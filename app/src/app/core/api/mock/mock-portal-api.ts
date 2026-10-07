import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AdminAccess, AuditEntry, BrandConfig, CampusConfig, Draft, Registration, RosterEntry, SignupMark, SyncRun, TestResult
} from '../../models';
import { SessionStore } from '../../session.store';
import { isActive, lc, maskEmail, newId, nowIso, regNo } from '../../util';
import {
  GateCheckRequest, GateCheckResult, OtpRequest, OtpSent, StatusChange, SubmitRegistrationRequest, SyncSummary
} from '../api-types';
import { PortalApi } from '../portal-api';
import { MockDb } from './mock-db';
import { fail, mockRequest } from './mock-http';
import { DEMO_SUPER } from './seed';

/** Fields every form must keep: switching these off would break the gate or the reports. */
const CORE_FIELDS = ['firstName', 'email', 'universityId', 'department'];

/* =====================================================================
   The portal backend, played in the browser. Every rule a real server
   must enforce is enforced here too, so the UI is built against the
   same behaviour (see docs/API.md for the error codes).
   ===================================================================== */
@Injectable()
export class MockPortalApi extends PortalApi {
  private db = inject(MockDb);
  private session = inject(SessionStore);

  /* ================= helpers ================= */
  private campus(id: string): CampusConfig {
    const c = this.db.campuses[id];
    if (!c) fail(404, 'CAMPUS_NOT_FOUND', 'That campus does not exist.');
    return c;
  }
  private me() { return this.session.session(); }
  private requireSuper(): void {
    if (this.me()?.role !== 'super_admin') fail(403, 'HQ_ONLY', 'Only Hitbullseye HQ can change this.');
  }
  private requireAdminOf(campusId: string): void {
    const s = this.me();
    if (s?.role === 'super_admin') return;
    if (s?.role === 'college_admin' && s.campusId === campusId) return;
    fail(403, 'FORBIDDEN', 'You do not have access to this campus.');
  }
  private audit(e: Omit<AuditEntry, 'id' | 'at' | 'actor'>): void {
    this.db.audit.unshift({ id: newId('AU-'), at: nowIso(), actor: this.session.actor(), ...e });
    this.db.save('audit');
  }
  private panelBatch(batchId: string) {
    return this.db.panel.batches.find(b => b.batchId === batchId);
  }
  private batchOpen(c: CampusConfig, batchId: string): boolean {
    const b = this.panelBatch(batchId);
    return isActive(c.batches[batchId]) && (!b || b.status === 'active');
  }
  private key(campusId: string, batchId: string, uid: string): string {
    return [campusId, batchId, lc(uid)].join('|');
  }
  private registeredEmail(email: string): Registration | undefined {
    return this.db.registrations.find(r => lc(r.email) === lc(email));
  }

  /* ================= configuration ================= */
  getBrand(): Observable<BrandConfig> {
    return mockRequest(() => this.db.brand);
  }

  getCampuses(): Observable<CampusConfig[]> {
    return mockRequest(() => Object.values(this.db.campuses));
  }

  saveCampus(cfg: CampusConfig, note?: string): Observable<CampusConfig> {
    return mockRequest(() => {
      this.requireSuper();
      this.campus(cfg.id);
      cfg.updatedAt = nowIso();
      this.db.campuses[cfg.id] = cfg;
      this.db.save('campuses');
      this.audit({ campusId: cfg.id, entity: 'config', entityId: cfg.id, entityLabel: cfg.name, action: 'update', details: note || 'Configuration saved' });
      return cfg;
    });
  }

  createCampus(cfg: CampusConfig): Observable<CampusConfig> {
    return mockRequest(() => {
      this.requireSuper();
      if (this.db.campuses[cfg.id]) fail(409, 'CAMPUS_EXISTS', 'A campus with that id already exists.');
      if (Object.values(this.db.campuses).some(c => c.externalClientId === cfg.externalClientId)) {
        fail(409, 'CLIENT_TAKEN', 'This admin-panel client already has a portal.');
      }
      cfg.updatedAt = nowIso();
      this.db.campuses[cfg.id] = cfg;
      this.db.save('campuses');
      this.audit({ campusId: cfg.id, entity: 'client', entityId: cfg.id, entityLabel: cfg.name, action: 'create', details: 'Portal set up for ' + cfg.externalClientId });
      return cfg;
    });
  }

