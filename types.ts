import type {
  CitizenReport,
  CitizenReportInput,
  Incident,
  IncidentHistoryEntry,
  IncidentInput,
  RoadSegment,
  SensorReading,
  Severity,
} from '../types'

export interface SensorReadingsResult {
  readings: SensorReading[]
  /** Timestamp of the most recent reading in the result. */
  latest: string | null
}

/** All data access goes through this interface so pages never talk to storage directly. */
export interface DataService {
  readonly mode: 'demo' | 'supabase'
  listIncidents(): Promise<Incident[]>
  createIncident(input: IncidentInput): Promise<Incident>
  updateIncident(id: string, patch: Partial<IncidentInput>): Promise<Incident>
  deleteIncident(id: string): Promise<void>
  listIncidentHistory(incidentId: string): Promise<IncidentHistoryEntry[]>
  listRoadSegments(): Promise<RoadSegment[]>
  listSensorReadings(hours: number): Promise<SensorReadingsResult>
  submitCitizenReport(input: CitizenReportInput, photo: File | null): Promise<{ reference: string; photoStored: boolean }>
  /** Admin only. */
  listCitizenReports(): Promise<CitizenReport[]>
  /** Public: number of reports awaiting review (no report contents). */
  pendingReportCount(): Promise<number>
  /** Admin only. Creates an incident from the report and marks it approved. */
  approveReport(id: string, opts: { title: string; severity: Severity }): Promise<Incident>
  /** Admin only. */
  rejectReport(id: string, note: string): Promise<void>
  /** Admin only. Returns a temporary URL for a report photo, if any. */
  getReportPhotoUrl(path: string): Promise<string | null>
}
