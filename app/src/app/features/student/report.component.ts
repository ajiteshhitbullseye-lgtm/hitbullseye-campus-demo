/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnInit, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HBA, HBR } from '../../core/analytics/legacy';
import { TestPlatformService } from '../../core/analytics/test-platform.service';
import { PortalApi } from '../../core/api/portal-api';
import { CampusConfig, Registration } from '../../core/models';
import { CampusService } from '../../core/services/campus.service';
import { ToastService } from '../../core/services/toast.service';
import { SessionStore } from '../../core/session.store';
import { initials, testsFor } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';
import { LegacyView, LegacyViewComponent } from '../../shared/legacy-view.component';
import { StudentNavComponent } from './student-nav.component';

/**
 * The performance report. Every number comes from the analytics engine
 * (HBA) over the student's question-level rows; the views themselves are
 * drawn by the unchanged report renderer (HBR) inside <hb-legacy-view>.
 * Students see their own report; placement cells see any student of
 * their campus (HQ: any student).
 */
@Component({
  selector: 'hb-report',
  standalone: true,
  imports: [RouterLink, IconComponent, LegacyViewComponent, StudentNavComponent],
  templateUrl: './report.component.html'
})
export class ReportComponent implements OnInit {
  readonly studentId = input<string>('');
  readonly test = input<string>('');
  readonly view = input<string>('');
  readonly fresh = input<string>('', { alias: 'new' });

