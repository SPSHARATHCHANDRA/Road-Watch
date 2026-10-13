import { useState } from 'react'
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS } from '../config/app'
import { cn } from '../lib/utils'
import { hasErrors, parseCoordinate, validateIncident, type FieldErrors } from '../services/validation'
import { INCIDENT_CATEGORIES, INCIDENT_STATUSES, SEVERITIES, type Incident, type IncidentInput, type RoadSegment } from '../types'
import { Field } from './ui/Field'

interface Props {
  initial?: Incident
  segments: RoadSegment[]
  busy: boolean
  onSubmit: (input: IncidentInput) => void
  onCancel: () => void
}

export function IncidentForm({ initial, segments, busy, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'pothole')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [lat, setLat] = useState(initial?.latitude?.toString() ?? '')
  const [lng, setLng] = useState(initial?.longitude?.toString() ?? '')
  const [severity, setSeverity] = useState(initial?.severity ?? 'medium')
  const [status, setStatus] = useState(initial?.status ?? 'open')
  const [segmentId, setSegmentId] = useState(initial?.segment_id ?? '')
  const [errors, setErrors] = useState<FieldErrors<IncidentInput>>({})

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const latitude = parseCoordinate(lat, 'lat')
    const longitude = parseCoordinate(lng, 'lng')
    const input: IncidentInput = {
      title: title.trim(),
      category,
      description: description.trim(),
      location: location.trim(),
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      severity,
      status,
      segment_id: segmentId || null,
    }
    const errs = validateIncident(input)
    if (latitude === undefined) errs.latitude = 'Latitude must be a number between -90 and 90'
    if (longitude === undefined) errs.longitude = 'Longitude must be a number between -180 and 180'
    setErrors(errs)
    if (!hasErrors(errs)) onSubmit(input)
  }

  function pickSegment(id: string) {
    setSegmentId(id)
    const seg = segments.find((s) => s.id === id)
    if (seg) {
      if (!location.trim()) setLocation(seg.name)
      if (!lat && !lng) {
        setLat(String(seg.latitude))
        setLng(String(seg.longitude))
      }
    }
  }

  return (
    <form id="incident-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Title" htmlFor="title" error={errors.title} required>
          <input id="title" className={cn('input', errors.title && 'input-error')} value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} />
        </Field>
      </div>
      <Field label="Category" htmlFor="category" error={errors.category} required>
        <select id="category" className="input" value={category} onChange={(e) => setCategory(e.target.value as IncidentInput['category'])}>
          {INCIDENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Road segment" htmlFor="segment" hint="Optional — fills location if empty">
        <select id="segment" className="input" value={segmentId} onChange={(e) => pickSegment(e.target.value)}>
          <option value="">None</option>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Severity" htmlFor="severity" error={errors.severity} required>
        <select id="severity" className="input" value={severity} onChange={(e) => setSeverity(e.target.value as IncidentInput['severity'])}>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Status" htmlFor="status" error={errors.status} required>
        <select id="status" className="input" value={status} onChange={(e) => setStatus(e.target.value as IncidentInput['status'])}>
          {INCIDENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Location" htmlFor="location" error={errors.location} required>
          <input id="location" className={cn('input', errors.location && 'input-error')} value={location} maxLength={300} onChange={(e) => setLocation(e.target.value)} />
        </Field>
      </div>
      <Field label="Latitude" htmlFor="lat" error={errors.latitude} hint="Optional, e.g. 12.9716">
        <input id="lat" inputMode="decimal" className={cn('input', errors.latitude && 'input-error')} value={lat} onChange={(e) => setLat(e.target.value)} />
      </Field>
      <Field label="Longitude" htmlFor="lng" error={errors.longitude} hint="Optional, e.g. 77.5946">
        <input id="lng" inputMode="decimal" className={cn('input', errors.longitude && 'input-error')} value={lng} onChange={(e) => setLng(e.target.value)} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description" htmlFor="description" error={errors.description}>
          <textarea id="description" rows={4} maxLength={2000} className={cn('input', errors.description && 'input-error')} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Create incident'}
        </button>
      </div>
    </form>
  )
}
