# ROADWATCH — Smart Road Monitoring System

ROADWATCH is an academic community-project prototype for recording, reviewing and visualising road hazards
(potholes, accidents, obstructions, waterlogging and damaged surfaces). Citizens submit reports, administrators
verify them, and verified incidents appear on a dashboard, an interactive map and an incident register.

> **Honesty note.** All incidents in the sample data and all sensor readings are **simulated**. No physical
> sensors, live traffic feed or AI detection model are connected. The UI labels this everywhere it applies.

## Features

| Page | What it does |
| --- | --- |
| Dashboard (`/`) | Statistics, incident trend, road-condition and category charts, recent reports, safety alerts, date/category filters |
| Road Map (`/map`) | Leaflet + OpenStreetMap, severity-coloured incident markers, road-segment condition rings, filters, legend, tile-failure fallback |
| Incidents (`/incidents`) | Search, filter, sort; admins can create, edit, update status/severity and delete (with confirmation); per-incident change history |
| Report an Issue (`/report`) | Public validated form with optional coordinates ("use my location") and optional photo; returns a reference ID; report stays private until reviewed |
| Sensor Monitoring (`/sensors`) | Vibration, water level, traffic density and surface condition per segment from a deterministic simulator, with thresholds and alert levels |
| Administration (`/admin`) | Review queue for citizen reports (approve → creates incident with assigned priority, or reject with a note), active-incident queue |
| About & Methodology (`/about`) | Problem, objectives, architecture, data model, proposed IoT/AI extensions, limitations |

## Tech stack

React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · React Router 6 · Lucide icons · Recharts · Leaflet / React-Leaflet
with OpenStreetMap tiles · Supabase (PostgreSQL, Auth, Storage, Row Level Security). Everything used is free.

## Two run modes

| Mode | When | Where data lives |
| --- | --- | --- |
| **Demo mode** | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not set | The current browser's `localStorage` only. A yellow **DEMO MODE** badge is shown. "Continue as demo administrator" unlocks admin screens in that browser — this is *not* security. Photos are previewed but not stored. Admin → "Reset demo data" restores the sample data. |
| **Connected mode** | Both variables are set | Supabase PostgreSQL. Admins sign in with Supabase Auth; all permissions are enforced in the database by RLS. A green **Connected to Supabase** badge is shown. |

## 1. Run locally

Requirements: Node.js 18+ (20 LTS recommended) and npm.

```bash
git clone <your-repo-url> roadwatch
cd roadwatch
npm install
npm run dev            # http://localhost:5173 (demo mode)
```

Other scripts:

```bash
npm run typecheck      # TypeScript, no emit
npm run lint           # ESLint
npm run build          # type-check + production build into dist/
npm run preview        # serve the production build locally
npm run seed:sql       # regenerate supabase/seed.sql from src/data/seed.ts
```

## 2. Set up Supabase (optional, for real persistence and login)

1. Create a free project at <https://supabase.com> → **New project**. Save the database password somewhere safe.
2. Open **SQL Editor**, paste the whole of `supabase/migrations/20261013000000_roadwatch_schema.sql` and click **Run**.
   This creates the enums, tables, indexes, triggers, RLS policies, RPC functions and the private `report-photos`
   storage bucket.
3. (Optional sample data) In the SQL Editor, run `supabase/seed.sql` (10 segments, 26 simulated incidents,
   3 pending reports, ~1,900 simulated sensor readings). Skip it for an empty production database.
4. Create an administrator:
   - **Authentication → Users → Add user** → enter email + password, tick "Auto confirm user".
   - In the SQL Editor run:
     ```sql
     insert into public.admins (user_id)
     select id from auth.users where email = 'admin@example.com';
     ```
   - Recommended: **Authentication → Providers → Email** → disable "Allow new users to sign up". Even if sign-up is
     left on, new users are not admins and cannot see reports or change data.
5. **Project Settings → API**: copy the *Project URL* and the *anon / public* key.
6. Create `.env.local` in the project root (it is git-ignored):
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
7. Restart `npm run dev`. The badge should now say **Connected to Supabase**.

**Never** put the `service_role` key (or any secret key) in a `VITE_` variable or in the repository — Vite embeds
`VITE_` variables in the public JavaScript bundle. The anon key is designed to be public; security comes from RLS.

### Using the Supabase CLI instead (local Docker)

