# Hitbullseye Campus — Angular app

The campus onboarding and assessment portal, rebuilt in **Angular 19.2.0 + Bootstrap 5.3.3**.
The plain HTML prototype in the repository root stays as it is; this folder is the real app.

It has three parts:

| Part | Who | Where |
| --- | --- | --- |
| **Registration** | Students on their college's list | `/c/:campus` → verify → register (drafts auto-saved) → thank you |
| **Reports** | Students, placement cells, HQ | `/me`, `/me/report`, `/console/report/:id`, Analytics, Insights |
| **Login** | Students and placement cells (admin-panel credentials), HQ (separate account) | `/login`, `/hq/login` |

---

## Run it

```bash
cd app
npm install
npm start              # http://localhost:4200
npm run build          # production build → dist/hitbullseye-campus/browser
```

Node 18.19+, 20.11+ or 22 is needed. The build is a static single-page app: serve `dist/hitbullseye-campus/browser`
and send every unknown path to `index.html` (SPA fallback), otherwise deep links like `/console/roster` give a 404.

Right now the app runs on **mock APIs inside the browser** (`useMockApi: true` in `src/environments/`).
Everything is saved in `localStorage` (prefix `hbc1.`). **HQ → Data & sync → Reset demo data** starts again from the seed.

## Demo logins

| Who | Username | Password |
| --- | --- | --- |
| HQ (super admin) | `super@demo.com` at `/hq/login` | `super@123` |
| Placement cell | `placement@chitkara.demo` (also `lpu`, `upes`, `thapar`, `amity`) | `admin@123` |
| Registered student | University ID or email, e.g. `2210991201` | `student@123` |
| Student on the list, not registered yet | e.g. `2310991301` (Chitkara, Batch 2027) | `student@123` → goes straight to the form |

Batch access codes for the registration gate: 2026 — `CHI123Y` `LPU123X` `UPES26K` `THA26TP` `AMI26CRC`;
2027 — `CHI27NX` `LPU27NX` `UPES27N` `THA27PF` `AMI27CRC`. The Verify page also lists demo IDs, and in demo mode the OTP is filled in for you.

`CL-1006 Chandigarh University` exists only in the (mock) admin panel: HQ → Clients → **Set up portal** shows how a new client comes in.

---

## The rules (enforced by the server — the mock does the same)

- **Credentials come from the Hitbullseye admin panel.** The portal sends username + password to the panel,
  gets back who it is (role, client id, batch id, University ID), and lets them in only if that matches a
  campus, batch and list row here that are all active.
- **Batch-wise.** Each batch has its own access code. A student can only register in the batch their list row is in.
- **Only students on the list can register.** The list is the student list uploaded (from Excel) in the admin
  panel, pulled in by **Sync**.
- **One email = one registration across the whole platform.**
- **Nothing is ever deleted.** Students, list rows, clients, batches, logins, assessments, form fields,
  departments, SPOCs and invoices are made **inactive** with a reason (invoices: cancelled). Every change is
  in the Activity log and is sent back to the admin panel.
- **Drafts.** A half-filled form is saved in the browser at once and on the server shortly after; the newer copy wins.
- **Who can change what.**

| | Placement cell (college admin) | HQ (super admin) |
| --- | --- | --- |
| Registration form, assessments, nomenclature | view only | edit |
| Campus profile, SPOCs, departments | edit | edit |
| Estimated students per batch | **fills it** | edit |
| Access codes | view / copy | edit |
| Make a student / list row / department / SPOC inactive | yes | yes |
| Make a client / batch / login / assessment / field / invoice inactive | — | yes |
| Clients, Data & sync, Engine pages | — | yes |

## Pages

**Public:** Welcome · Verify (access code + University ID + email → OTP) · Register (draft, review, declaration) · Thank you · Login · HQ login

**Student (`/me`):** Dashboard · Assessments · Quick practice · Report (overview, progress, per-test)

**Console (`/console`):**
Clients (HQ) · Analytics (funnel: estimated → on list → signed in → registered → attempted) · Insights ·
Students · Master list · Batches & logins · Commercial · Profile · Form builder (view-only for colleges) ·
Activity · Data & sync (HQ) · Engine (HQ)

A super admin picks any campus and any batch at the top; a placement cell sees only their own campus.

---

## Code map

```
src/app/
  core/
    models.ts                 every data shape
    api/
      panel-api.ts            the Hitbullseye admin panel (abstract)
      portal-api.ts           this portal's backend (abstract)
      http-*.ts               real HTTP clients — the only files to touch when the APIs arrive
      mock/                   in-browser mock server + seed data (same rules as the real one)
      api.providers.ts        picks mock or HTTP from environment.useMockApi
    services/                 auth, campus, sync, drafts, status changes, people/funnel, …
    analytics/                test platform (papers, simulation, grading) + wrappers for the report engine
  features/
    public/ student/ console/ one standalone component per page
  shared/                     icons, status badge, dialogs, toasts, chart and legacy-report hosts
src/legacy/hb-*.js            the report engine (hitbullseye-reports), unchanged from the prototype
src/styles/                   Bootstrap theme + page styles; legacy-scoped.css is generated
tools/scope-legacy-css.mjs    npm run scope-css — rebuilds legacy-scoped.css from ../css
docs/API.md                   the API contract
```

### Going live

1. Share the real admin-panel APIs → adjust paths/fields in `core/api/http-panel-api.ts` only.
2. Build the portal backend from `docs/API.md` (the mock in `core/api/mock/mock-portal-api.ts` is the reference for every rule).
3. Set `useMockApi: false` and `demoMode: false` in `src/environments/environment.prod.ts`, and the API base URLs.
4. Move the "new client" template (`campusTemplate` in `mock/seed.ts`) to the backend.
5. Replace the simulated test data (`TestPlatformService.world()`) with the analytics API; the report engine stays as is.
