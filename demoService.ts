/**
 * DEMO MODE data service. Everything is stored in this browser's localStorage.
 * Nothing is sent to a server. Clearing site data (or "Reset demo data") restores the seed.
 */
import { buildSeed } from '../data/seed'
import { simulateReadings } from '../data/sensorSimulator'
import { uuid } from '../lib/utils'
import type { CitizenReport, Incident, IncidentHistoryEntry, RoadSegment } from '../types'
import type { DataService } from './types'

const STORAGE_KEY = 'roadwatch-demo-v1'

interface DemoStore {
  version: 1
  segments: RoadSegment[]
  incidents: Incident[]
  reports: CitizenReport[]
  history: IncidentHistoryEntry[]
}

function freshStore(): DemoStore {
  const { segments, incidents, reports } = buildSeed()
  const history: IncidentHistoryEntry[] = incidents.map((i) => ({
    id: uuid(),
    incident_id: i.id,
    action: 'created',
    changes: {},
    actor: 'seed',
    created_at: i.created_at,
  }))
  return { version: 1, segments, incidents, reports, history }
}

function load(): DemoStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoStore
      if (parsed.version === 1) return parsed
    }
  } catch {
    /* fall through to a fresh seed */
  }
  const s = freshStore()
  save(s)
  return s
}

function save(s: DemoStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms))
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

function diff(before: Incident, after: Incident) {
  const changes: IncidentHistoryEntry['changes'] = {}
  for (const k of ['title', 'category', 'description', 'location', 'latitude', 'longitude', 'severity', 'status', 'segment_id'] as const) {
    if (before[k] !== after[k]) changes[k] = { from: before[k], to: after[k] }
  }
  return changes
}

function referenceId() {
  const d = new Date()
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `RW-${ymd}-${uuid().replace(/-/g, '').slice(0, 5).toUpperCase()}`
}

export function resetDemoData() {
  save(freshStore())
}

export const demoService: DataService = {
  mode: 'demo',

  async listIncidents() {
    await delay()
    return clone(load().incidents).sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  async createIncident(input) {
    await delay()
    const s = load()
    const now = new Date().toISOString()
    const inc: Incident = {
      ...input,
      title: input.title.trim(),
      description: input.description.trim(),
      location: input.location.trim(),
      id: uuid(),
      source_report_id: null,
      is_simulated: false,
      created_at: now,
      updated_at: now,
    }
    s.incidents.push(inc)
    s.history.push({ id: uuid(), incident_id: inc.id, action: 'created', changes: {}, actor: 'demo-admin', created_at: now })
    save(s)
    return clone(inc)
  },

  async updateIncident(id, patch) {
    await delay()
    const s = load()
    const idx = s.incidents.findIndex((i) => i.id === id)
    if (idx < 0) throw new Error('Incident not found')
    const before = s.incidents[idx]
    const after: Incident = { ...before, ...patch, updated_at: new Date().toISOString() }
    const changes = diff(before, after)
    s.incidents[idx] = after
    if (Object.keys(changes).length) {
      s.history.push({ id: uuid(), incident_id: id, action: 'updated', changes, actor: 'demo-admin', created_at: after.updated_at })
    }
    save(s)
    return clone(after)
  },

  async deleteIncident(id) {
    await delay()
    const s = load()
    s.incidents = s.incidents.filter((i) => i.id !== id)
    s.history = s.history.filter((h) => h.incident_id !== id)
    s.reports = s.reports.map((r) => (r.incident_id === id ? { ...r, incident_id: null } : r))
    save(s)
  },

  async listIncidentHistory(incidentId) {
    await delay(80)
    return clone(load().history.filter((h) => h.incident_id === incidentId)).sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  async listRoadSegments() {
    await delay()
    return clone(load().segments)
  },

  async listSensorReadings(hours) {
    await delay()
    const readings = simulateReadings(load().segments, hours)
    return { readings, latest: readings.length ? readings[readings.length - 1].recorded_at : null }
  },

  async submitCitizenReport(input) {
    await delay(300)
    const s = load()
    const now = new Date().toISOString()
    const report: CitizenReport = {
      ...input,
      location_description: input.location_description.trim(),
      description: input.description.trim(),
      id: uuid(),
      reference: referenceId(),
      photo_path: null,
      status: 'pending',
      reviewer_note: null,
      reviewed_at: null,
      incident_id: null,
      created_at: now,
      updated_at: now,
    }
    s.reports.push(report)
    save(s)
    return { reference: report.reference, photoStored: false }
  },

  async listCitizenReports() {
    await delay()
    return clone(load().reports).sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  async pendingReportCount() {
    await delay(50)
    return load().reports.filter((r) => r.status === 'pending').length
  },

  async approveReport(id, { title, severity }) {
    const s = load()
    const r = s.reports.find((x) => x.id === id)
    if (!r) throw new Error('Report not found')
    if (r.status !== 'pending') throw new Error('Report has already been reviewed')
    const inc = await demoService.createIncident({
      title,
      category: r.category,
      description: r.description,
      location: r.location_description,
      latitude: r.latitude,
      longitude: r.longitude,
      severity,
      status: 'open',
      segment_id: null,
    })
    const s2 = load()
    const now = new Date().toISOString()
    s2.incidents = s2.incidents.map((i) => (i.id === inc.id ? { ...i, source_report_id: r.id } : i))
    s2.reports = s2.reports.map((x) =>
      x.id === id ? { ...x, status: 'approved', incident_id: inc.id, reviewed_at: now, updated_at: now } : x,
    )
    save(s2)
    return { ...inc, source_report_id: r.id }
  },

  async rejectReport(id, note) {
    await delay()
    const s = load()
    const r = s.reports.find((x) => x.id === id)
    if (!r) throw new Error('Report not found')
    if (r.status !== 'pending') throw new Error('Report has already been reviewed')
    const now = new Date().toISOString()
    s.reports = s.reports.map((x) =>
      x.id === id ? { ...x, status: 'rejected', reviewer_note: note.trim() || null, reviewed_at: now, updated_at: now } : x,
    )
    save(s)
  },

  async getReportPhotoUrl() {
    return null
  },
}
