/* =====================================================================
   Domain model for the campus portal.

   Two systems feed it:
     PANEL  - the existing Hitbullseye admin panel. Owns clients, batches,
              the student list (uploaded there from Excel) and every login
              credential. We only read it (and push a few events back).
     PORTAL - this app's own backend. Owns how each campus looks and asks
              (config, form, assessments, access codes), registrations,
              drafts, statuses and the audit log.

   Nothing is ever deleted. Every record that can go away carries a
   `status` instead; "inactive" hides it and blocks it, and the change is
   written to the audit log with who did it and why.
   ===================================================================== */

export type Status = 'active' | 'inactive';
export type Role = 'student' | 'college_admin' | 'super_admin';

/** Who changed a status, and why. Carried on every record that can be switched off. */
export interface StatusInfo {
  status: Status;
  statusReason?: string;
  statusAt?: string;
  statusBy?: string;
}

/* ---------------------------------------------------------------------
   PANEL (read from the Hitbullseye admin panel API)
   --------------------------------------------------------------------- */
export interface PanelClient {
  clientId: string;        // e.g. "CL-1001"
  name: string;
  city?: string;
  status: Status;
}

export interface PanelBatch {
  batchId: string;         // e.g. "B-CU-2026"
  clientId: string;
  name: string;            // "Batch 2026"
  passingYear?: number;
  status: Status;
}

/** One row of the student list a campus uploaded (from Excel) in the admin panel. */
export interface PanelStudent {
  studentRef: string;      // panel's own id
  clientId: string;
  batchId: string;
  uid: string;             // University ID / roll number
  email: string;
  name: string;
  department?: string;
  programme?: string;
  course?: string;
  session?: string;
  username: string;        // login id created by the panel
  status: Status;
}

export interface PanelAdmin {
  adminRef: string;
  clientId: string;
  name: string;
  email: string;
  username: string;
  status: Status;
}

/** What the panel says after it checks a username + password. */
export interface PanelAuthResult {
  ok: boolean;
  error?: string;
  role?: 'student' | 'college_admin';
  clientId?: string;
  batchId?: string;
  uid?: string;
  email?: string;
  name?: string;
  ref?: string;            // studentRef / adminRef
}

/* ---------------------------------------------------------------------
   PORTAL — campus configuration (one per client)
   --------------------------------------------------------------------- */
export type FieldType = 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'textarea';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  half?: boolean;
  placeholder?: string;
  help?: string;
  section?: string;
  options?: string[];
  prefill?: string;                        // 'email' | 'uid' | ...
  lock?: boolean;
  dependsOn?: string;
  optionsMap?: Record<string, string[]>;
  showIf?: { field: string; values: string[] };
  status?: Status;                         // inactive = never shown, never asked
  statusReason?: string;
}

export interface Audience {
  departments: string[];
  programmes: string[];
  sessions: string[];
  batches?: string[];                      // panel batch ids; empty = every batch
}

export interface Assessment {
  id: string;
  name: string;
  tag?: string;
  durationMin: number;
  questions: number;
  sections: string[];
  window: string;
  attempts: string;
  audience: Audience;
  status?: Status;
  statusReason?: string;
}

export interface Spoc {
  name: string;
  role: string;
  email: string;
  phone: string;
  primary?: boolean;
  status?: Status;
  statusReason?: string;
}

export interface Department {
  name: string;
  total: number;
  finalYear: number;
  status?: Status;
  statusReason?: string;
}

export interface Nomenclature {
  uid: string;
  department: string;
  programme: string;
  course: string;
  session: string;
}

export interface CampusProfile {
  website: string;
  established: string;
  spocs: Spoc[];
  departments: Department[];
  nomenclature: Nomenclature;
  updatedAt?: string;
  updatedBy?: string;
}

export type InvoiceStatus = 'Paid' | 'Due' | 'Overdue' | 'Cancelled';

export interface Invoice {
  id: string;
  item: string;
  tests: number;
  licences: number;
  amount: number;
  status: InvoiceStatus;
  invoiced: string;
  due: string;
  paid: string;
  cancelReason?: string;
}

export interface Commercial {
  clientName: string;
  contract: { id: string; start: string; end: string; po: string };
  rate: number;
  items: Invoice[];
}

/** Portal-side settings for one panel batch. The batch itself (id, name) lives in the panel. */
export interface BatchSettings extends StatusInfo {
  accessCode: string;
  /** How many students the college expects in this batch (filled by the college). */
  estimated?: number;
  estimatedBy?: string;
  estimatedAt?: string;
}

export interface CampusConfig extends StatusInfo {
  id: string;                              // slug used in URLs: "chitkara"
  externalClientId: string;                // panel client id: "CL-1001"
  name: string;
  shortName: string;
  campus: string;
  logo: string;
  logoHeight: number;
  photo: string;
  theme: { primary: string; primaryDark: string; accent: string };
  welcome: {
    eyebrow: string; title: string; highlight: string; subtitle: string;
    points: string[]; stats: { value: string; label: string }[];
    cta: string; note: string;
  };
  campusPoints: string[];
  security: { enabled: boolean; label: string; help: string };
  gate: { idLabel: string; idPlaceholder: string; idHelp: string };
  verification: { otpLength: number; resendSeconds: number };
  fields: FormField[];
  tests: Assessment[];
  testimonials: { quote: string; name: string; meta: string }[];
  thankyou: { title: string; message: string; redirectSeconds: number; dashboardLabel: string };
  profile: CampusProfile;
  commercial: Commercial;
  batches: Record<string, BatchSettings>;  // keyed by panel batchId
  updatedAt?: string;
}

