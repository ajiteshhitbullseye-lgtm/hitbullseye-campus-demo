import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Assessment, CampusConfig, FieldType, FormField } from '../../core/models';
import { CampusService } from '../../core/services/campus.service';
import { ConsoleContext } from '../../core/services/console-context.service';
import { DialogService } from '../../core/services/dialog.service';
import { StatusService } from '../../core/services/status.service';
import { ToastService } from '../../core/services/toast.service';
import { SessionStore } from '../../core/session.store';
import { asApiError } from '../../core/api/api-types';
import { clone, csvList, downloadJson, isActive, lines } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

const TYPES: FieldType[] = ['text', 'email', 'tel', 'number', 'date', 'select', 'radio', 'checkbox', 'textarea'];
const PREFILL = ['', 'firstName', 'lastName', 'name', 'email', 'uid', 'department', 'programme', 'course', 'session'];
/** always asked, so not tunable per department and never switched off */
const CORE = ['firstName', 'lastName', 'email', 'universityId', 'department'];

interface FieldEdit { f: FormField; open: boolean; isNew: boolean; optionsText: string; mapText: string; showField: string; showValues: string; }
interface TestEdit { t: Assessment; open: boolean; isNew: boolean; sections: string; depts: string; progs: string; sessions: string; }

/**
 * The registration form builder. HQ edits everything; a college admin gets the
 * same screen read-only (changes go through Hitbullseye). Nothing is deleted:
 * fields and assessments are made inactive, with a reason, and can come back.
 */
@Component({
  selector: 'hb-form-builder',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, StatusBadgeComponent],
  templateUrl: './form-builder.component.html'
})
export class FormBuilderComponent {
  readonly ctx = inject(ConsoleContext);
  readonly sessions = inject(SessionStore);
  private campuses = inject(CampusService);
  private statuses = inject(StatusService);
  private dialogs = inject(DialogService);
  private toast = inject(ToastService);

  readonly types = TYPES;
  readonly prefills = PREFILL;
  readonly ro = computed(() => !this.sessions.isSuper());
  readonly cfg = signal<CampusConfig | null>(null);
  readonly fields = signal<FieldEdit[]>([]);
  readonly tests = signal<TestEdit[]>([]);
  readonly dirty = signal(false);
  readonly saving = signal(false);
  readonly matrix = signal<Record<string, Record<string, boolean> | undefined>>({});

  /* welcome copy as plain text areas */
  pointsText = '';
  statsText = '';

  readonly batches = computed(() => this.ctx.batches());
  readonly deptList = computed(() => {
    const c = this.cfg();
    if (!c) return [];
    const d = c.fields.find(f => f.id === 'department');
    return d?.options?.length ? d.options.slice() : (c.profile.departments || []).filter(x => isActive(x)).map(x => x.name);
  });
  readonly tunable = computed(() => this.fields().filter(e => !CORE.includes(e.f.id) && isActive(e.f)).map(e => e.f));

  constructor() {
    effect(() => {
      const id = this.ctx.campusId();
      if (id) untracked(() => { const c = this.campuses.byId(id); if (c) this.load(c); });
    });
  }

  load(src: CampusConfig): void {
    const c = clone(src);
    this.cfg.set(c);
    this.pointsText = (c.welcome.points || []).join('\n');
    this.statsText = (c.welcome.stats || []).map(s => s.value + ' | ' + s.label).join('\n');
    this.fields.set(c.fields.map(f => this.fieldEdit(f, false)));
    this.tests.set(c.tests.map(t => this.testEdit(t, false)));
    this.buildMatrix();
    this.dirty.set(false);
  }

  private fieldEdit(f: FormField, isNew: boolean): FieldEdit {
    return {
      f, open: isNew, isNew,
      optionsText: (f.options || []).join(', '),
      mapText: Object.entries(f.optionsMap || {}).map(([k, v]) => k + ' > ' + v.join(', ')).join('\n'),
      showField: f.showIf?.field || '', showValues: (f.showIf?.values || []).join(', ')
    };
  }
  private testEdit(t: Assessment, isNew: boolean): TestEdit {
    const a = t.audience || { departments: [], programmes: [], sessions: [], batches: [] };
    return { t, open: isNew, isNew, sections: t.sections.join(', '), depts: a.departments.join(', '), progs: a.programmes.join(', '), sessions: a.sessions.join(', ') };
  }

  touch(): void { if (!this.ro()) this.dirty.set(true); }
  liveTheme(): void { this.campuses.applyTheme(this.cfg()); this.touch(); }
  labelOf(id: string): string { return this.fields().find(e => e.f.id === id)?.f.label || id; }
  isCore(f: FormField): boolean { return CORE.includes(f.id); }
  isRestricted(e: TestEdit): boolean {
    return !!(csvList(e.depts).length || csvList(e.progs).length || csvList(e.sessions).length || (e.t.audience.batches || []).length);
  }
  hasBatch(e: TestEdit, id: string): boolean { return (e.t.audience.batches || []).includes(id); }
  toggleBatch(e: TestEdit, id: string, on: boolean): void {
    const b = new Set(e.t.audience.batches || []);
    if (on) b.add(id); else b.delete(id);
    e.t.audience.batches = [...b];
    this.touch();
  }

