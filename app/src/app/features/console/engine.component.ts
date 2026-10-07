/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, computed, inject, signal } from '@angular/core';
import { HBA } from '../../core/analytics/legacy';
import { TestPlatformService } from '../../core/analytics/test-platform.service';
import { DialogService } from '../../core/services/dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { downloadJson } from '../../core/util';

/* the field lists exactly as they exist in the Hitbullseye cluster */
const INDEXES: [string, string, string, string][] = [
  ['student_question_analytics', 'Raw student attempts', 'analyticsCalculation attemptType attemptedAt areaId areaTitle createdAt firstViewedAt isAttempted isCalculationDone isCorrect lod meta_data moduleId moduleName qno questionId questionMarks score sectionId sectionName selectedAnswer studentId subAreaId subAreaName testId testName timeTaken typeOfQues uniqueQno updatedAt', 'Everything: every tag, time and result comes from these rows.'],
  ['analytics_checkpoint_v2', 'Checkpoint tracker', 'lastRun type', '“Data as of” on every report.'],
  ['student_analytics_v2', 'Student analytics', 'accuracy areaStats attempts avgScore avgTime correct lodStats sectionStats strongAreaIds studentId totalScore totalTime updatedAt views weakAreaIds wrong', 'Counsellor views and quick summaries.'],
  ['question_analytics_v2', 'Question analytics', 'accuracy attempts avgScore avgTime correct questionId totalScore totalTime uniqueQno updatedAt views wrong', 'Question difficulty across all papers.'],
  ['test_analytics_v2', 'Test analytics', 'accuracy attempts avgScore avgTime correct students testId testName totalScore totalTime updatedAt wrong', 'Class average, number of students.'],
  ['test_question_analytics_v2', 'Test-question analytics', 'accuracy areaid areatitle attempts avgScore avgTime correct qno questionId sectionid sectionname subareaid subareaname testId testname totalScore totalTime uniqueQno updatedAt views wrong', 'Usual time, solve rate, “easy” and “tough” questions, others’ accuracy on the same questions.'],
  ['module_analytics_v2', 'Module analytics', 'accuracy attempts avgScore avgTime correct moduleId moduleName students totalScore totalTime updatedAt views wrong', 'Practice series totals.'],
  ['student_test_analytics_v2', 'Student + test analytics', 'accuracy areaStats attempts avgScore avgTime correct lodStats sectionStats strongAreaIds studentId testId testName totalScore totalTime updatedAt views weakAreaIds wrong', 'Percentile, score distribution, section average and top 10%.'],
  ['student_module_analytics_v2', 'Student + module analytics', 'accuracy areaStats attempts avgScore avgTime correct lodStats moduleId moduleName sectionStats strongAreaIds studentId totalScore totalTime updatedAt views weakAreaIds wrong', "A student's practice-series totals."]
];

