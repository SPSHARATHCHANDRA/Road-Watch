import { LogIn, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Field } from '../components/ui/Field'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/utils'

export default function LoginPage() {
  const { mode, isAdmin, user, signIn, enterDemoAdmin } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (isAdmin) return <Navigate to="/admin" replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    setBusy(true)
    try {
      await signIn(email.trim(), password)
      navigate('/admin')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm animate-fade-in py-10">
      <div className="panel p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-50">Administrator sign in</h1>
            <p className="text-xs text-slate-400">Manage incidents and review citizen reports</p>
          </div>
        </div>

        {mode === 'demo' ? (
          <div className="space-y-4">
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-200">
              No database is connected, so there are no real accounts. Demo administrator mode unlocks the admin screens in
              this browser only. It provides <strong>no security</strong> — real access control is enforced by Supabase Auth and
              Row Level Security once the database is configured.
            </p>
            <button
              className="btn-primary w-full"
              onClick={() => {
                enterDemoAdmin()
                navigate('/admin')
              }}
            >
              <LogIn className="h-4 w-4" /> Continue as demo administrator
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            {user && !isAdmin && (
              <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
                Signed in as {user.email}, but this account is not an administrator.
              </p>
            )}
            <Field label="Email" htmlFor="email" required>
              <input id="email" type="email" autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" htmlFor="password" required>
              <input id="password" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {error && (
              <p className="text-xs text-red-400" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              <LogIn className="h-4 w-4" /> {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="text-center text-[11px] text-slate-500">Administrator accounts are created by the project team in Supabase.</p>
          </form>
        )}
      </div>
    </div>
  )
}
