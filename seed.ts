/**
 * SIMULATED DEMO DATA.
 * Road segments use approximate coordinates of well-known roads in Bengaluru, India, purely as
 * example locations. Incidents and citizen reports are fictional and flagged `is_simulated`.
 * The same records are written to supabase/seed.sql by `npm run seed:sql`.
 */
import type { CitizenReport, Incident, IncidentCategory, IncidentStatus, RoadCondition, RoadSegment, Severity } from '../types'

const segId = (n: number) => `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const incId = (n: number) => `b0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const repId = (n: number) => `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`

type SegmentSeed = [name: string, area: string, lat: number, lng: number, lengthKm: number, condition: RoadCondition, inspectedDaysAgo: number]

export const SEGMENT_SEEDS: SegmentSeed[] = [
  ['MG Road (Trinity Circle – Anil Kumble Circle)', 'Central', 12.9755, 77.6068, 1.8, 'fair', 12],
  ['Outer Ring Road – Marathahalli', 'East', 12.9568, 77.701, 3.2, 'poor', 30],
  ['Hosur Road – Silk Board Junction', 'South-East', 12.9172, 77.6229, 2.5, 'critical', 45],
  ['Bannerghatta Road – Jayadeva', 'South', 12.918, 77.5996, 2.1, 'fair', 20],
  ['Tumkur Road – Yeshwanthpur', 'North-West', 13.0285, 77.5409, 2.8, 'poor', 38],
  ['Old Airport Road – HAL', 'East', 12.9583, 77.648, 2.0, 'good', 6],
  ['Bellary Road – Hebbal', 'North', 13.0358, 77.597, 2.4, 'fair', 15],
  ['Mysore Road – Satellite Bus Stand', 'South-West', 12.953, 77.544, 2.6, 'poor', 52],
  ['Kanakapura Road – Banashankari', 'South', 12.9255, 77.5468, 1.9, 'good', 9],
  ['Whitefield Main Road – ITPL', 'East', 12.9857, 77.7362, 2.2, 'fair', 25],
]

type IncidentSeed = [
  segment: number,
  category: IncidentCategory,
  severity: Severity,
  status: IncidentStatus,
  hoursAgo: number,
  title: string,
  description: string,
  dLat: number,
  dLng: number,
]

export const INCIDENT_SEEDS: IncidentSeed[] = [
  [3, 'pothole', 'critical', 'open', 5, 'Deep pothole cluster near flyover ramp', 'Three adjacent potholes roughly 15 cm deep on the left lane. Two-wheelers swerving into traffic.', 0.0012, -0.0008],
  [3, 'waterlogging', 'high', 'investigating', 30, 'Waterlogging under Silk Board flyover', 'Standing water up to ankle depth after evening rain; drain inlet appears blocked.', -0.0006, 0.0011],
  [2, 'accident', 'high', 'resolved', 52, 'Two-wheeler skid near service road', 'Rider skidded on loose gravel. Minor injuries; debris cleared by traffic police.', 0.0009, 0.0014],
  [2, 'surface_damage', 'medium', 'open', 76, 'Surface cracking on outer lane', 'Alligator cracking over ~40 m stretch. Risk of potholes forming in monsoon.', -0.0015, -0.0012],
  [5, 'obstruction', 'medium', 'resolved', 98, 'Fallen tree branch blocking lane', 'Large branch blocking one lane after strong winds. Removed by BBMP crew.', 0.0007, 0.001],
  [8, 'waterlogging', 'critical', 'open', 11, 'Severe waterlogging at bus stand entry', 'Water depth estimated above 25 cm; buses diverted. Requires pumping.', 0.001, -0.0009],
  [8, 'pothole', 'high', 'investigating', 140, 'Pothole at pedestrian crossing', 'Pothole on zebra crossing; pedestrians forced onto road.', -0.0011, 0.0006],
  [1, 'pothole', 'low', 'resolved', 210, 'Small pothole near metro pillar', 'Shallow pothole reported near pillar 143. Patched.', 0.0004, -0.0013],
  [4, 'accident', 'critical', 'investigating', 20, 'Car–bus collision at junction', 'Collision at signal junction; one lane blocked. Signal timing review requested.', -0.0008, -0.001],
  [4, 'surface_damage', 'medium', 'open', 260, 'Uneven patchwork on carriageway', 'Repeated patchwork has left a raised uneven surface causing vehicles to brake suddenly.', 0.0013, 0.0007],
  [5, 'pothole', 'high', 'open', 44, 'Pothole series on service road', 'Series of 5–6 potholes along 100 m service road near metro station.', -0.0012, 0.0015],
  [7, 'obstruction', 'low', 'resolved', 330, 'Construction debris on shoulder', 'Debris from private construction dumped on road shoulder.', 0.0006, 0.0012],
  [7, 'waterlogging', 'medium', 'resolved', 400, 'Water pooling at underpass', 'Shallow pooling at underpass after rain. Drain cleaned.', -0.0009, -0.0006],
  [10, 'pothole', 'medium', 'open', 66, 'Pothole near ITPL main gate', 'Medium pothole on left lane near entry gate, visible at night only with headlights.', 0.0011, -0.0011],
  [10, 'accident', 'medium', 'resolved', 520, 'Minor rear-end collision', 'Rear-end collision during peak hour; no injuries.', -0.0007, 0.0009],
  [6, 'other', 'low', 'rejected', 600, 'Faded lane markings', 'Lane markings faded near HAL junction. Forwarded to markings maintenance (not a hazard).', 0.0008, -0.0007],
  [9, 'surface_damage', 'low', 'open', 700, 'Minor surface ravelling', 'Loose aggregate on surface near bus stop.', -0.0005, 0.0012],
  [3, 'obstruction', 'high', 'resolved', 820, 'Broken-down truck in middle lane', 'Heavy truck breakdown causing long queue. Towed after 2 hours.', 0.0016, 0.0004],
  [2, 'waterlogging', 'high', 'resolved', 980, 'Flooded stretch near lake outlet', 'Overflow from storm drain flooded two lanes.', 0.0003, -0.0016],
  [1, 'accident', 'low', 'resolved', 1150, 'Auto-rickshaw scrape', 'Minor scrape between auto-rickshaw and car; cleared quickly.', -0.0004, 0.0009],
  [5, 'surface_damage', 'high', 'investigating', 1300, 'Road cave-in near drain cover', 'Partial cave-in around manhole cover; barricaded.', 0.0014, -0.0005],
  [8, 'obstruction', 'medium', 'open', 1500, 'Abandoned vehicle on carriageway', 'Abandoned car occupying part of the left lane for several days.', -0.0013, -0.0014],
  [4, 'pothole', 'medium', 'resolved', 1750, 'Pothole near hospital entrance', 'Pothole near ambulance entry; patched as priority.', 0.0005, 0.0013],
  [7, 'pothole', 'critical', 'resolved', 1950, 'Large pothole on flyover', 'Large pothole on flyover deck; lane closed until repaired.', 0.001, 0.0002],
  [2, 'pothole', 'medium', 'open', 150, 'Pothole near bus bay', 'Pothole at bus bay causing buses to stop in the main lane.', 0.0018, 0.0009],
  [3, 'surface_damage', 'high', 'open', 90, 'Rutting on heavy-vehicle lane', 'Deep rutting observed on the heavy-vehicle lane approaching the junction.', -0.0017, -0.0003],
]