  saveProfile(campusId: string, patch: Pick<CampusConfig, 'name' | 'shortName' | 'campus' | 'profile'> & { estimates?: Record<string, number | undefined> }): Observable<CampusConfig> {
    return mockRequest(() => {
      this.requireAdminOf(campusId);
      const c = this.campus(campusId);
      const isSuper = this.me()?.role === 'super_admin';
      c.name = patch.name || c.name;
      c.shortName = patch.shortName || c.shortName;
      c.campus = patch.campus ?? c.campus;
      /* the college fills its own profile; what the form is called stays with HQ */
      const nomenclature = isSuper ? patch.profile.nomenclature : c.profile.nomenclature;
      c.profile = { ...patch.profile, nomenclature, updatedAt: nowIso(), updatedBy: this.session.actor().name };
      Object.entries(patch.estimates || {}).forEach(([batchId, n]) => {
        const b = c.batches[batchId];
        if (!b || b.estimated === n) return;
        b.estimated = n;
        b.estimatedBy = this.session.actor().name;
        b.estimatedAt = nowIso();
        this.audit({ campusId, entity: 'estimate', entityId: batchId, entityLabel: this.panelBatch(batchId)?.name || batchId, action: 'update', details: 'Estimated students: ' + (n ?? 'cleared') });
      });
      this.db.save('campuses');
      this.audit({ campusId, entity: 'profile', entityId: campusId, entityLabel: c.name, action: 'update', details: 'Campus profile saved' });
      return c;
    });
  }

  /* ================= registration gate ================= */
  checkGate(req: GateCheckRequest): Observable<GateCheckResult> {
    return mockRequest(() => {
      const c = this.campus(req.campusId);
      if (!isActive(c)) fail(403, 'CAMPUS_INACTIVE', 'Registration for ' + c.name + ' is closed. Please contact your placement cell.');

      const uid = lc(req.uid), email = lc(req.email);
      let batchId: string | null = null;
      if (c.security.enabled) {
        const code = String(req.accessCode || '').trim().toUpperCase();
        if (!code) fail(400, 'CODE_REQUIRED', 'Enter the access code shared with your batch.', { field: 'code' });
        batchId = Object.keys(c.batches).find(b => String(c.batches[b].accessCode || '').toUpperCase() === code) || null;
        if (!batchId) fail(400, 'BAD_CODE', 'That access code is not valid for ' + (c.shortName || c.name) + '.', { field: 'code' });
        if (!this.batchOpen(c, batchId)) {
          fail(403, 'BATCH_CLOSED', 'Registration for ' + (this.panelBatch(batchId)?.name || 'this batch') + ' is closed.', { field: 'code' });
        }
      }

      const rows = this.db.roster.filter(r => r.campusId === c.id && lc(r.uid) === uid);
      const row = batchId ? rows.find(r => r.batchId === batchId) : rows[0];
      if (!row) {
        if (rows.length && batchId) {
          const other = this.panelBatch(rows[0].batchId)?.name || 'another batch';
          fail(400, 'WRONG_BATCH', 'This ID is on the ' + other + ' list. Use the access code for ' + other + '.', { field: 'code' });
        }
        fail(404, 'NOT_ON_LIST', 'This ID is not on the list shared by ' + (c.shortName || c.name) + '. Please contact your placement cell.', { field: 'uid' });
      }
      if (!isActive(row) || row.panelStatus !== 'active') {
        fail(403, 'STUDENT_INACTIVE', 'Your record is inactive. Please contact your placement cell.', { field: 'uid' });
      }
      if (lc(row.email) !== email) {
        fail(400, 'EMAIL_MISMATCH', 'This email does not match our record for that ID (' + maskEmail(row.email) + ').', { field: 'email' });
      }
      const taken = this.registeredEmail(row.email);
      if (taken) {
        const where = taken.campusId === c.id ? '' : ' (with ' + (this.db.campuses[taken.campusId]?.shortName || 'another campus') + ')';
        fail(409, 'ALREADY_REGISTERED', 'This email is already registered' + where + '. One email can register only once — please sign in instead.', { field: 'uid' });
      }
      if (this.db.registrations.some(r => r.campusId === c.id && lc(r.uid) === uid)) {
        fail(409, 'ALREADY_REGISTERED', 'This ID has already been registered. Please sign in instead.', { field: 'uid' });
      }
      const draft = this.db.drafts.find(d => d.key === row.key && d.state === 'open');
      return {
        batchId: row.batchId,
        batchName: this.panelBatch(row.batchId)?.name || row.batchId,
        name: row.name, department: row.department, programme: row.programme, course: row.course, session: row.session,
        maskedEmail: maskEmail(row.email),
        hasDraft: !!draft && Object.values(draft.values).some(v => !!v),
        draftCompletion: draft?.completion
      };
    });
  }