  /* ---------------- logo ---------------- */
  logoUp(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { this.cfg.update(c => (c ? { ...c, logo: String(r.result) } : c)); this.touch(); this.toast.show('Logo loaded — remember to save.', 'info'); };
    r.readAsDataURL(f);
  }

  /* ---------------- fields ---------------- */
  move<T>(list: T[], i: number, d: number): T[] {
    const j = i + d;
    if (j < 0 || j >= list.length) return list;
    const out = list.slice();
    [out[i], out[j]] = [out[j], out[i]];
    return out;
  }
  moveField(i: number, d: number): void { this.fields.set(this.move(this.fields(), i, d)); this.touch(); }
  moveTest(i: number, d: number): void { this.tests.set(this.move(this.tests(), i, d)); this.touch(); }
  toggleField(i: number): void { this.fields.update(l => l.map((e, k) => (k === i ? { ...e, open: !e.open } : e))); }
  toggleTestOpen(i: number): void { this.tests.update(l => l.map((e, k) => (k === i ? { ...e, open: !e.open } : e))); }

  addField(): void {
    const n = this.fields().length + 1;
    this.fields.update(l => [...l, this.fieldEdit({ id: 'field' + n, label: 'New field ' + n, type: 'text', required: false, half: true, placeholder: '', help: '', options: [], section: 'Academic Details', prefill: '', lock: false, status: 'active' }, true)]);
    this.touch();
  }
  discardField(i: number): void { this.fields.update(l => l.filter((_, k) => k !== i)); }

  addTest(): void {
    const c = this.cfg()!;
    const n = this.tests().length + 1;
    this.tests.update(l => [...l, this.testEdit({
      id: c.id + '-test-' + n, name: 'New assessment ' + n, tag: 'Assessment', durationMin: 60, questions: 50,
      sections: ['Quantitative Aptitude', 'Logical Reasoning'], window: '', attempts: '1 attempt per student',
      audience: { departments: [], programmes: [], sessions: [], batches: [] }, status: 'active'
    }, true)]);
    this.touch();
  }
  discardTest(i: number): void { this.tests.update(l => l.filter((_, k) => k !== i)); }

  /** switch a saved field / test on or off right away (audited); unsaved edits on the page are kept */
  async status(kind: 'field' | 'assessment', id: string, label: string, isOn: boolean): Promise<void> {
    const c = this.cfg()!;
    const ok = await this.statuses.change(kind, c.id, id, label, isOn ? 'inactive' : 'active', {
      what: kind === 'field' ? 'field' : 'assessment',
      note: kind === 'field' ? 'Students stop seeing it on the form; answers already given are kept.' : 'Students stop seeing it; results already in stay in the reports.'
    });
    if (!ok) return;
    const fresh = this.campuses.byId(c.id)!;
    if (kind === 'field') {
      const src = fresh.fields.find(f => f.id === id);
      this.fields.update(l => l.map(e => (e.f.id === id ? { ...e, f: { ...e.f, status: src?.status, statusReason: src?.statusReason } } : e)));
    } else {
      const src = fresh.tests.find(t => t.id === id);
      this.tests.update(l => l.map(e => (e.t.id === id ? { ...e, t: { ...e.t, status: src?.status, statusReason: src?.statusReason } } : e)));
    }
    this.buildMatrix();
  }

  /* ---------------- department-wise form ---------------- */
  private deptOn(f: FormField, d: string): boolean {
    const r = f.showIf;
    if (!r || r.field !== 'department') return true;
    return (r.values || []).indexOf(d) > -1;
  }
  buildMatrix(): void {
    const m: Record<string, Record<string, boolean>> = {};
    this.tunable().forEach(f => { m[f.id] = {}; this.deptList().forEach(d => { m[f.id][d] = this.deptOn(f, d); }); });
    this.matrix.set(m);
  }
  setCell(fid: string, d: string, on: boolean): void { this.matrix.update(m => ({ ...m, [fid]: { ...m[fid], [d]: on } })); this.touch(); }
  toggleCol(d: string): void {
    const anyOff = this.tunable().some(f => !this.matrix()[f.id]?.[d]);
    this.matrix.update(m => { const n = { ...m }; this.tunable().forEach(f => { n[f.id] = { ...n[f.id], [d]: anyOff }; }); return n; });
    this.touch();
  }
  allOn(): void {
    this.matrix.update(m => { const n = { ...m }; this.tunable().forEach(f => { this.deptList().forEach(d => { n[f.id] = { ...n[f.id], [d]: true }; }); }); return n; });
    this.touch();
  }
  fieldNote(f: FormField): string {
    const row = this.matrix()[f.id] || {};
    const on = this.deptList().filter(d => row[d]).length;
    return on === this.deptList().length ? '' : on === 0 ? 'hidden everywhere' : 'varies by department';
  }
  short(d: string): string { return d.length > 20 ? d.slice(0, 19) + '…' : d; }

