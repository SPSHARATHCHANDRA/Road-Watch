import { ArrowRight, CheckCircle2, CircleDashed } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader } from '../components/ui/PageHeader'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">{title}</h2>
      </div>
      <div className="space-y-3 px-4 py-4 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  )
}

const IMPLEMENTED = [
  'Dashboard with statistics, charts, date and category filters',
  'Interactive Leaflet/OpenStreetMap map with severity markers, filters, legend and tile-failure fallback',
  'Incident management: create, view, edit, delete (with confirmation), search, filter, sort, status/severity changes, change history',
  'Public citizen-report form with validation, reference IDs and pending-review workflow',
  'Administrator review: approve (creates incident) or reject reports, prioritise and update incidents',
  'Supabase PostgreSQL schema with Row Level Security, admin-only policies and a validated submission function',
  'Demo mode (browser storage) when no database is configured',
  'Sensor monitoring page using a deterministic simulator / seeded readings',
]

const PROPOSED = [
  'ESP32/Arduino sensor nodes (accelerometer, ultrasonic water level, vehicle counter) posting to a secured ingest API',
  'Real-time updates via Supabase Realtime subscriptions',
  'AI-assisted pothole detection from citizen photos (e.g. a YOLO model run offline or in a server function)',
  'Road-condition classification and risk scoring per segment',
  'Notifications (email/SMS/push) for critical incidents',
  'GPS-based reporting from a mobile app, duplicate-report detection, rate limiting / CAPTCHA',
]

const FLOW = ['Citizen submits report', 'Stored as “pending” (private)', 'Admin reviews', 'Approved → incident created', 'Incident tracked to resolution']

const TABLES: [string, string][] = [
  ['road_segments', 'Monitored road stretches: name, area, coordinates, length, condition, last inspection.'],
  ['incidents', 'Verified incidents: category, severity, status, location, optional coordinates, link to segment and source report.'],
  ['citizen_reports', 'Public submissions (private to admins): reference ID, details, optional photo path, review status.'],
  ['sensor_readings', 'Time-series readings: sensor ID, segment, metric, value, unit, timestamp, simulated flag.'],
  ['incident_history', 'Audit log written by a database trigger on every incident insert/update.'],
  ['admins', 'User IDs of administrator accounts (managed only from the Supabase dashboard).'],
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl animate-fade-in space-y-5">
      <PageHeader title="About & Methodology" description="ROADWATCH is an academic community-project prototype." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="The road-safety problem">
          <p>
            Potholes, waterlogging, obstructions and damaged surfaces cause accidents, vehicle damage and traffic congestion. Reports are often
            scattered across phone calls and social media, so problems are fixed late and there is little data to prioritise repairs.
          </p>
        </Section>
        <Section title="Project objectives">
          <ul className="list-disc space-y-1 pl-5">
            <li>Provide one place to record and track road hazards.</li>
            <li>Let citizens report issues easily, with administrator verification.</li>
            <li>Visualise incidents on a map and summarise trends for decision-making.</li>
            <li>Prepare a data model for future low-cost IoT sensors and image-based detection.</li>
          </ul>
        </Section>
      </div>

      <Section title="System architecture">
        <div className="grid gap-3 text-center text-xs sm:grid-cols-3">
          <div className="rounded-lg border border-navy-600 bg-navy-900 p-3">
            <p className="font-semibold text-cyan-300">Frontend</p>
            <p className="mt-1 text-slate-400">React + TypeScript + Vite, Tailwind CSS, Recharts, Leaflet/OpenStreetMap. Hosted as a static site (e.g. Vercel).</p>
          </div>
          <div className="rounded-lg border border-navy-600 bg-navy-900 p-3">
            <p className="font-semibold text-cyan-300">Data service layer</p>
            <p className="mt-1 text-slate-400">
              <code>src/services</code> — one interface, two implementations: Supabase (production) and browser storage (demo mode).
            </p>
          </div>
          <div className="rounded-lg border border-navy-600 bg-navy-900 p-3">
            <p className="font-semibold text-cyan-300">Supabase</p>
            <p className="mt-1 text-slate-400">PostgreSQL with Row Level Security, Auth for administrators, Storage for report photos.</p>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          The browser only holds the public <em>anon</em> key. All permissions are enforced inside the database: anonymous users can read public
          incident/segment/sensor data and submit reports through a validating function, but cannot read reports or change incidents.
        </p>
      </Section>

      <Section title="How reports flow through the system">
        <div className="flex flex-wrap items-center gap-2">
          {FLOW.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className="rounded-lg border border-navy-600 bg-navy-900 px-3 py-1.5 text-xs text-slate-200">{s}</span>
              {i < FLOW.length - 1 && <ArrowRight className="h-4 w-4 text-cyan-400" />}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Database design">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <tbody className="divide-y divide-navy-700/60">
              {TABLES.map(([t, d]) => (
                <tr key={t}>
                  <td className="td whitespace-nowrap font-mono text-xs text-cyan-300">{t}</td>
                  <td className="td text-slate-300">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400">All tables use UUID primary keys and timestamps. See <code>supabase/migrations</code> in the repository.</p>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Proposed IoT integration (not implemented)">
          <p>
            Each road segment would get a low-cost node (ESP32 + MPU-6050 accelerometer, HC-SR04 ultrasonic sensor, IR vehicle counter). Nodes
            would send readings over Wi-Fi/GSM via HTTPS (or MQTT through a broker) to a server-side function holding a per-device secret, which
            validates and inserts rows into <code>sensor_readings</code>. Devices would never receive database admin keys.
          </p>
          <p className="text-xs text-amber-300/90">Currently all sensor readings are simulated.</p>
        </Section>
        <Section title="Planned AI-assisted pothole detection (not implemented)">
          <p>
            Citizen photos could be passed through an object-detection model (e.g. YOLO trained on a public pothole dataset) to suggest a category
            and severity to administrators. The model output would only assist — an administrator would still verify each report.
          </p>
        </Section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Implemented in this prototype">
          <ul className="space-y-1.5">
            {IMPLEMENTED.map((s) => (
              <li key={s} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                {s}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Future development roadmap">
          <ul className="space-y-1.5">
            {PROPOSED.map((s) => (
              <li key={s} className="flex gap-2">
                <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                {s}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Current prototype limitations">
        <ul className="list-disc space-y-1 pl-5">
          <li>No physical sensors are connected; sensor data is simulated.</li>
          <li>Sample incidents and road-segment conditions are fictional, placed at well-known Bengaluru roads as example locations.</li>
          <li>The map shows stored records only; it is not a live traffic feed.</li>
          <li>In demo mode, data lives only in the current browser and admin mode has no real security.</li>
          <li>Public submissions are not yet rate-limited or protected by CAPTCHA.</li>
          <li>Road segments are shown as points, not full road geometry.</li>
        </ul>
      </Section>
    </div>
  )
}
