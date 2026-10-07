# API contract

Two APIs sit behind the app. Both are abstract classes with a mock (used now) and an HTTP client (used when
`environment.useMockApi` is `false`):

| | What | Owner | Code |
| --- | --- | --- | --- |
| **Panel API** | The existing Hitbullseye admin panel: clients, batches, student list (Excel uploads), logins | Hitbullseye admin panel team | `src/app/core/api/panel-api.ts`, `http-panel-api.ts` |
| **Portal API** | This portal's backend: campus config, registration gate, drafts, registrations, roster copy, status changes, audit | to be built | `src/app/core/api/portal-api.ts`, `http-portal-api.ts` |

The paths below are a **proposal**. When the real panel APIs are shared, only `http-panel-api.ts` changes.
Every data shape is in `src/app/core/models.ts`; request/response helpers in `src/app/core/api/api-types.ts`.
`src/app/core/api/mock/mock-portal-api.ts` is the reference implementation of every rule listed here.

## Conventions

- JSON in, JSON out. Dates are ISO-8601 strings.
- `status` is always `"active"` or `"inactive"`. Nothing is deleted: there are **no DELETE endpoints**.
- Errors: HTTP status + body `{ "code": "STABLE_CODE", "message": "Text the user can read", "data": { "field": "uid" } }`.
  The app shows `message` and switches on `code` (see the table at the end). `data.field` points the form at the right input.
- Auth: the portal backend issues its own session (cookie or bearer token) after a successful login. The app
  sends it with every call; the backend decides what the caller may see and change (see *Permissions*).

---

## 1. Panel API (what we need from the admin panel)

Base: `environment.panelApiBase` (default `/api/panel`).

