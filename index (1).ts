export const INCIDENT_CATEGORIES = [
  'pothole',
  'accident',
  'waterlogging',
  'obstruction',
  'surface_damage',
  'other',
] as const
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number]

export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
export type Severity = (typeof SEVERITIES)[number]

export const INCIDENT_STATUSES = ['open', 'investigating', 'resolved', 'rejected'] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

export const REPORT_STATUSES = ['pending', 'approved', 'rejected'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export const ROAD_CONDITIONS = ['good', 'fair', 'poor', 'critical'] as const
export type RoadCondition = (typeof ROAD_CONDITIONS)[number]

export const SENSOR_METRICS = ['vibration', 'water_level', 'traffic_density', 'surface_condition'] as const
export type SensorMetric = (typeof SENSOR_METRICS)[number]

export interface RoadSegment {
  id: string
  name: string
  area: string
  latitude: number
  longitude: number
  length_km: number
  condition: RoadCondition
  last_inspected_at: string | null
  created_at: string
  updated_at: string
}

export interface Incident {
  id: string
  title: string
  category: IncidentCategory
  description: string
  location: string
  latitude: number | null
  longitude: number | null
  severity: Severity
  status: IncidentStatus
  segment_id: string | null
  source_report_id: string | null
  is_simulated: boolean
  created_at: string
  updated_at: string
}

export type IncidentInput = Pick<
  Incident,
  'title' | 'category' | 'description' | 'location' | 'latitude' | 'longitude' | 'severity' | 'status' | 'segment_id'
>

export interface IncidentHistoryEntry {
  id: string
  incident_id: string
  action: 'created' | 'updated' | 'deleted'
  changes: Record<string, { from: unknown; to: unknown }>
  actor: string | null
  created_at: string
}

export interface CitizenReport {
  id: string
  reference: string
  category: IncidentCategory
  location_description: string
  latitude: number | null
  longitude: number | null
  severity: Severity
  description: string
  photo_path: string | null
  status: ReportStatus
  reviewer_note: string | null
  reviewed_at: string | null
  incident_id: string | null
  created_at: string
  updated_at: string
}

export type CitizenReportInput = Pick<
  CitizenReport,
  'category' | 'location_description' | 'latitude' | 'longitude' | 'severity' | 'description'
>

export interface SensorReading {
  id: string
  sensor_id: string
  segment_id: string | null
  metric: SensorMetric
  value: number
  unit: string
  recorded_at: string
  is_simulated: boolean
}
