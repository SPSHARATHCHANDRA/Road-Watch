import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="font-mono text-sm text-cyan-400">404</p>
      <h1 className="text-xl font-semibold text-slate-100">Page not found</h1>
      <Link to="/" className="btn-primary">
        Back to dashboard
      </Link>
    </div>
  )
}
