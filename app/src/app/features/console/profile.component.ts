import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { asApiError } from '../../core/api/api-types';
import { PortalApi } from '../../core/api/portal-api';
import { CampusConfig, Department, Nomenclature, Spoc } from '../../core/models';
import { CampusService } from '../../core/services/campus.service';
import { ConsoleContext } from '../../core/services/console-context.service';
import { StatusService } from '../../core/services/status.service';
import { ToastService } from '../../core/services/toast.service';
import { SessionStore } from '../../core/session.store';
import { clone, csvList, fmtDateTime, initials, isActive, MAIL_RE, num } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

interface DeptRow extends Department { programmes: string; courses: string; isNew?: boolean; onForm: boolean; open?: boolean; }
interface SpocRow extends Spoc { isNew?: boolean; }
interface EstRow { batchId: string; name: string; estimated: number | null; by?: string; at?: string; active: boolean; }

/**
 * What the college fills in: institute details, SPOCs, department-wise
 * strength and how many students they expect per batch. What the form
 * calls things (nomenclature) and which departments / programmes / courses
 * the form offers stay with Hitbullseye HQ — the college sees them read-only.
 */
@Component({
  selector: 'hb-profile',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, StatusBadgeComponent],
  templateUrl: './profile.component.html'
})
export class ProfileComponent {
  readonly ctx = inject(ConsoleContext);
  readonly sessions = inject(SessionStore);
  private campuses = inject(CampusService);
  private api = inject(PortalApi);
  private statuses = inject(StatusService);
  private toast = inject(ToastService);

  readonly isSuper = this.sessions.isSuper;
  readonly saving = signal(false);
  readonly c = signal<CampusConfig | null>(null);
  readonly initials = initials;
  readonly num = num;
  readonly fmtDateTime = fmtDateTime;

  name = ''; shortName = ''; city = ''; website = ''; established = '';
  nom: Nomenclature = { uid: '', department: '', programme: '', course: '', session: '' };
  sessionsCsv = '';
  readonly spocs = signal<SpocRow[]>([]);
  readonly depts = signal<DeptRow[]>([]);
  readonly estimates = signal<EstRow[]>([]);

  readonly totals = computed(() => {
    const live = this.depts().filter(d => isActive(d));
    return {
      depts: live.length,
      total: live.reduce((a, d) => a + (+d.total || 0), 0),
      finalYear: live.reduce((a, d) => a + (+d.finalYear || 0), 0),
      programmes: live.reduce((a, d) => a + csvList(d.programmes).length, 0),
      courses: live.reduce((a, d) => a + csvList(d.courses).length, 0),
      spocs: this.spocs().filter(s => isActive(s)).length,
      estimated: this.estimates().reduce((a, e) => a + (e.active ? +(e.estimated || 0) : 0), 0)
    };
  });
  readonly offForm = computed(() => this.depts().filter(d => isActive(d) && !d.onForm && d.name.trim()));
  readonly offFormNames = computed(() => this.offForm().map(d => d.name).join(', '));
  readonly campusesSupport = () => this.campuses.brand()?.supportEmail || 'Hitbullseye';

  constructor() {
    effect(() => {
      const c = this.ctx.campus();
      if (c) untracked(() => this.load(c));
    });
  }

  private field(c: CampusConfig, id: string) { return c.fields.find(f => f.id === id) || null; }

  load(cIn: CampusConfig): void {
    const c = clone(cIn);
    this.c.set(c);
    const pf = c.profile;
    this.name = c.name; this.shortName = c.shortName; this.city = c.campus;
    this.website = pf.website || ''; this.established = pf.established || '';
    this.nom = { ...{ uid: c.gate.idLabel, department: 'Department', programme: 'Programme', course: 'Course', session: 'Session' }, ...(pf.nomenclature || {}) };
    this.spocs.set((pf.spocs || []).map(s => ({ ...s })));

    /* departments: what the campus filled, joined with what the form offers */
    const dF = this.field(c, 'department'), pF = this.field(c, 'programme'), cF = this.field(c, 'course'), sF = this.field(c, 'session');
    const onForm = dF?.options || [];
    const coursesFor = (name: string, progs: string[]) => {
      if (cF?.dependsOn === 'programme') {
        const out: string[] = [];
        progs.forEach(p => (cF.optionsMap?.[p] || []).forEach(x => { if (out.indexOf(x) < 0) out.push(x); }));
        return out;
      }
      return cF?.optionsMap?.[name] || [];
    };
    const names = [...(pf.departments || []).map(d => d.name), ...onForm.filter(n => !(pf.departments || []).some(d => d.name === n))];
    this.depts.set(names.map(n => {
      const saved = (pf.departments || []).find(d => d.name === n);
      const progs = pF?.optionsMap?.[n] || [];
      return {
        name: n, total: saved?.total || 0, finalYear: saved?.finalYear || 0, status: saved?.status || 'active', statusReason: saved?.statusReason,
        programmes: progs.join(', '), courses: coursesFor(n, progs).join(', '), onForm: onForm.indexOf(n) > -1
      };
    }));
    this.sessionsCsv = (sF?.optionsMap?.['*'] || sF?.options || []).join(', ');
    this.estimates.set(this.campuses.batchesOf(c.id).map(b => ({
      batchId: b.batchId, name: b.name, estimated: b.estimated ?? null, by: b.estimatedBy, at: b.estimatedAt,
      active: isActive(b) && b.panelStatus === 'active'
    })));
  }

