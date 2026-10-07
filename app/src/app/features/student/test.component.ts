/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Paper, TestPlatformService } from '../../core/analytics/test-platform.service';
import { PortalApi } from '../../core/api/portal-api';
import { CampusConfig, Registration } from '../../core/models';
import { CampusService } from '../../core/services/campus.service';
import { DialogService } from '../../core/services/dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { SessionStore } from '../../core/session.store';
import { testsFor } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';

interface Tel { firstViewedAt: string | null; attemptedAt: string | null; ms: number; changes: number; visits: number; }

/**
 * Plays the test engine for the demo: a short version of the paper, with
 * the time on every question recorded. On submit each answer becomes one
 * `student_question_analytics` row — exactly what the real engine writes.
 */
@Component({
  selector: 'hb-test',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './test.component.html'
})
export class TestComponent implements OnInit, OnDestroy {
  readonly testId = input<string>('');
  readonly practiceId = input<string>('');
  private sessions = inject(SessionStore);
  private api = inject(PortalApi);
  private campuses = inject(CampusService);
  private platform = inject(TestPlatformService);
  private dialogs = inject(DialogService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly st = signal<Registration | null>(null);
  readonly c = signal<CampusConfig | null>(null);
  readonly paper = signal<Paper | null>(null);
  readonly testName = signal('');
  private testKey = '';
  private isPractice = false;

  readonly cur = signal(0);
  readonly answers = signal<number[]>([]);
  readonly codes = signal<(string | null)[]>([]);
  readonly runOut = signal<{ cls: string; text: string }[]>([]);
  readonly left = signal(0);
  readonly submitting = signal(false);
  private tel: Tel[] = [];
  private shownAt = Date.now();
  private tick: ReturnType<typeof setInterval> | null = null;

  readonly q = computed(() => this.paper()?.questions[this.cur()] || null);
  readonly answered = computed(() => this.answers().filter(a => a > -1).length);
  readonly total = computed(() => this.paper()?.questions.length || 0);
  readonly clock = computed(() => {
    const t = Math.max(0, this.left()), m = Math.floor(t / 60), s = t % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  });
  readonly palette = computed(() => {
    let last: string | null = null;
    return (this.paper()?.questions || []).map((p, i) => {
      const head = p.sectionName !== last ? p.sectionName : null;
      last = p.sectionName;
      return { i, head };
    });
  });

  async ngOnInit(): Promise<void> {
    const s = this.sessions.session();
    if (!s?.studentId) return;
    const st = await firstValueFrom(this.api.getRegistration(s.studentId));
    if (!st) return;
    const c = this.campuses.byId(st.campusId)!;
    this.campuses.applyTheme(c, 'Test · Hitbullseye');
    this.st.set(st);
    this.c.set(c);

    let paper: Paper;
    let minutes: number;
    const practice = [...this.platform.PRACTICE, ...this.platform.QUICK].find(p => p.testId === this.practiceId());
    if (practice) {
      paper = practice;
      this.isPractice = true;
      const hasCode = practice.questions.some(q => q.coding);
      minutes = hasCode ? 20 : Math.max(3, Math.ceil(practice.questions.length * 1.5));
      this.testName.set(practice.testName);
      this.testKey = practice.testId;
    } else {
      const mine = testsFor(c, st);
      let t = mine.find(x => x.id === this.testId());
      if (!t) {
        if (this.testId()) this.toast.warn('That assessment is not open for you.');
        t = mine[0];
      }
      if (!t) { this.router.navigateByUrl('/me'); return; }
      paper = this.platform.paperFor(t);
      minutes = Math.min(t.durationMin, Math.ceil(paper.questions.length * 1.5));
      this.testName.set(t.name);
      this.testKey = t.id;
    }
    this.paper.set(paper);
    this.answers.set(paper.questions.map(() => -1));
    this.codes.set(paper.questions.map(q => (q.coding ? q.starter : null)));
    this.tel = paper.questions.map(() => ({ firstViewedAt: null, attemptedAt: null, ms: 0, changes: 0, visits: 0 }));
    this.left.set(minutes * 60);
    this.arrive(0);
    this.tick = setInterval(() => {
      this.left.update(v => v - 1);
      if (this.left() <= 0) {
        this.stop();
        this.toast.show('Time is up — submitting your test.', 'clock');
        this.submit(true);
      }
    }, 1000);
  }

  ngOnDestroy(): void { this.stop(); }
  private stop(): void { if (this.tick) { clearInterval(this.tick); this.tick = null; } }

  private leave(): void {
    const now = Date.now();
    this.tel[this.cur()].ms += now - this.shownAt;
    this.shownAt = now;
  }
  private arrive(i: number): void {
    this.cur.set(i);
    this.shownAt = Date.now();
    const t = this.tel[i];
    t.visits++;
    if (!t.firstViewedAt) t.firstViewedAt = new Date().toISOString();
    this.runOut.set([]);
  }

  pick(i: number): void {
    const cur = this.cur();
    const a = [...this.answers()];
    if (a[cur] !== i) {
      if (a[cur] > -1) this.tel[cur].changes++;
      a[cur] = i;
      this.tel[cur].attemptedAt = new Date().toISOString();
      this.answers.set(a);
    }
  }
  jump(i: number): void { this.leave(); this.arrive(i); }
  go(d: number): void {
    const n = this.cur() + d;
    if (n < 0) return;
    if (n >= this.total()) { this.toast.show('That was the last question. Submit when you are ready.', 'info'); return; }
    this.leave(); this.arrive(n);
  }
  clear(): void {
    const cur = this.cur();
    const a = [...this.answers()]; a[cur] = -1; this.answers.set(a);
    this.tel[cur].attemptedAt = null;
    if (this.q()?.coding) { const c = [...this.codes()]; c[cur] = this.q().starter; this.codes.set(c); }
  }

  /* ---------------- coding ---------------- */
  setCode(v: string): void {
    const cur = this.cur(), q = this.q();
    const c = [...this.codes()]; c[cur] = v; this.codes.set(c);
    const written = !!v.trim() && v.trim() !== String(q.starter).trim();
    const a = [...this.answers()]; a[cur] = written ? 0 : -1; this.answers.set(a);
    if (written) this.tel[cur].attemptedAt = new Date().toISOString();
  }
  codeKey(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const ta = e.target as HTMLTextAreaElement, s = ta.selectionStart;
    ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd);
    ta.selectionStart = ta.selectionEnd = s + 2;
    this.setCode(ta.value);
  }
  sampleText(q: any, s: any[]): string {
    return q.fn + '(' + s[0].map((a: unknown) => JSON.stringify(a)).join(', ') + ')  →  ' + JSON.stringify(s[1]);
  }
  async run(): Promise<void> {
    const q = this.q();
    this.runOut.set([{ cls: '', text: 'Running…' }]);
    const res = await this.platform.grade(q.questionId, this.codes()[this.cur()] || '', 'samples');
    if (res.error) { this.runOut.set([{ cls: 'bad', text: res.error }]); return; }
    this.runOut.set(res.results.map((t: any) => ({
      cls: t.ok ? 'ok' : 'bad',
      text: (t.ok ? '✓ ' : '✗ ') + q.fn + '(' + t.input.map((a: unknown) => JSON.stringify(a)).join(', ') + ') → ' +
        (t.error ? 'error: ' + t.error : JSON.stringify(t.got)) + (t.ok ? '' : '  (expected ' + JSON.stringify(t.expected) + ')')
    })));
  }