  private sessions = inject(SessionStore);
  private api = inject(PortalApi);
  private campuses = inject(CampusService);
  private platform = inject(TestPlatformService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly st = signal<Registration | null>(null);
  readonly c = signal<CampusConfig | null>(null);
  readonly notFound = signal(false);
  readonly isAdmin = computed(() => this.sessions.isAdmin());
  readonly data = signal<any>(null);
  readonly rep = signal<any>(null);
  readonly legacy = signal<LegacyView | null>(null);
  readonly initials = initials;

  /* which view */
  readonly testIds = computed<string[]>(() => (this.rep()?.tests || []).map((t: any) => t.testId));
  readonly practiceIds = computed<string[]>(() => (this.rep()?.practice || []).map((t: any) => t.testId));
  readonly microId = computed(() => {
    const w = this.test();
    if (w && this.practiceIds().indexOf(w) > -1) return w;
    if (!this.showOverview() && !this.testIds().length) return this.practiceIds()[this.practiceIds().length - 1] || null;
    return null;
  });
  readonly showOverview = computed(() => !this.test() && this.view() !== 'progress' && this.view() !== 'test');
  readonly showProgress = computed(() => !this.showOverview() && !this.microIdRaw() && this.rep()?.mode === 'journey' &&
    (this.view() === 'progress' || (!this.test() && this.view() !== 'test')));
  private microIdRaw = computed(() => { const w = this.test(); return w && this.practiceIds().indexOf(w) > -1 ? w : null; });
  readonly testId = computed(() => {
    const w = this.test();
    return w && this.testIds().indexOf(w) > -1 ? w : this.testIds()[this.testIds().length - 1];
  });
  readonly curId = computed(() => this.microId() || (!this.showOverview() && !this.showProgress() ? this.testId() : ''));
  readonly testsDesc = computed(() => (this.rep()?.tests || []).slice().reverse());
  readonly practiceDesc = computed(() => (this.rep()?.practice || []).slice().reverse());
  readonly empty = computed(() => this.rep()?.mode === 'empty' && !(this.rep()?.practice || []).length);
  readonly simOffer = computed(() => !this.isAdmin() && !this.microId() && !this.showOverview() && this.rep()?.mode === 'single' &&
    !!this.st() && !this.platform.hasSimulatedJourney(this.st()!.id));

  constructor() {
    effect(() => {
      /* re-render when the query changes (test / view) */
      this.test(); this.view();
      const st = this.st();
      if (st) untracked(() => this.paint());
    });
  }

  async ngOnInit(): Promise<void> {
    const s = this.sessions.session();
    const id = this.studentId() || s?.studentId;
    const st = id ? await firstValueFrom(this.api.getRegistration(id)) : null;
    if (!st || (s?.role === 'student' && st.id !== s.studentId) || (s?.role === 'college_admin' && st.campusId !== s.campusId)) {
      this.notFound.set(true);
      return;
    }
    const c = this.campuses.byId(st.campusId);
    this.campuses.applyTheme(c, st.name + ' · Report');
    this.c.set(c);
    const d = this.platform.dataFor(st.id);
    this.data.set(d);
    this.rep.set(HBA().buildStudentReport(d));
    this.st.set(st);
  }

  /** link to another view of this report */
  href(o: { test?: string; view?: string }): string {
    const base = this.isAdmin() ? '/console/report/' + encodeURIComponent(this.st()!.id) : '/me/report';
    const q: string[] = [];
    if (o.test) q.push('test=' + encodeURIComponent(o.test));
    if (o.view) q.push('view=' + o.view);
    return base + (q.length ? '?' + q.join('&') : '');
  }

  open(o: { test?: string; view?: string }): void {
    this.router.navigateByUrl(this.href(o));
  }

  private buildView(): LegacyView | null {
    const st = this.st(), c = this.c(), data = this.data(), rep = this.rep();
    if (!st || !c || !data || !rep || this.empty()) return null;
    const ctx = {
      st: { ...st, batch: st.session, collegeId: st.campusId, rollNo: st.uid }, data, college: c,
      href: (o: any) => this.href(o),
      rank: (tid: string, score: number) => this.platform.rankOf(tid, score),
      key: (tid: string) => this.platform.answerKey(tid),
      nameOf: (sid: string) => this.platform.registrations().find(x => x.id === sid)?.name || null,
      support: this.campuses.brand()?.supportEmail || '',
      catalogue: { 'Assessments': testsFor(c, st).length, 'Placement Practice Series': this.platform.PRACTICE.length, 'Quick practice': this.platform.QUICK.length }
    };
    const R = HBR();
    if (this.showOverview()) return R.overviewView(ctx, rep.overview);
    if (this.microId()) return R.questionView(ctx, HBA().buildMicroReport(data, this.microId()));
    if (this.showProgress()) return R.progressView(ctx, rep.journey);
    return R.testView(ctx, HBA().buildTestReport(data, this.testId()));
  }

  private paint(): void {
    if (this.fresh()) {
      const w = this.platform.world();
      const tid = this.microId() || this.testId();
      const r = this.microId() ? HBA().buildMicroReport(this.data(), tid) : HBA().buildTestReport(this.data(), tid);
      const peers = (w.idx.student_test_analytics_v2.get(tid) || []).length;
      HBR().analysing({ questions: r ? r.questions.length : 0, rows: w.rows.length, students: w.idx.student_analytics_v2.size, peers }, () => {
        this.legacy.set(this.buildView());
        this.toast.ok('Your report is ready. Well done on completing the test!', 6000);
        this.router.navigate([], { queryParams: { new: null }, queryParamsHandling: 'merge', replaceUrl: true });
      });
      return;
    }
    this.legacy.set(this.buildView());
  }

  pick(v: string): void { if (v) this.open({ test: v }); }

  simulate(): void {
    this.platform.simulateJourney(this.st()!.id);
    const d = this.platform.dataFor(this.st()!.id);
    this.data.set(d);
    this.rep.set(HBA().buildStudentReport(d));
    this.open({ view: 'progress' });
  }

  label(t: any, practice: boolean): string {
    return practice
      ? t.testName + '  ·  ' + (t.scorePct >= 1 ? 'right' : Math.round(t.scorePct * 100) + '%')
      : t.testName.replace(/—.*$/, '').trim() + '  ·  ' + Math.round(t.scorePct * 100) + '%';
  }

  print(): void { window.print(); }
  batchName(): string { return this.campuses.batchName(this.st()?.batchId); }
}