  /* ---------------- SPOCs ---------------- */
  addSpoc(): void { this.spocs.update(l => [...l, { name: '', role: '', email: '', phone: '', primary: !l.some(s => isActive(s)), status: 'active', isNew: true }]); }
  discardSpoc(i: number): void { this.spocs.update(l => l.filter((_, k) => k !== i)); }
  makePrimary(i: number): void {
    this.spocs.update(l => l.map((s, k) => ({ ...s, primary: k === i })));
    this.toast.ok('Primary SPOC changed — save to keep it.');
  }
  async toggleSpoc(s: SpocRow): Promise<void> {
    const c = this.c()!;
    const ok = await this.statuses.change('spoc', c.id, s.email || s.name, s.name || s.email, isActive(s) ? 'inactive' : 'active', { what: 'SPOC' });
    if (ok) this.load(this.campuses.byId(c.id)!);
  }

  /* ---------------- departments ---------------- */
  addDept(): void {
    this.depts.update(l => [...l, { name: '', total: 0, finalYear: 0, status: 'active', programmes: '', courses: '', isNew: true, onForm: false, open: true }]);
  }
  discardDept(i: number): void { this.depts.update(l => l.filter((_, k) => k !== i)); }
  toggleOpen(i: number): void { this.depts.update(l => l.map((d, k) => (k === i ? { ...d, open: !d.open } : d))); }
  touch(): void { this.depts.update(l => [...l]); this.spocs.update(l => [...l]); this.estimates.update(l => [...l]); }
  async toggleDept(d: DeptRow): Promise<void> {
    const c = this.c()!;
    if (d.isNew) { this.toast.warn('Save the profile first, then this department can be made inactive.'); return; }
    const ok = await this.statuses.change('department', c.id, d.name, d.name, isActive(d) ? 'inactive' : 'active', {
      what: 'department', note: 'Its strength leaves the totals.'
    });
    if (ok) this.load(this.campuses.byId(c.id)!);
  }

  /* ---------------- save ---------------- */
  async save(): Promise<void> {
    const c = this.c();
    if (!c) return;
    const depts = this.depts().filter(d => d.name.trim());
    const spocs = this.spocs().filter(s => s.name.trim() || s.email.trim());
    if (!depts.length) { this.toast.warn('Add at least one department first.'); return; }
    const badMail = spocs.find(s => s.email && !MAIL_RE.test(s.email));
    if (badMail) { this.toast.warn('Check the email of ' + (badMail.name || 'a SPOC') + '.'); return; }
    if (spocs.length && !spocs.some(s => s.primary && isActive(s))) { const first = spocs.find(s => isActive(s)); if (first) first.primary = true; }

    this.saving.set(true);
    try {
      const profile = {
        ...c.profile,
        website: this.website.trim(), established: this.established.trim(),
        spocs: spocs.map(({ isNew, ...s }) => s),
        departments: depts.map(d => ({ name: d.name.trim(), total: +d.total || 0, finalYear: +d.finalYear || 0, status: d.status || 'active', statusReason: d.statusReason })),
        nomenclature: { ...this.nom }
      };
      const estimates: Record<string, number | undefined> = {};
      this.estimates().forEach(e => { estimates[e.batchId] = e.estimated != null && +e.estimated > 0 ? +e.estimated : undefined; });
      let saved = await firstValueFrom(this.api.saveProfile(c.id, { name: this.name.trim(), shortName: this.shortName.trim(), campus: this.city.trim(), profile, estimates }));

      /* HQ: the same save writes the form — labels and the dependent dropdowns (as the prototype did) */
      if (this.isSuper()) {
        const next = clone(saved);
        const setLabel = (id: string, label: string) => { const f = next.fields.find(x => x.id === id); if (f && label.trim()) f.label = label.trim(); };
        next.gate.idLabel = this.nom.uid.trim() || next.gate.idLabel;
        setLabel('universityId', this.nom.uid); setLabel('department', this.nom.department); setLabel('programme', this.nom.programme);
        setLabel('course', this.nom.course); setLabel('session', this.nom.session);
        const live = depts.filter(d => isActive(d));
        const dF = next.fields.find(f => f.id === 'department'), pF = next.fields.find(f => f.id === 'programme');
        const cF = next.fields.find(f => f.id === 'course'), sF = next.fields.find(f => f.id === 'session');
        if (dF) dF.options = live.map(d => d.name.trim());
        if (pF) { pF.dependsOn = 'department'; pF.optionsMap = {}; live.forEach(d => { pF.optionsMap![d.name.trim()] = csvList(d.programmes); }); }
        if (cF) { cF.dependsOn = 'department'; cF.optionsMap = {}; live.forEach(d => { cF.optionsMap![d.name.trim()] = csvList(d.courses); }); }
        if (sF) { sF.dependsOn = 'programme'; sF.optionsMap = { '*': csvList(this.sessionsCsv) }; }
        saved = await this.campuses.save(next, 'Profile saved by HQ: form labels and dropdowns updated');
      } else {
        this.campuses.replaceLocal(saved);
      }
      this.load(saved);
      this.toast.ok(this.isSuper() ? 'Profile saved — the student form is updated.' : 'Profile saved. Hitbullseye can see it straight away.', 4000);
    } catch (e) {
      this.toast.warn(asApiError(e).message);
    } finally {
      this.saving.set(false);
    }
  }
}
