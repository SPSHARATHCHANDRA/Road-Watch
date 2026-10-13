import { INCIDENT_CATEGORIES, INCIDENT_STATUSES, SEVERITIES } from '../types'
import type { CitizenReportInput, IncidentInput } from '../types'

export type FieldErrors<T> = Partial<Record<keyof T, string>>

/** Parses an optional coordinate string. Returns undefined when invalid. */
export function parseCoordinate(raw: string, kind: 'lat' | 'lng'): number | null | undefined {
  const s = raw.trim()
  if (s === '') return null
  if (!/^-?\d+(\.\d+)?$/.test(s)) return undefined
  const n = Number(s)
  const limit = kind === 'lat' ? 90 : 180
  return n >= -limit && n <= limit ? n : undefined
}

function checkCoords<T extends { latitude: number | null; longitude: number | null }>(v: T, errors: FieldErrors<T>) {
  if ((v.latitude === null) !== (v.longitude === null)) {
    const msg = 'Provide both latitude and longitude, or leave both empty'
    if (v.latitude === null) errors.latitude = msg as never
    else errors.longitude = msg as never
  }
}

export function validateIncident(v: IncidentInput): FieldErrors<IncidentInput> {
  const e: FieldErrors<IncidentInput> = {}
  const title = v.title.trim()
  if (title.length < 3) e.title = 'Title must be at least 3 characters'
  else if (title.length > 150) e.title = 'Title must be at most 150 characters'
  if (!INCIDENT_CATEGORIES.includes(v.category)) e.category = 'Select a category'
  if (v.description.trim().length > 2000) e.description = 'Description must be at most 2000 characters'
  const loc = v.location.trim()
  if (loc.length < 3) e.location = 'Location is required (min. 3 characters)'
  else if (loc.length > 300) e.location = 'Location must be at most 300 characters'
  if (!SEVERITIES.includes(v.severity)) e.severity = 'Select a severity'
  if (!INCIDENT_STATUSES.includes(v.status)) e.status = 'Select a status'
  checkCoords(v, e)
  return e
}

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function validateReport(v: CitizenReportInput, photo: File | null): FieldErrors<CitizenReportInput & { photo: string }> {
  const e: FieldErrors<CitizenReportInput & { photo: string }> = {}
  if (!INCIDENT_CATEGORIES.includes(v.category)) e.category = 'Select a category'
  const loc = v.location_description.trim()
  if (loc.length < 5) e.location_description = 'Describe the location (min. 5 characters)'
  else if (loc.length > 300) e.location_description = 'Location must be at most 300 characters'
  if (!SEVERITIES.includes(v.severity)) e.severity = 'Select a severity'
  const d = v.description.trim()
  if (d.length < 10) e.description = 'Description must be at least 10 characters'
  else if (d.length > 2000) e.description = 'Description must be at most 2000 characters'
  checkCoords(v, e)
  if (photo) {
    if (!PHOTO_TYPES.includes(photo.type)) e.photo = 'Photo must be a JPEG, PNG or WebP image'
    else if (photo.size > PHOTO_MAX_BYTES) e.photo = 'Photo must be smaller than 5 MB'
  }
  return e
}

export function hasErrors(e: object) {
  return Object.keys(e).length > 0
}