  /* ---------------- save ---------------- */
  private collect(): CampusConfig | null {
    const c = clone(this.cfg()!);
    const ids = new Set<string>();
    for (const e of this.fields()) {
      const f = e.f;
      f.id = (f.id || '').replace(/[^A-Za-z0-9_]/g, '');
      if (!f.id) { this.toast.warn('Every field needs an id.'); return null; }
      if (ids.has(f.id)) { this.toast.warn('Two fields use the id "' + f.id + '".'); return null; }
      ids.add(f.id);
      f.options = csvList(e.optionsText);
      if (f.dependsOn) {
        const map: Record<string, string[]> = {};
        lines(e.mapText).forEach(l => { const i = l.indexOf('>'); if (i < 0) return; const k = l.slice(0, i).trim(); if (k) map[k] = csvList(l.slice(i + 1)); });
        f.optionsMap = map;
      } else { delete f.dependsOn; delete f.optionsMap; }
      const vals = csvList(e.showValues);
      if (e.showField && vals.length) f.showIf = { field: e.showField, values: vals }; else delete f.showIf;
    }
    /* the department matrix wins for the fields it covers */
    const depts = this.deptList();
    this.tunable().forEach(tf => {
      const f = this.fields().find(e => e.f.id === tf.id)?.f;
      if (!f) return;
      const on = depts.filter(d => this.matrix()[tf.id]?.[d]);
      if (on.length === depts.length) { if (f.showIf?.field === 'department') delete f.showIf; }
      else if (!f.showIf || f.showIf.field === 'department') f.showIf = { field: 'department', values: on };
    });
    c.fields = this.fields().map(e => e.f);
    const tids = new Set<string>();
    for (const e of this.tests()) {
      e.t.id = (e.t.id || '').replace(/[^A-Za-z0-9_-]/g, '');
      if (!e.t.id || tids.has(e.t.id)) { this.toast.warn('Every assessment needs its own test id.'); return null; }
      tids.add(e.t.id);
      e.t.sections = csvList(e.sections);
      e.t.audience = { departments: csvList(e.depts), programmes: csvList(e.progs), sessions: csvList(e.sessions), batches: e.t.audience.batches || [] };
    }
    c.tests = this.tests().map(e => e.t);
    c.welcome.points = lines(this.pointsText);
    c.welcome.stats = lines(this.statsText).map(l => { const p = l.split('|'); return { value: (p[0] || '').trim(), label: (p[1] || '').trim() }; });
    c.logoHeight = Math.max(20, Math.min(64, +c.logoHeight || 34));
    c.verification.otpLength = Math.max(4, Math.min(8, +c.verification.otpLength || 6));
    return c;
  }

  async save(): Promise<void> {
    if (this.ro()) return;
    const c = this.collect();
    if (!c) return;
    this.saving.set(true);
    try {
      const saved = await this.campuses.save(c, 'Form builder: branding, form and assessments');
      this.load(saved);
      this.toast.ok('Configuration saved. The live form uses it right away.');
    } catch (e) {
      this.toast.warn(asApiError(e).message);
    } finally {
      this.saving.set(false);
    }
  }

  async discard(): Promise<void> {
    if (this.dirty() && !(await this.dialogs.confirm('Discard unsaved changes?', 'The form goes back to the last saved version.', 'Discard'))) return;
    const c = this.campuses.byId(this.cfg()!.id);
    if (c) { this.load(c); this.campuses.applyTheme(c); }
  }

  exportJson(): void { downloadJson((this.cfg()?.id || 'campus') + '-config.json', this.collect() || this.cfg()); }

  importJson(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(String(r.result));
        const obj = j.colleges ? (j.colleges[this.cfg()!.id] || Object.values(j.colleges)[0]) : j;
        if (!obj || !obj.fields) throw new Error('no fields');
        const merged = { ...this.cfg()!, ...obj, id: this.cfg()!.id, externalClientId: this.cfg()!.externalClientId, batches: this.cfg()!.batches, status: this.cfg()!.status };
        this.load(merged);
        this.dirty.set(true);
        this.toast.show('Configuration loaded from the file — review it, then save.', 'info');
      } catch {
        this.toast.warn('That file is not a valid campus configuration.');
      }
    };
    r.readAsText(file);
    (ev.target as HTMLInputElement).value = '';
  }
}
