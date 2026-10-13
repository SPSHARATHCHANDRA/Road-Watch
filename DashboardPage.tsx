import { AlertOctagon, AlertTriangle, ClipboardList, Clock, Route as RouteIcon, ShieldAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CategoryLabel, ConditionBadge, SeverityBadge, SimulatedTag, StatusBadge } from '../components/ui/Badges'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/Feedback'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { CATEGORY_COLORS, CATEGORY_LABELS, CONDITION_COLORS, CONDITION_LABELS, SEVERITY_RANK } from '../config/app'
import { useAsync } from '../hooks'
import { timeAgo } from '../lib/utils'
import { dataService, isDemoMode } from '../services'
import { INCIDENT_CATEGORIES, ROAD_CONDITIONS, type IncidentCategory } from '../types'

const RANGES = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 0, label: 'All time' },
]

const tooltipStyle = {
  contentStyle: { background: '#131d33', border: '1px solid #273759', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#e2e8f0' },
  itemStyle: { color: '#cbd5e1' },
}

export default function DashboardPage() {
  const [range, setRange] = useState(30)
  const [category, setCategory] = useState<IncidentCategory | 'all'>('all')

  const { data, loading, error, reload } = useAsync(async () => {
    const [incidents, segments, pending] = await Promise.all([
      dataService.listIncidents(),
      dataService.listRoadSegments(),
      dataService.pendingReportCount(),
    ])
    return { incidents, segments, pending }
  })

  const view = useMemo(() => {
    if (!data) return null
    const since = range ? Date.now() - range * 86400_000 : 0
    const filtered = data.incidents.filter(
      (i) => new Date(i.created_at).getTime() >= since && (category === 'all' || i.category === category),
    )
    const active = filtered.filter((i) => i.status === 'open' || i.status === 'investigating')

    const byCategory = INCIDENT_CATEGORIES.map((c) => ({
      key: c,
      name: CATEGORY_LABELS[c],
      count: filtered.filter((i) => i.category === c).length,
    }))

    const conditions = ROAD_CONDITIONS.map((c) => ({
      key: c,
      name: CONDITION_LABELS[c],
      value: data.segments.filter((s) => s.condition === c).length,
    })).filter((c) => c.value > 0)

    // Trend buckets: daily for <= 30 days, weekly otherwise.
    const oldest = filtered.reduce((m, i) => Math.min(m, new Date(i.created_at).getTime()), Date.now())
    const start = range ? since : oldest
    const bucketDays = range && range <= 30 ? 1 : 7
    const bucketMs = bucketDays * 86400_000
    const n = Math.max(1, Math.ceil((Date.now() - start) / bucketMs))
    const trend = Array.from({ length: n }, (_, k) => {
      const from = start + k * bucketMs
      const label = new Date(from).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
      const inBucket = filtered.filter((i) => {
        const t = new Date(i.created_at).getTime()
        return t >= from && t < from + bucketMs
      })
      return { label, reported: inBucket.length, critical: inBucket.filter((i) => i.severity === 'critical').length }
    })

    const alerts = [
      ...active
        .filter((i) => i.severity === 'critical' || i.severity === 'high')
        .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.created_at.localeCompare(a.created_at))
        .slice(0, 5)
        .map((i) => ({ id: i.id, kind: 'incident' as const, incident: i })),
      ...data.segments
        .filter((s) => s.condition === 'critical')
        .map((s) => ({ id: s.id, kind: 'segment' as const, segment: s })),
    ]

    return {
      filtered,
      active,
      critical: active.filter((i) => i.severity === 'critical').length,
      byCategory,
      conditions,
      trend,
      bucketDays,
      recent: filtered.slice(0, 6),
      alerts,
    }
  }, [data, range, category])

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        description={
          <span className="flex flex-wrap items-center gap-2">
            Overview of monitored road segments and reported incidents.
            {isDemoMode && <SimulatedTag label="SAMPLE DATA" />}
          </span>
        }
        actions={
          <>
            <select className="input w-auto py-1.5" value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Date range">
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <select
              className="input w-auto py-1.5"
              value={category}
              onChange={(e) => setCategory(e.target.value as IncidentCategory | 'all')}
              aria-label="Category"
            >
              <option value="all">All categories</option>
              {INCIDENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </>
        }
      />

      {loading && !data && <LoadingState label="Loading dashboard…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && view && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Monitored road segments" value={data.segments.length} icon={RouteIcon} tone="cyan" hint="All segments" />
            <StatCard label="Reported incidents" value={view.filtered.length} icon={ClipboardList} tone="slate" hint="In selected range" />
            <StatCard label="Open incidents" value={view.active.length} icon={AlertTriangle} tone="amber" hint="Open + investigating" />
            <StatCard label="Critical incidents" value={view.critical} icon={AlertOctagon} tone="red" hint="Active, critical severity" />
            <StatCard label="Awaiting review" value={data.pending} icon={Clock} tone="green" hint="Citizen reports (all time)" />
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <section className="panel xl:col-span-2">
              <div className="panel-header">
                <h2 className="panel-title">Incident trend</h2>
                <span className="text-xs text-slate-500">{view.bucketDays === 1 ? 'Per day' : 'Per week'}</span>
              </div>
              <div className="h-64 px-2 py-3">
                {view.filtered.length === 0 ? (
                  <EmptyState title="No incidents in this range" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={view.trend} margin={{ left: -20, right: 8, top: 8 }}>
                      <defs>
                        <linearGradient id="gReported" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1c2944" vertical={false} />
                      <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} minTickGap={16} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip {...tooltipStyle} />
                      <Area type="monotone" dataKey="reported" name="Reported" stroke="#22d3ee" fill="url(#gReported)" strokeWidth={2} />
                      <Area type="monotone" dataKey="critical" name="Critical" stroke="#ef4444" fill="transparent" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2 className="panel-title">Road-condition distribution</h2>
                <span className="text-xs text-slate-500">{data.segments.length} segments</span>
              </div>
              <div className="flex h-64 items-center gap-2 px-3">
                {view.conditions.length === 0 ? (
                  <EmptyState title="No road segments" className="w-full" />
                ) : (
                  <>
                    <ResponsiveContainer width="55%" height="100%">
                      <PieChart>
                        <Pie data={view.conditions} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
                          {view.conditions.map((c) => (
                            <Cell key={c.key} fill={CONDITION_COLORS[c.key]} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className="flex-1 space-y-2 text-sm">
                      {view.conditions.map((c) => (
                        <li key={c.key} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-slate-300">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CONDITION_COLORS[c.key] }} />
                            {c.name}
                          </span>
                          <span className="tabular-nums text-slate-400">{c.value}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <section className="panel">
              <div className="panel-header">
                <h2 className="panel-title">Incidents by category</h2>
              </div>
              <div className="h-64 px-2 py-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={view.byCategory} layout="vertical" margin={{ left: 10, right: 16 }}>
                    <CartesianGrid stroke="#1c2944" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={120} tickLine={false} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#1c294455' }} />
                    <Bar dataKey="count" name="Incidents" radius={[0, 4, 4, 0]}>
                      {view.byCategory.map((c) => (
                        <Cell key={c.key} fill={CATEGORY_COLORS[c.key]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel xl:col-span-2">
              <div className="panel-header">
                <h2 className="panel-title">Recent reports</h2>
                <Link to="/incidents" className="text-xs text-cyan-400 hover:text-cyan-300">
                  View all →
                </Link>
              </div>
              {view.recent.length === 0 ? (
                <EmptyState title="No incidents match the filters" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead className="border-b border-navy-700">
                      <tr>
                        <th className="th">Incident</th>
                        <th className="th">Category</th>
                        <th className="th">Severity</th>
                        <th className="th">Status</th>
                        <th className="th text-right">Reported</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-700/60">
                      {view.recent.map((i) => (
                        <tr key={i.id} className="hover:bg-navy-800/50">
                          <td className="td">
                            <p className="max-w-[260px] truncate font-medium text-slate-100">{i.title}</p>
                            <p className="max-w-[260px] truncate text-xs text-slate-500">{i.location}</p>
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
                          <td className="td text-right text-xs text-slate-400">{timeAgo(i.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-400" /> Road-safety alerts
              </h2>
              <span className="text-xs text-slate-500">Active high/critical incidents and critical road segments</span>
            </div>
            {view.alerts.length === 0 ? (
              <EmptyState title="No active alerts" description="No high or critical incidents are open for the selected filters." />
            ) : (
              <ul className="divide-y divide-navy-700/60">
                {view.alerts.map((a) =>
                  a.kind === 'incident' ? (
                    <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <SeverityBadge severity={a.incident.severity} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">{a.incident.title}</p>
                        <p className="truncate text-xs text-slate-500">
                          {a.incident.location} · {timeAgo(a.incident.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={a.incident.status} />
                    </li>
                  ) : (
                    <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <ConditionBadge condition={a.segment.condition} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">Road segment in critical condition</p>
                        <p className="truncate text-xs text-slate-500">
                          {a.segment.name} · {a.segment.area}
                        </p>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
