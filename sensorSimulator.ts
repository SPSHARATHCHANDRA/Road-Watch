/**
 * Deterministic SIMULATED sensor data generator.
 *
 * No real sensors are connected. Each road segment is given a virtual sensor node with four channels.
 * Values depend only on (sensor id, hour bucket), so the same hour always produces the same reading.
 *
 * To integrate real hardware later, have devices (e.g. ESP32) POST readings to a trusted backend
 * (Supabase Edge Function or other API) that inserts rows into `sensor_readings`. The UI already reads
 * from that table when Supabase is configured.
 */
import { SENSOR_METRIC_CONFIG } from '../config/app'
import { hashString, seededRandom } from '../lib/utils'
import type { RoadCondition, RoadSegment, SensorMetric, SensorReading } from '../types'
import { SENSOR_METRICS } from '../types'

const METRIC_CODE: Record<SensorMetric, string> = {
  vibration: 'VIB',
  water_level: 'WTR',
  traffic_density: 'TRF',
  surface_condition: 'SRF',
}

const CONDITION_FACTOR: Record<RoadCondition, number> = { good: 0, fair: 0.33, poor: 0.66, critical: 1 }

export interface SimSegment {
  id: string
  condition: RoadCondition
  index: number
}

export function sensorIdFor(segmentIndex: number, metric: SensorMetric) {
  return `RW-NODE-${String(segmentIndex + 1).padStart(2, '0')}-${METRIC_CODE[metric]}`
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function valueFor(seg: SimSegment, metric: SensorMetric, bucket: number): number {
  const rand = seededRandom(hashString(`${seg.id}:${metric}:${bucket}`))
  const hourOfDay = new Date(bucket * 3600_000).getHours()
  const cf = CONDITION_FACTOR[seg.condition]
  const noise = rand() - 0.5
  const cfg = SENSOR_METRIC_CONFIG[metric]
  let v: number
  switch (metric) {
    case 'vibration': {
      const spike = rand() < 0.04 + cf * 0.1 ? 0.5 + rand() * 0.6 : 0
      v = 0.25 + cf * 0.55 + noise * 0.2 + spike
      break
    }
    case 'water_level': {
      // Simulated rain events: a deterministic "storm" window every ~31 hours, stronger on poorly drained roads.
      const stormPhase = (bucket + seg.index * 7) % 31
      const storm = stormPhase < 5 ? Math.sin((stormPhase / 5) * Math.PI) * (6 + cf * 24) : 0
      v = Math.max(0, storm + noise * 2 + cf * 1.5)
      break
    }
    case 'traffic_density': {
      const morning = Math.exp(-((hourOfDay - 9) ** 2) / 4)
      const evening = Math.exp(-((hourOfDay - 18.5) ** 2) / 5)
      const night = hourOfDay < 6 ? -10 : 0
      v = 18 + (morning + evening) * (38 + seg.index * 1.5) + noise * 8 + night
      break
    }
    case 'surface_condition': {
      v = 88 - cf * 52 + noise * 6
      break
    }
  }
  return +clamp(v, cfg.min, cfg.max).toFixed(metric === 'vibration' ? 2 : 1)
}

export function simulateReadings(segments: Pick<RoadSegment, 'id' | 'condition'>[], hours = 48, now = Date.now()): SensorReading[] {
  const currentBucket = Math.floor(now / 3600_000)
  const out: SensorReading[] = []
  segments.forEach((s, index) => {
    const seg: SimSegment = { id: s.id, condition: s.condition, index }
    for (const metric of SENSOR_METRICS) {
      const sensor_id = sensorIdFor(index, metric)
      for (let h = hours - 1; h >= 0; h--) {
        const bucket = currentBucket - h
        out.push({
          id: `${sensor_id}-${bucket}`,
          sensor_id,
          segment_id: s.id,
          metric,
          value: valueFor(seg, metric, bucket),
          unit: SENSOR_METRIC_CONFIG[metric].unit,
          recorded_at: new Date(bucket * 3600_000).toISOString(),
          is_simulated: true,
        })
      }
    }
  })
  return out
}
