import { CATEGORY_LABELS, CONDITION_COLORS, CONDITION_LABELS, REPORT_STATUS_LABELS, SEVERITY_COLORS, SEVERITY_LABELS, STATUS_LABELS } from '../../config/app'
import { cn } from '../../lib/utils'
import type { IncidentCategory, IncidentStatus, ReportStatus, RoadCondition, Severity } from '../../types'

function Pill({ color, children, className }: { color: string; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', className)}
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Pill color={SEVERITY_COLORS[severity]}>{SEVERITY_LABELS[severity]}</Pill>
}

const STATUS_COLORS: Record<IncidentStatus, string> = {
  open: '#22d3ee',
  investigating: '#fbbf24',
  resolved: '#34d399',
  rejected: '#94a3b8',
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <Pill color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Pill>
}

const REPORT_COLORS: Record<ReportStatus, string> = { pending: '#fbbf24', approved: '#34d399', rejected: '#94a3b8' }

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <Pill color={REPORT_COLORS[status]}>{REPORT_STATUS_LABELS[status]}</Pill>
}

export function ConditionBadge({ condition }: { condition: RoadCondition }) {
  return <Pill color={CONDITION_COLORS[condition]}>{CONDITION_LABELS[condition]}</Pill>
}

export function CategoryLabel({ category }: { category: IncidentCategory }) {
  return <span className="text-slate-300">{CATEGORY_LABELS[category]}</span>
}

export function SimulatedTag({ label = 'SIMULATED DEMO DATA', className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider text-amber-300',
        className,
      )}
    >
      {label}
    </span>
  )
}
