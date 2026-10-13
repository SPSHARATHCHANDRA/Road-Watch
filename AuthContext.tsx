import type { User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

const DEMO_ADMIN_KEY = 'roadwatch-demo-admin'

interface AuthState {
  mode: 'demo' | 'supabase'
  user: User | null
  isAdmin: boolean
  loading: boolean
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  /** Demo mode only: unlock admin screens locally (no real security — see README). */
  enterDemoAdmin(): void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(() => !supabase && sessionStorage.getItem(DEMO_ADMIN_KEY) === '1')
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    const db = supabase
    let cancelled = false

    async function apply(u: User | null) {
      setUser(u)
      if (!u) {
        setIsAdmin(false)
        setLoading(false)
        return
      }
      const { data, error } = await db.rpc('is_admin')
      if (!cancelled) {
        setIsAdmin(!error && data === true)
        setLoading(false)
      }
    }

    db.auth.getSession().then(({ data }) => apply(data.session?.user ?? null))
    const { data: sub } = db.auth.onAuthStateChange((_e, session) => {
      // Defer to avoid calling Supabase inside the auth callback.
      setTimeout(() => void apply(session?.user ?? null), 0)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }, [])

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut()
    } else {
      sessionStorage.removeItem(DEMO_ADMIN_KEY)
      setIsAdmin(false)
    }
  }, [])

  const enterDemoAdmin = useCallback(() => {
    if (supabase) return
    sessionStorage.setItem(DEMO_ADMIN_KEY, '1')
    setIsAdmin(true)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ mode: supabase ? 'supabase' : 'demo', user, isAdmin, loading, signIn, signOut, enterDemoAdmin }),
    [user, isAdmin, loading, signIn, signOut, enterDemoAdmin],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
