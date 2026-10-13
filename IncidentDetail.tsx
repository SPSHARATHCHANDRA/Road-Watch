import { History } from 'lucide-react'
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS } from '../config/app'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks'
import { formatDateTime, shortId } from '../lib/utils'
import { dataService } from '../services'
import { INCIDENT_STATUSES, SEVERITIES, type Incident, type IncidentStatus, type Severity } from '../types'
import { CategoryLabel, SeverityBadge, SimulatedTag, StatusBadge } from './ui/Badges'
import { ErrorState, LoadingState } from './ui/Feedback'

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  category: 'Category',
  description: 'Description',
  location: 'Location',
  latitude: 'Latitude',
  longitude: 'Longitude',
  severity: 'Severity',
  status: 'Status',
  segment_id: 'Road segment',
}

function fmt(field: string, v: unknown) {
  if (v === null || v === undefined || v === '') return '—'
  if (field === 'severity') return SEVERITY_LABELS[v as Severity] ?? String(v)
  if (field === 'status') return STATUS_LABELS[v as IncidentStatus] ?? String(v)
  if (field === 'category') return CATEGORY_LABELS[v as keyof typeof CATEGORY_LABELS] ?? String(v)
  const s = String(v)
  return s.length > 60 ? `${s.slice(0, 60)}…` : s
}

function IncidentHistory({ incidentId, version }: { incidentId: string; version: string }) {
  const { data, loading, error, reload } = useAsync(() => dataService.listIncidentHistory(incidentId), [incidentId, version])
  if (loading && !data) return <LoadingState label="Loading history…" className="py-4" />
  if (error) return <ErrorState message={error} onRetry={reload} className="py-4" />
  if (!data?.length) return <p className="text-xs text-slate-500">No history recorded.</p>
  return (
    <ol className="space-y-3 border-l border-navy-600 pl-4">
      {data.map((h) => (
        <li key={h.id} className="relative">
          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-navy-850 bg-cyan-400" />
          <p className="text-xs text-slate-400">
            <span className="font-medium capitalize text-slate-200">{h.action}</span> · {formatDateTime(h.created_at)}
          </p>
          {Object.entries(h.changes).length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-slate-400">
              {Object.entries(h.changes).map(([k, c]) => (
                <li key={k}>
                  {FIELD_LABELS[k] ?? k}: <span className="text-slate-500 line-through">{fmt(k, c.from)}</span> →{' '}
                  <span className="text-slate-200">{fmt(k, c.to)}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  )
}

interface Props {
  incident: Incident
  busy?: boolean
  onQuickUpdate?: (patch: { status?: IncidentStatus; severity?: Severity }) => void
}

export function IncidentDetail({ incident, busy, onQuickUpdate }: Props) {
  const { isAdmin } = useAuth()
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-slate-500">#{shortId(incident.id)}</span>
        <SeverityBadge severity={incident.severity} />
        <StatusBadge status={incident.status} />
        {incident.is_simulated && <SimulatedTag label="SIMULATED" />}
        {incident.source_report_id && <span className="text-xs text-cyan-300">From citizen report</span>}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-50">{incident.title}</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{incident.description || 'No description provided.'}</p>
      </div>
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="label">Category</dt>
          <dd>
            <CategoryLabel category={incident.category} />
          </dd>
        </div>
        <div>
          <dt className="label">Location</dt>
          <dd className="text-slate-200">{incident.location}</dd>
        </div>
        <div>
          <dt className="label">Coordinates</dt>
          <dd className="font-mono text-xs text-slate-300">
            {incident.latitude !== null && incident.longitude !== null ? `${incident.latitude}, ${incident.longitude}` : 'Not provided'}
          </dd>
        </div>
        <div>
          <dt className="label">Created / updated</dt>
          <dd className="text-xs text-slate-300">
            {formatDateTime(incident.created_at)}
            <br />
            {formatDateTime(incident.updated_at)}
          </dd>
        </div>
      </dl>

      {isAdmin && onQuickUpdate && (
        <div className="grid gap-3 rounded-lg border border-navy-700 bg-navy-900 p-3 sm:grid-cols-2">
          <div>
            <label htmlFor="quick-status" className="label">
              Change status
            </label>
            <select id="quick-status" className="input" value={incident.status} disabled={busy} onChange={(e) => onQuickUpdate({ status: e.target.value as IncidentStatus })}>
              {INCIDENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="quick-severity" className="label">
              Change severity / priority
            </label>
            <select id="quick-severity" className="input" value={incident.severity} disabled={busy} onChange={(e) => onQuickUpdate({ severity: e.target.value as Severity })}>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isAdmin && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <History className="h-4 w-4 text-cyan-400" /> Incident history
          </h4>
          <IncidentHistory incidentId={incident.id} version={incident.updated_at} />
        </div>
      )}
    </div>
  )
}
