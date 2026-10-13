import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IncidentDetail } from '../components/IncidentDetail'
import { IncidentForm } from '../components/IncidentForm'
import { CategoryLabel, SeverityBadge, SimulatedTag, StatusBadge } from '../components/ui/Badges'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/Feedback'
import { ConfirmDialog, Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { CATEGORY_LABELS, SEVERITY_LABELS, SEVERITY_RANK, STATUS_LABELS } from '../config/app'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks'
import { errorMessage, formatDateTime, shortId } from '../lib/utils'
import { dataService } from '../services'
import { INCIDENT_CATEGORIES, INCIDENT_STATUSES, SEVERITIES, type Incident, type IncidentInput } from '../types'

type SortKey = 'created_at' | 'updated_at' | 'title' | 'severity' | 'status'
const STATUS_ORDER = { open: 0, investigating: 1, resolved: 2, rejected: 3 }

export default function IncidentsPage() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const { data, loading, error, reload, setData } = useAsync(async () => {
    const [incidents, segments] = await Promise.all([dataService.listIncidents(), dataService.listRoadSegments()])
    return { incidents, segments }
  })

  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'created_at', dir: 'desc' })

  const [viewing, setViewing] = useState<Incident | null>(null)
  const [editing, setEditing] = useState<Incident | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Incident | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => {
    if (!data) return []
    const term = q.trim().toLowerCase()
    const list = data.incidents.filter(
      (i) =>
        (category === 'all' || i.category === category) &&
        (severity === 'all' || i.severity === severity) &&
        (status === 'all' || i.status === status) &&
        (!term || [i.title, i.location, i.description, i.id].some((f) => f.toLowerCase().includes(term))),
    )
    const m = sort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sort.key) {
        case 'severity':
          return (SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) * m
        case 'status':
          return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * m
        case 'title':
          return a.title.localeCompare(b.title) * m
        default:
          return a[sort.key].localeCompare(b[sort.key]) * m
      }
    })
  }, [data, q, category, severity, status, sort])

  function replaceIncident(inc: Incident) {
    setData((d) => (d ? { ...d, incidents: d.incidents.map((i) => (i.id === inc.id ? inc : i)) } : d))
  }

  async function save(input: IncidentInput) {
    setBusy(true)
    try {
      if (editing === 'new') {
        const inc = await dataService.createIncident(input)
        setData((d) => (d ? { ...d, incidents: [inc, ...d.incidents] } : d))
        toast('success', `Incident #${shortId(inc.id)} created`)
      } else if (editing) {
        const inc = await dataService.updateIncident(editing.id, input)
        replaceIncident(inc)
        if (viewing?.id === inc.id) setViewing(inc)
        toast('success', 'Incident updated')
      }
      setEditing(null)
    } catch (e) {
      toast('error', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function quickUpdate(patch: Partial<IncidentInput>) {
    if (!viewing) return
    setBusy(true)
    try {
      const inc = await dataService.updateIncident(viewing.id, patch)
      replaceIncident(inc)
      setViewing(inc)
      toast('success', 'Incident updated')
    } catch (e) {
      toast('error', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    try {
      await dataService.deleteIncident(deleting.id)
      setData((d) => (d ? { ...d, incidents: d.incidents.filter((i) => i.id !== deleting.id) } : d))
      toast('success', 'Incident deleted')
      setDeleting(null)
      setViewing(null)
    } catch (e) {
      toast('error', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  function SortHeader({ k, label, className }: { k: SortKey; label: string; className?: string }) {
    const active = sort.key === k
    const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
    return (
      <th className={`th ${className ?? ''}`}>
        <button
          className="inline-flex items-center gap-1 uppercase hover:text-slate-200"
          onClick={() => setSort({ key: k, dir: active && sort.dir === 'desc' ? 'asc' : 'desc' })}
        >
          {label}
          <Icon className={`h-3 w-3 ${active ? 'text-cyan-400' : ''}`} />
        </button>
      </th>
    )
  }

  const filtersActive = q || category !== 'all' || severity !== 'all' || status !== 'all'

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Incident Management"
        description={isAdmin ? 'Create, review and update road incidents.' : 'Browse reported road incidents. Sign in as an administrator to manage them.'}
        actions={
          isAdmin ? (
            <button className="btn-primary" onClick={() => setEditing('new')} disabled={!data}>
              <Plus className="h-4 w-4" /> New incident
            </button>
          ) : (
            <Link to="/report" className="btn-secondary">
              Report an issue
            </Link>
          )
        }
      />

      <div className="panel">
        <div className="flex flex-col gap-2 border-b border-navy-700 p-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input className="input pl-9" placeholder="Search title, location, description or ID…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search incidents" />
          </div>
          <div className="grid grid-cols-3 gap-2 md:flex">
            <select className="input md:w-40" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter category">
              <option value="all">All categories</option>
              {INCIDENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <select className="input md:w-36" value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Filter severity">
              <option value="all">All severities</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABELS[s]}
                </option>
              ))}
            </select>
            <select className="input md:w-36" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status">
              <option value="all">All statuses</option>
              {INCIDENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && !data && <LoadingState label="Loading incidents…" />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && rows.length === 0 && (
          <EmptyState
            title={filtersActive ? 'No incidents match your filters' : 'No incidents yet'}
            description={filtersActive ? 'Try clearing the search or filters.' : isAdmin ? 'Create the first incident.' : undefined}
            action={
              filtersActive ? (
                <button
                  className="btn-secondary btn-sm mt-1"
                  onClick={() => {
                    setQ('')
                    setCategory('all')
                    setSeverity('all')
                    setStatus('all')
                  }}
                >
                  Clear filters
                </button>
              ) : undefined
            }
          />
        )}
        {data && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="border-b border-navy-700">
                <tr>
                  <th className="th">ID</th>
                  <SortHeader k="title" label="Incident" />
                  <th className="th">Category</th>
                  <SortHeader k="severity" label="Severity" />
                  <SortHeader k="status" label="Status" />
                  <SortHeader k="created_at" label="Created" />
                  <SortHeader k="updated_at" label="Updated" />
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/60">
                {rows.map((i) => (
                  <tr key={i.id} className="hover:bg-navy-800/50">
                    <td className="td font-mono text-xs text-slate-500">{shortId(i.id)}</td>
                    <td className="td">
                      <button className="max-w-[280px] truncate text-left font-medium text-slate-100 hover:text-cyan-300" onClick={() => setViewing(i)}>
                        {i.title}
                      </button>
                      <p className="flex max-w-[280px] items-center gap-2 truncate text-xs text-slate-500">
                        {i.location}
                        {i.is_simulated && <SimulatedTag label="SIM" className="py-0 text-[9px]" />}
                      </p>
                    </td>
                    <td className="td">
                      <CategoryLabel category={i.category} />
                    </td>
                    <td className="td">
                      <SeverityBadge severity={i.severity} />
                    </td>
                    <td className="td">
                      <StatusBadge status={i.status} />
                    </td>
                    <td className="td whitespace-nowrap text-xs text-slate-400">{formatDateTime(i.created_at)}</td>
                    <td className="td whitespace-nowrap text-xs text-slate-400">{formatDateTime(i.updated_at)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost btn-sm" onClick={() => setViewing(i)} aria-label={`View ${i.title}`} title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button className="btn-ghost btn-sm" onClick={() => setEditing(i)} aria-label={`Edit ${i.title}`} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button className="btn-ghost btn-sm text-red-400 hover:text-red-300" onClick={() => setDeleting(i)} aria-label={`Delete ${i.title}`} title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <div className="border-t border-navy-700 px-4 py-2 text-xs text-slate-500">
            Showing {rows.length} of {data.incidents.length} incidents
          </div>
        )}
      </div>

      <Modal
        open={viewing !== null}
        title="Incident details"
        size="lg"
        onClose={() => setViewing(null)}
        footer={
          viewing && isAdmin ? (
            <>
              <button className="btn-danger" onClick={() => setDeleting(viewing)}>
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <button className="btn-primary" onClick={() => setEditing(viewing)}>
                <Pencil className="h-4 w-4" /> Edit
              </button>
            </>
          ) : undefined
        }
      >
        {viewing && <IncidentDetail incident={viewing} busy={busy} onQuickUpdate={quickUpdate} />}
      </Modal>

      <Modal open={editing !== null} title={editing === 'new' ? 'New incident' : 'Edit incident'} size="lg" onClose={() => !busy && setEditing(null)}>
        {editing !== null && data && (
          <IncidentForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : editing}
            segments={data.segments}
            busy={busy}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete incident?"
        danger
        busy={busy}
        confirmLabel="Delete permanently"
        message={
          <>
            This will permanently delete <strong className="text-slate-100">{deleting?.title}</strong> and its history. This cannot be undone.
          </>
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
