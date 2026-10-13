import { AlertTriangle, Layers } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from 'react-leaflet'
import { IncidentDetail } from '../components/IncidentDetail'
import { CategoryLabel, ConditionBadge, SeverityBadge, SimulatedTag, StatusBadge } from '../components/ui/Badges'
import { ErrorState, LoadingState } from '../components/ui/Feedback'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import {
  CATEGORY_LABELS,
  CONDITION_COLORS,
  CONDITION_LABELS,
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  SEVERITY_RANK,
  STATUS_LABELS,
} from '../config/app'
import { useAsync } from '../hooks'
import { cn, timeAgo } from '../lib/utils'
import { dataService } from '../services'
import { INCIDENT_CATEGORIES, INCIDENT_STATUSES, ROAD_CONDITIONS, SEVERITIES, type Incident } from '../types'

export default function MapPage() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [incidents, segments] = await Promise.all([dataService.listIncidents(), dataService.listRoadSegments()])
    return { incidents, segments }
  })
  const [category, setCategory] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [status, setStatus] = useState('active')
  const [showSegments, setShowSegments] = useState(true)
  const [tileErrors, setTileErrors] = useState(0)
  const [selected, setSelected] = useState<Incident | null>(null)

  const incidents = useMemo(() => {
    if (!data) return []
    return data.incidents
      .filter(
        (i) =>
          i.latitude !== null &&
          i.longitude !== null &&
          (category === 'all' || i.category === category) &&
          (severity === 'all' || i.severity === severity) &&
          (status === 'all' || (status === 'active' ? i.status === 'open' || i.status === 'investigating' : i.status === status)),
      )
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
  }, [data, category, severity, status])

  const tilesFailed = tileErrors >= 4
  const anySimulated = incidents.some((i) => i.is_simulated)
  const missingCoords = data ? data.incidents.filter((i) => i.latitude === null).length : 0

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Interactive Road Map"
        description={
          <span className="flex flex-wrap items-center gap-2">
            Incident markers and monitored road segments. Not a live feed.
            {anySimulated && <SimulatedTag label="SIMULATED SAMPLE INCIDENTS" />}
          </span>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <select className="input sm:w-44" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter category">
          <option value="all">All categories</option>
          {INCIDENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select className="input sm:w-40" value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Filter severity">
          <option value="all">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABELS[s]}
            </option>
          ))}
        </select>
        <select className="input sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status">
          <option value="active">Active (open + investigating)</option>
          <option value="all">All statuses</option>
          {INCIDENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" className="h-4 w-4 accent-cyan-500" checked={showSegments} onChange={(e) => setShowSegments(e.target.checked)} />
          Show road segments
        </label>
        <span className="col-span-2 text-xs text-slate-500 sm:ml-auto">
          {incidents.length} incident{incidents.length === 1 ? '' : 's'} on map
          {missingCoords > 0 && ` · ${missingCoords} without coordinates`}
        </span>
      </div>

      {loading && !data && <LoadingState label="Loading map data…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="panel relative h-[60vh] min-h-[380px] overflow-hidden">
            <MapContainer center={MAP_DEFAULT_CENTER} zoom={MAP_DEFAULT_ZOOM} className="h-full w-full" scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="map-tiles-dark"
                eventHandlers={{
                  tileerror: () => setTileErrors((n) => n + 1),
                  tileload: () => setTileErrors(0),
                }}
              />
              {showSegments &&
                data.segments.map((s) => (
                  <CircleMarker
                    key={s.id}
                    center={[s.latitude, s.longitude]}
                    radius={14}
                    pathOptions={{ color: CONDITION_COLORS[s.condition], weight: 2, fillOpacity: 0.08, dashArray: '4 4' }}
                  >
                    <Tooltip direction="top">{s.name}</Tooltip>
                    <Popup>
                      <div className="space-y-1.5 text-sm">
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-xs text-slate-400">
                          {s.area} · {s.length_km} km
                        </p>
                        <ConditionBadge condition={s.condition} />
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              {incidents.map((i) => (
                <CircleMarker
                  key={i.id}
                  center={[i.latitude!, i.longitude!]}
                  radius={i.severity === 'critical' ? 9 : i.severity === 'high' ? 8 : 6.5}
                  pathOptions={{ color: '#0b1220', weight: 1.5, fillColor: SEVERITY_COLORS[i.severity], fillOpacity: 0.95 }}
                >
                  <Popup>
                    <div className="w-60 space-y-2 text-sm">
                      <p className="font-semibold leading-snug">{i.title}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <SeverityBadge severity={i.severity} />
                        <StatusBadge status={i.status} />
                      </div>
                      <p className="text-xs text-slate-300">
                        <CategoryLabel category={i.category} /> · {i.location}
                      </p>
                      <p className="line-clamp-3 text-xs text-slate-400">{i.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">{timeAgo(i.created_at)}</span>
                        {i.is_simulated && <SimulatedTag label="SIMULATED" />}
                      </div>
                      <button className="btn-secondary btn-sm w-full" onClick={() => setSelected(i)}>
                        View full details
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>

            {tilesFailed && (
              <div className="absolute inset-x-3 top-3 z-[500] flex items-start gap-2 rounded-lg border border-amber-400/40 bg-navy-900/95 p-3 text-xs text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Map tiles could not be loaded.</p>
                  <p className="text-amber-200/80">
                    You may be offline or the OpenStreetMap tile server is unavailable. Markers are still shown on a blank background, and
                    every incident is listed in the panel.
                  </p>
                  <button className="mt-1.5 underline" onClick={() => setTileErrors(0)}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div className="absolute bottom-3 left-3 z-[500] rounded-lg border border-navy-600 bg-navy-900/95 p-3 text-xs shadow-lg">
              <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-slate-200">
                <Layers className="h-3.5 w-3.5 text-cyan-400" /> Legend
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {SEVERITIES.map((s) => (
                  <span key={s} className="flex items-center gap-1.5 text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEVERITY_COLORS[s] }} />
                    {SEVERITY_LABELS[s]}
                  </span>
                ))}
              </div>
              {showSegments && (
                <div className="mt-2 border-t border-navy-700 pt-2">
                  <p className="mb-1 text-slate-400">Road segment condition</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {ROAD_CONDITIONS.map((c) => (
                      <span key={c} className="flex items-center gap-1.5 text-slate-300">
                        <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed" style={{ borderColor: CONDITION_COLORS[c] }} />
                        {CONDITION_LABELS[c]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="panel flex max-h-[60vh] min-h-[300px] flex-col">
            <div className="panel-header">
              <h2 className="panel-title">Incidents on map</h2>
              <span className="text-xs text-slate-500">{incidents.length}</span>
            </div>
            <ul className="flex-1 divide-y divide-navy-700/60 overflow-y-auto">
              {incidents.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">No incidents match the filters.</li>}
              {[...incidents].reverse().map((i) => (
                <li key={i.id}>
                  <button className={cn('w-full px-4 py-2.5 text-left hover:bg-navy-800/60')} onClick={() => setSelected(i)}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SEVERITY_COLORS[i.severity] }} />
                      <span className="truncate text-sm font-medium text-slate-100">{i.title}</span>
                    </div>
                    <p className="truncate pl-[18px] text-xs text-slate-500">
                      {CATEGORY_LABELS[i.category]} · {STATUS_LABELS[i.status]} · {i.location}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      <Modal open={selected !== null} title="Incident details" size="lg" onClose={() => setSelected(null)}>
        {selected && <IncidentDetail incident={selected} />}
      </Modal>
    </div>
  )
}
