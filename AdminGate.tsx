import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingState } from './ui/Feedback'

/** UI convenience only. Real authorization is enforced by database RLS policies in Supabase mode. */
export function AdminGate({ children }: { children: ReactNode }) {
  const { isAdmin, loading, user, mode } = useAuth()
  if (loading) return <LoadingState label="Checking access…" />
  if (isAdmin) return <>{children}</>
  return (
    <div className="panel mx-auto mt-8 flex max-w-md flex-col items-center gap-3 px-6 py-10 text-center">
      <Lock className="h-6 w-6 text-cyan-400" />
      <h2 className="text-base font-semibold text-slate-100">Administrator access required</h2>
      <p className="text-sm text-slate-400">
        {user && mode === 'supabase'
          ? 'Your account is signed in but is not listed as an administrator.'
          : 'Sign in with an administrator account to review citizen reports and manage incidents.'}
      </p>
      {!user && (
        <Link to="/login" className="btn-primary">
          Go to sign in
        </Link>
      )}
    </div>
  )
}