/** HQ: how every answer becomes a report — the nine indexes, live counts, sample documents. */
@Component({
  selector: 'hb-engine',
  standalone: true,
  template: `
    <main class="console-main page">
      <div class="page-head">
        <div>
          <span class="eyebrow">Hitbullseye HQ</span>
          <h1>Analytics engine</h1>
          <p class="sm mut">How every answer becomes a report. In this demo the pipeline runs in the browser on simulated data; in production steps 1–3 are the existing test engine and Elasticsearch.</p>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-ghost btn-sm" (click)="reset()">Clear live attempts</button>
          <button class="btn btn-ghost btn-sm" (click)="download()">Download sample rows (JSON)</button>
          <button class="btn btn-primary btn-sm" (click)="rebuild()">Rebuild aggregates now</button>
        </div>
      </div>

      <section class="stats mt">
        <div class="stat"><div class="lbl">Raw answers</div><div class="val">{{ F.num(w().rows.length) }}</div><div class="sub">rows in student_question_analytics</div></div>
        <div class="stat"><div class="lbl">Students</div><div class="val">{{ F.num(students()) }}</div><div class="sub">seeded · simulated cohort · live</div></div>
        <div class="stat"><div class="lbl">Papers</div><div class="val">{{ papers() }}</div><div class="sub">campus assessments + practice</div></div>
        <div class="stat"><div class="lbl">Pipeline run</div><div class="val">{{ w().ms }} ms</div><div class="sub">last run {{ F.dateTime(w().builtAt) }}</div></div>
      </section>

      <section class="an-sec">
        <div class="an-head"><div><span class="an-kicker">Data flow</span><h2>From a click to a report</h2>
          <p>Each box is one stage. The grey ones already exist in the Hitbullseye platform; the white ones are what this project adds.</p></div></div>
        <div class="flowd">
          @for (b of flow(); track b[1]) {
            <div class="fbox" [class.prod]="b[0] === 'prod'"><div class="k">{{ b[1] }}</div><b>{{ b[2] }}</b><p>{{ b[3] }}</p><div class="n">{{ b[4] }}</div></div>
          }
        </div>
      </section>

      <section class="an-sec">
        <div class="an-head"><div><span class="an-kicker">Elasticsearch</span><h2>The nine indexes</h2><p>Document counts are live from the simulated pipeline. Open a row to see a real document from it.</p></div></div>
        <div class="tbl-wrap"><table class="table idx">
          <thead><tr><th style="width:230px">Index</th><th style="width:80px">Docs</th><th>Fields</th><th style="width:260px">Used in the report for</th><th style="width:120px"></th></tr></thead>
          <tbody>
            @for (ix of indexes; track ix[0]; let k = $index) {
              <tr><td><code>{{ ix[0] }}</code><div class="xs mut" style="margin-top:4px">{{ ix[1] }}</div></td>
                <td><b>{{ F.num(counts()[ix[0]]) }}</b></td>
                <td><div class="fields">{{ ix[2].split(' ').length }} fields · {{ ix[2].split(' ').join(', ') }}</div></td>
                <td class="sm">{{ ix[3] }}</td>
                <td><button class="btn btn-ghost btn-sm" (click)="toggle(k)">{{ open() === k ? 'Hide' : 'Sample doc' }}</button></td></tr>
              @if (open() === k) { <tr><td colspan="5"><pre class="doc">{{ sample(ix[0]) }}</pre></td></tr> }
            }
          </tbody>
        </table></div>
      </section>

      <section class="an-sec">
        <div class="an-head"><div><span class="an-kicker">Handover</span><h2>What the developer connects</h2></div></div>
        <div class="an-grid an-2">
          <div class="an-card"><h3>Replace the simulation with the API</h3>
            <ol class="sm" style="margin:10px 0 0 18px;padding:0;line-height:1.8">
              <li><code>TestPlatformService.world()</code> builds rows here; in production the test engine already writes them to <code>student_question_analytics</code>.</li>
              <li><code>HBA.sim.aggregate()</code> mirrors the existing aggregation job that fills the <code>*_v2</code> indexes.</li>
              <li><code>HBA.buildStudentReport()</code> ships unchanged: give it a student's rows plus the test benchmarks.</li>
              <li>The report service (<code>hitbullseye-reports</code>) calls the API and embeds into the student dashboard with a signed token.</li>
            </ol></div>
          <div class="an-card"><h3>Fields the test engine must record</h3>
            <ul class="sm" style="margin:10px 0 0 18px;padding:0;line-height:1.8">
              <li><code>timeTaken</code> per question: pacing, rushed answers, time sinks, stamina</li>
              <li><code>isAttempted</code>, <code>isCorrect</code>, <code>score</code>: accuracy, penalties, potential score</li>
              <li><code>areaId</code>, <code>subAreaId</code>, <code>lod</code>: topic map, weak sub-topics, difficulty</li>
              <li><code>firstViewedAt</code>: question order for stamina and pacing</li>
              <li><code>selectedAnswer</code>: the option chosen; the right option is read from correct answers</li>
            </ul>
            <p class="sm mut" style="margin-top:10px"><b>Nothing outside these nine indexes is used.</b> Student name and campus come from the login, not from analytics.</p></div>
        </div>
      </section>
      <footer class="foot row-b"><span>© 2026 Hitbullseye · Campus Assessment Platform</span><span>Engine: hitbullseye-reports (bundled as src/legacy/hb-engine.js)</span></footer>
    </main>
  `
})
export class EngineComponent {
  private platform = inject(TestPlatformService);
  private dialogs = inject(DialogService);
  private toast = inject(ToastService);
  readonly indexes = INDEXES;
  readonly F = HBA().format;
  readonly ver = signal(0);
  readonly open = signal(-1);