  sendOtp(req: OtpRequest): Observable<OtpSent> {
    return mockRequest(() => {
      const c = this.campus(req.campusId);
      const len = c.verification?.otpLength || 6;
      let code = '';
      for (let i = 0; i < len; i++) code += Math.floor(Math.random() * 10);
      this.db.otps[this.key(req.campusId, req.batchId, req.uid)] = { code, exp: Date.now() + 10 * 60000 };
      return {
        sentTo: maskEmail(req.email), resendSeconds: c.verification?.resendSeconds || 30, length: len,
        demoCode: environment.demoMode ? code : undefined
      };
    });
  }

  verifyOtp(req: OtpRequest & { code: string }): Observable<{ ok: true }> {
    return mockRequest(() => {
      const t = this.db.otps[this.key(req.campusId, req.batchId, req.uid)];
      if (!t) fail(400, 'OTP_NOT_SENT', 'Ask for a new code first.');
      if (Date.now() > t.exp) fail(400, 'OTP_EXPIRED', 'That code has expired. Ask for a new one.');
      if (String(req.code || '').trim() !== t.code) fail(400, 'BAD_OTP', 'That code is not correct.');
      delete this.db.otps[this.key(req.campusId, req.batchId, req.uid)];
      return { ok: true as const };
    });
  }

  markSignup(mark: Pick<SignupMark, 'campusId' | 'batchId' | 'uid' | 'email' | 'via'>): Observable<void> {
    return mockRequest(() => {
      const key = this.key(mark.campusId, mark.batchId, mark.uid);
      const was = this.db.signups.find(s => s.key === key);
      if (was) { was.touchedAt = nowIso(); was.via = mark.via; }
      else this.db.signups.push({ ...mark, key, startedAt: nowIso(), touchedAt: nowIso() });
      this.db.save('signups');
    });
  }

  getSignups(campusId?: string): Observable<SignupMark[]> {
    return mockRequest(() => this.db.signups.filter(s => !campusId || s.campusId === campusId));
  }

  /* ================= drafts ================= */
  getDraft(campusId: string, batchId: string, uid: string): Observable<Draft | null> {
    return mockRequest(() => this.db.drafts.find(d => d.key === this.key(campusId, batchId, uid) && d.state === 'open') || null);
  }

  saveDraft(draft: Draft): Observable<Draft> {
    return mockRequest(() => {
      const key = this.key(draft.campusId, draft.batchId, draft.uid);
      if (this.db.registrations.some(r => r.campusId === draft.campusId && lc(r.uid) === lc(draft.uid))) {
        fail(409, 'ALREADY_REGISTERED', 'This registration is already submitted.');
      }
      const was = this.db.drafts.find(d => d.key === key);
      const row: Draft = { ...draft, key, updatedAt: nowIso(), createdAt: was?.createdAt || nowIso(), state: 'open' };
      if (was) Object.assign(was, row); else this.db.drafts.push(row);
      this.db.save('drafts');
      return row;
    });
  }

  getDrafts(campusId?: string): Observable<Draft[]> {
    return mockRequest(() => this.db.drafts.filter(d => !campusId || d.campusId === campusId));
  }