### Read

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/clients` | `PanelClient[]` — every client, active and inactive |
| GET | `/batches` | `PanelBatch[]` — every batch of every client |
| GET | `/clients/{clientId}/batches` | `PanelBatch[]` |
| GET | `/clients/{clientId}/students?batchId=` | `PanelStudent[]` — the uploaded student list (`batchId` optional) |
| GET | `/admins` | `PanelAdmin[]` — placement-cell logins of every client |
| GET | `/clients/{clientId}/admins` | `PanelAdmin[]` |
| POST | `/auth/verify` | body `{ username, password }` → `PanelAuthResult` |

```ts
PanelClient  { clientId: "CL-1001", name, city?, status }
PanelBatch   { batchId: "B-1001-2026", clientId, name: "Batch 2026", passingYear?, status }
PanelStudent { studentRef, clientId, batchId, uid, email, name, department?, programme?, course?, session?, username, status }
PanelAdmin   { adminRef, clientId, name, email, username, status }
PanelAuthResult {
  ok: boolean, error?: string,
  role?: "student" | "college_admin",
  clientId?, batchId?, uid?, email?, name?,
  ref?            // studentRef or adminRef
}
```

Passwords never leave the panel. `/auth/verify` only says who the person is; the portal then checks that the
client has a portal, the client / batch / list row / login is active here, and lets them in.

### Sent back to the panel

| Method | Path | Body | When |
| --- | --- | --- | --- |
| POST | `/portal-events/registration` | `{ clientId, batchId, uid, email, regNo, registeredAt }` | A student submits the registration form |
| POST | `/portal-events/status` | `{ clientId, entity, ref, status, reason, at, by }` | Anything is made active / inactive in the portal |

`entity` is one of the *status entities* below; `ref` is that entity's id.

### Sync

There is no push from the panel yet, so the portal **pulls**: HQ presses *Sync* (Clients or Data & sync page), and
a new client's first sync runs when HQ sets it up. A scheduled job on the backend can call the same thing.
Per client: `GET /clients/{id}/students` + `GET /clients/{id}/admins` → `POST /campuses/{id}/roster/sync` +
`POST /admins/sync` on the portal → one `POST /sync-runs` entry.
If the panel can call a webhook when a list changes, the portal can sync that client at once.

---

## 2. Portal API (this portal's backend)

Base: `environment.portalApiBase` (default `/api/portal`).

### Configuration

| Method | Path | Body → Returns | Who |
| --- | --- | --- | --- |
| GET | `/brand` | → `BrandConfig` | anyone |
| GET | `/campuses` | → `CampusConfig[]` | anyone (public pages need branding, form and assessments) |
| POST | `/campuses` | `CampusConfig` → `CampusConfig` | HQ. `409 CAMPUS_EXISTS`, `409 CLIENT_TAKEN` |
| PUT | `/campuses/{id}` | `{ config: CampusConfig, note? }` → `CampusConfig` | HQ only (form, assessments, nomenclature, access codes, branding) |
| PUT | `/campuses/{id}/profile` | `{ name, shortName, campus, profile, estimates?: { [batchId]: number } }` → `CampusConfig` | that campus's placement cell, or HQ. A placement cell's `profile.nomenclature` is ignored |

`CampusConfig.batches` is keyed by `batchId`: `{ status, accessCode, estimated?, estimatedBy?, estimatedAt? }`.

### Registration gate

| Method | Path | Body → Returns |
| --- | --- | --- |
| POST | `/gate/check` | `{ campusId, accessCode, uid, email }` → `GateCheckResult` |
| POST | `/gate/otp/send` | `{ campusId, batchId, uid, email }` → `{ sentTo, resendSeconds, length, demoCode? }` |
| POST | `/gate/otp/verify` | `{ campusId, batchId, uid, email, code }` → `{ ok: true }` |
| POST | `/signups` | `{ campusId, batchId, uid, email, via: "otp" \| "credentials" }` |
| GET | `/signups?campusId=` | → `SignupMark[]` (for the "signed in" count) |

`/gate/check` in order: campus active (`CAMPUS_INACTIVE`) → code entered (`CODE_REQUIRED`) → code matches one of
the campus's batches (`BAD_CODE`) → that batch is open here and in the panel (`BATCH_CLOSED`) → the ID is on that
batch's list (`WRONG_BATCH` if it is on another batch, else `NOT_ON_LIST`) → list row active here and in the panel
(`STUDENT_INACTIVE`) → email matches the list (`EMAIL_MISMATCH`, message shows the masked email) → email not
registered anywhere on the platform (`ALREADY_REGISTERED`) → ID not registered at this campus (`ALREADY_REGISTERED`).
On success it says which batch, and whether a draft exists (`hasDraft`, `draftCompletion`).

OTP: 6 digits by default (`verification.otpLength`), valid 10 minutes, single use. `demoCode` is returned **only** in demo mode.

### Drafts

| Method | Path | Body → Returns |
| --- | --- | --- |
| GET | `/drafts/one?campusId=&batchId=&uid=` | → `Draft \| null` |
| PUT | `/drafts` | `Draft` → `Draft` (upsert by `key = campusId\|batchId\|uid`) |
| GET | `/drafts?campusId=` | → `Draft[]` (for the "half-filled" count) |

The app saves a draft in the browser at once and PUTs it about 0.7 s after the last keystroke. On load the newer
of the two (`updatedAt`) wins. A submitted draft gets `state: "submitted"`.

### Registrations

| Method | Path | Body → Returns |
| --- | --- | --- |
| POST | `/registrations` | `SubmitRegistrationRequest` → `Registration` |
| GET | `/registrations?campusId=&batchId=` | → `Registration[]` |
| GET | `/registrations/{id}` | → `Registration \| null` |
| GET | `/registrations/find?email=&campusId=&uid=` | → `Registration \| null` |
| PUT | `/registrations/{id}/results/{testId}` | `TestResult` |

`POST /registrations` repeats every gate check on the server (never trust the browser): campus and batch open,
on the list, active, email matches, **email not registered anywhere**, ID not registered here. It then creates
the registration number, closes the draft and the app sends `/portal-events/registration` to the panel.
The email must be unique across the whole platform — enforce it with a unique index, not only in code.

### Roster (the portal's copy of the panel's student list)

| Method | Path | Body → Returns |
| --- | --- | --- |
| GET | `/roster?campusId=&batchId=` | → `RosterEntry[]` |
| POST | `/campuses/{id}/roster/sync` | `{ rows: RosterEntry-without-status/key/syncedAt[] }` → `SyncSummary` |

Sync is an upsert by `campusId|batchId|uid`. A row that is no longer in the panel is **kept** and gets
`panelStatus: "inactive"` (counted as `deactivated`). The portal's own `status` (set by a placement cell) is
never overwritten by a sync.

### Placement-cell logins

| Method | Path | Body → Returns |
| --- | --- | --- |
| GET | `/admins?campusId=` | → `AdminAccess[]` |
| POST | `/admins/sync` | `{ rows: AdminAccess-without-status[] }` |
| POST | `/admins/{adminRef}/login` | — (last sign-in time) |

### Status changes — the only way anything goes away

`POST /status-changes` with `{ entity, campusId, id, status, reason }`.

| `entity` | `id` is | Placement cell may? |
| --- | --- | --- |
| `student` | registration id | yes |
| `roster` | roster key `campusId\|batchId\|uid` | yes |
| `department` | department name | yes |
| `spoc` | SPOC email | yes |
| `client` | campus id | HQ only |
| `batch` | batch id | HQ only |
| `admin` | adminRef | HQ only |
| `assessment` | test id | HQ only |
| `field` | form field id | HQ only (core fields cannot be switched off: `CORE_FIELD`) |
| `invoice` | invoice id — `inactive` means **cancelled** | HQ only |

Rules: `reason` is required (3+ characters) when making something inactive (`REASON_REQUIRED`); the last active
SPOC / assessment cannot be switched off (`LAST_ONE`); the change is stamped with `statusReason`, `statusAt`,
`statusBy`, written to the audit log, and the app sends `/portal-events/status` to the panel.
Core fields: `firstName`, `email`, `universityId`, `department`.

### HQ

| Method | Path | Body → Returns |
| --- | --- | --- |
| POST | `/hq/login` | `{ email, password }` → `{ name, email }`. `401 BAD_LOGIN`. HQ accounts are created on the backend, not in the app |
| GET | `/audit?campusId=` | → `AuditEntry[]` (placement cells: their own campus only) |
| POST | `/audit` | `{ campusId?, entity, entityId, entityLabel, action, details? }` |
| GET | `/sync-runs` | → `SyncRun[]` |
| POST | `/sync-runs` | `{ scope, clients, batches, added, updated, deactivated, ok, error? }` → `SyncRun` |

---

## Permissions

| Caller | May |
| --- | --- |
| Anyone | brand, campuses (public fields), gate, OTP, drafts and registration for their own verified `campusId\|batchId\|uid` |
| Student (session) | their own registration and results |
| Placement cell | read everything of **their** campus; `PUT /campuses/{id}/profile` (incl. estimates); status of `student`, `roster`, `department`, `spoc` |
| HQ | everything |

Wrong campus → `403 FORBIDDEN`. HQ-only action → `403 HQ_ONLY`.

The mock checks these rules on every **write**. Reads are not scoped in the mock (the app only ever asks for the
signed-in campus), so the backend must add that: a placement cell's `campusId` comes from its session, never from the query.

## Error codes

| HTTP | `code` | Meaning |
| --- | --- | --- |
| 400 | `CODE_REQUIRED` | No access code entered |
| 400 | `BAD_CODE` | Access code is not one of this campus's batches |
| 400 | `WRONG_BATCH` | ID is on another batch's list — use that batch's code |
| 400 | `EMAIL_MISMATCH` | Email does not match the list (message shows the masked email) |
| 400 | `OTP_NOT_SENT` / `OTP_EXPIRED` / `BAD_OTP` | OTP problems |
| 400 | `REASON_REQUIRED` | Making something inactive without a reason |
| 400 | `CORE_FIELD` | Tried to switch off a core form field |
| 400 | `LAST_ONE` | Would leave no active SPOC / assessment |
| 401 | `BAD_LOGIN` | Wrong HQ credentials |
| 403 | `CAMPUS_INACTIVE` | Client is inactive on the portal |
| 403 | `BATCH_CLOSED` | Batch inactive here or in the panel |
| 403 | `STUDENT_INACTIVE` | List row / student is inactive |
| 403 | `FORBIDDEN` | Not your campus |
| 403 | `HQ_ONLY` | Only HQ may do this |
| 404 | `NOT_ON_LIST` | ID is not on the campus list |
| 404 | `CAMPUS_NOT_FOUND` / `NOT_FOUND` | Unknown id |
| 409 | `ALREADY_REGISTERED` | Email already registered anywhere, or ID already registered here |
| 409 | `CAMPUS_EXISTS` / `CLIENT_TAKEN` | Setting up a client twice |
