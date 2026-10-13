import { Check, ImageIcon, RotateCcw, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminGate } from '../components/AdminGate'
import { IncidentDetail } from '../components/IncidentDetail'
import { CategoryLabel, ReportStatusBadge, SeverityBadge, StatusBadge } from '../components/ui/Badges'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/Feedback'
import { Field } from '../components/ui/Field'
import { ConfirmDialog, Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { CATEGORY_LABELS, SEVERITY_LABELS, SEVERITY_RANK } from '../config/app'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks'
import { cn, errorMessage, formatDateTime, timeAgo } from '../lib/utils'
import { dataService, isDemoMode, resetDemoData } from '../services'
import { SEVERITIES, type CitizenReport, type Incident, type IncidentStatus, type ReportStatus, type Severity } from '../types'

function ReportPhoto({ path }: { path: string }) {
  const { data, loading } = useAsync(() => dataService.getReportPhotoUrl(path), [path])
  if (loading) return <p className="text-xs text-slate-500">Loading photo…</p>
  if (!data) return <p className="text-xs text-slate-500">Photo unavailable.</p>
  return <img src={data} alt="Citizen report attachment" className="max-h-64 rounded-lg border border-navy-600 object-contain" />
}

function AdminContent() {
  const toast = useToast()
  const { data, loading, error, reload, setData } = useAsync(async () => {
    const [reports, incidents] = await Promise.all([dataService.listCitizenReports(), dataService.listIncidents()])
    return { reports, incidents }
  })
  const [tab, setTab] = useState<ReportStatus | 'queue'>('pending')
  const [reviewing, setReviewing] = useState<CitizenReport | null>(null)
  const [title, setTitle] = useState('')
  const [severity, setSeverity] = useState<Severity>('medium')
  const [note, setNote] = useState('')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [viewing, setViewing] = useState<Incident | null>(null)

  const reports = useMemo(() => (data ? data.reports.filter((r) => tab === 'queue' || r.status === tab) : []), [data, tab])
  const queue = useMemo(
    () =>
      data
        ? data.incidents
            .filter((i) => i.status === 'open' || i.status === 'investigating')
            .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.created_at.localeCompare(b.created_at))
        : [],
    [data],
  )
  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 }
    data?.reports.forEach((r) => c[r.status]++)
    return c
  }, [data])

  function openReview(r: CitizenReport) {
    setReviewing(r)
    setTitle(`${CATEGORY_LABELS[r.category]} – ${r.location_description}`.slice(0, 150))
    setSeverity(r.severity)
    setNote('')
    setTitleError(null)
  }

  async function approve() {
    if (!reviewing) return
    const t = title.trim()
    if (t.length < 3 || t.length > 150) return setTitleError('Title must be 3–150 characters')
    setBusy(true)
    try {
      const inc = await dataService.approveReport(reviewing.id, { title: t, severity })
      const now = new Date().toISOString()
      setData((d) =>
        d
          ? {
              incidents: [inc, ...d.incidents],
              reports: d.reports.map((r) => (r.id === reviewing.id ? { ...r, status: 'approved', incident_id: inc.id, reviewed_at: now } : r)),
            }
          : d,
      )
      toast('success', `Report ${reviewing.reference} approved and converted to an incident`)
      setReviewing(null)
    } catch (e) {
      toast('error', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function reject() {
    if (!reviewing) return
    setBusy(true)
    try {
      await dataService.rejectReport(reviewing.id, note)
      const now = new Date().toISOString()
      setData((d) =>
        d ? { ...d, reports: d.reports.map((r) => (r.id === reviewing.id ? { ...r, status: 'rejected', reviewer_note: note.trim() || null, reviewed_at: now } : r)) } : d,
      )
      toast('success', `Report ${reviewing.reference} rejected`)
      setConfirmReject(false)
      setReviewing(null)
    } catch (e) {
      toast('error', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function quickUpdate(patch: { status?: IncidentStatus; severity?: Severity }) {
    if (!viewing) return
    setBusy(true)
    try {
      const inc = await dataService.updateIncident(viewing.id, patch)
      setViewing(inc)
      setData((d) => (d ? { ...d, incidents: d.incidents.map((i) => (i.id === inc.id ? inc : i)) } : d))
      toast('success', 'Incident updated')
    } catch (e) {
      toast('error', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const tabs: { key: typeof tab; label: string; count?: number }[] = [
    { key: 'pending', label: 'Pending review', count: counts.pending },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'rejected', label: 'Rejected', count: counts.rejected },
    { key: 'queue', label: 'Active incident queue', count: queue.length },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Administration"
        description="Review citizen reports, assign priorities and update incident statuses."
        actions={
          isDemoMode ? (
            <button className="btn-secondary btn-sm" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset demo data
            </button>
          ) : undefined
        }
      />

      <div className="mb-3 flex gap-1 overflow-x-auto border-b border-navy-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm',
              tab === t.key ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200',
            )}
          >
            {t.label}
            {data && <span className="rounded-full bg-navy-700 px-1.5 text-[11px] tabular-nums text-slate-300">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading && !data && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && tab !== 'queue' && (
        <div className="panel">
          {reports.length === 0 ? (
            <EmptyState
              title={tab === 'pending' ? 'No reports awaiting review' : `No ${tab} reports`}
              description={tab === 'pending' ? 'New citizen submissions will appear here.' : undefined}
              action={
                tab === 'pending' ? (
                  <Link to="/report" className="btn-secondary btn-sm mt-1">
                    Open the public report form
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-navy-700/60">
              {reports.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-cyan-300">{r.reference}</span>
                      <SeverityBadge severity={r.severity} />
                      <ReportStatusBadge status={r.status} />
                      {r.photo_path && <ImageIcon className="h-3.5 w-3.5 text-slate-400" aria-label="Has photo" />}
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-slate-100">
                      <CategoryLabel category={r.category} /> · {r.location_description}
                    </p>
                    <p className="truncate text-xs text-slate-500">{r.description}</p>
                    {r.reviewer_note && <p className="mt-0.5 text-xs text-slate-400">Note: {r.reviewer_note}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{timeAgo(r.created_at)}</span>
                    <button className="btn-secondary btn-sm" onClick={() => openReview(r)}>
                      {r.status === 'pending' ? 'Review' : 'View'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {data && tab === 'queue' && (
        <div className="panel">
          {queue.length === 0 ? (
            <EmptyState title="No active incidents" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="border-b border-navy-700">
                  <tr>
                    <th className="th">Priority</th>
                    <th className="th">Incident</th>
                    <th className="th">Status</th>
                    <th className="th">Age</th>
                    <th className="th text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/60">
                  {queue.map((i) => (
                    <tr key={i.id} className="hover:bg-navy-800/50">
                      <td className="td">
                        <SeverityBadge severity={i.severity} />
                      </td>
                      <td className="td">
                        <p className="max-w-[320px] truncate font-medium text-slate-100">{i.title}</p>
                        <p className="max-w-[320px] truncate text-xs text-slate-500">{i.location}</p>
                      </td>
                      <td className="td">
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="td text-xs text-slate-400">{timeAgo(i.created_at)}</td>
                      <td className="td text-right">
                        <button className="btn-secondary btn-sm" onClick={() => setViewing(i)}>
                          Update / history
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal
        open={reviewing !== null}
        title={reviewing ? `Citizen report ${reviewing.reference}` : ''}
        size="lg"
        onClose={() => !busy && setReviewing(null)}
        footer={
          reviewing?.status === 'pending' ? (
            <>
              <button className="btn-secondary" onClick={() => setConfirmReject(true)} disabled={busy}>
                <X className="h-4 w-4" /> Reject
              </button>
              <button className="btn-primary" onClick={approve} disabled={busy}>
                <Check className="h-4 w-4" /> {busy ? 'Approving…' : 'Approve & create incident'}
              </button>
            </>
          ) : undefined
        }
      >
        {reviewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <ReportStatusBadge status={reviewing.status} />
              <SeverityBadge severity={reviewing.severity} />
              <span className="text-xs text-slate-500">Submitted {formatDateTime(reviewing.created_at)}</span>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="label">Category</dt>
                <dd>
                  <CategoryLabel category={reviewing.category} />
                </dd>
              </div>
              <div>
                <dt className="label">Coordinates</dt>
                <dd className="font-mono text-xs text-slate-300">
                  {reviewing.latitude !== null ? `${reviewing.latitude}, ${reviewing.longitude}` : 'Not provided'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="label">Location</dt>
                <dd className="text-slate-200">{reviewing.location_description}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="label">Description</dt>
                <dd className="whitespace-pre-wrap text-slate-300">{reviewing.description}</dd>
              </div>
              {reviewing.photo_path && (
                <div className="sm:col-span-2">
                  <dt className="label">Photo</dt>
                  <dd>
                    <ReportPhoto path={reviewing.photo_path} />
                  </dd>
                </div>
              )}
              {reviewing.reviewed_at && (
                <div className="sm:col-span-2">
                  <dt className="label">Reviewed</dt>
                  <dd className="text-xs text-slate-300">
                    {formatDateTime(reviewing.reviewed_at)}
                    {reviewing.reviewer_note && ` — ${reviewing.reviewer_note}`}
                  </dd>
                </div>
              )}
            </dl>
            {reviewing.status === 'pending' && (
              <div className="grid gap-3 rounded-lg border border-navy-700 bg-navy-900 p-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Field label="Incident title (if approved)" htmlFor="approve-title" error={titleError ?? undefined} required>
                    <input id="approve-title" className={cn('input', titleError && 'input-error')} maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} />
                  </Field>
                </div>
                <Field label="Assigned priority" htmlFor="approve-severity">
                  <select id="approve-severity" className="input" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {SEVERITY_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="sm:col-span-3">
                  <Field label="Rejection note (optional)" htmlFor="reject-note" hint="Only used if you reject the report">
                    <input id="reject-note" className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Duplicate of an existing incident" />
                  </Field>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmReject}
        title="Reject this report?"
        danger
        busy={busy}
        confirmLabel="Reject report"
        message="The report will be marked as rejected and will not become an incident."
        onConfirm={reject}
        onCancel={() => setConfirmReject(false)}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        danger
        confirmLabel="Reset"
        message="All incidents and reports stored in this browser will be replaced with the original sample data."
        onConfirm={() => {
          resetDemoData()
          setConfirmReset(false)
          void reload()
          toast('success', 'Demo data reset')
        }}
        onCancel={() => setConfirmReset(false)}
      />

      <Modal open={viewing !== null} title="Update incident" size="lg" onClose={() => setViewing(null)}>
        {viewing && <IncidentDetail incident={viewing} busy={busy} onQuickUpdate={quickUpdate} />}
      </Modal>
    </div>
  )
}

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminContent />
    </AdminGate>
  )
}
