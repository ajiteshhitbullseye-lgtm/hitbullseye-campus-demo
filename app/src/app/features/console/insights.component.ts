/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HBA, HBC } from '../../core/analytics/legacy';
import { TestPlatformService } from '../../core/analytics/test-platform.service';
import { Assessment, Registration } from '../../core/models';
import { ConsoleContext } from '../../core/services/console-context.service';
import { SessionStore } from '../../core/session.store';
import { downloadCsv, isActive } from '../../core/util';
import { ChartComponent } from '../../shared/chart.component';
import { IconComponent } from '../../shared/icon.component';

interface Item {
  q: any; views: number; attempts: number; solve: number; acc: number | null; time: number | null; disc: number;
  picks: Record<string, number>; right: string | null; lure: { letter: string; share: number } | null; flags: [string, string][];
}

/** Placement-cell deep insights for one paper: teaching priorities, item analysis, students who need a nudge. */
@Component({
  selector: 'hb-insights',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, ChartComponent],
  templateUrl: './insights.component.html'
})
export class InsightsComponent {
  readonly ctx = inject(ConsoleContext);
  readonly sessions = inject(SessionStore);
  private platform = inject(TestPlatformService);

  readonly testId = signal('');
  readonly tick = signal(0);
  readonly tests = computed<Assessment[]>(() => this.ctx.campus()?.tests || []);
  readonly test = computed<Assessment | null>(() => this.tests().find(t => t.id === this.testId()) || this.tests().find(t => isActive(t)) || this.tests()[0] || null);

  readonly analysis = computed(() => {
    this.tick();
    const test = this.test();
    if (!test) return null;
    const w = this.platform.world();
    const paper = w.papers[test.id];
    if (!paper) return null;
    const rows = w.rows.filter((x: any) => x.testId === test.id);
    const byStu: Record<string, any[]> = {};
    rows.forEach((x: any) => { (byStu[x.studentId] = byStu[x.studentId] || []).push(x); });
    const students = Object.keys(byStu).map(id => ({ id, score: byStu[id].reduce((a, x) => a + x.score, 0) })).sort((a, b) => b.score - a.score);
    const k = Math.max(1, Math.round(students.length * 0.27));
    const top = new Set(students.slice(0, k).map(s => s.id)), bot = new Set(students.slice(-k).map(s => s.id));
    const pct = HBC().pct;
    const items: Item[] = paper.questions.map((q: any) => {
      const qs = rows.filter((x: any) => x.questionId === q.questionId);
      const att = qs.filter((x: any) => x.isAttempted), ok = att.filter((x: any) => x.isCorrect);
      const rate = (set: Set<string>) => { const n = qs.filter((x: any) => set.has(x.studentId)); return n.length ? n.filter((x: any) => x.isCorrect).length / n.length : 0; };
      const picks: Record<string, number> = {};
      att.forEach((x: any) => { picks[x.selectedAnswer] = (picks[x.selectedAnswer] || 0) + 1; });
      const right = ok[0] ? ok[0].selectedAnswer : null;
      const lureL = Object.keys(picks).filter(l => l !== right).sort((a, b) => picks[b] - picks[a])[0];
      const it: Item = {
        q, views: qs.length, attempts: att.length, solve: qs.length ? ok.length / qs.length : 0,
        acc: att.length ? ok.length / att.length : null,
        time: att.length ? att.reduce((a: number, x: any) => a + x.timeTaken, 0) / att.length : null,
        disc: rate(top) - rate(bot), picks, right,
        lure: lureL ? { letter: lureL, share: picks[lureL] / (att.length || 1) } : null, flags: []
      };
      if (it.disc < 0) it.flags.push(['err', 'Check the answer key: top students miss it more often']);
      else if (it.disc < 0.15) it.flags.push(['warn', 'Barely separates strong and weak students']);
      if (it.solve >= 0.85) it.flags.push(['info', 'Too easy for this cohort']);
      if (it.solve <= 0.12) it.flags.push(['warn', 'Too hard for this cohort']);
      if (q.lod === 'Easy' && it.solve < 0.4) it.flags.push(['warn', 'Tagged Easy but most students miss it']);
      if (q.lod === 'Difficult' && it.solve > 0.7) it.flags.push(['info', 'Tagged Difficult but most students solve it']);
      if (it.lure && it.lure.share >= 0.4 && (it.acc || 0) < 0.6) it.flags.push(['warn', 'One wrong option draws ' + pct(it.lure.share) + ' of answers — check its wording']);
      return it;
    });
    /* topics by solve rate */
    const tp: Record<string, { name: string; sec: string; views: number; ok: number; att: number; n: number }> = {};
    items.forEach(i => {
      const t = tp[i.q.areaId] || (tp[i.q.areaId] = { name: i.q.areaTitle, sec: i.q.sectionName, views: 0, ok: 0, att: 0, n: 0 });
      t.n++; t.views += i.views; t.ok += i.solve * i.views; t.att += i.attempts;
    });
    const topics = Object.values(tp).map(t => ({ ...t, solve: t.ok / (t.views || 1), attempt: t.att / (t.views || 1) })).sort((a, b) => a.solve - b.solve);
    const scores = students.map(s => s.score);
    const max = paper.questions.reduce((a: number, q: any) => a + q.marks, 0);
    const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    return { rows, students, items, topics, scores, max, avg, flagged: items.filter(i => i.flags.length).length };
  });

