import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { asApiError } from '../api/api-types';
import { PanelApi } from '../api/panel-api';
import { PortalApi } from '../api/portal-api';
import { Session } from '../models';
import { SessionStore } from '../session.store';
import { isActive, lc, nowIso, splitName } from '../util';
import { CampusService } from './campus.service';
import { GateService } from './gate.service';
import { ToastService } from './toast.service';

export type LoginOutcome = { ok: true; url: string } | { ok: false; error: string };

/**
 * Sign-in for all three roles.
 *
 * Students and placement cells sign in with the username + password created in
 * the Hitbullseye admin panel. The panel checks the password; the portal then
 * matches who came back against its own records (campus, batch, list row,
 * registration) and refuses anyone switched off. Super admins have their own
 * account here, on a separate page.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private panel = inject(PanelApi);
  private portal = inject(PortalApi);
  private campuses = inject(CampusService);
  private sessions = inject(SessionStore);
  private gate = inject(GateService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly session = this.sessions.session;

  async login(username: string, password: string): Promise<LoginOutcome> {
    if (!username.trim() || !password) return { ok: false, error: 'Enter your username and password.' };
    try {
      const who = await firstValueFrom(this.panel.verifyCredentials(username.trim(), password));
      if (!who.ok) return { ok: false, error: who.error || 'Incorrect username or password.' };

      const campus = this.campuses.campuses().find(c => c.externalClientId === who.clientId);
      if (!campus) return { ok: false, error: 'Your college is not set up on this portal yet. Please contact Hitbullseye.' };
      if (!isActive(campus)) return { ok: false, error: 'The ' + campus.shortName + ' portal is currently inactive. Please contact Hitbullseye.' };

      if (who.role === 'college_admin') {
        const access = await firstValueFrom(this.portal.getAdminAccess(campus.id));
        const mine = access.find(a => a.adminRef === who.ref);
        if (mine && !isActive(mine)) {
          return { ok: false, error: 'Your access to this portal is switched off' + (mine.statusReason ? ' (' + mine.statusReason + ')' : '') + '. Please contact Hitbullseye.' };
        }
        if (who.ref) this.portal.touchAdminLogin(who.ref).subscribe();
        this.sessions.set({
          role: 'college_admin', name: who.name || 'Placement Cell', email: who.email || '', campusId: campus.id,
          username, at: nowIso()
        });
        this.campuses.rememberCampus(campus.id);
        return { ok: true, url: '/console/home' };
      }

      /* ---------------- student ---------------- */
      const batchId = who.batchId || '';
      const batch = this.campuses.batchesOf(campus.id).find(b => b.batchId === batchId);
      if (!batch || !isActive(batch) || batch.panelStatus !== 'active') {
        return { ok: false, error: (batch?.name || 'Your batch') + ' is closed on this portal. Please contact your placement cell.' };
      }
      const roster = await firstValueFrom(this.portal.getRoster({ campusId: campus.id, batchId }));
      const row = roster.find(r => lc(r.uid) === lc(who.uid));
      if (!row) return { ok: false, error: 'You are not on the ' + campus.shortName + ' list yet. Please ask your placement cell.' };
      if (!isActive(row) || row.panelStatus !== 'active') {
        return { ok: false, error: 'Your record is inactive' + (row.statusReason ? ' (' + row.statusReason + ')' : '') + '. Please contact your placement cell.' };
      }

      const reg = await firstValueFrom(this.portal.findRegistration({ campusId: campus.id, uid: row.uid }));
      if (reg) {
        if (!isActive(reg)) {
          return { ok: false, error: 'Your account is inactive' + (reg.statusReason ? ' (' + reg.statusReason + ')' : '') + '. Please contact your placement cell.' };
        }
        this.sessions.set({
          role: 'student', name: reg.name, email: reg.email, campusId: campus.id, batchId: reg.batchId,
          studentId: reg.id, uid: reg.uid, username, at: nowIso()
        });
        this.campuses.rememberCampus(campus.id);
        return { ok: true, url: '/me' };
      }

      /* signed in, but the form is not submitted yet: straight to it (a draft is restored there) */
      const elsewhere = await firstValueFrom(this.portal.findRegistration({ email: row.email }));
      if (elsewhere) return { ok: false, error: 'This email is already registered with another campus. One email can register only once.' };
      const nm = splitName(row.name);
      this.gate.set({
        campusId: campus.id, batchId, uid: row.uid, email: row.email, name: row.name,
        firstName: nm.first, lastName: nm.last, department: row.department, programme: row.programme,
        course: row.course, session: row.session, via: 'credentials', at: Date.now()
      });
      await firstValueFrom(this.portal.markSignup({ campusId: campus.id, batchId, uid: row.uid, email: row.email, via: 'credentials' }));
      this.campuses.rememberCampus(campus.id);
      return { ok: true, url: '/c/' + campus.id + '/register' };
    } catch (e) {
      return { ok: false, error: asApiError(e).message };
    }
  }

  async superLogin(email: string, password: string): Promise<LoginOutcome> {
    try {
      const who = await firstValueFrom(this.portal.superLogin(email.trim(), password));
      this.sessions.set({ role: 'super_admin', name: who.name, email: who.email, at: nowIso() });
      return { ok: true, url: '/console/clients' };
    } catch (e) {
      return { ok: false, error: asApiError(e).message };
    }
  }

  /** Called by the student page after a registration is submitted. */
  startStudentSession(s: Omit<Session, 'role' | 'at'>): void {
    this.sessions.set({ ...s, role: 'student', at: nowIso() });
  }

  logout(message?: string): void {
    const wasSuper = this.sessions.isSuper();
    this.sessions.clear();
    if (message) this.toast.warn(message, 7000);
    this.router.navigateByUrl(wasSuper ? '/hq/login' : '/login');
  }

  /**
   * Re-checks that whoever is signed in is still allowed in. Runs on every
   * protected navigation, so switching someone off takes effect at once.
   */
  async stillAllowed(): Promise<string | null> {
    const s = this.sessions.session();
    if (!s) return 'Please sign in.';
    if (s.role === 'super_admin') return null;
    const campus = this.campuses.byId(s.campusId);
    if (!campus || !isActive(campus)) return 'This campus portal is inactive.';
    if (s.role === 'college_admin') {
      const access = await firstValueFrom(this.portal.getAdminAccess(campus.id));
      const mine = access.find(a => lc(a.email) === lc(s.email));
      if (mine && !isActive(mine)) return 'Your access to this portal was switched off.';
      return null;
    }
    if (!s.studentId) return 'Please sign in.';
    const reg = await firstValueFrom(this.portal.getRegistration(s.studentId));
    if (!reg) return 'Your registration was not found.';
    if (!isActive(reg)) return 'Your account is inactive' + (reg.statusReason ? ' (' + reg.statusReason + ')' : '') + '.';
    return null;
  }
}
