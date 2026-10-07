/* =====================================================================
   DEMO TEST PLATFORM + ANALYTICS PIPELINE (port of the prototype's
   hb-analytics.js, "HBX").

   Plays, in the browser, what the real platform does on the server:
     1. QUESTION BANK  every question tagged section > area > sub-area > LOD
     2. PAPERS         each campus assessment and the practice-mock series
     3. RAW ROWS       one row per student per question, in the exact
                       `student_question_analytics` (Elasticsearch) shape
     4. AGGREGATION    rebuilds the 8 other *_v2 indexes from the raw rows
     5. REPORTS        HBA (src/legacy/hb-engine.js) turns them into insights

   Sources of rows: real attempts taken in this browser, the 25 seeded
   students (simulated, fixed) and a simulated cohort of peers per paper.
   Simulated rows are deterministic: same numbers on every load.

   For the developer: in production steps 1-4 are the existing test engine
   and Elasticsearch; only step 5 ships (the hitbullseye-reports service).
   ===================================================================== */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PortalApi } from '../api/portal-api';
import { Assessment, CampusConfig, Registration, SectionResult, TestResult } from '../models';
import { CampusService } from '../services/campus.service';
import { StorageService } from '../storage.service';
import { audienceOk, makeResult, resultList } from '../util';
import { BANK, CODING } from './item-bank';
import { HBA } from './legacy';

const SIM_VERSION = 6;
const DAY = 86400000;
const PER_SECTION = 5;

export interface Paper {
  testId: string;
  testName: string;
  moduleId: string | null;
  moduleName: string | null;
  questions: any[];
}

export interface World {
  rows: any[];
  idx: any;
  papers: Record<string, Paper>;
  ms: number;
  builtAt: string;
}

