import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Props {
  label: string
  value: number | string
  icon: LucideIcon
  tone?: 'cyan' | 'green' | 'amber' | 'red' | 'slate'
  hint?: string
}

const TONES = {
  cyan: 'text-cyan-400 bg-cyan-400/10',
  green: 'text-emerald-400 bg-emerald-400/10',
  amber: 'text-amber-400 bg-amber-400/10',
  red: 'text-red-400 bg-red-400/10',
  slate: 'text-slate-300 bg-slate-400/10',
}

export function StatCard({ label, value, icon: Icon, tone = 'cyan', hint }: Props) {
  return (
    <div className="panel flex items-center gap-3 px-4 py-3">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-400">{label}</p>
        <p className="text-2xl font-semibold tabular-nums text-slate-50">{value}</p>
        {hint && <p className="truncate text-[11px] text-slate-500">{hint}</p>}
      </div>
    </div>
  )
}