type ReportSeed = [category: IncidentCategory, location: string, lat: number | null, lng: number | null, severity: Severity, description: string, hoursAgo: number]

export const REPORT_SEEDS: ReportSeed[] = [
  ['pothole', 'Kanakapura Road, opposite Banashankari temple bus stop', 12.9262, 77.5475, 'high', 'Large pothole on the left lane. Several bikes nearly fell this morning.', 3],
  ['waterlogging', 'Whitefield Main Road near Hope Farm signal', null, null, 'medium', 'Water collects every time it rains, about ankle deep near the footpath.', 9],
  ['obstruction', 'Old Airport Road service lane near HAL museum', 12.9591, 77.6472, 'low', 'Pile of sand and bricks left on the service lane for a week.', 26],
]

function hoursAgoIso(now: number, hours: number) {
  return new Date(now - hours * 3600_000).toISOString()
}

export function buildSeed(now = Date.now()) {
  const segments: RoadSegment[] = SEGMENT_SEEDS.map(([name, area, latitude, longitude, length_km, condition, d], i) => ({
    id: segId(i + 1),
    name,
    area,
    latitude,
    longitude,
    length_km,
    condition,
    last_inspected_at: hoursAgoIso(now, d * 24),
    created_at: hoursAgoIso(now, 24 * 120),
    updated_at: hoursAgoIso(now, d * 24),
  }))

  const incidents: Incident[] = INCIDENT_SEEDS.map(([seg, category, severity, status, h, title, description, dLat, dLng], i) => {
    const s = segments[seg - 1]
    const resolvedLater = status === 'resolved' || status === 'rejected' ? Math.max(1, Math.round(h * 0.6)) : h * 0.8
    return {
      id: incId(i + 1),
      title,
      category,
      description,
      location: s.name,
      latitude: +(s.latitude + dLat).toFixed(6),
      longitude: +(s.longitude + dLng).toFixed(6),
      severity,
      status,
      segment_id: s.id,
      source_report_id: null,
      is_simulated: true,
      created_at: hoursAgoIso(now, h),
      updated_at: hoursAgoIso(now, Math.min(h, resolvedLater)),
    }
  })

  const reports: CitizenReport[] = REPORT_SEEDS.map(([category, location_description, latitude, longitude, severity, description, h], i) => ({
    id: repId(i + 1),
    reference: `RW-DEMO-${String(i + 1).padStart(4, '0')}`,
    category,
    location_description,
    latitude,
    longitude,
    severity,
    description,
    photo_path: null,
    status: 'pending',
    reviewer_note: null,
    reviewed_at: null,
    incident_id: null,
    created_at: hoursAgoIso(now, h),
    updated_at: hoursAgoIso(now, h),
  }))

  return { segments, incidents, reports }
}
