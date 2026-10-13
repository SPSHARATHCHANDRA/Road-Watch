import { Cpu, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SimulatedTag } from '../components/ui/Badges'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/Feedback'
import { PageHeader } from '../components/ui/PageHeader'
import { metricLevel, SENSOR_METRIC_CONFIG } from '../config/app'
import { useAsync } from '../hooks'
import { cn, formatDateTime } from '../lib/utils'
import { dataService } from '../services'
import { SENSOR_METRICS, type SensorMetric, type SensorReading } from '../types'

const LEVEL_STYLES = {
  normal: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30',
  warning: 'text-amber-300 bg-amber-400/10 border-amber-400/30',
  critical: 'text-red-300 bg-red-400/10 border-red-400/30',
}

const tooltipStyle = {
  contentStyle: { background: '#131d33', border: '1px solid #273759', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#e2e8f0' },
}

export default function SensorsPage() {
  const [hours, setHours] = useState(24)
  const { data, loading, error, reload } = useAsync(async () => {
    const [segments, sensor] = await Promise.all([dataService.listRoadSegments(), dataService.listSensorReadings(hours)])
    return { segments, ...sensor }
  }, [hours])
  const [segmentId, setSegmentId] = useState<string>('')

  const activeSegment = segmentId || data?.segments[0]?.id || ''
  const segmentName = data?.segments.find((s) => s.id === activeSegment)?.name

  const view = useMemo(() => {
    if (!data) return null
    const bySegment = data.readings.filter((r) => r.segment_id === activeSegment)
    const series: Record<SensorMetric, SensorReading[]> = { vibration: [], water_level: [], traffic_density: [], surface_condition: [] }
    for (const r of bySegment) series[r.metric].push(r)

    // Latest reading per sensor across all segments, for the overview table.
    const latest = new Map<string, SensorReading>()
    for (const r of data.readings) {
      const prev = latest.get(r.sensor_id)
      if (!prev || prev.recorded_at < r.recorded_at) latest.set(r.sensor_id, r)
    }
    const latestRows = [...latest.values()].sort((a, b) => a.sensor_id.localeCompare(b.sensor_id))
    const alerts = latestRows.filter((r) => metricLevel(r.metric, r.value) !== 'normal')
    return { series, latestRows, alerts }
  }, [data, activeSegment])

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Sensor Monitoring"
        description={
          <span className="flex flex-wrap items-center gap-2">
            Vibration, water level, traffic density and surface condition per road segment.
            <SimulatedTag />
          </span>
        }
        actions={
          <>
            <select className="input w-auto py-1.5" value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Time window">
              <option value={12}>Last 12 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={48}>Last 48 hours</option>
            </select>
            <button className="btn-secondary btn-sm" onClick={() => void reload()} disabled={loading}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
            </button>
          </>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-100/90">
        <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <p>
          <strong className="text-amber-200">No physical sensors are connected.</strong> Readings are produced by a deterministic simulator
          (or seeded into the database) so the dashboard can be demonstrated. Real ESP32/Arduino nodes can later send readings to the{' '}
          <code className="font-mono">sensor_readings</code> table through a trusted API — see the About page.
        </p>
      </div>

      {loading && !data && <LoadingState label="Loading sensor readings…" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.readings.length === 0 && <EmptyState title="No sensor readings" description="Run the seed script to add simulated readings." />}

      {data && view && data.readings.length > 0 && (
        <div className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <label htmlFor="segment" className="text-sm text-slate-400">
                Road segment
              </label>
              <select id="segment" className="input w-full min-w-0 sm:w-auto sm:max-w-[320px]" value={activeSegment} onChange={(e) => setSegmentId(e.target.value)}>
                {data.segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500">Latest reading: {formatDateTime(data.latest)}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {SENSOR_METRICS.map((m) => {
              const cfg = SENSOR_METRIC_CONFIG[m]
              const rows = view.series[m]
              const last = rows[rows.length - 1]
              const level = last ? metricLevel(m, last.value) : 'normal'
              const chart = rows.map((r) => ({
                t: new Date(r.recorded_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
                v: r.value,
              }))
              return (
                <section key={m} className="panel">
                  <div className="panel-header">
                    <div className="min-w-0">
                      <h2 className="panel-title">{cfg.label}</h2>
                      <p className="truncate font-mono text-[11px] text-slate-500">{last?.sensor_id ?? '—'}</p>
                    </div>
                    {last && (
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-semibold tabular-nums text-slate-50">
                          {last.value}
                          <span className="ml-1 text-xs font-normal text-slate-400">{cfg.unit}</span>
                        </span>
                        <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize', LEVEL_STYLES[level])}>{level}</span>
                      </div>
                    )}
                  </div>
                  <div className="h-48 px-1 py-3">
                    {chart.length === 0 ? (
                      <EmptyState title="No readings for this segment" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chart} margin={{ left: -16, right: 12, top: 6 }}>
                          <CartesianGrid stroke="#1c2944" vertical={false} />
                          <XAxis dataKey="t" stroke="#64748b" fontSize={10} tickLine={false} minTickGap={24} />
                          <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[cfg.min, cfg.max]} />
                          <Tooltip {...tooltipStyle} formatter={(v) => [`${v} ${cfg.unit}`, cfg.label]} />
                          <ReferenceLine y={cfg.warning} stroke="#fbbf24" strokeDasharray="4 4" />
                          <ReferenceLine y={cfg.critical} stroke="#ef4444" strokeDasharray="4 4" />
                          <Line type="monotone" dataKey="v" stroke={cfg.color} strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <p className="border-t border-navy-700 px-4 py-2 text-[11px] text-slate-500">
                    Thresholds: warning {cfg.direction === 'above' ? '≥' : '≤'} {cfg.warning} {cfg.unit}, critical{' '}
                    {cfg.direction === 'above' ? '≥' : '≤'} {cfg.critical} {cfg.unit}. {cfg.description}
                  </p>
                </section>
              )
            })}
          </div>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">All sensors — latest readings</h2>
              <span className="text-xs text-slate-500">
                {view.alerts.length} sensor{view.alerts.length === 1 ? '' : 's'} above threshold
              </span>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[640px]">
                <thead className="sticky top-0 border-b border-navy-700 bg-navy-850">
                  <tr>
                    <th className="th">Sensor ID</th>
                    <th className="th">Road segment</th>
                    <th className="th">Metric</th>
                    <th className="th text-right">Value</th>
                    <th className="th">Level</th>
                    <th className="th">Measured at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/60">
                  {view.latestRows.map((r) => {
                    const level = metricLevel(r.metric, r.value)
                    return (
                      <tr key={r.sensor_id} className={cn('hover:bg-navy-800/50', r.segment_id === activeSegment && 'bg-cyan-500/5')}>
                        <td className="td font-mono text-xs text-slate-300">{r.sensor_id}</td>
                        <td className="td max-w-[220px] truncate text-slate-300">{data.segments.find((s) => s.id === r.segment_id)?.name ?? '—'}</td>
                        <td className="td text-slate-300">{SENSOR_METRIC_CONFIG[r.metric].label}</td>
                        <td className="td text-right tabular-nums text-slate-100">
                          {r.value} <span className="text-xs text-slate-500">{r.unit}</span>
                        </td>
                        <td className="td">
                          <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize', LEVEL_STYLES[level])}>{level}</span>
                        </td>
                        <td className="td whitespace-nowrap text-xs text-slate-400">{formatDateTime(r.recorded_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
          {segmentName && <p className="sr-only">Selected segment: {segmentName}</p>}
        </div>
      )}
    </div>
  )
}
