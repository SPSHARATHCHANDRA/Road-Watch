import { CheckCircle2, Copy, ImagePlus, LocateFixed, Send, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Field } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'
import { CATEGORY_LABELS, SEVERITY_LABELS } from '../config/app'
import { useToast } from '../context/ToastContext'
import { cn, errorMessage } from '../lib/utils'
import { dataService, isDemoMode } from '../services'
import { hasErrors, parseCoordinate, PHOTO_TYPES, validateReport, type FieldErrors } from '../services/validation'
import { INCIDENT_CATEGORIES, SEVERITIES, type CitizenReportInput, type IncidentCategory, type Severity } from '../types'

type Errors = FieldErrors<CitizenReportInput & { photo: string }>

export default function ReportPage() {
  const toast = useToast()
  const [category, setCategory] = useState<IncidentCategory | ''>('')
  const [location, setLocation] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [severity, setSeverity] = useState<Severity | ''>('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [result, setResult] = useState<{ reference: string; photoStored: boolean; hadPhoto: boolean } | null>(null)

  useEffect(() => {
    if (!photo) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast('error', 'Geolocation is not supported by this browser')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setLocating(false)
      },
      (err) => {
        toast('error', `Could not get location: ${err.message}`)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const latitude = parseCoordinate(lat, 'lat')
    const longitude = parseCoordinate(lng, 'lng')
    const input = {
      category: category as IncidentCategory,
      location_description: location.trim(),
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      severity: severity as Severity,
      description: description.trim(),
    }
    const errs = validateReport(input, photo)
    if (latitude === undefined) errs.latitude = 'Latitude must be a number between -90 and 90'
    if (longitude === undefined) errs.longitude = 'Longitude must be a number between -180 and 180'
    setErrors(errs)
    if (hasErrors(errs)) {
      toast('error', 'Please fix the highlighted fields')
      return
    }
    setBusy(true)
    try {
      const res = await dataService.submitCitizenReport(input, photo)
      setResult({ ...res, hadPhoto: photo !== null })
    } catch (err) {
      toast('error', errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setCategory('')
    setLocation('')
    setLat('')
    setLng('')
    setSeverity('')
    setDescription('')
    setPhoto(null)
    setErrors({})
    setResult(null)
  }

  if (result) {
    return (
      <div className="mx-auto max-w-lg animate-fade-in py-8">
        <div className="panel flex flex-col items-center gap-4 px-6 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <div>
            <h1 className="text-lg font-semibold text-slate-50">Report submitted</h1>
            <p className="mt-1 text-sm text-slate-400">Thank you. Your report is now pending review by an administrator.</p>
          </div>
          <div className="w-full rounded-lg border border-navy-600 bg-navy-900 px-4 py-3">
            <p className="text-xs text-slate-500">Your reference ID</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="font-mono text-lg font-semibold tracking-wider text-cyan-300">{result.reference}</span>
              <button
                className="btn-ghost btn-sm"
                aria-label="Copy reference ID"
                onClick={() => navigator.clipboard?.writeText(result.reference).then(() => toast('success', 'Reference copied'))}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
          {isDemoMode && (
            <p className="text-xs text-amber-300/90">
              Demo mode: this report was saved only in this browser{result.hadPhoto ? ' and the photo was not stored' : ''}.
            </p>
          )}
          <button className="btn-primary" onClick={reset}>
            Submit another report
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader
        title="Report a Road Issue"
        description="Help keep roads safe. Reports are reviewed by an administrator before they appear as incidents."
      />
      <form onSubmit={submit} noValidate className="panel grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <Field label="Incident category" htmlFor="r-category" error={errors.category} required>
          <select id="r-category" className={cn('input', errors.category && 'input-error')} value={category} onChange={(e) => setCategory(e.target.value as IncidentCategory)}>
            <option value="">Select a category…</option>
            {INCIDENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Severity" htmlFor="r-severity" error={errors.severity} required hint="How dangerous does it look?">
          <select id="r-severity" className={cn('input', errors.severity && 'input-error')} value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
            <option value="">Select severity…</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Location description" htmlFor="r-location" error={errors.location_description} required hint="Road name, nearby landmark, direction of travel">
            <input id="r-location" className={cn('input', errors.location_description && 'input-error')} maxLength={300} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Hosur Road near Silk Board flyover, towards Electronic City" />
          </Field>
        </div>
        <Field label="Latitude (optional)" htmlFor="r-lat" error={errors.latitude}>
          <input id="r-lat" inputMode="decimal" className={cn('input', errors.latitude && 'input-error')} value={lat} onChange={(e) => setLat(e.target.value)} placeholder="12.9716" />
        </Field>
        <Field label="Longitude (optional)" htmlFor="r-lng" error={errors.longitude}>
          <input id="r-lng" inputMode="decimal" className={cn('input', errors.longitude && 'input-error')} value={lng} onChange={(e) => setLng(e.target.value)} placeholder="77.5946" />
        </Field>
        <div className="sm:col-span-2 -mt-2">
          <button type="button" className="btn-ghost btn-sm text-cyan-300" onClick={useMyLocation} disabled={locating}>
            <LocateFixed className="h-3.5 w-3.5" /> {locating ? 'Getting location…' : 'Use my current location'}
          </button>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description" htmlFor="r-description" error={errors.description} required hint={`${description.trim().length}/2000 characters (min. 10)`}>
            <textarea id="r-description" rows={5} maxLength={2000} className={cn('input', errors.description && 'input-error')} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What did you see? How large is it? Is it blocking traffic?" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <span className="label">Photo (optional)</span>
          {preview ? (
            <div className="flex items-start gap-3">
              <img src={preview} alt="Selected" className="h-24 w-32 rounded-lg border border-navy-600 object-cover" />
              <div className="text-xs text-slate-400">
                <p className="max-w-[220px] truncate text-slate-200">{photo?.name}</p>
                <p>{photo && (photo.size / 1024).toFixed(0)} KB</p>
                <button type="button" className="btn-ghost btn-sm mt-1 px-0 text-red-300" onClick={() => setPhoto(null)}>
                  <X className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <label htmlFor="r-photo" className={cn('flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-4 text-sm text-slate-400 hover:border-cyan-500/60 hover:text-slate-200', errors.photo ? 'border-red-500/70' : 'border-navy-600')}>
              <ImagePlus className="h-5 w-5 text-cyan-400" />
              <span>Choose an image (JPEG, PNG or WebP, max 5 MB)</span>
            </label>
          )}
          <input
            id="r-photo"
            type="file"
            accept={PHOTO_TYPES.join(',')}
            className="sr-only"
            onChange={(e) => {
              setPhoto(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
          />
          {errors.photo && <p className="mt-1 text-xs text-red-400">{errors.photo}</p>}
          {isDemoMode && <p className="mt-1 text-xs text-amber-300/80">Demo mode: photos are previewed but not stored. Photo storage requires Supabase.</p>}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-navy-700 pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">Do not include personal information. Reports are only visible to administrators.</p>
          <button type="submit" className="btn-primary" disabled={busy}>
            <Send className="h-4 w-4" /> {busy ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </form>
    </div>
  )
}