  /* ---------------- submit ---------------- */
  async submit(auto = false): Promise<void> {
    if (this.submitting()) return;
    const remaining = this.total() - this.answered();
    if (!auto && remaining > 0) {
      const ok = await this.dialogs.confirm('Submit the test?', remaining + ' question(s) are still unanswered. Submit anyway?', 'Submit test');
      if (!ok) return;
    }
    this.submitting.set(true);
    this.stop();
    this.leave();
    const paper = this.paper()!;
    const graded: Record<number, { passed: number; total: number }> = {};
    const hasCode = paper.questions.some(q => q.coding);
    if (hasCode) this.toast.show('Running your code against the hidden tests…', 'rocket', 4000);
    await Promise.all(paper.questions.map(async (q, i) => {
      if (!q.coding || this.answers()[i] === -1) return;
      const res = await this.platform.grade(q.questionId, this.codes()[i] || '', 'tests');
      graded[i] = { passed: res.results.filter((x: any) => x.ok).length, total: q.tests.length };
    }));

    /* one row per question, exactly the Elasticsearch `student_question_analytics` shape */
    const st = this.st()!;
    const now = new Date().toISOString();
    const rows = paper.questions.map((q, i) => {
      const t = this.tel[i], a = this.answers()[i];
      const att = a > -1;
      let ok = att && a === q.answer;
      let score = att ? (ok ? q.marks : -q.negative) : 0;
      if (q.coding) {
        const g = graded[i];
        ok = !!g && g.passed === g.total;
        score = g ? Math.round((g.passed / g.total) * q.marks * 10) / 10 : 0;
      }
      return {
        studentId: st.id, testId: this.testKey, testName: this.testName(),
        questionId: q.questionId, uniqueQno: q.uniqueQno, qno: q.qno,
        sectionId: q.sectionId, sectionName: q.sectionName,
        areaId: q.areaId, areaTitle: q.areaTitle, subAreaId: q.subAreaId, subAreaName: q.subAreaName,
        moduleId: paper.moduleId, moduleName: paper.moduleName, lod: q.lod, typeOfQues: q.typeOfQues, attemptType: 'test',
        isAttempted: att, isCorrect: ok, score, questionMarks: q.marks,
        timeTaken: Math.max(1, Math.round(t.ms / 1000)),
        selectedAnswer: att && !q.coding ? 'ABCDEFGH'[a] : null,
        firstViewedAt: t.firstViewedAt, attemptedAt: att ? t.attemptedAt : null,
        createdAt: t.firstViewedAt || now, updatedAt: now
      };
    });
    await this.platform.recordAttempt(rows, this.isPractice ? null : { registrationId: st.id, testId: this.testKey });
    this.router.navigate(['/me/report'], { queryParams: { new: 1, test: this.testKey } });
  }

  letter(i: number): string { return 'ABCDEFGH'[i]; }
}
