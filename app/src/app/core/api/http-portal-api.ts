import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminAccess, AuditEntry, BrandConfig, CampusConfig, Draft, Registration, RosterEntry, SignupMark, SyncRun, TestResult
} from '../models';
import {
  GateCheckRequest, GateCheckResult, OtpRequest, OtpSent, StatusChange, SubmitRegistrationRequest, SyncSummary
} from './api-types';
import { PortalApi } from './portal-api';

/** The real portal backend. Endpoints and error codes: docs/API.md. */
@Injectable()
export class HttpPortalApi extends PortalApi {
  private http = inject(HttpClient);
  private base = environment.portalApiBase;

  private params(q: Record<string, string | undefined>): HttpParams {
    let p = new HttpParams();
    Object.entries(q).forEach(([k, v]) => { if (v) p = p.set(k, v); });
    return p;
  }

  getBrand(): Observable<BrandConfig> { return this.http.get<BrandConfig>(`${this.base}/brand`); }
  getCampuses(): Observable<CampusConfig[]> { return this.http.get<CampusConfig[]>(`${this.base}/campuses`); }
  saveCampus(cfg: CampusConfig, note?: string): Observable<CampusConfig> {
    return this.http.put<CampusConfig>(`${this.base}/campuses/${cfg.id}`, { config: cfg, note });
  }
  createCampus(cfg: CampusConfig): Observable<CampusConfig> { return this.http.post<CampusConfig>(`${this.base}/campuses`, cfg); }
  saveProfile(campusId: string, patch: Pick<CampusConfig, 'name' | 'shortName' | 'campus' | 'profile'> & { estimates?: Record<string, number | undefined> }): Observable<CampusConfig> {
    return this.http.put<CampusConfig>(`${this.base}/campuses/${campusId}/profile`, patch);
  }

  checkGate(req: GateCheckRequest): Observable<GateCheckResult> { return this.http.post<GateCheckResult>(`${this.base}/gate/check`, req); }
  sendOtp(req: OtpRequest): Observable<OtpSent> { return this.http.post<OtpSent>(`${this.base}/gate/otp/send`, req); }
  verifyOtp(req: OtpRequest & { code: string }): Observable<{ ok: true }> { return this.http.post<{ ok: true }>(`${this.base}/gate/otp/verify`, req); }
  markSignup(mark: Pick<SignupMark, 'campusId' | 'batchId' | 'uid' | 'email' | 'via'>): Observable<void> {
    return this.http.post<void>(`${this.base}/signups`, mark);
  }
  getSignups(campusId?: string): Observable<SignupMark[]> {
    return this.http.get<SignupMark[]>(`${this.base}/signups`, { params: this.params({ campusId }) });
  }

  getDraft(campusId: string, batchId: string, uid: string): Observable<Draft | null> {
    return this.http.get<Draft | null>(`${this.base}/drafts/one`, { params: this.params({ campusId, batchId, uid }) });
  }
  saveDraft(draft: Draft): Observable<Draft> { return this.http.put<Draft>(`${this.base}/drafts`, draft); }
  getDrafts(campusId?: string): Observable<Draft[]> {
    return this.http.get<Draft[]>(`${this.base}/drafts`, { params: this.params({ campusId }) });
  }

  submitRegistration(req: SubmitRegistrationRequest): Observable<Registration> {
    return this.http.post<Registration>(`${this.base}/registrations`, req);
  }
  getRegistrations(q: { campusId?: string; batchId?: string } = {}): Observable<Registration[]> {
    return this.http.get<Registration[]>(`${this.base}/registrations`, { params: this.params(q) });
  }
  getRegistration(id: string): Observable<Registration | null> { return this.http.get<Registration | null>(`${this.base}/registrations/${id}`); }
  findRegistration(q: { email?: string; campusId?: string; uid?: string }): Observable<Registration | null> {
    return this.http.get<Registration | null>(`${this.base}/registrations/find`, { params: this.params(q) });
  }
  saveResult(registrationId: string, testId: string, result: TestResult): Observable<void> {
    return this.http.put<void>(`${this.base}/registrations/${registrationId}/results/${testId}`, result);
  }

  getRoster(q: { campusId?: string; batchId?: string } = {}): Observable<RosterEntry[]> {
    return this.http.get<RosterEntry[]>(`${this.base}/roster`, { params: this.params(q) });
  }
  applyRosterSync(campusId: string, rows: Omit<RosterEntry, 'status' | 'key' | 'syncedAt'>[]): Observable<SyncSummary> {
    return this.http.post<SyncSummary>(`${this.base}/campuses/${campusId}/roster/sync`, { rows });
  }

  getAdminAccess(campusId?: string): Observable<AdminAccess[]> {
    return this.http.get<AdminAccess[]>(`${this.base}/admins`, { params: this.params({ campusId }) });
  }
  applyAdminSync(rows: Omit<AdminAccess, 'status'>[]): Observable<void> { return this.http.post<void>(`${this.base}/admins/sync`, { rows }); }
  touchAdminLogin(adminRef: string): Observable<void> { return this.http.post<void>(`${this.base}/admins/${adminRef}/login`, {}); }

  changeStatus(change: StatusChange): Observable<void> { return this.http.post<void>(`${this.base}/status-changes`, change); }

  superLogin(email: string, password: string): Observable<{ name: string; email: string }> {
    return this.http.post<{ name: string; email: string }>(`${this.base}/hq/login`, { email, password });
  }
  getAudit(q: { campusId?: string } = {}): Observable<AuditEntry[]> {
    return this.http.get<AuditEntry[]>(`${this.base}/audit`, { params: this.params(q) });
  }
  addAudit(entry: Omit<AuditEntry, 'id' | 'at' | 'actor'>): Observable<void> { return this.http.post<void>(`${this.base}/audit`, entry); }
  getSyncRuns(): Observable<SyncRun[]> { return this.http.get<SyncRun[]>(`${this.base}/sync-runs`); }
  addSyncRun(run: Omit<SyncRun, 'id' | 'at' | 'by'>): Observable<SyncRun> { return this.http.post<SyncRun>(`${this.base}/sync-runs`, run); }
}
