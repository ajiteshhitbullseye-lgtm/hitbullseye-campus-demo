import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Assessment, Registration, TestResult } from '../../core/models';
import { ConsoleContext } from '../../core/services/console-context.service';
import { CampusPeople, Funnel, PeopleService } from '../../core/services/people.service';
import { SessionStore } from '../../core/session.store';
import { audienceOk, band, downloadCsv, initials, isActive } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';
import { FunnelComponent, FunnelKey } from './funnel.component';

/** Cohort analytics for one campus (and batch): funnel, scores, sections, departments. */
@Component({
  selector: 'hb-analytics',
  standalone: true,
  imports: [DecimalPipe, FormsModule, IconComponent, FunnelComponent],
  templateUrl: './analytics.component.html'
})
export class AnalyticsComponent {
  readonly ctx = inject(ConsoleContext);
  private people = inject(PeopleService);
  private router = inject(Router);
  readonly sessions = inject(SessionStore);

  readonly data = signal<CampusPeople | null>(null);
  readonly funnel = signal<Funnel | null>(null);
  readonly testId = signal('');
  readonly dept = signal('');
  readonly sess = signal('');
  readonly initials = initials;
  readonly band = band;

  readonly tests = computed<Assessment[]>(() => this.ctx.campus()?.tests || []);
  readonly test = computed<Assessment | null>(() => this.tests().find(t => t.id === this.testId()) || this.tests().find(t => isActive(t)) || this.tests()[0] || null);
  readonly regs = computed(() => (this.data()?.registrations || []).filter(r => isActive(r)));
  readonly depts = computed(() => [...new Set(this.regs().map(r => r.department).filter(Boolean))].sort());
  readonly sessionsList = computed(() => [...new Set(this.regs().map(r => r.session).filter(Boolean))].sort());

  /** the students this paper is open to, in the current filter */
  readonly cohort = computed(() => {
    const t = this.test();
    return this.regs().filter(x => (!this.dept() || x.department === this.dept()) && (!this.sess() || x.session === this.sess()) && (!t || audienceOk(t, x)));
  });
  readonly resultOf = (x: Registration): TestResult | null => (this.test() ? x.results?.[this.test()!.id] || null : null);
  readonly done = computed(() => this.cohort().filter(x => this.resultOf(x)));
  readonly pcts = computed(() => this.done().map(x => this.resultOf(x)!.pct));
  readonly kpi = computed(() => {
    const p = this.pcts(), d = this.done();
    const avg = p.length ? Math.round(p.reduce((a, b) => a + b, 0) / p.length) : 0;
    const avgP = d.length ? Math.round(d.reduce((a, b) => a + this.resultOf(b)!.percentile, 0) / d.length) : 0;
    const pass = p.filter(x => x >= 40).length;
    return { avg, avgP, pass, best: p.length ? Math.max(...p) : 0 };
  });
  readonly hist = computed(() => {
    const b = [0, 0, 0, 0, 0];
    this.pcts().forEach(p => b[Math.min(4, Math.floor(p / 20))]++);
    const max = Math.max(...b, 1);
    return b.map((n, i) => ({ n, h: Math.max(2, Math.round((n * 100) / max)), cls: i < 2 ? 'low' : i > 3 ? 'high' : '', label: ['0-20', '20-40', '40-60', '60-80', '80-100'][i] }));
  });
  readonly sections = computed(() => {
    const agg: Record<string, { sum: number; n: number; acc: number }> = {};
    this.done().forEach(x => (this.resultOf(x)!.sections || []).forEach(s => {
      const a = agg[s.name] || (agg[s.name] = { sum: 0, n: 0, acc: 0 });
      a.sum += s.pct || 0; a.acc += s.accuracy || 0; a.n++;
    }));
    return Object.keys(agg).map(k => ({ name: k, p: Math.round(agg[k].sum / agg[k].n), acc: Math.round(agg[k].acc / agg[k].n) }))
      .sort((a, b) => b.p - a.p);
  });
  readonly byDept = computed(() => {
    const m: Record<string, { n: number; done: number; sum: number; best: number; weak: Record<string, { sum: number; n: number }> }> = {};
    this.cohort().forEach(x => {
      const d = m[x.department || '—'] || (m[x.department || '—'] = { n: 0, done: 0, sum: 0, best: 0, weak: {} });
      d.n++;
      const r = this.resultOf(x);
      if (r) {
        d.done++; d.sum += r.pct; d.best = Math.max(d.best, r.pct);
        (r.sections || []).forEach(s => { const w = d.weak[s.name] || (d.weak[s.name] = { sum: 0, n: 0 }); w.sum += s.pct || 0; w.n++; });
      }
    });
    return Object.keys(m).map(k => {
      const d = m[k];
      const weakest = Object.keys(d.weak).sort((a, b) => d.weak[a].sum / d.weak[a].n - d.weak[b].sum / d.weak[b].n)[0] || '—';
      return { name: k, n: d.n, done: d.done, avg: d.done ? Math.round(d.sum / d.done) : null, best: d.done ? d.best : null, weakest };
    }).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
  });
  readonly top = computed(() => this.done().slice().sort((a, b) => this.resultOf(b)!.pct - this.resultOf(a)!.pct).slice(0, 10));
  readonly low = computed(() => this.done().filter(x => this.resultOf(x)!.pct < 40).sort((a, b) => this.resultOf(a)!.pct - this.resultOf(b)!.pct));
  readonly never = computed(() => this.cohort().filter(x => !this.resultOf(x)).slice(0, 8));

  constructor() {
    effect(() => {
      const id = this.ctx.campusId(), b = this.ctx.batchId();
      if (id) untracked(() => this.load(id, b));
    });
  }

  private async load(campusId: string, batchId: string): Promise<void> {
    this.data.set(null);
    const p = await this.people.load(campusId, batchId || undefined);
    this.data.set(p);
    this.funnel.set(this.people.funnel(p, this.ctx.batchesInView()));
    this.dept.set(''); this.sess.set('');
  }

  goRoster(k: FunnelKey): void {
    this.router.navigate(['/console/roster'], { queryParams: { stage: k || null } });
  }
  pickDept(d: string): void { this.dept.set(d === '—' ? '' : d); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  reset(): void { this.dept.set(''); this.sess.set(''); }
  open(x: Registration): void {
    this.router.navigate(['/console/report', x.id], { queryParams: { test: this.test()?.id } });
  }

  csv(): void {
    const t = this.test();
    downloadCsv((this.ctx.campusId() || 'campus') + '-' + (t?.id || 'all') + '-summary.csv',
      ['Name', 'University ID', 'Batch', 'Department', 'Programme', 'Course', 'Session', 'Assessment', 'Status', 'Score', 'Max', 'Percent', 'Percentile', 'Accuracy'],
      this.cohort().map(x => {
        const r = this.resultOf(x);
        return [x.name, x.uid, this.ctx.batches().find(b => b.batchId === x.batchId)?.name || x.batchId, x.department, x.programme, x.course, x.session, t?.name || '',
          r ? 'Attempted' : 'Pending', r?.score ?? '', r?.max ?? '', r?.pct ?? '', r?.percentile ?? '', r?.accuracy ?? ''];
      }));
  }

  print(): void { window.print(); }
}
