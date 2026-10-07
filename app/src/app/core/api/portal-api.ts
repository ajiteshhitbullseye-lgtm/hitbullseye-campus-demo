import { Observable } from 'rxjs';
import {
  AdminAccess, AuditEntry, BrandConfig, CampusConfig, Draft, Registration, RosterEntry, SignupMark, SyncRun, TestResult
} from '../models';
import {
  GateCheckRequest, GateCheckResult, OtpRequest, OtpSent, StatusChange, SubmitRegistrationRequest, SyncSummary
} from './api-types';

/* =====================================================================
   This portal's own backend.
   Business rules live on the server, not in the browser:
     - one email = one registration across the whole platform
     - only students on the synced list can register, with the batch's code
     - inactive clients / batches / students / admins are refused
     - nothing is deleted; status changes are audited with a reason
   The mock (MockPortalApi) enforces the same rules so the UI can be
   built and tested before the real service exists.
   ===================================================================== */
export abstract class PortalApi {
  /* ---------------- configuration ---------------- */
  abstract getBrand(): Observable<BrandConfig>;
  abstract getCampuses(): Observable<CampusConfig[]>;
  /** Super admin only (college admins may only save their profile via saveProfile). */
  abstract saveCampus(cfg: CampusConfig, note?: string): Observable<CampusConfig>;
  abstract createCampus(cfg: CampusConfig): Observable<CampusConfig>;
  /** College admin: institute details, SPOCs, department strength, batch estimates. */
  abstract saveProfile(campusId: string, patch: Pick<CampusConfig, 'name' | 'shortName' | 'campus' | 'profile'> & {
    estimates?: Record<string, number | undefined>;
  }): Observable<CampusConfig>;

  /* ---------------- registration gate ---------------- */
  abstract checkGate(req: GateCheckRequest): Observable<GateCheckResult>;
  abstract sendOtp(req: OtpRequest): Observable<OtpSent>;
  abstract verifyOtp(req: OtpRequest & { code: string }): Observable<{ ok: true }>;
  abstract markSignup(mark: Pick<SignupMark, 'campusId' | 'batchId' | 'uid' | 'email' | 'via'>): Observable<void>;
  abstract getSignups(campusId?: string): Observable<SignupMark[]>;

  /* ---------------- drafts ---------------- */
  abstract getDraft(campusId: string, batchId: string, uid: string): Observable<Draft | null>;
  abstract saveDraft(draft: Draft): Observable<Draft>;
  abstract getDrafts(campusId?: string): Observable<Draft[]>;

  /* ---------------- registrations ---------------- */
  abstract submitRegistration(req: SubmitRegistrationRequest): Observable<Registration>;
  abstract getRegistrations(q?: { campusId?: string; batchId?: string }): Observable<Registration[]>;
  abstract getRegistration(id: string): Observable<Registration | null>;
  abstract findRegistration(q: { email?: string; campusId?: string; uid?: string }): Observable<Registration | null>;
  abstract saveResult(registrationId: string, testId: string, result: TestResult): Observable<void>;

  /* ---------------- roster (synced copy of the panel's student list) ---------------- */
  abstract getRoster(q?: { campusId?: string; batchId?: string }): Observable<RosterEntry[]>;
  /** Store what the panel returned for a campus. Rows missing from the panel are marked inactive, never removed. */
  abstract applyRosterSync(campusId: string, rows: Omit<RosterEntry, 'status' | 'key' | 'syncedAt'>[]): Observable<SyncSummary>;

  /* ---------------- college admin accounts ---------------- */
  abstract getAdminAccess(campusId?: string): Observable<AdminAccess[]>;
  abstract applyAdminSync(rows: Omit<AdminAccess, 'status'>[]): Observable<void>;
  abstract touchAdminLogin(adminRef: string): Observable<void>;

  /* ---------------- status: the only way anything goes away ---------------- */
  abstract changeStatus(change: StatusChange): Observable<void>;

  /* ---------------- HQ ---------------- */
  abstract superLogin(email: string, password: string): Observable<{ name: string; email: string }>;
  abstract getAudit(q?: { campusId?: string }): Observable<AuditEntry[]>;
  abstract addAudit(entry: Omit<AuditEntry, 'id' | 'at' | 'actor'>): Observable<void>;
  abstract getSyncRuns(): Observable<SyncRun[]>;
  abstract addSyncRun(run: Omit<SyncRun, 'id' | 'at' | 'by'>): Observable<SyncRun>;
}