  /* ================= registrations ================= */
  submitRegistration(req: SubmitRegistrationRequest): Observable<Registration> {
    return mockRequest(() => {
      const c = this.campus(req.campusId);
      if (!isActive(c)) fail(403, 'CAMPUS_INACTIVE', 'Registration for ' + c.name + ' is closed.');
      if (!this.batchOpen(c, req.batchId)) fail(403, 'BATCH_CLOSED', 'Registration for this batch is closed.');
      const row = this.db.roster.find(r => r.key === this.key(req.campusId, req.batchId, req.uid));
      if (!row) fail(404, 'NOT_ON_LIST', 'This ID is not on the campus list.');
      if (!isActive(row) || row.panelStatus !== 'active') fail(403, 'STUDENT_INACTIVE', 'Your record is inactive. Please contact your placement cell.');
      if (lc(row.email) !== lc(req.email)) fail(400, 'EMAIL_MISMATCH', 'The email does not match the campus record.');
      if (this.registeredEmail(req.email)) {
        fail(409, 'ALREADY_REGISTERED', 'This email is already registered. One email can register only once.');
      }
      if (this.db.registrations.some(r => r.campusId === c.id && lc(r.uid) === lc(req.uid))) {
        fail(409, 'ALREADY_REGISTERED', 'This ID is already registered.');
      }
      const v = req.values;
      const name = ((v['firstName'] || '') + ' ' + (v['lastName'] || '')).trim() || row.name;
      const reg: Registration = {
        id: 'S' + Date.now().toString().slice(-7),
        regNo: regNo(c),
        campusId: c.id, batchId: req.batchId,
        uid: row.uid, email: row.email, name,
        phone: v['phone'] || '',
        department: v['department'] || row.department || '',
        programme: v['programme'] || row.programme || '',
        course: v['course'] || row.course || '',
        session: v['session'] || row.session || '',
        data: req.data,
        declaration: { at: nowIso(), rows: req.declarationRows, mode: 'self-verified' },
        verifiedEmail: true,
        verifiedVia: req.via,
        registeredAt: nowIso(),
        results: {},
        status: 'active'
      };
      this.db.registrations.unshift(reg);
      const d = this.db.drafts.find(x => x.key === row.key);
      if (d) { d.state = 'submitted'; d.submittedAt = nowIso(); d.completion = 100; }
      this.db.save('registrations');
      this.db.save('drafts');
      return reg;
    });
  }

  getRegistrations(q: { campusId?: string; batchId?: string } = {}): Observable<Registration[]> {
    return mockRequest(() => this.db.registrations.filter(r =>
      (!q.campusId || r.campusId === q.campusId) && (!q.batchId || r.batchId === q.batchId)));
  }

  getRegistration(id: string): Observable<Registration | null> {
    return mockRequest(() => this.db.registrations.find(r => r.id === id) || null);
  }

  findRegistration(q: { email?: string; campusId?: string; uid?: string }): Observable<Registration | null> {
    return mockRequest(() => this.db.registrations.find(r =>
      (!q.email || lc(r.email) === lc(q.email)) &&
      (!q.campusId || r.campusId === q.campusId) &&
      (!q.uid || lc(r.uid) === lc(q.uid))) || null);
  }

  saveResult(registrationId: string, testId: string, result: TestResult): Observable<void> {
    return mockRequest(() => {
      const r = this.db.registrations.find(x => x.id === registrationId);
      if (!r) fail(404, 'NOT_FOUND', 'Registration not found.');
      r.results = { ...(r.results || {}), [testId]: result };
      this.db.save('registrations');
    });
  }

  /* ================= roster ================= */
  getRoster(q: { campusId?: string; batchId?: string } = {}): Observable<RosterEntry[]> {
    return mockRequest(() => this.db.roster.filter(r =>
      (!q.campusId || r.campusId === q.campusId) && (!q.batchId || r.batchId === q.batchId)));
  }