  readonly w = computed(() => { this.ver(); return this.platform.world(); });
  readonly students = computed(() => new Set(this.w().rows.map((x: any) => x.studentId)).size);
  readonly papers = computed(() => new Set(this.w().rows.map((x: any) => x.testId)).size);
  readonly counts = computed<Record<string, number>>(() => {
    const w = this.w(), idx = w.idx;
    const sum = (m: Map<string, unknown[]>) => { let n = 0; m.forEach(v => { n += v.length; }); return n; };
    return {
      student_question_analytics: w.rows.length, analytics_checkpoint_v2: idx.analytics_checkpoint_v2.length,
      student_analytics_v2: idx.student_analytics_v2.size, question_analytics_v2: idx.question_analytics_v2.size,
      test_analytics_v2: idx.test_analytics_v2.size, test_question_analytics_v2: sum(idx.test_question_analytics_v2),
      module_analytics_v2: idx.module_analytics_v2.size, student_test_analytics_v2: sum(idx.student_test_analytics_v2),
      student_module_analytics_v2: idx.student_module_analytics_v2.size
    };
  });
  readonly flow = computed(() => {
    const n = this.counts(), F = this.F;
    return [
      ['prod', '1 · Test engine', 'Student answers', 'Each answer, its time and the option chosen.', F.num(this.platform.liveRows().length) + ' live rows in this browser'],
      ['prod', '2 · Raw index', 'student_question_analytics', 'One document per student per question.', F.num(n['student_question_analytics']) + ' docs'],
      ['prod', '3 · Aggregation job', '8 × *_v2 indexes', 'Rebuilt at each checkpoint (lastRun).', F.num(n['test_question_analytics_v2'] + n['student_test_analytics_v2'] + n['question_analytics_v2']) + ' aggregate docs'],
      ['', '4 · Report engine', 'Insights + plan', 'Tags every answer, compares with others, builds actions.', 'rules in hitbullseye-reports'],
      ['', '5 · Delivered', 'Student & campus views', 'Student report, progress, campus insights, JSON API.', 'Report · Insights pages']
    ];
  });

  sample(name: string): string {
    const w = this.w(), idx = w.idx;
    const first = (m: Map<string, unknown>) => { const v = m.values().next().value; return Array.isArray(v) ? v[0] : v; };
    const d = name === 'student_question_analytics' ? (w.rows.find((x: any) => !/^PEER|^NAT/.test(x.studentId)) || w.rows[0])
      : name === 'analytics_checkpoint_v2' ? idx.analytics_checkpoint_v2[0] : first(idx[name]);
    return JSON.stringify(d, (_k, v) => (v instanceof Map ? Object.fromEntries(v) : typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v), 2);
  }
  toggle(k: number): void { this.open.set(this.open() === k ? -1 : k); }
  rebuild(): void {
    this.platform.rebuild();
    this.ver.update(v => v + 1);
    this.toast.ok('Aggregates rebuilt from ' + this.F.num(this.w().rows.length) + ' raw answers in ' + this.w().ms + ' ms.', 5000);
  }
  async reset(): Promise<void> {
    if (!(await this.dialogs.confirm('Clear live attempts?', 'Removes every live attempt and simulated journey saved in this browser. Seeded demo data stays.', 'Clear', true))) return;
    this.platform.clearLive();
    this.ver.update(v => v + 1);
    this.toast.ok('Live attempts cleared.');
  }
  download(): void {
    const rows = this.w().rows.filter((x: any) => !/^PEER|^NAT/.test(x.studentId)).slice(0, 400);
    downloadJson('student_question_analytics-sample.json', { hits: { hits: rows.map((r: any) => ({ _index: 'student_question_analytics', _source: r })) } });
  }
}