  readonly regs = computed(() => {
    this.tick();
    const t = this.test(), id = this.ctx.campusId(), b = this.ctx.batchId();
    return this.platform.registrations().filter(x => x.campusId === id && isActive(x) && (!b || x.batchId === b) && t && x.results?.[t.id]);
  });

  readonly notes = computed(() => {
    const t = this.test();
    if (!t) return [];
    const F = HBA().format, pct = HBC().pct;
    return this.regs().map((st: Registration) => {
      const r = HBA().buildTestReport(this.platform.dataFor(st.id), t.id);
      if (!r) return null;
      const why: string[] = [];
      if (r.percentile != null && r.percentile < 30) why.push('Bottom 30% on this paper (' + F.ordinal(r.percentile) + ' percentile)');
      if (r.deep.stamina && r.deep.stamina.drop != null && r.deep.stamina.drop <= -0.15) why.push('Accuracy fell ' + Math.round(-r.deep.stamina.drop * 100) + ' pts in the second half');
      if (r.patterns.rushed >= 3) why.push(r.patterns.rushed + ' rushed wrong answers');
      if (r.patterns.missedEasy >= 2) why.push(r.patterns.missedEasy + ' easy questions wrong');
      if (r.totals.attemptRate < 0.6) why.push('Attempted only ' + pct(r.totals.attemptRate) + ' of the paper');
      return why.length ? { st, r, why } : null;
    }).filter((x): x is { st: Registration; r: any; why: string[] } => !!x).sort((a, b) => b.why.length - a.why.length);
  });

  readonly distDraw = computed(() => {
    const a = this.analysis();
    if (!a || !a.scores.length) return null;
    const lo = Math.min(...a.scores), hi = Math.max(...a.scores), bins: { from: number; to: number; count: number }[] = [];
    for (let v = lo; v <= hi; v++) bins.push({ from: v, to: v + 1, count: 0 });
    a.scores.forEach(s => bins[s - lo].count++);
    return HBC().histogram({ bins, studentBin: null }, 0);
  });

  readonly hardest = computed(() => {
    const a = this.analysis();
    return a?.topics[0]?.name || '—';
  });

  constructor() {
    effect(() => { this.ctx.campusId(); untracked(() => this.testId.set('')); });
  }

  pct(x: number): string { return HBC().pct(x); }
  dur(s: number | null): string { return s == null ? '—' : HBC().dur(s); }
  num(n: number, d = 0): string { return HBA().format.num(n, d); }
  splitOf(i: Item): { l: string; n: number; right: boolean; share: number }[] {
    const total = i.attempts || 1;
    return Object.keys(i.picks).sort().map(l => ({ l, n: i.picks[l], right: l === i.right, share: Math.round((i.picks[l] / total) * 100) }));
  }
  discColor(d: number): string { return d < 0 ? 'var(--err)' : d < 0.15 ? 'var(--warn)' : d >= 0.3 ? 'var(--ok)' : 'var(--ink)'; }

  csv(): void {
    const a = this.analysis();
    if (!a) return;
    downloadCsv('question-analysis-' + (this.test()?.id || 'test') + '.csv',
      ['qno', 'question_id', 'section', 'topic', 'sub_topic', 'level', 'views', 'attempts', 'solve_rate', 'discrimination', 'avg_time_s', 'top_wrong_option', 'top_wrong_share', 'flags'],
      a.items.map(i => [i.q.qno, i.q.questionId, i.q.sectionName, i.q.areaTitle, i.q.subAreaName, i.q.lod, i.views, i.attempts, i.solve.toFixed(3), i.disc.toFixed(3),
        i.time != null ? Math.round(i.time) : '', i.lure?.letter || '', i.lure ? i.lure.share.toFixed(3) : '', i.flags.map(f => f[1]).join(' | ')]));
  }
  print(): void { window.print(); }
}