  applyRosterSync(campusId: string, rows: Omit<RosterEntry, 'status' | 'key' | 'syncedAt'>[]): Observable<SyncSummary> {
    return mockRequest(() => {
      const at = nowIso();
      const seen = new Set<string>();
      let added = 0, updated = 0, deactivated = 0;
      rows.forEach(r => {
        const key = this.key(campusId, r.batchId, r.uid);
        seen.add(key);
        const was = this.db.roster.find(x => x.key === key);
        if (was) {
          const changed = was.email !== r.email || was.name !== r.name || was.panelStatus !== r.panelStatus ||
            was.department !== r.department || was.course !== r.course || was.session !== r.session;
          Object.assign(was, r, { key, syncedAt: at });
          if (changed) updated++;
        } else {
          this.db.roster.push({ ...r, key, campusId, status: 'active', syncedAt: at });
          added++;
        }
      });
      /* gone from the panel: keep the row, mark it inactive there */
      this.db.roster.filter(x => x.campusId === campusId && !seen.has(x.key) && x.panelStatus === 'active').forEach(x => {
        x.panelStatus = 'inactive';
        x.syncedAt = at;
        deactivated++;
      });
      this.db.save('roster');
      return { clients: 1, batches: new Set(rows.map(r => r.batchId)).size, added, updated, deactivated };
    });
  }

  /* ================= college admin accounts ================= */
  getAdminAccess(campusId?: string): Observable<AdminAccess[]> {
    return mockRequest(() => this.db.adminAccess.filter(a => !campusId || a.campusId === campusId));
  }

  applyAdminSync(rows: Omit<AdminAccess, 'status'>[]): Observable<void> {
    return mockRequest(() => {
      rows.forEach(r => {
        const was = this.db.adminAccess.find(a => a.adminRef === r.adminRef);
        if (was) Object.assign(was, { ...r, status: was.status, statusReason: was.statusReason, lastLoginAt: was.lastLoginAt });
        else this.db.adminAccess.push({ ...r, status: 'active' });
      });
      this.db.save('adminAccess');
    });
  }

  touchAdminLogin(adminRef: string): Observable<void> {
    return mockRequest(() => {
      const a = this.db.adminAccess.find(x => x.adminRef === adminRef);
      if (a) { a.lastLoginAt = nowIso(); this.db.save('adminAccess'); }
    });
  }

