/**
 * Supabase data service. Authorization is enforced by Row Level Security and SECURITY DEFINER
 * functions in supabase/migrations — the frontend only uses the public anon key.
 */
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { uuid } from '../lib/utils'
import type { CitizenReport, Incident, IncidentHistoryEntry, RoadSegment, SensorReading } from '../types'
import type { DataService } from './types'

const PHOTO_BUCKET = 'report-photos'
const PAGE = 1000

function check<T>(res: { data: T | null; error: PostgrestError | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export function createSupabaseService(db: SupabaseClient): DataService {
  return {
    mode: 'supabase',

    async listIncidents() {
      return check(await db.from('incidents').select('*').order('created_at', { ascending: false })) as Incident[]
    },

    async createIncident(input) {
      return check(await db.from('incidents').insert(input).select().single()) as Incident
    },

    async updateIncident(id, patch) {
      return check(await db.from('incidents').update(patch).eq('id', id).select().single()) as Incident
    },

    async deleteIncident(id) {
      const { error, count } = await db.from('incidents').delete({ count: 'exact' }).eq('id', id)
      if (error) throw new Error(error.message)
      if (count === 0) throw new Error('Incident was not deleted (missing permission or already removed)')
    },

    async listIncidentHistory(incidentId) {
      return check(
        await db.from('incident_history').select('*').eq('incident_id', incidentId).order('created_at', { ascending: false }),
      ) as IncidentHistoryEntry[]
    },

    async listRoadSegments() {
      return check(await db.from('road_segments').select('*').order('name')) as RoadSegment[]
    },

    async listSensorReadings(hours) {
      const latestRows = check(
        await db.from('sensor_readings').select('recorded_at').order('recorded_at', { ascending: false }).limit(1),
      ) as { recorded_at: string }[]
      if (!latestRows.length) return { readings: [], latest: null }
      const latest = latestRows[0].recorded_at
      const since = new Date(new Date(latest).getTime() - hours * 3600_000).toISOString()
      const readings: SensorReading[] = []
      for (let from = 0; ; from += PAGE) {
        const page = check(
          await db
            .from('sensor_readings')
            .select('*')
            .gt('recorded_at', since)
            .order('recorded_at', { ascending: true })
            .order('id')
            .range(from, from + PAGE - 1),
        ) as SensorReading[]
        readings.push(...page.map((r) => ({ ...r, value: Number(r.value) })))
        if (page.length < PAGE) break
      }
      return { readings, latest }
    },

    async submitCitizenReport(input, photo) {
      let photoPath: string | null = null
      if (photo) {
        const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg'
        photoPath = `pending/${uuid()}.${ext}`
        const { error } = await db.storage.from(PHOTO_BUCKET).upload(photoPath, photo, { contentType: photo.type, upsert: false })
        if (error) throw new Error(`Photo upload failed: ${error.message}`)
      }
      const reference = check(
        await db.rpc('submit_citizen_report', {
          p_category: input.category,
          p_location_description: input.location_description,
          p_latitude: input.latitude,
          p_longitude: input.longitude,
          p_severity: input.severity,
          p_description: input.description,
          p_photo_path: photoPath,
        }),
      ) as string
      return { reference, photoStored: photoPath !== null }
    },

    async listCitizenReports() {
      return check(await db.from('citizen_reports').select('*').order('created_at', { ascending: false })) as CitizenReport[]
    },

    async pendingReportCount() {
      return Number(check(await db.rpc('pending_report_count')))
    },

    async approveReport(id, { title, severity }) {
      const incidentId = check(
        await db.rpc('approve_citizen_report', { p_report_id: id, p_title: title, p_severity: severity }),
      ) as string
      return check(await db.from('incidents').select('*').eq('id', incidentId).single()) as Incident
    },

    async rejectReport(id, note) {
      check(await db.rpc('reject_citizen_report', { p_report_id: id, p_note: note }))
    },

    async getReportPhotoUrl(path) {
      const { data, error } = await db.storage.from(PHOTO_BUCKET).createSignedUrl(path, 300)
      if (error) return null
      return data.signedUrl
    },
  }
}
