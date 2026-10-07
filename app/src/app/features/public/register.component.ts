import { Component, HostListener, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TestPlatformService } from '../../core/analytics/test-platform.service';
import { asApiError } from '../../core/api/api-types';
import { PanelApi } from '../../core/api/panel-api';
import { PortalApi } from '../../core/api/portal-api';
import { CampusConfig, Draft, FormField, GatePass } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CampusService } from '../../core/services/campus.service';
import { DraftService } from '../../core/services/draft.service';
import { GateService } from '../../core/services/gate.service';
import { ToastService } from '../../core/services/toast.service';
import { activeFields, ago, completionOf, fieldError, fieldOptions, fieldVisible, nowIso } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';
import { SiteNavComponent } from '../../shared/site-nav.component';
import { StepperComponent } from '../../shared/stepper.component';

interface Group { section: string; fields: FormField[]; }
interface ReviewRow { field: FormField; value: string; optional: boolean; }

/**
 * Step 3: the registration form, then the ITR-style declaration.
 * Opens only with a gate pass (OTP verified, or signed in with panel
 * credentials). Everything typed is saved as a draft as you go.
 */
@Component({
  selector: 'hb-register',
  standalone: true,
  imports: [RouterLink, IconComponent, SiteNavComponent, StepperComponent],
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit, OnDestroy {
  readonly campusParam = input<string>('', { alias: 'campus' });
  private campuses = inject(CampusService);
  private gates = inject(GateService);
  private drafts = inject(DraftService);
  private api = inject(PortalApi);
  private panel = inject(PanelApi);
  private auth = inject(AuthService);
  private platform = inject(TestPlatformService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly demo = environment.demoMode;
  readonly c = signal<CampusConfig | null>(null);
  readonly gate = signal<GatePass | null>(null);
  readonly values = signal<Record<string, string>>({});
  readonly errors = signal<Record<string, string>>({});
  readonly stage = signal<'loading' | 'form' | 'review'>('loading');
  readonly saveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly savedAt = signal<string | null>(null);
  readonly restored = signal<{ at: string; completion: number } | null>(null);
  readonly ticked = signal<Record<string, boolean>>({});
  readonly missing = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly batchName = computed(() => this.campuses.batchName(this.gate()?.batchId));
  readonly tick = signal(0);   /* re-renders "saved x min ago" */

  private draftCreatedAt = nowIso();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private clock: ReturnType<typeof setInterval> | null = null;

  readonly fields = computed(() => (this.c() ? activeFields(this.c()!) : []));
  readonly groups = computed<Group[]>(() => {
    const out: Group[] = [];
    this.fields().forEach(f => {
      const s = f.section || 'Details';
      const last = out[out.length - 1];
      if (last && last.section === s) last.fields.push(f); else out.push({ section: s, fields: [f] });
    });
    return out;
  });
  readonly completion = computed(() => (this.c() ? completionOf(this.c()!, this.values()) : 0));
  readonly reviewRows = computed<ReviewRow[]>(() => this.fields()
    .filter(f => fieldVisible(f, this.values()))
    .map(f => {
      let v = (this.values()[f.id] || '').trim();
      if (f.type === 'checkbox') v = v ? 'Accepted' : '';
      return { field: f, value: v, optional: !v };
    }));
  readonly needed = computed(() => this.reviewRows().filter(r => !r.optional).length);
  readonly tickCount = computed(() => this.reviewRows().filter(r => !r.optional && this.ticked()[r.field.id]).length);
  readonly savedAgo = computed(() => { this.tick(); return this.savedAt() ? ago(this.savedAt()) : ''; });

  readonly fieldOptions = fieldOptions;
  readonly agoOf = ago;
  readonly fieldVisible = fieldVisible;

  async ngOnInit(): Promise<void> {
    const c = this.campuses.resolve(this.campusParam());
    const g = this.gates.get();
    if (!c || !g || g.campusId !== c.id) {
      this.router.navigate(['/c', c?.id || this.campusParam(), 'verify'], { replaceUrl: true });
      return;
    }
    this.campuses.applyTheme(c);
    this.c.set(c);
    this.gate.set(g);

    /* already registered (e.g. submitted in another tab)? then sign in instead */
    const done = await firstValueFrom(this.api.findRegistration({ campusId: c.id, uid: g.uid }));
    if (done) {
      this.gates.clear();
      this.toast.show('This registration is already submitted. Please sign in.', 'info', 6000);
      this.router.navigateByUrl('/login');
      return;
    }

    const base: Record<string, string> = {};
    activeFields(c).forEach(f => {
      const pre = f.prefill ? (g as unknown as Record<string, string>)[f.prefill] : undefined;
      base[f.id] = pre != null ? String(pre) : '';
    });

    const d = await this.drafts.load(c.id, g.batchId, g.uid);
    if (d && Object.values(d.values).some(v => !!v)) {
      /* identity fields always come from the verified pass */
      const vals = { ...base, ...d.values };
      activeFields(c).forEach(f => { if (f.prefill && f.lock) vals[f.id] = base[f.id]; });
      this.values.set(vals);
      this.draftCreatedAt = d.createdAt || nowIso();
      this.savedAt.set(d.updatedAt);
      this.saveState.set('saved');
      this.restored.set({ at: d.updatedAt, completion: completionOf(c, vals) });
      this.toast.show('Welcome back — your draft from <b>' + ago(d.updatedAt) + '</b> is restored.', 'save', 5000);
    } else {
      this.values.set(base);
      if (this.demo) this.demoFill();
    }
    this.stage.set('form');
    this.clock = setInterval(() => this.tick.update(v => v + 1), 30000);
  }

  ngOnDestroy(): void {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.flush(); }
    if (this.clock) clearInterval(this.clock);
  }

  @HostListener('window:beforeunload')
  onUnload(): void { this.persistLocal(); }

  /* ---------------- editing ---------------- */
  set(fid: string, v: string): void {
    this.values.update(x => ({ ...x, [fid]: v }));
    if (this.errors()[fid]) this.errors.update(e => ({ ...e, [fid]: '' }));
    this.queueSave();
  }

  /** a choice changed: clear any dependent value that is no longer offered (cascades down) */
  pick(fid: string, v: string): void {
    const vals = { ...this.values(), [fid]: v };
    let again = true;
    while (again) {
      again = false;
      this.fields().forEach(f => {
        if (!f.dependsOn || !vals[f.id]) return;
        if (fieldOptions(f, vals).indexOf(vals[f.id]) === -1) { vals[f.id] = ''; again = true; }
      });
    }
    this.values.set(vals);
    if (this.errors()[fid]) this.errors.update(e => ({ ...e, [fid]: '' }));
    this.queueSave();
  }

  labelOf(fid: string): string {
    return this.fields().find(f => f.id === fid)?.label || fid;
  }

  /* ---------------- draft ---------------- */
  private draft(step: 'form' | 'review' = 'form'): Draft | null {
    const c = this.c(), g = this.gate();
    if (!c || !g) return null;
    return {
      key: this.drafts.key(c.id, g.batchId, g.uid), campusId: c.id, batchId: g.batchId, uid: g.uid, email: g.email,
      values: this.values(), step, completion: this.completion(), createdAt: this.draftCreatedAt, updatedAt: nowIso(), state: 'open'
    };
  }

  private persistLocal(): void {
    const d = this.draft(this.stage() === 'review' ? 'review' : 'form');
    if (d) this.drafts.saveLocal(d);
  }

  private queueSave(): void {
    this.persistLocal();
    this.saveState.set('saving');
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 700);
  }

  private async flush(): Promise<void> {
    this.saveTimer = null;
    const d = this.draft(this.stage() === 'review' ? 'review' : 'form');
    if (!d) return;
    try {
      const saved = await this.drafts.saveServer(d);
      this.savedAt.set(saved.updatedAt);
      this.saveState.set('saved');
    } catch {
      this.saveState.set('error');    /* the browser copy still has it */
    }
  }

  async saveAndExit(): Promise<void> {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    await this.flush();
    this.toast.ok('Draft saved (' + this.completion() + '% filled). Verify again or sign in to continue.', 5000);
    this.router.navigate(['/c', this.c()!.id]);
  }

  /* ---------------- review & submit ---------------- */
  review(): void {
    const errs: Record<string, string> = {};
    let first: string | null = null;
    this.fields().forEach(f => {
      if (!fieldVisible(f, this.values())) return;
      const m = fieldError(f, this.values()[f.id] || '');
      if (m) { errs[f.id] = m; first = first || f.id; }
    });
    this.errors.set(errs);
    if (first) {
      document.getElementById('fd_' + first)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.toast.warn('A few fields need attention before you can continue.');
      return;
    }
    this.ticked.set({});
    this.stage.set('review');
    this.queueSave();
    if (this.demo) this.tickAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  edit(): void {
    this.stage.set('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleTick(fid: string, on: boolean): void {
    this.ticked.update(t => ({ ...t, [fid]: on }));
    if (this.missing() === fid) this.missing.set(null);
  }

  tickAll(): void {
    const t: Record<string, boolean> = {};
    this.reviewRows().forEach(r => { if (!r.optional) t[r.field.id] = true; });
    this.ticked.set(t);
  }

  async submit(): Promise<void> {
    const miss = this.reviewRows().find(r => !r.optional && !this.ticked()[r.field.id]);
    if (miss) {
      this.missing.set(miss.field.id);
      document.getElementById('rr_' + miss.field.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.toast.warn('Every row has to be ticked before you can submit.');
      return;
    }
    const c = this.c()!, g = this.gate()!;
    const data: Record<string, { label: string; value: string }> = {};
    this.reviewRows().forEach(r => { data[r.field.id] = { label: r.field.label, value: this.values()[r.field.id] || '' }; });
    this.submitting.set(true);
    try {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      const reg = await firstValueFrom(this.api.submitRegistration({
        campusId: c.id, batchId: g.batchId, uid: g.uid, email: g.email, via: g.via,
        values: this.values(), data, declarationRows: this.needed()
      }));
      this.drafts.clearLocal(this.drafts.key(c.id, g.batchId, g.uid));
      this.gates.clear();
      this.panel.notifyRegistration({
        clientId: c.externalClientId, batchId: reg.batchId, uid: reg.uid, email: reg.email, regNo: reg.regNo, registeredAt: reg.registeredAt
      }).subscribe({ error: () => { /* best effort */ } });
      this.auth.startStudentSession({
        name: reg.name, email: reg.email, campusId: c.id, batchId: reg.batchId, studentId: reg.id, uid: reg.uid
      });
      await this.platform.reloadRegistrations();
      this.router.navigate(['/c', c.id, 'thank-you']);
    } catch (e) {
      const a = asApiError(e);
      this.toast.warn(a.message, 7000);
      if (a.code === 'ALREADY_REGISTERED') { this.gates.clear(); this.router.navigateByUrl('/login'); }
    } finally {
      this.submitting.set(false);
    }
  }

  fillRest(): void {
    this.demoFill();
    this.queueSave();
  }

  /* demo: fill the form from the campus list record so a demo is one click (two passes for dependent fields) */
  private demoFill(): void {
    const g = this.gate()!;
    const vals = { ...this.values() };
    const digits = String(g.uid || '').replace(/\D/g, '') + '73915264';
    const known: Record<string, string | undefined> = {
      firstName: g.firstName, lastName: g.lastName, universityId: g.uid, email: g.email,
      department: g.department, programme: g.programme, course: g.course, session: g.session
    };
    for (let pass = 0; pass < 2; pass++) {
      this.fields().forEach(f => {
        if (vals[f.id] || !fieldVisible(f, vals)) return;
        const opts = fieldOptions(f, vals);
        let v = '';
        if (f.type === 'select' || f.type === 'radio') {
          const k = known[f.id];
          v = k && opts.indexOf(k) > -1 ? k : (opts.find(o => /^(no|none|0)$/i.test(o)) || opts[0] || '');
        } else if (f.type === 'checkbox') v = 'Yes';
        else if (f.type === 'email') v = g.email;
        else if (f.type === 'tel') v = '9' + digits.slice(0, 9);
        else if (f.type === 'number') v = /cgpa|gpa/i.test(f.id + f.label) ? '8.2' : '1';
        else if (f.type === 'textarea') v = 'Prefilled for the demo.';
        else v = known[f.id] || (f.label ? 'Demo ' + f.label.split(' ')[0] : 'Demo');
        vals[f.id] = v;
      });
    }
    this.values.set(vals);
  }
}