export interface BrandConfig {
  product: string;
  logo: string;
  supportEmail: string;
  steps: { icon: string; title: string; text: string }[];
  faq: { q: string; a: string }[];
}

/** A panel batch joined with the portal's settings for it. */
export interface BatchView extends BatchSettings {
  batchId: string;
  clientId: string;
  name: string;
  passingYear?: number;
  panelStatus: Status;
}

/* ---------------------------------------------------------------------
   PORTAL — people and progress
   --------------------------------------------------------------------- */

/** A roster row as the portal keeps it: synced from the panel, status can be switched here too. */
export interface RosterEntry extends StatusInfo {
  key: string;                             // campusId|batchId|uid (lower case)
  campusId: string;
  batchId: string;
  uid: string;
  email: string;
  name: string;
  department?: string;
  programme?: string;
  course?: string;
  session?: string;
  username: string;
  studentRef: string;
  panelStatus: Status;
  syncedAt: string;
}

export interface SectionResult {
  name: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  score?: number;
  max?: number;
  attempted?: number;
  accuracy?: number;
  pct?: number;
}

export interface TestResult {
  testId: string;
  testName: string;
  attemptedAt: string;
  score: number;
  max: number;
  pct: number;
  accuracy: number;
  attempted: number;
  timeMin: number;
  percentile: number;
  sections: SectionResult[];
  strengths: string[];
  improve: string[];
  fromRows?: boolean;
}

/** A submitted registration. This is the "student" of the portal. */
export interface Registration extends StatusInfo {
  id: string;
  regNo: string;
  campusId: string;
  batchId: string;
  uid: string;
  email: string;
  name: string;
  phone: string;
  department: string;
  programme: string;
  course: string;
  session: string;
  data: Record<string, { label: string; value: string }>;
  declaration?: { at: string; rows: number; mode: string };
  verifiedEmail: boolean;
  verifiedVia: 'otp' | 'credentials';
  registeredAt: string;
  results: Record<string, TestResult>;
  /* demo seed only: drives the simulated answer rows */
  _seedRaw?: number[] | null;
  _seedIdx?: number;
  _simV?: number;
}

export type DraftState = 'open' | 'submitted';

/** A half-filled form, saved as the student types so they can continue later. */
export interface Draft {
  key: string;                             // campusId|batchId|uid
  campusId: string;
  batchId: string;
  uid: string;
  email: string;
  values: Record<string, string>;
  step: 'form' | 'review';
  completion: number;                      // 0..100 of required visible fields
  createdAt: string;
  updatedAt: string;
  state: DraftState;
  submittedAt?: string;
}

/** Someone got through the gate (OTP or credentials) — they have an account. */
export interface SignupMark {
  key: string;                             // campusId|batchId|uid
  campusId: string;
  batchId: string;
  uid: string;
  email: string;
  via: 'otp' | 'credentials';
  startedAt: string;
  touchedAt: string;
}

export type FunnelStage = 'invited' | 'signed_in' | 'draft' | 'registered';

/* ---------------------------------------------------------------------
   Accounts, audit, sync
   --------------------------------------------------------------------- */
export interface Session {
  role: Role;
  name: string;
  email: string;
  campusId?: string;                       // college admin + student
  batchId?: string;                        // student
  studentId?: string;                      // student (registration id)
  uid?: string;
  username?: string;
  at: string;
}

/** Portal-side status of a panel college-admin account. */
export interface AdminAccess extends StatusInfo {
  adminRef: string;
  campusId: string;
  name: string;
  email: string;
  username: string;
  panelStatus: Status;
  lastLoginAt?: string;
}

export type AuditEntity =
  | 'student' | 'roster' | 'client' | 'batch' | 'admin' | 'assessment' | 'field'
  | 'department' | 'spoc' | 'invoice' | 'config' | 'profile' | 'sync' | 'estimate';

export interface AuditEntry {
  id: string;
  at: string;
  actor: { role: Role | 'system'; name: string; email: string };
  campusId?: string;
  entity: AuditEntity;
  entityId: string;
  entityLabel: string;
  action: 'inactivate' | 'activate' | 'create' | 'update' | 'cancel' | 'sync' | 'import' | 'login-blocked';
  reason?: string;
  details?: string;
}

export interface SyncRun {
  id: string;
  at: string;
  by: string;
  scope: string;                           // "all clients" or a campus name
  clients: number;
  batches: number;
  added: number;
  updated: number;
  deactivated: number;
  ok: boolean;
  error?: string;
}

/** What the gate hands from step 2 (verify) to step 3 (form). */
export interface GatePass {
  campusId: string;
  batchId: string;
  uid: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  department?: string;
  programme?: string;
  course?: string;
  session?: string;
  via: 'otp' | 'credentials';
  at: number;
}