```bash
npx supabase start     # applies supabase/migrations and supabase/seed.sql to a local stack
npx supabase status    # prints the local API URL and anon key for .env.local
npx supabase db push   # (with a linked remote project) applies the migration remotely
```

### Security model (what the database enforces)

| Role | Can do |
| --- | --- |
| Anonymous / any signed-in non-admin | Read road segments, incidents and sensor readings. Submit a citizen report **only** via the `submit_citizen_report` function (server-side validation, forced `pending` status, generated reference ID). Upload a photo only to `report-photos/pending/…` (≤ 5 MB, JPEG/PNG/WebP). See the pending-report *count* only. |
| Cannot | Read citizen reports or photos, read incident history, insert/update/delete any table, call approve/reject, add themselves to `admins`. |
| Admin (row in `public.admins`) | Everything above plus full incident CRUD, read/review reports via `approve_citizen_report` / `reject_citizen_report`, view photos via signed URLs, read history. |

These rules were exercised against a local Supabase stack with the anon key, a non-admin user and an admin user.

## 3. Push to GitHub

```bash
git add -A
git commit -m "ROADWATCH prototype"
git branch -M main
git remote add origin https://github.com/<you>/roadwatch.git
git push -u origin main
```

Check that `.env`, `.env.local` and `node_modules/` are **not** in the commit (they are in `.gitignore`).

## 4. Deploy to Vercel (free)

1. <https://vercel.com> → **Add New → Project** → import the GitHub repository.
2. Framework preset: **Vite** (build command `npm run build`, output directory `dist` — detected automatically).
3. **Environment Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (omit both to deploy in demo mode).
4. **Deploy**. `vercel.json` already rewrites all paths to `index.html` so routes such as `/map` work on refresh.
5. In Supabase → **Authentication → URL Configuration**, set *Site URL* to your Vercel URL.
6. Open the deployed URL and check: badge state, dashboard data, submitting a report, admin sign-in.

Netlify works too: build `npm run build`, publish `dist`, and add a rewrite `/* /index.html 200`.

## Project structure

```
src/
  components/      layout, reusable UI (badges, modal, feedback states), IncidentForm, IncidentDetail, AdminGate
  config/app.ts    labels, colours, thresholds, map centre — change these first
  context/         AuthContext (Supabase Auth or demo admin), ToastContext
  data/            seed.ts (sample data), sensorSimulator.ts (deterministic simulated readings)
  lib/             supabase client, helpers
  pages/           one file per route
  services/        DataService interface + demoService (localStorage) + supabaseService
  types/           domain types
supabase/
  migrations/      schema, RLS, functions, storage policies
  seed.sql         generated sample data (npm run seed:sql)
scripts/           seed SQL generator
```

All pages talk to `dataService` (`src/services/index.ts`), so a new backend only needs to implement `DataService`.

## Extending the prototype

- **ESP32/Arduino sensors**: nodes POST readings to a trusted endpoint (e.g. a Supabase Edge Function holding a
  per-device key) which inserts into `sensor_readings`. Never give devices the service-role key. Swap
  `getSensorReadings` in `supabaseService.ts` to read only real data, and subscribe with Supabase Realtime for live charts.
- **Pothole detection**: run a model (e.g. YOLO on dashcam frames) server-side; create incidents with a
  `detected_by_model` source and keep humans in the approval loop.
- **Notifications**: a database webhook / Edge Function on new critical incidents → email, SMS or Telegram.
- **Risk scoring**: compute per-segment scores from incident severity, recency and sensor alerts in a SQL view.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Badge still says DEMO MODE | Variables must be named exactly `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; restart the dev server or redeploy after changing them. |
| "permission denied" / empty admin lists | The signed-in user is not in `public.admins` (step 2.4). |
| Sign-in says "Email not confirmed" | Confirm the user in Supabase → Authentication → Users, or create it with "Auto confirm". |
| 404 on refresh in production | Make sure `vercel.json` (or the Netlify rewrite) is deployed. |
| Map tiles missing | OpenStreetMap tiles need internet access; the page shows a notice and markers/list still work. |
| `node: command not found` | Install Node.js 20 LTS (e.g. via nvm). |

## Limitations

Prototype only: simulated sensor data, no real-time device ingestion, no AI model, demo mode has no real
authentication, OpenStreetMap public tiles are subject to their usage policy (fine for demos, not heavy traffic).