function slug(s: string): string {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

@Injectable({ providedIn: 'root' })
export class TestPlatformService {
  private campuses = inject(CampusService);
  private store = inject(StorageService);
  private api = inject(PortalApi);

  readonly BANK = BANK;
  readonly CODING = CODING;
  ITEMS: Record<string, any> = {};
  PRACTICE: Paper[] = [];
  QUICK: Paper[] = [];
  readonly SIM_VERSION = SIM_VERSION;

  /** every registration, kept here because the simulated world is built from them */
  private regs: Registration[] = [];
  private _world: World | null = null;
  private ready = false;

  private get sim(): any { return HBA().sim; }

  /** Builds the item bank and paper series, loads registrations, and derives seeded results. */
  async init(): Promise<void> {
    if (!this.ready) {
      this.buildItems();
      this.PRACTICE = [1, 2, 3, 4, 5, 6].map(n => this.blueprint('pm-0' + n, 'Placement Practice Mock ' + n,
        ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Data Interpretation'],
        { moduleId: 'PRACTICE', moduleName: 'Placement Practice Series', perSection: 8 }));
      this.QUICK = [
        this.single('qp-mcq-01', 'Quick MCQ: Probability', 'QA-008'),
        this.single('qp-mcq-02', 'Quick MCQ: Syllogisms', 'LR-010'),
        this.single('qp-mcq-03', 'Quick MCQ: Para Jumbles', 'VA-008'),
        this.single('qp-mcq-04', 'Quick MCQ: Sets & Caselets', 'DI-007'),
        this.single('qp-code-01', 'Coding: Sum of digits', 'CODE-001'),
        this.single('qp-code-02', 'Coding: Palindrome check', 'CODE-002'),
        this.single('qp-code-03', 'Coding: Second largest number', 'CODE-003')
      ];
      this.ready = true;
    }
    await this.reloadRegistrations();
    await this.syncSeeded();
  }

  async reloadRegistrations(): Promise<void> {
    this.regs = await firstValueFrom(this.api.getRegistrations());
    this._world = null;
  }

  registrations(): Registration[] { return this.regs; }

  /* ------------------------------------------------------------------
     1. QUESTION BANK
     ------------------------------------------------------------------ */
  sectionOf(name: string): string {
    if (BANK[name]) return name;
    const n = String(name).toLowerCase();
    if (/quant|numer|math/.test(n)) return 'Quantitative Aptitude';
    if (/logic|reason/.test(n)) return 'Logical Reasoning';
    if (/verbal|english|language/.test(n)) return 'Verbal Ability';
    if (/data|interpret/.test(n)) return 'Data Interpretation';
    if (/tech|code|software|program/.test(n)) return 'Technical Aptitude';
    return 'Domain Knowledge';
  }

  private buildItems(): void {
    const sim = this.sim;
    Object.keys(BANK).forEach(sec => {
      const s = BANK[sec];
      s.items.forEach((it, i) => {
        const id = s.id + '-' + String(i + 1).padStart(3, '0');
        const r = sim.rng('item-' + id);
        this.ITEMS[id] = {
          questionId: id, sectionId: s.id, sectionName: sec,
          areaId: s.id + '-' + slug(it[0]), areaTitle: it[0],
          subAreaId: s.id + '-' + slug(it[0]) + '-' + slug(it[1]), subAreaName: it[1],
          lod: it[2], typeOfQues: 'MCQ', marks: 1, negative: 0,
          b: sim.LOD_B[it[2]] + sim.normal(r, 0, 0.3),
          baseTime: Math.round(sim.LOD_TIME[it[2]] * (0.8 + r() * 0.5)),
          options: it[4].length,
          text: it[3], choices: it[4], answer: it[5]
        };
      });
    });
    Object.keys(CODING).forEach(id => {
      const c = CODING[id], r = sim.rng('item-' + id);
      this.ITEMS[id] = {
        questionId: id, sectionId: 'CODE', sectionName: 'Coding',
        areaId: 'CODE-' + slug(c.area), areaTitle: c.area,
        subAreaId: 'CODE-' + slug(c.area) + '-' + slug(c.sub), subAreaName: c.sub,
        lod: c.lod, typeOfQues: 'Coding', marks: 10, negative: 0, partial: true,
        b: sim.LOD_B[c.lod] + sim.normal(r, 0, 0.2), baseTime: c.baseTime, options: 0,
        text: c.text, title: c.title, starter: c.starter, fn: c.fn, samples: c.samples, tests: c.tests, coding: true
      };
    });
  }

  /* ------------------------------------------------------------------
     2. PAPERS
     ------------------------------------------------------------------ */
  private pickItems(sectionName: string, seed: string, n: number): string[] {
    const s = BANK[this.sectionOf(sectionName)];
    const ids = s.items.map((_, i) => s.id + '-' + String(i + 1).padStart(3, '0'));
    const r = this.sim.rng(seed + '|' + s.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
    const order: Record<string, number> = { Easy: 0, Medium: 1, Difficult: 2 };
    return ids.slice(0, n).sort((a, b) => order[this.ITEMS[a].lod] - order[this.ITEMS[b].lod]);
  }

  private blueprint(testId: string, testName: string, sections: string[], opts: { perSection?: number; moduleId?: string; moduleName?: string } = {}): Paper {
    const qs: any[] = [];
    let qno = 0;
    sections.forEach(sec => {
      this.pickItems(sec, testId, opts.perSection || PER_SECTION).forEach(id => {
        const it = this.ITEMS[id];
        qno++;
        qs.push({ ...it, qno, uniqueQno: testId + '#' + qno, sectionName: sec, sectionId: it.sectionId });
      });
    });
    return { testId, testName, moduleId: opts.moduleId || null, moduleName: opts.moduleName || null, questions: qs };
  }

  paperFor(test: Assessment): Paper {
    return this.blueprint(test.id, test.name, test.sections?.length ? test.sections : ['Quantitative Aptitude']);
  }

  private single(testId: string, testName: string, itemId: string): Paper {
    const it = this.ITEMS[itemId];
    return { testId, testName, moduleId: 'QUICK', moduleName: 'Quick Practice', questions: [{ ...it, qno: 1, uniqueQno: testId + '#1' }] };
  }

  /** Run a coding answer against the hidden tests in a worker (so a loop can be stopped). */
  grade(itemId: string, code: string, which: 'samples' | 'tests'): Promise<{ error: string | null; results: any[] }> {
    const it = this.ITEMS[itemId];
    const tests = which === 'samples' ? it.samples : it.tests;
    const src = "onmessage=function(e){var d=e.data,out=[];var f;try{f=(new Function(d.code+'\\n;return typeof '+d.fn+'===\"function\"?'+d.fn+':null;'))();}catch(err){postMessage({error:String(err&&err.message||err)});return;}" +
      "if(!f){postMessage({error:'Function '+d.fn+' was not found.'});return;}" +
      "d.tests.forEach(function(t){var got,err=null;try{got=f.apply(null,JSON.parse(JSON.stringify(t[0])));}catch(x){err=String(x&&x.message||x);}" +
      "out.push({input:t[0],expected:t[1],got:got===undefined?null:got,ok:!err&&JSON.stringify(got===undefined?null:got)===JSON.stringify(t[1]),error:err});});postMessage({results:out});};";
    return new Promise(resolve => {
      let w: Worker;
      try { w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))); }
      catch { resolve({ error: 'Code runner unavailable in this browser.', results: [] }); return; }
      const timer = setTimeout(() => { w.terminate(); resolve({ error: 'Time limit: your code ran for more than 3 seconds.', results: [] }); }, 3000);
      w.onmessage = (e: MessageEvent) => { clearTimeout(timer); w.terminate(); resolve({ error: e.data.error || null, results: e.data.results || [] }); };
      w.postMessage({ code, fn: it.fn, tests });
    });
  }

  /* ------------------------------------------------------------------
     3. RAW ROWS
     ------------------------------------------------------------------ */
  liveRows(): any[] { return this.store.json<any[]>('attempts', []); }
  private saveLiveRows(rows: any[]): void { this.store.setJson('attempts', rows); this._world = null; }
  private simJourneyRows(): any[] { return this.store.json<any[]>('simjourney', []); }
  private saveSimJourney(rows: any[]): void { this.store.setJson('simjourney', rows); this._world = null; }

  private dayStart(): number { const d = new Date(); d.setHours(10, 0, 0, 0); return d.getTime(); }

  /** a seeded student's profile from their seed scores (marks out of 15 per section) */
  private seededProfile(st: Registration, idx: number): any {
    const sim = this.sim;
    const r = sim.rng('seed-' + st.id);
    const raw = st._seedRaw || [10, 10, 10, 10];
    const avg = raw.reduce((a, b) => a + b, 0) / raw.length;
    const p = sim.randomProfile(r, 0);
    p.ability = (avg / 15 - 0.55) * 3.2;
    ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Data Interpretation'].forEach((sec, k) => {
      p.bias[BANK[sec].id] = ((raw[k % raw.length] - avg) / 15) * 2.5;
    });
    p.speed = Math.min(1.25, Math.max(0.8, p.speed));
    const kind = idx % 5;
    if (kind === 0) { p.growth = 0.16; }
    if (kind === 1) { p.speed = 0.62; p.threshold = 0.14; p.careless = 0.15; }
    if (kind === 2) { p.speed = 1.5; p.threshold = 0.66; p.careless = 0.02; }
    if (kind === 3) { p.fatigue = 0.3; p.growth = 0.05; }
    if (kind === 4) { p.growth = 0.08; p.focusGrowth[BANK['Quantitative Aptitude'].id] = 0.12; }
    return p;
  }

  /** campus assessments a seeded student sat (same rule as the prototype seed); history ignores status */
  private seededStudents(): { st: Registration; tests: Assessment[] }[] {
    return this.regs.filter(st => st._seedRaw).map(st => {
      const col = this.campuses.byId(st.campusId);
      const eligible = col ? col.tests.filter(t => audienceOk(t, st)) : [];
      const tests = eligible.slice(0, 2).filter((_, k) => !(k === 1 && (st._seedIdx || 0) % 3 === 0));
      return { st, tests };
    });
  }

  /** every row in the system: simulated cohort + seeded students + live attempts */
  world(): World {
    if (this._world) return this._world;
    const sim = this.sim;
    const t0 = performance.now();
    const rows: any[] = [];
    const papers: Record<string, Paper> = {};
    const start = this.dayStart();
    const seeded = this.seededStudents();
    const campusList: CampusConfig[] = this.campuses.campuses();

    /* campus assessments */
    campusList.forEach(col => {
      (col.tests || []).forEach(t => {
        const bp = this.paperFor(t);
        papers[t.id] = bp;
        const r = sim.rng('cohort-' + t.id);
        for (let i = 0; i < 120; i++) {
          sim.sit(bp, sim.randomProfile(r, -0.1), r, {
            studentId: 'PEER-' + col.id + '-' + i, nth: 0, start: start - (3 + (i % 9)) * DAY
          }).forEach((x: any) => rows.push(x));
        }
      });
    });

    /* practice mocks: national cohort */
    this.PRACTICE.forEach((bp, k) => {
      papers[bp.testId] = bp;
      const r = sim.rng('cohort-' + bp.testId);
      for (let i = 0; i < 170 - k * 10; i++) {
        sim.sit(bp, sim.randomProfile(r, -0.15), r, { studentId: 'NAT-' + i, nth: k, start: start - (50 - k * 7) * DAY })
          .forEach((x: any) => rows.push(x));
      }
    });

    /* quick practice: one question each, a national cohort */
    this.QUICK.forEach((bp, k) => {
      papers[bp.testId] = bp;
      const r = sim.rng('cohort-' + bp.testId);
      for (let i = 0; i < 160; i++) {
        sim.sit(bp, sim.randomProfile(r, -0.15), r, { studentId: 'NAT-' + i, nth: 0, start: start - (1 + (i % 20)) * DAY - k * 3600000 })
          .forEach((x: any) => rows.push(x));
      }
    });

    /* seeded demo students: practice journey, then their campus papers */
    seeded.forEach((sd, idx) => {
      const st = sd.st;
      const p = this.seededProfile(st, idx);
      const r = sim.rng('journey-' + st.id);
      const mocks = 3 + (idx % 4);
      for (let k = 0; k < mocks; k++) {
        sim.sit(this.PRACTICE[k], p, r, { studentId: st.id, nth: k, start: start - (45 - k * 7 - (idx % 3)) * DAY })
          .forEach((x: any) => rows.push(x));
      }
      sd.tests.forEach((t, k) => {
        if (!papers[t.id]) return;
        sim.sit(papers[t.id], p, r, { studentId: st.id, nth: mocks + k, start: start - (idx + 1) * DAY - (k * DAY) / 2 })
          .forEach((x: any) => rows.push(x));
      });
      this.QUICK.forEach((bp, k) => {
        if ((idx + k) % 3 === 0) return;
        sim.sit(bp, p, r, { studentId: st.id, nth: mocks, start: start - ((k * 2 + idx) % 13) * DAY - 7200000 })
          .forEach((x: any) => rows.push(x));
      });
    });

    /* live rows (real attempts in this browser) replace any simulated row for the same student/test */
    const live = this.liveRows().concat(this.simJourneyRows());
    const liveKeys = new Set(live.map(x => x.studentId + '|' + x.testId));
    const all = rows.filter(x => !liveKeys.has(x.studentId + '|' + x.testId)).concat(live);

    const lastRun = new Date().toISOString();
    const idx = sim.aggregate(all, lastRun);
    this._world = { rows: all, idx, papers, ms: Math.round(performance.now() - t0), builtAt: lastRun };
    return this._world;
  }

  /* ------------------------------------------------------------------
     4/5. REPORTS
     ------------------------------------------------------------------ */
  dataFor(studentId: string): any {
    const w = this.world();
    return this.sim.studentData(studentId, w.rows, w.idx, true);
  }
  reportFor(studentId: string): any { return HBA().buildStudentReport(this.dataFor(studentId)); }
  testReportFor(studentId: string, testId: string): any { return HBA().buildTestReport(this.dataFor(studentId), testId); }

  /** the campus "result" object (dashboard / console pages) built from raw rows */
  resultFromRows(rows: any[], testId: string): TestResult | null {
    const mine = rows.filter(x => x.testId === testId);
    if (!mine.length) return null;
    const bySec: Record<string, SectionResult> = {};
    const order: string[] = [];
    mine.forEach(x => {
      let s = bySec[x.sectionName];
      if (!s) { s = bySec[x.sectionName] = { name: x.sectionName, total: 0, correct: 0, wrong: 0, skipped: 0 }; order.push(x.sectionName); }
      s.total++;
      if (!x.isAttempted) s.skipped++; else if (x.isCorrect) s.correct++; else s.wrong++;
    });
    const secs = order.map(n => bySec[n]);
    const secsTime = mine.reduce((a, x) => a + x.timeTaken, 0);
    const res = makeResult(secs, Math.max(1, Math.round(secsTime / 60)));
    const w = this.world();
    const scores = (w.idx.student_test_analytics_v2.get(testId) || []).map((d: any) => d.totalScore);
    if (scores.length >= 10) {
      let below = 0, tied = 0;
      scores.forEach((s: number) => { if (s < res.score) below++; else if (s === res.score) tied++; });
      res.percentile = Math.round(((below + tied / 2) / scores.length) * 1000) / 10;
    }
    res.testId = testId;
    res.testName = mine[0].testName;
    res.attemptedAt = mine.reduce((a, x) => { const t = x.attemptedAt || x.updatedAt; return t > a ? t : a; }, '');
    res.fromRows = true;
    return res;
  }

  /** Seeded students: results come from their simulated rows, so every page agrees. Runs once per seed. */
  private async syncSeeded(): Promise<void> {
    const todo = this.regs.filter(st => st._seedRaw && !resultList(st).length);
    if (!todo.length) return;
    this._world = null;
    const w = this.world();
    const saves: Promise<void>[] = [];
    for (const st of todo) {
      const rows = w.rows.filter(x => x.studentId === st.id);
      const tests = new Set<string>();
      rows.forEach(x => { if (!x.moduleId) tests.add(x.testId); });   /* campus assessments only */
      for (const tid of tests) {
        const res = this.resultFromRows(rows, tid);
        if (!res) continue;
        st.results[tid] = res;
        saves.push(firstValueFrom(this.api.saveResult(st.id, tid, res)));
      }
    }
    await Promise.all(saves);
  }

  /* ------------------------------------------------------------------
     LIVE ATTEMPTS (the test page)
     ------------------------------------------------------------------ */
  async recordAttempt(rows: any[], campusResult: { registrationId: string; testId: string } | null): Promise<void> {
    const key = rows[0].studentId + '|' + rows[0].testId;
    this.saveLiveRows(this.liveRows().filter(x => x.studentId + '|' + x.testId !== key).concat(rows));
    if (campusResult) {
      const res = this.resultFromRows(rows, campusResult.testId);
      if (res) {
        await firstValueFrom(this.api.saveResult(campusResult.registrationId, campusResult.testId, res));
        const st = this.regs.find(r => r.id === campusResult.registrationId);
        if (st) st.results = { ...(st.results || {}), [campusResult.testId]: res };
      }
    }
  }

  /** The right option for each question of a test, read from the raw rows (isCorrect + selectedAnswer). */
  answerKey(testId: string): Record<string, string> {
    const key: Record<string, string> = {};
    this.world().rows.forEach(x => {
      if (x.testId === testId && x.isCorrect && x.selectedAnswer && !key[x.questionId]) key[x.questionId] = x.selectedAnswer;
    });
    return key;
  }

  /** Rank among everyone who took the test, from student_test_analytics_v2.totalScore */
  rankOf(testId: string, score: number): { rank: number; of: number } | null {
    const docs = this.world().idx.student_test_analytics_v2.get(testId) || [];
    if (!docs.length) return null;
    return { rank: 1 + docs.filter((d: any) => d.totalScore > score).length, of: docs.length };
  }

  /** "Simulate my journey": practice mocks for a real student, from their measured accuracy */
  simulateJourney(studentId: string): void {
    const sim = this.sim;
    const mine = this.liveRows().filter(x => x.studentId === studentId && !x.moduleId);
    const att = mine.filter(x => x.isAttempted);
    const acc = att.length ? att.filter(x => x.isCorrect).length / att.length : 0.55;
    const p = sim.randomProfile(sim.rng('me-' + studentId), 0);
    p.ability = (acc - 0.6) * 3.5 - 0.6;
    p.growth = 0.14;
    const r = sim.rng('me-j-' + studentId), start = this.dayStart(), rows: any[] = [];
    for (let k = 0; k < 5; k++) {
      sim.sit(this.PRACTICE[k], p, r, { studentId, nth: k, start: start - (36 - k * 7) * DAY }).forEach((x: any) => rows.push(x));
    }
    this.saveSimJourney(this.simJourneyRows().filter(x => x.studentId !== studentId).concat(rows));
  }
  clearJourney(studentId: string): void {
    this.saveSimJourney(this.simJourneyRows().filter(x => x.studentId !== studentId));
  }
  hasSimulatedJourney(studentId: string): boolean {
    return this.simJourneyRows().some(x => x.studentId === studentId);
  }

  rebuild(): World { this._world = null; return this.world(); }
  clearLive(): void { this.saveLiveRows([]); this.saveSimJourney([]); }
}