  /* ================= status ================= */
  changeStatus(ch: StatusChange): Observable<void> {
    return mockRequest(() => {
      const reason = String(ch.reason || '').trim();
      if (ch.status === 'inactive' && reason.length < 3) fail(400, 'REASON_REQUIRED', 'Say why, so the change can be traced later.');
      const collegeMay = ['student', 'roster', 'department', 'spoc'].includes(ch.entity);
      if (collegeMay) this.requireAdminOf(ch.campusId); else this.requireSuper();

      const stamp = { status: ch.status, statusReason: reason || undefined, statusAt: nowIso(), statusBy: this.session.actor().name };
      const c = this.campus(ch.campusId);
      let label = ch.id;

      switch (ch.entity) {
        case 'student': {
          const r = this.db.registrations.find(x => x.id === ch.id && x.campusId === c.id);
          if (!r) fail(404, 'NOT_FOUND', 'Student not found.');
          Object.assign(r, stamp);
          label = r.name + ' (' + r.uid + ')';
          this.db.save('registrations');
          break;
        }
        case 'roster': {
          const r = this.db.roster.find(x => x.key === ch.id && x.campusId === c.id);
          if (!r) fail(404, 'NOT_FOUND', 'List row not found.');
          Object.assign(r, stamp);
          label = r.name + ' (' + r.uid + ')';
          this.db.save('roster');
          break;
        }
        case 'client':
          Object.assign(c, stamp);
          label = c.name;
          this.db.save('campuses');
          break;
        case 'batch': {
          const b = c.batches[ch.id];
          if (!b) fail(404, 'NOT_FOUND', 'Batch not found.');
          Object.assign(b, stamp);
          label = this.panelBatch(ch.id)?.name || ch.id;
          this.db.save('campuses');
          break;
        }
        case 'admin': {
          const a = this.db.adminAccess.find(x => x.adminRef === ch.id && x.campusId === c.id);
          if (!a) fail(404, 'NOT_FOUND', 'Admin account not found.');
          Object.assign(a, stamp);
          label = a.name + ' (' + a.email + ')';
          this.db.save('adminAccess');
          break;
        }
        case 'assessment': {
          const t = c.tests.find(x => x.id === ch.id);
          if (!t) fail(404, 'NOT_FOUND', 'Assessment not found.');
          if (ch.status === 'inactive' && c.tests.filter(x => isActive(x)).length < 2) {
            fail(400, 'LAST_ONE', 'Keep at least one active assessment.');
          }
          t.status = ch.status; t.statusReason = reason || undefined;
          label = t.name;
          this.db.save('campuses');
          break;
        }
        case 'field': {
          const f = c.fields.find(x => x.id === ch.id);
          if (!f) fail(404, 'NOT_FOUND', 'Field not found.');
          if (ch.status === 'inactive' && CORE_FIELDS.includes(f.id)) {
            fail(400, 'CORE_FIELD', '"' + f.label + '" is needed by the ID check and the reports, so it always stays on.');
          }
          f.status = ch.status; f.statusReason = reason || undefined;
          label = f.label;
          this.db.save('campuses');
          break;
        }
        case 'department': {
          const d = c.profile.departments.find(x => x.name === ch.id);
          if (!d) fail(404, 'NOT_FOUND', 'Department not found.');
          d.status = ch.status; d.statusReason = reason || undefined;
          label = d.name;
          this.db.save('campuses');
          break;
        }
        case 'spoc': {
          const s = c.profile.spocs.find(x => lc(x.email) === lc(ch.id) || x.name === ch.id);
          if (!s) fail(404, 'NOT_FOUND', 'SPOC not found.');
          if (ch.status === 'inactive' && c.profile.spocs.filter(x => isActive(x)).length < 2) {
            fail(400, 'LAST_ONE', 'Keep at least one active SPOC — we need someone to write to.');
          }
          s.status = ch.status; s.statusReason = reason || undefined;
          if (ch.status === 'inactive' && s.primary) {
            s.primary = false;
            const next = c.profile.spocs.find(x => isActive(x));
            if (next) next.primary = true;
          }
          label = s.name;
          this.db.save('campuses');
          break;
        }
        case 'invoice': {
          const i = c.commercial.items.find(x => x.id === ch.id);
          if (!i) fail(404, 'NOT_FOUND', 'Invoice not found.');
          if (ch.status === 'inactive') { i.status = 'Cancelled'; i.cancelReason = reason; }
          else { i.status = i.paid ? 'Paid' : 'Due'; i.cancelReason = undefined; }
          label = i.id;
          this.db.save('campuses');
          break;
        }
      }
      this.audit({
        campusId: c.id, entity: ch.entity, entityId: ch.id, entityLabel: label,
        action: ch.entity === 'invoice' && ch.status === 'inactive' ? 'cancel' : ch.status === 'inactive' ? 'inactivate' : 'activate',
        reason: reason || undefined
      });
    });
  }

  /* ================= HQ ================= */
  superLogin(email: string, password: string): Observable<{ name: string; email: string }> {
    return mockRequest(() => {
      if (lc(email) !== DEMO_SUPER.email || password !== DEMO_SUPER.password) fail(401, 'BAD_LOGIN', 'Those are not valid HQ credentials.');
      return { name: DEMO_SUPER.name, email: DEMO_SUPER.email };
    });
  }

  getAudit(q: { campusId?: string } = {}): Observable<AuditEntry[]> {
    return mockRequest(() => this.db.audit.filter(a => !q.campusId || a.campusId === q.campusId));
  }

  addAudit(entry: Omit<AuditEntry, 'id' | 'at' | 'actor'>): Observable<void> {
    return mockRequest(() => this.audit(entry));
  }

  getSyncRuns(): Observable<SyncRun[]> {
    return mockRequest(() => this.db.syncRuns.slice().reverse());
  }

  addSyncRun(run: Omit<SyncRun, 'id' | 'at' | 'by'>): Observable<SyncRun> {
    return mockRequest(() => {
      const row: SyncRun = { id: newId('SY-'), at: nowIso(), by: this.session.actor().name, ...run };
      this.db.syncRuns.push(row);
      this.db.save('syncRuns');
      return row;
    });
  }
}
