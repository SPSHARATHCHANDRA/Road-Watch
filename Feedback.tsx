import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-12 text-sm text-slate-400', className)} role="status">
      <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
      {label}
    </div>
  )
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-10 text-center', className)} role="alert">
      <AlertTriangle className="h-6 w-6 text-red-400" />
      <div>
        <p className="text-sm font-medium text-slate-200">Could not load data</p>
        <p className="mt-1 max-w-md text-xs text-slate-400">{message}</p>
      </div>
      {onRetry && (
        <button className="btn-secondary btn-sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, description, action, className }: { title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-10 text-center', className)}>
      <Inbox className="h-6 w-6 text-slate-500" />
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description && <p className="max-w-sm text-xs text-slate-500">{description}</p>}
      {action}
    </div>
  )
}
