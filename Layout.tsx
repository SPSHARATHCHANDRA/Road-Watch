import { Activity, Info, LayoutDashboard, ListChecks, LogIn, LogOut, Map, Menu, MessageSquarePlus, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { APP_NAME, APP_SUBTITLE } from '../../config/app'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/map', label: 'Road Map', icon: Map },
  { to: '/incidents', label: 'Incidents', icon: ListChecks },
  { to: '/report', label: 'Report an Issue', icon: MessageSquarePlus },
  { to: '/sensors', label: 'Sensor Monitoring', icon: Activity },
  { to: '/admin', label: 'Administration', icon: ShieldCheck },
  { to: '/about', label: 'About & Methodology', icon: Info },
]

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-1">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-[0.18em] text-slate-50">{APP_NAME}</p>
        <p className="text-[11px] text-slate-400">{APP_SUBTITLE}</p>
      </div>
    </Link>
  )
}

function ModeBadge() {
  const { mode } = useAuth()
  return mode === 'demo' ? (
    <span
      title="No database connected. Data is stored only in this browser (localStorage)."
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-300"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      DEMO MODE · browser storage only
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      Connected to Supabase
    </span>
  )
}

function AuthButton() {
  const { isAdmin, user, signOut, mode } = useAuth()
  if (isAdmin || user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-slate-400 md:inline">
          {mode === 'demo' ? 'Demo administrator' : user?.email}
          {mode === 'supabase' && !isAdmin && ' (not admin)'}
        </span>
        <button className="btn-secondary btn-sm" onClick={() => void signOut()}>
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    )
  }
  return (
    <Link to="/login" className="btn-secondary btn-sm">
      <LogIn className="h-3.5 w-3.5" /> Admin sign in
    </Link>
  )
}

export function Layout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setOpen(false)
  }

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive ? 'bg-cyan-500/10 font-medium text-cyan-300' : 'text-slate-400 hover:bg-navy-800 hover:text-slate-200',
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-navy-700 bg-navy-950 px-3 py-5 lg:flex">
        <Brand />
        {nav}
        <div className="mt-auto rounded-lg border border-navy-700 bg-navy-900 p-3 text-[11px] leading-relaxed text-slate-500">
          Academic prototype. Sample incidents and sensor readings are simulated.
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-[1200] lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 animate-fade-in flex-col gap-6 border-r border-navy-700 bg-navy-950 px-3 py-5">
            <div className="flex items-center justify-between">
              <Brand />
              <button className="btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-4 w-4" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[1000] flex items-center gap-3 border-b border-navy-700 bg-navy-900/90 px-4 py-2.5 backdrop-blur">
          <button className="btn-ghost btn-sm lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden">
            <p className="text-sm font-bold tracking-[0.18em] text-slate-50">{APP_NAME}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block">
              <ModeBadge />
            </div>
            <AuthButton />
          </div>
        </header>
        <div className="border-b border-navy-700 bg-navy-900 px-4 py-1.5 sm:hidden">
          <ModeBadge />
        </div>
        <main className="flex-1 px-4 py-5 md:px-6 lg:px-8">
          <Outlet />
        </main>
        <footer className="border-t border-navy-700 px-4 py-3 text-center text-xs text-slate-500 md:px-6">
          {APP_NAME} · {APP_SUBTITLE} · Community Project Prototype
        </footer>
      </div>
    </div>
  )
}
