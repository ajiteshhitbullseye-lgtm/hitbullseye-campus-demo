/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HBA, HBC } from '../../core/analytics/legacy';
import { TestPlatformService } from '../../core/analytics/test-platform.service';
import { PortalApi } from '../../core/api/portal-api';
import { Assessment, CampusConfig, Registration, TestResult } from '../../core/models';
import { CampusService } from '../../core/services/campus.service';
import { SessionStore } from '../../core/session.store';
import { audienceText, band, initials, isActive, resultList, testsFor } from '../../core/util';
import { ChartComponent } from '../../shared/chart.component';
import { IconComponent } from '../../shared/icon.component';
import { StudentNavComponent } from './student-nav.component';

interface TestCard { t: Assessment; res: TestResult | null; }

@Component({
  selector: 'hb-dashboard',
  standalone: true,
  imports: [RouterLink, IconComponent, ChartComponent, StudentNavComponent],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private sessions = inject(SessionStore);
  private api = inject(PortalApi);
  private campuses = inject(CampusService);
  readonly platform = inject(TestPlatformService);

  readonly st = signal<Registration | null>(null);
  readonly c = signal<CampusConfig | null>(null);
  readonly rep = signal<any>(null);
  readonly data = signal<any>(null);

  readonly done = computed(() => resultList(this.st()));
  readonly mine = computed<TestCard[]>(() => (this.st() && this.c()
    ? testsFor(this.c()!, this.st()!).map(t => ({ t, res: this.st()!.results[t.id] || null })) : []));
  readonly latest = computed(() => this.done()[0] || null);
  readonly rank = computed(() => {
    const r = this.latest(), st = this.st();
    if (!r || !st) return null;
    const peers = this.platform.registrations()
      .filter(x => x.campusId === st.campusId && isActive(x) && x.results?.[r.testId])
      .sort((a, b) => b.results[r.testId].score - a.results[r.testId].score);
    return { pos: peers.findIndex(x => x.id === st.id) + 1, of: peers.length };
  });
  readonly profileRows = computed(() => Object.values(this.st()?.data || {}).filter(d => !!d.value));
  readonly batchName = computed(() => this.campuses.batchName(this.st()?.batchId));
  readonly subtitle = computed(() => [this.c()?.name, this.st()?.department, this.st()?.programme, this.batchName()].filter(Boolean).join(' \u00b7 '));

  /* practice series + quick practice */
  readonly doneIds = computed(() => new Set<string>((this.data()?.attempts || []).map((x: any) => x.testId)));
  readonly practice = computed(() => {
    const done = this.doneIds();
    const next = this.platform.PRACTICE.find(p => !done.has(p.testId));
    return this.platform.PRACTICE.map(p => {
      const secs: string[] = [];
      p.questions.forEach(q => { if (secs.indexOf(q.sectionName) < 0) secs.push(q.sectionName); });
      const r = done.has(p.testId) ? (this.rep()?.tests || []).find((t: any) => t.testId === p.testId) : null;
      return { p, done: done.has(p.testId), open: next?.testId === p.testId, secs, pct: r ? Math.round(r.scorePct * 100) : null };
    });
  });
  readonly quick = computed(() => {
    const byId: Record<string, any> = {};
    (this.rep()?.practice || []).forEach((t: any) => { byId[t.testId] = t; });
    return this.platform.QUICK.map(p => {
      const q = p.questions[0], d = byId[p.testId];
      const res = d ? (d.scorePct >= 1 ? ['ok', 'Right'] : d.scorePct > 0 ? ['warn', Math.round(d.scorePct * 100) + '% marks'] : ['err', 'Not yet']) : null;
      return { p, q, done: !!d, res, name: p.testName.replace(/^Quick MCQ: |^Coding: /, '') };
    });
  });
  readonly practiceDone = computed(() => this.practice().filter(x => x.done).length);
  readonly quickDone = computed(() => this.quick().filter(x => x.done).length);

  /* progress snapshot */
  readonly journey = computed(() => (this.rep()?.mode === 'journey' ? this.rep().journey : null));
  readonly trendDraw = computed(() => {
    const j = this.journey();
    if (!j) return null;
    const F = HBA().format;
    return HBC().trend(j.tests, (t: any) => t.percentile, {
      max: 100, fmt: F.ordinal, label: 'Percentile', height: 170, sub: (t: any) => F.date(t.takenAt, true)
    });
  });
  readonly lastTest = computed(() => { const j = this.journey(); return j ? j.tests[j.tests.length - 1] : null; });
  readonly ordinal = (n: number | null) => (n == null ? '—' : HBA().format.ordinal(n));

  readonly support = computed(() => this.campuses.brand()?.supportEmail || '');
  readonly mins = (n: number) => Math.ceil(n * 1.5);
  readonly initials = initials;
  readonly band = band;
  readonly audienceText = (t: Assessment) => audienceText(t, id => this.campuses.batchName(id));

  async ngOnInit(): Promise<void> {
    const s = this.sessions.session();
    if (!s?.studentId) return;
    const st = await firstValueFrom(this.api.getRegistration(s.studentId));
    if (!st) return;
    const c = this.campuses.byId(st.campusId);
    this.campuses.applyTheme(c);
    this.campuses.rememberCampus(st.campusId);
    this.c.set(c);
    this.st.set(st);
    const d = this.platform.dataFor(st.id);
    this.data.set(d);
    this.rep.set(HBA().buildStudentReport(d));
  }
}
