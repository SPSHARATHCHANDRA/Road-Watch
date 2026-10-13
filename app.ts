import type { IncidentCategory, IncidentStatus, ReportStatus, RoadCondition, SensorMetric, Severity } from '../types'

export const APP_NAME = 'ROADWATCH'
export const APP_SUBTITLE = 'Smart Road Monitoring System'

/**
 * Map defaults. The sample road segments are example locations in Bengaluru, India.
 * Change these (and the seed data) to your own city if needed.
 */
export const MAP_DEFAULT_CENTER: [number, number] = [12.9716, 77.5946]
export const MAP_DEFAULT_ZOOM = 12

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  pothole: 'Pothole',
  accident: 'Accident',
  waterlogging: 'Waterlogging',
  obstruction: 'Road obstruction',
  surface_damage: 'Damaged road surface',
  other: 'Other',
}

export const CATEGORY_COLORS: Record<IncidentCategory, string> = {
  pothole: '#22d3ee',
  accident: '#f87171',
  waterlogging: '#60a5fa',
  obstruction: '#fbbf24',
  surface_damage: '#a78bfa',
  other: '#94a3b8',
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const SEVERITY_COLORS: Record<Severity, string> = {
  low: '#34d399',
  medium: '#fbbf24',
  high: '#fb923c',
  critical: '#ef4444',
}

export const SEVERITY_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 }

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: 'Open',
  investigating: 'Investigating',
  resolved: 'Resolved',
  rejected: 'Rejected',
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const CONDITION_LABELS: Record<RoadCondition, string> = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  critical: 'Critical',
}

export const CONDITION_COLORS: Record<RoadCondition, string> = {
  good: '#34d399',
  fair: '#a3e635',
  poor: '#fbbf24',
  critical: '#ef4444',
}

export interface MetricConfig {
  label: string
  unit: string
  /** 'above' = higher values are worse; 'below' = lower values are worse */
  direction: 'above' | 'below'
  warning: number
  critical: number
  min: number
  max: number
  color: string
  description: string
}

export const SENSOR_METRIC_CONFIG: Record<SensorMetric, MetricConfig> = {
  vibration: {
    label: 'Vibration',
    unit: 'g',
    direction: 'above',
    warning: 0.8,
    critical: 1.4,
    min: 0,
    max: 2,
    color: '#22d3ee',
    description: 'Peak vertical acceleration from an accelerometer (e.g. MPU-6050). Spikes can indicate potholes.',
  },
  water_level: {
    label: 'Water level',
    unit: 'cm',
    direction: 'above',
    warning: 10,
    critical: 25,
    min: 0,
    max: 40,
    color: '#60a5fa',
    description: 'Standing water depth from an ultrasonic sensor (e.g. HC-SR04) mounted above the road edge.',
  },
  traffic_density: {
    label: 'Traffic density',
    unit: 'veh/min',
    direction: 'above',
    warning: 45,
    critical: 65,
    min: 0,
    max: 90,
    color: '#a78bfa',
    description: 'Vehicles counted per minute (e.g. IR beam / loop counter).',
  },
  surface_condition: {
    label: 'Surface condition',
    unit: 'index',
    direction: 'below',
    warning: 60,
    critical: 40,
    min: 0,
    max: 100,
    color: '#34d399',
    description: 'Road-surface quality index 0–100 (100 = perfect), derived from vibration history.',
  },
}

export function metricLevel(metric: SensorMetric, value: number): 'normal' | 'warning' | 'critical' {
  const c = SENSOR_METRIC_CONFIG[metric]
  if (c.direction === 'above') {
    if (value >= c.critical) return 'critical'
    if (value >= c.warning) return 'warning'
    return 'normal'
  }
  if (value <= c.critical) return 'critical'
  if (value <= c.warning) return 'warning'
  return 'normal'
}
