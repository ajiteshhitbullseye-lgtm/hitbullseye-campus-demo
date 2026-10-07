import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TestPlatformService } from '../../core/analytics/test-platform.service';
import { PortalApi } from '../../core/api/portal-api';
import { Registration, TestResult } from '../../core/models';
import { ConsoleContext } from '../../core/services/console-context.service';
import { StatusService } from '../../core/services/status.service';
import { ToastService } from '../../core/services/toast.service';
import { SessionStore } from '../../core/session.store';
import { audienceOk, band, downloadCsv, fmtDate, initials, isActive, latestResult, lc, resultList, testsFor } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

/** Every registration and every attempt for the campus in view. Students are never deleted — only made inactive. */
@Component({
  selector: 'hb-students',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, StatusBadgeComponent],
  templateUrl: './students.component.html'
})
export class StudentsComponent {
  readonly ctx = inject(ConsoleContext);
  readonly sessions = inject(SessionStore);
  private api = inject(PortalApi);
  private statuses = inject(StatusService);
  private platform = inject(TestPlatformService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly all = signal<Registration[] | null>(null);
  readonly q = signal('');
  readonly testId = signal('');
  readonly dept = signal('');
  readonly course = signal('');
  readonly sess = signal('');
  readonly attempt = signal('');
  readonly active = signal<'active' | 'inactive' | 'all'>('active');
  readonly sort = signal('score');
  readonly initials = initials;
  readonly band = band;
  readonly fmtDate = fmtDate;

  readonly tests = computed(() => this.ctx.campus()?.tests || []);
  readonly uniq = (k: 'department' | 'course' | 'session') => computed(() => [...new Set((this.all() || []).map(x => x[k]).filter(Boolean))].sort());
  readonly depts = this.uniq('department');
  readonly courses = this.uniq('course');
  readonly sessionsList = this.uniq('session');

  pick(x: Registration): TestResult | null {
    return this.testId() ? x.results?.[this.testId()] || null : latestResult(x);
  }

  readonly filtered = computed(() => {
    const c = this.ctx.campus();
    const q = lc(this.q());
    const t = this.tests().find(x => x.id === this.testId());
    const l = (this.all() || []).filter(x => {
      if (this.active() === 'active' && !isActive(x)) return false;
      if (this.active() === 'inactive' && isActive(x)) return false;
      if (this.dept() && x.department !== this.dept()) return false;
      if (this.course() && x.course !== this.course()) return false;
      if (this.sess() && x.session !== this.sess()) return false;
      if (t && !audienceOk(t, x)) return false;
      if (this.attempt() === 'done' && !this.pick(x)) return false;
      if (this.attempt() === 'pending' && this.pick(x)) return false;
      if (q && lc(x.name + ' ' + x.email + ' ' + x.uid + ' ' + x.regNo).indexOf(q) === -1) return false;
      return !!c;
    });
    const so = this.sort();
    return l.sort((a, b) => {
      if (so === 'name') return a.name.localeCompare(b.name);
      if (so === 'new') return +new Date(b.registeredAt) - +new Date(a.registeredAt);
      const as = this.pick(a)?.pct ?? -1, bs = this.pick(b)?.pct ?? -1;
      return so === 'low' ? as - bs : bs - as;
    });
  });

  readonly kpi = computed(() => {
    const l = this.filtered().filter(x => isActive(x));
    const done = l.filter(x => this.pick(x));
    const avg = done.length ? Math.round(done.reduce((a, b) => a + this.pick(b)!.pct, 0) / done.length) : 0;
    const top: Registration | null = done.slice().sort((a, b) => this.pick(b)!.pct - this.pick(a)!.pct)[0] || null;
    const inactive = (this.all() || []).filter(x => !isActive(x)).length;
    return { n: l.length, done: done.length, avg, top, topName: top ? top.name : '', inactive };
  });

  constructor() {
    effect(() => {
      const id = this.ctx.campusId(), b = this.ctx.batchId();
      if (id) untracked(() => this.load(id, b));
    });
  }

  async load(campusId: string, batchId: string): Promise<void> {
    this.all.set(null);
    this.all.set(await firstValueFrom(this.api.getRegistrations({ campusId, batchId: batchId || undefined })));
  }

  nOpen(x: Registration): number { const c = this.ctx.campus(); return c ? testsFor(c, x).length : 0; }
  nDone(x: Registration): number { return resultList(x).length; }
  batchName(id: string): string { return this.ctx.batches().find(b => b.batchId === id)?.name || id; }

  open(x: Registration): void {
    this.router.navigate(['/console/report', x.id], { queryParams: this.testId() ? { test: this.testId() } : {} });
  }

  async toggle(x: Registration, e: Event): Promise<void> {
    e.stopPropagation();
    const to = isActive(x) ? 'inactive' : 'active';
    const ok = await this.statuses.change('student', x.campusId, x.id, x.name + ' (' + x.uid + ')', to, {
      what: 'student',
      note: to === 'inactive' ? 'They will not be able to sign in, and they leave every count and report until made active again. Their registration and results are kept.' : undefined
    });
    if (ok) { await this.load(x.campusId, this.ctx.batchId()); await this.platform.reloadRegistrations(); }
  }

  csv(): void {
    downloadCsv('hitbullseye-student-reports.csv',
      ['Name', 'Email', 'Phone', 'University ID', 'Registration No', 'Campus', 'Batch', 'Department', 'Programme', 'Course', 'Session', 'Registered On',
        'Status', 'Status reason', 'Assessment', 'Attempt', 'Score', 'Max', 'Percent', 'Percentile', 'Accuracy'],
      this.filtered().map(x => {
        const r = this.pick(x);
        return [x.name, x.email, x.phone, x.uid, x.regNo, this.ctx.campus()?.name, this.batchName(x.batchId), x.department, x.programme, x.course, x.session,
          fmtDate(x.registeredAt), isActive(x) ? 'Active' : 'Inactive', x.statusReason || '', r?.testName || '', r ? 'Attempted' : 'Pending',
          r?.score ?? '', r?.max ?? '', r?.pct ?? '', r?.percentile ?? '', r?.accuracy ?? ''];
      }));
    this.toast.ok('Exported ' + this.filtered().length + ' rows to CSV.');
  }

  clear(): void { this.q.set(''); this.testId.set(''); this.dept.set(''); this.course.set(''); this.sess.set(''); this.attempt.set(''); this.active.set('active'); }
}
