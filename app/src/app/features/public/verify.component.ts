import { Component, OnDestroy, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiError, GateCheckResult, asApiError } from '../../core/api/api-types';
import { PortalApi } from '../../core/api/portal-api';
import { CampusService } from '../../core/services/campus.service';
import { GateService } from '../../core/services/gate.service';
import { ToastService } from '../../core/services/toast.service';
import { activeTests, isActive, lc, MAIL_RE, splitName } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';
import { SiteNavComponent } from '../../shared/site-nav.component';
import { StepperComponent } from '../../shared/stepper.component';

interface DemoId { uid: string; email: string; code: string; batch: string; }

/**
 * Step 2: the gate. Batch access code + University ID + email are checked by
 * the server against the synced campus list (and against every registration
 * on the platform), then a one-time code goes to the email on record.
 */
@Component({
  selector: 'hb-verify',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, SiteNavComponent, StepperComponent],
  templateUrl: './verify.component.html'
})
export class VerifyComponent implements OnDestroy {
  readonly campusParam = input<string>('', { alias: 'campus' });
  private campuses = inject(CampusService);
  private api = inject(PortalApi);
  private gate = inject(GateService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly demo = environment.demoMode;
  readonly brand = this.campuses.brand;
  readonly c = computed(() => this.campuses.resolve(this.campusParam()));
  readonly primary = computed(() => (this.c() ? activeTests(this.c()!)[0] : null));
  readonly nTests = computed(() => (this.c() ? activeTests(this.c()!).length : 0));
  readonly open = computed(() => isActive(this.c()));

  /* stage 1 */
  code = '';
  uid = '';
  email = '';
  readonly errs = signal<{ code?: string; uid?: string; email?: string }>({});
  readonly busy = signal(false);

  /* stage 2 */
  readonly match = signal<GateCheckResult | null>(null);
  readonly sentTo = signal('');
  otp = '';
  readonly otpErr = signal('');
  readonly left = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly demoIds = signal<DemoId[]>([]);
  readonly demoCodes = computed(() => this.c() ? this.campuses.batchesOf(this.c()!.id).filter(b => isActive(b)) : []);

  constructor() {
    effect(() => {
      const c = this.c();
      if (!c) return;
      this.campuses.applyTheme(c);
      if (this.demo) this.loadDemoIds(c.id);
    });
  }

  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  /** demo only: a few IDs on the list that are not registered yet, with their batch code */
  private async loadDemoIds(campusId: string): Promise<void> {
    const r = await firstValueFrom(forkJoin({ roster: this.api.getRoster({ campusId }), regs: this.api.getRegistrations({ campusId }) }));
    const taken = new Set(r.regs.map(x => lc(x.email)));
    const batches = this.campuses.batchesOf(campusId).filter(b => isActive(b) && b.panelStatus === 'active');
    const out: DemoId[] = [];
    batches.forEach(b => {
      r.roster.filter(x => x.batchId === b.batchId && isActive(x) && x.panelStatus === 'active' && !taken.has(lc(x.email)))
        .slice(0, b.passingYear === 2026 ? 3 : 2)
        .forEach(x => out.push({ uid: x.uid, email: x.email, code: b.accessCode, batch: b.name }));
    });
    this.demoIds.set(out);
    if (out[0] && !this.uid) this.fill(out[0]);
  }

  fill(d: DemoId): void {
    this.code = d.code;
    this.uid = d.uid;
    this.email = d.email;
    this.errs.set({});
  }

  async check(): Promise<void> {
    const c = this.c();
    if (!c) return;
    const e: { code?: string; uid?: string; email?: string } = {};
    if (c.security.enabled && !this.code.trim()) e.code = 'Enter the access code shared with your batch';
    if (!this.uid.trim()) e.uid = 'Enter your ' + c.gate.idLabel;
    if (!MAIL_RE.test(this.email.trim())) e.email = 'Enter a valid email address';
    this.errs.set(e);
    if (Object.keys(e).length) return;

    this.busy.set(true);
    try {
      const m = await firstValueFrom(this.api.checkGate({ campusId: c.id, accessCode: this.code, uid: this.uid.trim(), email: this.email.trim() }));
      this.match.set(m);
      await this.send();
    } catch (err) {
      const a = asApiError(err);
      const field = ((a.data as { field?: 'code' | 'uid' | 'email' }) || {}).field || 'uid';
      this.errs.set({ [field]: a.message });
      if (a.code === 'ALREADY_REGISTERED') {
        this.toast.show('Already registered. <a href="/login">Sign in</a> instead.', 'info', 8000);
      }
    } finally {
      this.busy.set(false);
    }
  }

  async send(): Promise<void> {
    const c = this.c(), m = this.match();
    if (!c || !m) return;
    try {
      const r = await firstValueFrom(this.api.sendOtp({ campusId: c.id, batchId: m.batchId, uid: this.uid.trim(), email: this.email.trim() }));
      this.sentTo.set(r.sentTo);
      this.otp = '';
      this.otpErr.set('');
      if (r.demoCode) {
        this.toast.show('One-time code for <b>' + this.email.trim() + '</b><br><b>' + r.demoCode + '</b>', 'mail', 12000);
        this.otp = r.demoCode;                       /* demo: code prefilled */
      }
      this.left.set(r.resendSeconds);
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(() => {
        this.left.update(v => Math.max(0, v - 1));
        if (this.left() <= 0 && this.timer) { clearInterval(this.timer); this.timer = null; }
      }, 1000);
    } catch (err) {
      this.toast.warn(asApiError(err).message);
    }
  }

  async confirm(): Promise<void> {
    const c = this.c(), m = this.match();
    if (!c || !m) return;
    this.busy.set(true);
    try {
      const uid = this.uid.trim(), email = this.email.trim().toLowerCase();
      await firstValueFrom(this.api.verifyOtp({ campusId: c.id, batchId: m.batchId, uid, email, code: this.otp }));
      await firstValueFrom(this.api.markSignup({ campusId: c.id, batchId: m.batchId, uid, email, via: 'otp' }));
      const nm = splitName(m.name);
      this.gate.set({
        campusId: c.id, batchId: m.batchId, uid, email, name: m.name, firstName: nm.first, lastName: nm.last,
        department: m.department, programme: m.programme, course: m.course, session: m.session, via: 'otp', at: Date.now()
      });
      this.toast.ok(m.hasDraft ? 'Verified. Opening your saved draft.' : 'Verified. Opening your form.', 2500);
      this.router.navigate(['/c', c.id, 'register']);
    } catch (err) {
      const a = asApiError(err);
      this.otpErr.set(a instanceof ApiError ? a.message : 'That code is not correct.');
    } finally {
      this.busy.set(false);
    }
  }

  back(): void {
    this.match.set(null);
    this.otp = '';
    this.uid = '';
    this.email = '';
    this.code = '';
  }

  logoH(h: number | undefined): number { return (+(h || 34)) - 6; }
  codeMask(): string { return 'X'.repeat(7); }
}
