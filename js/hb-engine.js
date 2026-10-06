/* HitBullseye analytics engine (generated from hitbullseye-reports/src — do not edit by hand) */
"use strict";
var HBA = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/browser/engine.ts
  var engine_exports = {};
  __export(engine_exports, {
    BEHAVIOUR: () => BEHAVIOUR,
    CUMULATIVE_MIN: () => CUMULATIVE_MIN,
    MICRO_MAX: () => MICRO_MAX,
    RULES: () => RULES,
    ZONES: () => ZONES,
    buildMicroReport: () => buildMicroReport,
    buildQuestionReport: () => buildQuestionReport,
    buildStudentReport: () => buildStudentReport,
    buildTestReport: () => buildTestReport,
    format: () => format_exports,
    sim: () => sim_exports
  });

  // src/lib/analytics/classify.ts
  var RULES = {
    /** Share of everyone who saw it and solved it, at or above this = "most students get it right". */
    easySolveRate: 0.6,
    /** Solve rate at or below this = "most students get it wrong". */
    toughSolveRate: 0.2,
    /** Fallbacks when only accuracy (correct ÷ attempted) is known. */
    easyAccuracy: 0.8,
    toughAccuracy: 0.35,
    /** Wrong in under this share of the reference time = rushed. */
    rushedRatio: 0.5,
    /** Over this multiple of the reference time = slow. */
    slowRatio: 2,
    /** A time sink must also have cost at least this many seconds. */
    slowMinSeconds: 90,
    /** Minimum attempted questions before an area/sub-area gets a strong/weak verdict. */
    minAttempts: 3,
    /** Edge vs cohort (accuracy points) to call an area strong / weak. */
    edge: 0.1,
    /** Without benchmarks: absolute accuracy for strong / weak. */
    strongAccuracy: 0.75,
    weakAccuracy: 0.45
  };
  function statusOf(a) {
    if (!a.isAttempted) return "skipped";
    return a.isCorrect ? "correct" : "wrong";
  }
  function median(xs) {
    if (!xs.length) return 0;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function classifyQuestions(rows, bench) {
    const byQ = new Map((bench != null ? bench : []).map((b) => [b.questionId, b]));
    const ownMedian = /* @__PURE__ */ new Map();
    for (const sec of new Set(rows.map((r) => r.sectionId))) {
      const ts = rows.filter((r) => r.sectionId === sec && r.isAttempted && r.timeTaken > 0).map((r) => r.timeTaken);
      if (ts.length >= 3) ownMedian.set(sec, median(ts));
    }
    return [...rows].sort((a, b) => a.qno - b.qno).map((a) => {
      var _a, _b;
      const b = byQ.get(a.questionId);
      const status = statusOf(a);
      const cohortAccuracy = b && b.attempts >= 5 ? b.accuracy : null;
      const cohortTime = b && b.attempts >= 5 && b.avgTime ? b.avgTime : null;
      const cohortSolveRate = b && b.views >= 10 && b.views >= b.attempts ? b.correct / b.views : null;
      const ref = (_a = cohortTime != null ? cohortTime : ownMedian.get(a.sectionId)) != null ? _a : null;
      const timeRatio = ref && a.timeTaken > 0 ? a.timeTaken / ref : null;
      const lod = ((_b = a.lod) != null ? _b : "").toLowerCase();
      const easy = cohortSolveRate !== null ? cohortSolveRate >= RULES.easySolveRate : cohortAccuracy !== null ? cohortAccuracy >= RULES.easyAccuracy : lod === "easy";
      const tough = cohortSolveRate !== null ? cohortSolveRate <= RULES.toughSolveRate : cohortAccuracy !== null ? cohortAccuracy <= RULES.toughAccuracy : lod.startsWith("diff") || lod === "hard";
      const tags = [];
      if (status === "wrong" && easy) tags.push("missed-easy");
      if (status === "wrong" && timeRatio !== null && timeRatio < RULES.rushedRatio) tags.push("rushed");
      if (status !== "correct" && timeRatio !== null && timeRatio >= RULES.slowRatio && a.timeTaken >= RULES.slowMinSeconds)
        tags.push("time-sink");
      if (status === "correct" && timeRatio !== null && timeRatio >= RULES.slowRatio && a.timeTaken >= RULES.slowMinSeconds)
        tags.push("slow-correct");
      if (status === "skipped" && easy) tags.push("missed-chance");
      if (status === "skipped" && tough) tags.push("smart-skip");
      if (status === "correct" && tough) tags.push("tough-cracked");
      return {
        questionId: a.questionId,
        qno: a.qno,
        sectionId: a.sectionId,
        sectionName: a.sectionName,
        areaId: a.areaId,
        areaTitle: a.areaTitle,
        subAreaId: a.subAreaId,
        subAreaName: a.subAreaName,
        lod: a.lod,
        type: a.typeOfQues,
        status,
        score: a.score,
        marks: a.questionMarks,
        time: a.timeTaken,
        cohortTime,
        cohortAccuracy,
        cohortSolveRate,
        timeRatio,
        tags
      };
    });
  }
  function bucketize(qs, key) {
    const groups = /* @__PURE__ */ new Map();
    for (const q of qs) {
      const k = key(q);
      if (!k) continue;
      const g = groups.get(k.id);
      if (g) g.qs.push(q);
      else groups.set(k.id, { meta: k, qs: [q] });
    }
    return [...groups.values()].map(({ meta, qs: qs2 }) => makeBucket(meta.id, meta.name, qs2, meta.parentId, meta.parentName));
  }
  function makeBucket(id, name, qs, parentId, parentName) {
    let attempted = 0, correct = 0, wrong = 0, score = 0, maxScore = 0, time = 0, cohortSum = 0, cohortN = 0;
    for (const q of qs) {
      score += q.score;
      maxScore += q.marks;
      time += q.time;
      if (q.status !== "skipped") {
        attempted++;
        if (q.status === "correct") correct++;
        else wrong++;
        if (q.cohortAccuracy !== null) {
          cohortSum += q.cohortAccuracy;
          cohortN++;
        }
      }
    }
    const accuracy = attempted ? correct / attempted : null;
    const cohortAccuracy = cohortN && cohortN >= attempted * 0.8 ? cohortSum / cohortN : null;
    const edge = accuracy !== null && cohortAccuracy !== null ? accuracy - cohortAccuracy : null;
    return {
      id,
      name,
      parentId: parentId != null ? parentId : null,
      parentName: parentName != null ? parentName : null,
      total: qs.length,
      attempted,
      correct,
      wrong,
      skipped: qs.length - attempted,
      score,
      maxScore,
      time,
      accuracy,
      attemptRate: qs.length ? attempted / qs.length : 0,
      cohortAccuracy,
      edge,
      verdict: verdictOf(attempted, accuracy, edge)
    };
  }
  function verdictOf(attempted, accuracy, edge) {
    if (attempted < RULES.minAttempts || accuracy === null) return "thin";
    if (edge !== null) return edge >= RULES.edge ? "strong" : edge <= -RULES.edge ? "weak" : "par";
    return accuracy >= RULES.strongAccuracy ? "strong" : accuracy <= RULES.weakAccuracy ? "weak" : "par";
  }
  var bySection = (q) => ({ id: q.sectionId, name: q.sectionName });
  var byArea = (q) => ({ id: q.areaId, name: q.areaTitle, parentId: q.sectionId, parentName: q.sectionName });
  var bySubArea = (q) => ({ id: q.subAreaId, name: q.subAreaName, parentId: q.areaId, parentName: q.areaTitle });
  var byLod = (q) => q.lod ? { id: q.lod.toLowerCase(), name: q.lod } : null;
  var LOD_ORDER = ["easy", "medium", "moderate", "difficult", "hard", "very difficult"];
  function sortLods(bs) {
    const rank2 = (id) => {
      const i = LOD_ORDER.indexOf(id);
      return i < 0 ? 99 : i;
    };
    return [...bs].sort((a, b) => rank2(a.id) - rank2(b.id) || a.name.localeCompare(b.name));
  }
  function patternsOf(qs) {
    const has = (t) => qs.filter((q) => q.tags.includes(t));
    const missedEasy = has("missed-easy");
    const missedChances = has("missed-chance");
    const timeSinks = has("time-sink");
    return {
      rushed: has("rushed").length,
      missedEasy: missedEasy.length,
      timeSinks: timeSinks.length,
      slowCorrect: has("slow-correct").length,
      missedChances: missedChances.length,
      smartSkips: has("smart-skip").length,
      toughCracked: has("tough-cracked").length,
      negative: qs.reduce((s, q) => s + (q.score < 0 ? -q.score : 0), 0),
      timeSunk: timeSinks.reduce((s, q) => s + q.time, 0),
      // Full marks on those questions plus any penalty already taken on them.
      marksWithinReach: missedEasy.reduce((s, q) => s + q.marks - q.score, 0) + missedChances.reduce((s, q) => s + q.marks, 0)
    };
  }
  function percentileOf(score, scores) {
    if (scores.length < 10) return null;
    let below = 0, tied = 0;
    for (const s of scores) {
      if (s < score) below++;
      else if (s === score) tied++;
    }
    return (below + tied / 2) / scores.length * 100;
  }
  function distributionOf(score, scores) {
    if (scores.length < 10) return null;
    const lo = Math.min(...scores, score);
    const hi = Math.max(...scores, score);
    const width = niceStep((hi - lo) / 14 || 1);
    const start = Math.floor(lo / width) * width;
    const n = Math.max(1, Math.ceil((hi - start + 1e-9) / width));
    const bins = Array.from({ length: n }, (_, i) => ({ from: start + i * width, to: start + (i + 1) * width, count: 0 }));
    const idx = (v) => Math.min(n - 1, Math.floor((v - start) / width));
    for (const s of scores) bins[idx(s)].count++;
    return { students: scores.length, bins, studentBin: idx(score), median: median(scores), top: hi };
  }
  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }
  function slope(ys) {
    const pts2 = ys.map((y, x) => [x, y]).filter((p) => p[1] !== null);
    if (pts2.length < 2) return null;
    const mx = pts2.reduce((s, p) => s + p[0], 0) / pts2.length;
    const my = pts2.reduce((s, p) => s + p[1], 0) / pts2.length;
    let num2 = 0, den = 0;
    for (const [x, y] of pts2) {
      num2 += (x - mx) * (y - my);
      den += (x - mx) ** 2;
    }
    return den ? num2 / den : null;
  }
  function stdev(xs) {
    if (xs.length < 3) return null;
    const m = xs.reduce((s, x) => s + x, 0) / xs.length;
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
  }

  // src/lib/analytics/format.ts
  var format_exports = {};
  __export(format_exports, {
    date: () => date,
    dateTime: () => dateTime,
    duration: () => duration,
    num: () => num,
    ordinal: () => ordinal,
    pct: () => pct,
    plural: () => plural,
    pts: () => pts,
    signed: () => signed
  });
  var pct = (x, digits = 0) => x === null || x === void 0 ? "\u2014" : `${(x * 100).toFixed(digits)}%`;
  var pts = (x) => x === null || x === void 0 ? "\u2014" : `${x >= 0 ? "+" : "\u2212"}${Math.abs(Math.round(x * 100))} pts`;
  var num = (x, digits = 0) => x === null || x === void 0 ? "\u2014" : x.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  var signed = (x, digits = 0) => `${x > 0 ? "+" : x < 0 ? "\u2212" : ""}${num(Math.abs(x), digits)}`;
  function duration(seconds) {
    if (seconds === null || seconds === void 0) return "\u2014";
    const s = Math.round(seconds);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return s % 60 ? `${m}m ${s % 60}s` : `${m}m`;
    const h = Math.floor(m / 60);
    return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  }
  function ordinal(n) {
    const v = Math.round(n);
    const s = ["th", "st", "nd", "rd"];
    const m = v % 100;
    return v + (s[(m - 20) % 10] || s[m] || s[0]);
  }
  var IST = "Asia/Kolkata";
  function date(iso, withYear = false) {
    if (!iso) return "\u2014";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      ...withYear ? { year: "numeric" } : {},
      timeZone: IST
    });
  }
  function dateTime(iso) {
    if (!iso) return "\u2014";
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: IST
    });
  }
  var plural = (n, one, many = `${one}s`) => `${num(n)} ${n === 1 ? one : many}`;

  // src/lib/analytics/extras.ts
  var BEHAVIOUR = {
    "tough-cracked": { label: "Cracked a tough one", hint: "Right on a question most students get wrong", good: true },
    solid: { label: "Solid", hint: "Right, in about the usual time or faster", good: true },
    "slow-right": { label: "Right but slow", hint: "Right, but took over twice the usual time", good: null },
    careless: { label: "Careless slip", hint: "Wrong on a question most students get right", good: false },
    rushed: { label: "Rushed", hint: "Wrong in under half the usual time", good: false },
    stuck: { label: "Stuck and wrong", hint: "Over twice the usual time, still wrong", good: false },
    "concept-gap": { label: "Concept gap", hint: "Wrong after a normal attempt", good: false },
    "skipped-easy": { label: "Skipped an easy one", hint: "Skipped, though most students get it right", good: false },
    "smart-skip": { label: "Smart skip", hint: "Skipped a question most students get wrong", good: true },
    skipped: { label: "Skipped", hint: "Left unattempted", good: null }
  };
  function behaviourOf(q) {
    const t = q.tags;
    if (q.status === "correct") return t.includes("tough-cracked") ? "tough-cracked" : t.includes("slow-correct") ? "slow-right" : "solid";
    if (q.status === "wrong") {
      if (t.includes("rushed")) return "rushed";
      if (t.includes("missed-easy")) return "careless";
      if (t.includes("time-sink")) return "stuck";
      return "concept-gap";
    }
    return t.includes("missed-chance") ? "skipped-easy" : t.includes("smart-skip") ? "smart-skip" : "skipped";
  }
  function behaviourMix(qs) {
    var _a;
    const counts = /* @__PURE__ */ new Map();
    for (const q of qs) counts.set(behaviourOf(q), ((_a = counts.get(behaviourOf(q))) != null ? _a : 0) + 1);
    return Object.keys(BEHAVIOUR).filter((k) => counts.get(k)).map((k) => ({ key: k, count: counts.get(k) }));
  }
  function potentialOf(qs, score, max) {
    const careless = qs.filter((q) => behaviourOf(q) === "careless");
    const easySkips = qs.filter((q) => behaviourOf(q) === "skipped-easy");
    const otherPenalties = qs.filter((q) => q.status === "wrong" && q.score < 0 && behaviourOf(q) !== "careless");
    const steps = [
      {
        key: "careless",
        label: "Fix careless slips",
        detail: `${careless.length} easy question${careless.length === 1 ? "" : "s"} answered wrong`,
        gain: careless.reduce((s, q) => s + q.marks - q.score, 0)
      },
      {
        key: "easy-skips",
        label: "Attempt the easy skips",
        detail: `${easySkips.length} easy question${easySkips.length === 1 ? "" : "s"} left blank`,
        gain: easySkips.reduce((s, q) => s + q.marks, 0)
      },
      {
        key: "penalties",
        label: "Skip blind guesses",
        detail: `${otherPenalties.length} penalised wrong answer${otherPenalties.length === 1 ? "" : "s"}`,
        gain: otherPenalties.reduce((s, q) => s - q.score, 0)
      }
    ].filter((s) => s.gain > 0);
    const potential = Math.min(max, score + steps.reduce((s, x) => s + x.gain, 0));
    return { score, max, steps, potential };
  }
  function inOrder(qs, seen) {
    return [...qs].sort((a, b) => {
      var _a, _b;
      const x = (_a = seen.get(a.questionId)) != null ? _a : "";
      const y = (_b = seen.get(b.questionId)) != null ? _b : "";
      return x && y && x !== y ? x.localeCompare(y) : a.qno - b.qno;
    });
  }
  function half(qs) {
    const att = qs.filter((q) => q.status !== "skipped");
    const correct = att.filter((q) => q.status === "correct").length;
    const ratios = att.filter((q) => q.timeRatio !== null && q.cohortTime !== null).map((q) => q.timeRatio);
    return { attempted: att.length, correct, accuracy: att.length ? correct / att.length : null, pace: ratios.length >= 3 ? median(ratios) : null };
  }
  function staminaOf(ordered) {
    if (ordered.length < 8) return null;
    const mid = Math.floor(ordered.length / 2);
    const first = half(ordered.slice(0, mid));
    const second = half(ordered.slice(mid));
    const drop = first.accuracy !== null && second.accuracy !== null && first.attempted >= 3 && second.attempted >= 3 ? second.accuracy - first.accuracy : null;
    return { first, second, drop };
  }
  function pacingOf(ordered) {
    let own = 0;
    let usual = 0;
    return ordered.map((q, i) => {
      own += q.time;
      usual = usual !== null && q.cohortTime !== null ? usual + (q.status === "skipped" ? Math.min(q.cohortTime, q.time) : q.cohortTime) : null;
      return { n: i + 1, qno: q.qno, own, usual };
    });
  }
  var ZONES = {
    master: { label: "Strong and quick", hint: "Keep warm with light practice" },
    "slow-sure": { label: "Accurate but slow", hint: "Drill speed with timed sets" },
    "fast-loose": { label: "Quick but careless", hint: "Slow down and re-check" },
    rebuild: { label: "Slow and shaky", hint: "Go back to concepts first" }
  };
  function quadrantOf(buckets, qs, key) {
    return buckets.filter((b) => b.attempted >= 2 && b.accuracy !== null).map((b) => {
      const ratios = qs.filter((q) => key(q) === b.id && q.status !== "skipped" && q.timeRatio !== null).map((q) => q.timeRatio);
      if (!ratios.length) return null;
      const speed = median(ratios);
      const accurate = b.accuracy >= 0.6;
      const fast = speed <= 1.15;
      const zone = accurate ? fast ? "master" : "slow-sure" : fast ? "fast-loose" : "rebuild";
      return { id: b.id, name: b.name, parentName: b.parentName, attempted: b.attempted, accuracy: b.accuracy, speed, zone };
    }).filter((x) => !!x);
  }
  function sectionCompareOf(sections, bench) {
    return sections.map((s) => {
      const b = bench == null ? void 0 : bench.find((x) => x.sectionId === s.id);
      const ok = b && b.students >= 10;
      return {
        sectionId: s.id,
        name: s.name,
        you: s.maxScore ? Math.max(0, s.score) / s.maxScore : 0,
        avg: ok ? b.avgPct : null,
        top: ok ? b.topPct : null,
        students: ok ? b.students : null
      };
    });
  }
  function targetsOf(input) {
    var _a;
    const { score, max, totals, potential, avgTimePerQ, usualTimePerQ } = input;
    const out = [];
    const within = potential.potential - score;
    const scoreTarget = Math.min(max, Math.round(score + Math.max(1, within / 2)));
    out.push({
      key: "score",
      label: "Score",
      now: `${score} / ${max}`,
      target: `${scoreTarget} / ${max}`,
      why: within > 0 ? `Your score plus half of the ${within} marks within reach.` : "One mark more than this test."
    });
    if (totals.accuracy !== null) {
      const a = totals.accuracy;
      const t = a < 0.7 ? Math.min(0.85, Math.ceil((a + 0.1) * 20) / 20) : Math.min(0.95, Math.ceil((a + 0.05) * 20) / 20);
      out.push({
        key: "accuracy",
        label: "Accuracy",
        now: pct(a),
        target: pct(t),
        why: a < 0.7 ? "Fewer wrong answers is the quickest gain right now." : "Hold your accuracy while you speed up."
      });
    }
    const attemptTarget = ((_a = totals.accuracy) != null ? _a : 0) >= 0.75 && totals.attemptRate < 0.8 ? Math.min(0.95, Math.ceil((totals.attemptRate + 0.15) * 20) / 20) : null;
    if (attemptTarget) {
      out.push({
        key: "attempts",
        label: "Questions attempted",
        now: pct(totals.attemptRate),
        target: pct(attemptTarget),
        why: "Your accuracy is good enough to attempt more of the paper."
      });
    }
    if (usualTimePerQ && avgTimePerQ > usualTimePerQ * 1.2) {
      out.push({
        key: "pace",
        label: "Time per question",
        now: `${Math.round(avgTimePerQ)}s`,
        target: `${Math.round(usualTimePerQ * 1.1)}s`,
        why: "Close to the usual time other students take on the same questions."
      });
    }
    return out;
  }
  function weekPlanOf(input) {
    const { weakSubs, weakSection, strongArea, accuracyIssue, speedIssue, staminaIssue } = input;
    const [a, b] = weakSubs;
    const days = [];
    days.push(
      a ? { title: `Concepts: ${a.name}`, task: `Revise the theory of ${a.name}, then solve 15 questions untimed and note why each mistake happened.`, minutes: 60, focus: "concepts" } : { title: "Error log", task: "Go through every wrong answer in this test and write the correct method in one line.", minutes: 45, focus: "concepts" }
    );
    days.push(
      b ? { title: `Concepts: ${b.name}`, task: `Same routine for ${b.name}: theory first, then 15 untimed questions.`, minutes: 60, focus: "concepts" } : { title: "Mixed practice", task: "30 mixed questions from your weaker section, untimed.", minutes: 50, focus: "concepts" }
    );
    days.push(
      accuracyIssue ? { title: "Accuracy drill", task: "25 easy-to-medium questions. Re-read each question once before marking. Aim for zero careless slips.", minutes: 40, focus: "accuracy" } : speedIssue ? { title: "Speed drill", task: "3 sets of 10 questions in 10 minutes each. Move on at the 90-second mark.", minutes: 40, focus: "speed" } : { title: "Timed set", task: "2 timed sets of 15 questions on your recent mistakes.", minutes: 40, focus: "speed" }
    );
    days.push(
      weakSection ? { title: `Sectional: ${weakSection.name}`, task: `One timed sectional on ${weakSection.name}. Use a first pass for the easy questions.`, minutes: 45, focus: "strategy" } : { title: "Sectional", task: "One timed sectional on your lowest-scoring section.", minutes: 45, focus: "strategy" }
    );
    days.push(
      strongArea ? { title: `Keep ${strongArea.name} sharp`, task: `10 questions on ${strongArea.name}, then revise your error log from days 1\u20133.`, minutes: 30, focus: "maintain" } : { title: "Revision", task: "Revise your error log from days 1\u20133 and redo the questions you got wrong.", minutes: 30, focus: "maintain" }
    );
    days.push({
      title: "Full mock",
      task: staminaIssue ? "A full-length timed mock in one sitting, with a 30-second reset between sections to keep your second half sharp." : "A full-length timed mock in one sitting, applying the first-pass strategy.",
      minutes: 75,
      focus: "strategy"
    });
    days.push({ title: "Review", task: "Compare the mock with these targets. Note what improved and what to repeat next week.", minutes: 30, focus: "strategy" });
    return days.map((d, i) => ({ ...d, day: i + 1 }));
  }

  // src/lib/analytics/insights.ts
  var listNames = (names) => names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  function topNames(qs, max = 3) {
    var _a;
    const counts = /* @__PURE__ */ new Map();
    for (const q of qs) counts.set(q.subAreaName, ((_a = counts.get(q.subAreaName)) != null ? _a : 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, max).map(([n]) => n);
  }
  function strongest(bs) {
    var _a;
    const s = bs.filter((b) => b.verdict === "strong");
    return (_a = s.sort((a, b) => {
      var _a2, _b, _c, _d;
      return ((_b = (_a2 = b.edge) != null ? _a2 : b.accuracy) != null ? _b : 0) - ((_d = (_c = a.edge) != null ? _c : a.accuracy) != null ? _d : 0);
    })[0]) != null ? _a : null;
  }
  function weakest(bs) {
    var _a;
    const w = bs.filter((b) => b.verdict === "weak");
    return (_a = w.sort((a, b) => {
      var _a2, _b, _c, _d;
      return ((_b = (_a2 = a.edge) != null ? _a2 : a.accuracy) != null ? _b : 0) - ((_d = (_c = b.edge) != null ? _c : b.accuracy) != null ? _d : 0);
    })[0]) != null ? _a : null;
  }
  function compareLine(b) {
    const own = `${b.correct} of ${b.attempted} right (${pct(b.accuracy)})`;
    return b.cohortAccuracy !== null ? `${own}; students who attempted the same questions got ${pct(b.cohortAccuracy)}.` : `${own}.`;
  }
  function testInsights(r) {
    var _a, _b, _c;
    const out = [];
    const t = r.totals;
    const p = r.patterns;
    if (r.percentile !== null && r.distribution) {
      const tone = r.percentile >= 70 ? "good" : r.percentile >= 40 ? "info" : "warn";
      out.push({
        id: "standing",
        tone,
        title: `You did better than ${Math.round(r.percentile)} out of every 100 students on this test`,
        detail: `You scored ${num(t.score, 1)} out of ${num(t.maxScore)}. ${num(r.distribution.students)} students took it; the middle score was ${num(r.distribution.median, 1)} and the top score ${num(r.distribution.top, 1)}.`
      });
    } else {
      out.push({
        id: "standing",
        tone: "info",
        title: `You scored ${num(t.score, 1)} out of ${num(t.maxScore)} (${pct(r.scorePct)})`,
        detail: "A comparison with other students will appear once enough of them have taken this test."
      });
    }
    if (t.accuracy !== null) {
      if (t.accuracy < 0.6 && t.attemptRate >= 0.75) {
        out.push({
          id: "balance",
          tone: "bad",
          title: `You attempted a lot, but ${Math.round((1 - t.accuracy) * 10)} in 10 answers were wrong`,
          detail: `${t.attempted} of ${t.total} questions attempted at ${pct(t.accuracy)} accuracy.${p.negative ? ` Wrong answers cost ${num(p.negative, 1)} marks in penalties.` : ""}`
        });
      } else if (t.accuracy >= 0.85 && t.attemptRate < 0.65) {
        out.push({
          id: "balance",
          tone: "warn",
          title: `Very accurate, but ${plural(t.skipped, "question")} left untouched`,
          detail: `${pct(t.accuracy)} of your answers were right, so attempting more is likely to pay off.${p.missedChances ? ` ${plural(p.missedChances, "skipped question")} were ones most students answer correctly.` : ""}`
        });
      } else if (t.accuracy >= 0.75 && t.attemptRate >= 0.7) {
        out.push({
          id: "balance",
          tone: "good",
          title: "Good balance of speed and accuracy",
          detail: `${t.attempted} of ${t.total} questions attempted, ${pct(t.accuracy)} of them right.`
        });
      }
    }
    const strong = strongest(r.areas);
    if (strong)
      out.push({ id: "strong-area", tone: "good", title: `${strong.name} is your strength`, detail: compareLine(strong) });
    const weak = weakest(r.areas);
    if (weak)
      out.push({ id: "weak-area", tone: "bad", title: `${weak.name} needs the most work`, detail: compareLine(weak) });
    const tagged = (tag) => r.questions.filter((q) => q.tags.includes(tag));
    if (p.missedEasy >= 2) {
      out.push({
        id: "missed-easy",
        tone: "warn",
        title: `${plural(p.missedEasy, "question")} that most students get right went wrong`,
        detail: `Mostly in ${listNames(topNames(tagged("missed-easy")))}. These are the cheapest marks to win back.`
      });
    }
    if (p.rushed >= 3) {
      out.push({
        id: "rushed",
        tone: "warn",
        title: `${p.rushed} wrong answers came in under half the usual time`,
        detail: "Answering fast is good only when it is right. These look like guesses or skipped steps."
      });
    }
    if (p.timeSinks >= 2) {
      out.push({
        id: "time-sinks",
        tone: "warn",
        title: `${plural(p.timeSinks, "question")} took ${duration(p.timeSunk)} and still didn't score`,
        detail: `Each took more than twice the usual time. That time could have gone to ${p.missedChances ? `the ${plural(p.missedChances, "easier question")} you skipped` : "easier questions"}.`
      });
    }
    if (p.toughCracked >= 2) {
      out.push({
        id: "tough",
        tone: "good",
        title: `You cracked ${plural(p.toughCracked, "of the toughest questions", "of the toughest questions")}`,
        detail: `Most students got ${p.toughCracked === 1 ? "this one" : "these"} wrong. Your concepts in ${listNames(topNames(tagged("tough-cracked"), 2))} are solid.`
      });
    }
    const easy = r.lods.find((l) => l.id === "easy");
    const lagging = r.lods.filter((l) => l.attempted >= 4 && l.edge !== null && l.edge <= -0.15).sort((a, b) => a.edge - b.edge)[0];
    if (easy && easy.attempted >= 4 && easy.accuracy !== null && easy.accuracy < 0.7) {
      out.push({
        id: "lod",
        tone: "bad",
        title: `Easy questions are leaking marks: only ${pct(easy.accuracy)} right`,
        detail: `${easy.wrong} of ${easy.attempted} easy questions went wrong. Fixing basics will lift your score faster than chasing hard questions.`
      });
    } else if (lagging) {
      out.push({
        id: "lod",
        tone: "warn",
        title: `${lagging.name} questions are where marks slip: ${pct(lagging.accuracy)} right`,
        detail: `Other students got ${pct(lagging.cohortAccuracy)} on the same ${lagging.name.toLowerCase()} questions. Practise this level specifically, timed.`
      });
    }
    const ratios = r.questions.filter((q) => q.status !== "skipped" && q.cohortTime !== null && q.timeRatio !== null).map((q) => q.timeRatio);
    if (ratios.length >= 8) {
      const typical = median(ratios);
      if (typical >= 1.35) {
        out.push({
          id: "pace",
          tone: "warn",
          title: `You take about ${typical.toFixed(1)}\xD7 the usual time per question`,
          detail: `Your average was ${duration(r.avgTimePerQ)} a question. Slower solving is why ${plural(t.skipped, "question")} went unattempted.`
        });
      } else if (typical <= 0.75 && ((_a = t.accuracy) != null ? _a : 0) >= 0.75) {
        out.push({
          id: "pace",
          tone: "good",
          title: "Quick and accurate",
          detail: `You solve in about ${typical.toFixed(1)}\xD7 the usual time while keeping ${pct(t.accuracy)} accuracy.`
        });
      }
    }
    const st = (_b = r.deep) == null ? void 0 : _b.stamina;
    if (st && st.drop !== null && st.drop <= -0.15) {
      out.push({
        id: "stamina",
        tone: "bad",
        title: `Accuracy fell from ${pct(st.first.accuracy)} to ${pct(st.second.accuracy)} in the second half`,
        detail: "Concentration dips as the test goes on. Full-length timed practice builds the stamina to finish as strongly as you start."
      });
    } else if (st && st.drop !== null && st.drop >= 0.15) {
      out.push({
        id: "stamina",
        tone: "info",
        title: `A slow start: ${pct(st.first.accuracy)} in the first half, ${pct(st.second.accuracy)} in the second`,
        detail: "You warmed up as the test went on. A 5-minute warm-up set before a test helps you start sharp."
      });
    }
    const pot = (_c = r.deep) == null ? void 0 : _c.potential;
    if (pot && pot.potential - pot.score >= Math.max(2, pot.max * 0.05)) {
      out.push({
        id: "potential",
        tone: "info",
        title: `${num(pot.potential - pot.score)} more marks were within reach: ${num(pot.potential)} instead of ${num(pot.score)}`,
        detail: `Without new chapters: ${pot.steps.map((s) => `${s.label.toLowerCase()} (+${num(s.gain)})`).join(", ")}.`
      });
    }
    const positive = r.sections.reduce((s, b) => s + Math.max(0, b.score), 0);
    const allTime = r.sections.reduce((s, b) => s + b.time, 0);
    if (positive > 0 && allTime > 0 && r.sections.length > 1) {
      const skew = r.sections.map((b) => ({ b, timeShare: b.time / allTime, markShare: Math.max(0, b.score) / positive })).sort((a, b) => b.timeShare - b.markShare - (a.timeShare - a.markShare))[0];
      if (skew && skew.timeShare - skew.markShare >= 0.15) {
        out.push({
          id: "time-vs-marks",
          tone: "info",
          title: `${skew.b.name} took ${pct(skew.timeShare)} of your time but gave ${pct(skew.markShare)} of your marks`,
          detail: "Plan section time before the test, and switch sections when a set isn't moving."
        });
      }
    }
    return rank(out);
  }
  var TONE_ORDER = { bad: 0, warn: 1, good: 2, info: 3 };
  function rank(xs) {
    const [first, ...rest] = xs;
    return [first, ...rest.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone])].filter(Boolean);
  }
  var round5 = (x) => Math.round(x * 20) / 20;
  function buildActions(input) {
    var _a, _b;
    const { questions, subAreas, areas, totals, patterns: p, tests } = input;
    const per = (x) => Math.round(x / tests * 10) / 10;
    const perMock = tests > 1 ? " per test" : "";
    const about = (x) => tests > 1 ? `about ${Math.round(x / tests)}` : num(x);
    const count = (x) => Math.round(x / tests);
    const out = [];
    const weakSubs = subAreas.filter((b) => b.attempted >= 2 && b.accuracy !== null && (b.verdict === "weak" || b.accuracy <= 0.5)).sort((a, b) => {
      var _a2, _b2;
      return ((_a2 = a.edge) != null ? _a2 : a.accuracy - 0.6) - ((_b2 = b.edge) != null ? _b2 : b.accuracy - 0.6) || b.wrong - a.wrong;
    }).slice(0, 2);
    if (weakSubs.length) {
      const names = weakSubs.map((b) => b.name);
      const lost = questions.filter((q) => weakSubs.some((b) => b.id === q.subAreaId) && q.status === "wrong").reduce((s, q) => s + q.marks - q.score, 0);
      const bench = weakSubs.map((b) => b.cohortAccuracy).filter((x) => x !== null);
      const target = Math.min(0.9, Math.max(0.65, round5((bench.length ? Math.max(...bench) : 0.6) + 0.1)));
      const correct = weakSubs.reduce((s, b) => s + b.correct, 0);
      const attempted = weakSubs.reduce((s, b) => s + b.attempted, 0);
      out.push({
        id: "concepts",
        focus: "concepts",
        title: `Rebuild ${listNames(names)}`,
        why: `${correct} of ${attempted} right here${bench.length ? `; other students got ${pct(bench.reduce((s, x) => s + x, 0) / bench.length)} on the same questions` : ""}.`,
        steps: [
          `Revise the core concepts and formulas of ${listNames(names)} from your HitBullseye material.`,
          "Solve 15\u201320 easy-to-medium questions on each, untimed, and write down why each mistake happened.",
          `Then take a timed set of 10 and aim for ${pct(target)} accuracy before moving on.`
        ],
        gain: lost > 0 ? per(lost) : null
      });
    }
    if (p.negative >= 4 * tests && (p.rushed >= 2 * tests || ((_a = totals.accuracy) != null ? _a : 1) < 0.65)) {
      out.push({
        id: "accuracy",
        focus: "accuracy",
        title: "Answer only when you can rule out two options",
        why: `Wrong answers cost ${about(p.negative)} marks in penalties${perMock}${p.rushed ? `, and ${about(p.rushed)} of them came in under half the usual time` : ""}.`,
        steps: [
          "Before marking an answer, take 10 more seconds to re-read the question and check units or signs.",
          "If you can't eliminate two options within about 30 seconds, leave it for the end.",
          `Next test: keep wrong answers under ${Math.max(1, Math.floor(totals.wrong / tests * 0.6))} (you had ${num(totals.wrong / tests, 0)}).`
        ],
        gain: per(p.negative)
      });
    }
    const easyGain = p.marksWithinReach;
    if (p.missedEasy + p.missedChances >= 2 * tests && easyGain > 0) {
      const easyQs = questions.filter((q) => q.tags.includes("missed-easy") || q.tags.includes("missed-chance"));
      out.push({
        id: "easy-first",
        focus: "strategy",
        title: "Win the easy marks first",
        why: `${[
          count(p.missedEasy) ? `${about(p.missedEasy)} ${p.missedEasy / tests === 1 ? "question" : "questions"} that most students get right went wrong` : "",
          count(p.missedChances) ? `${about(p.missedChances)} like ${p.missedChances / tests === 1 ? "it was" : "them were"} skipped` : ""
        ].filter(Boolean).join(" and ")}${perMock}, mostly in ${listNames(topNames(easyQs, 2))}.`,
        steps: [
          "Do a first pass through each section answering only the questions you can solve in under a minute.",
          "On the second pass, take the medium ones; leave the long ones for last.",
          "Re-check every easy answer once before moving on; most of these are slips, not gaps."
        ],
        gain: per(easyGain)
      });
    }
    if (p.timeSinks >= 2 * tests) {
      out.push({
        id: "exit-rule",
        focus: "speed",
        title: "Use a 3-minute exit rule",
        why: `${about(p.timeSinks)} ${p.timeSinks / tests === 1 ? "question" : "questions"} took over twice the usual time and gave no marks: ${duration(p.timeSunk / tests)} lost${perMock}.`,
        steps: [
          "Glance at the timer when you start a question. At 3 minutes, mark it for review and move on.",
          "Spend the saved time on questions you haven't seen yet.",
          "Practise two timed sectionals this week with this rule."
        ],
        gain: null
      });
    }
    if (input.stamina && input.stamina.drop !== null && input.stamina.drop <= -0.15) {
      out.push({
        id: "stamina",
        focus: "strategy",
        title: "Train to finish as strongly as you start",
        why: `Accuracy dropped from ${pct(input.stamina.first.accuracy)} in the first half to ${pct(input.stamina.second.accuracy)} in the second.`,
        steps: [
          "Take every practice test full-length and in one sitting, no breaks.",
          "Take a 30-second reset (eyes closed, slow breaths) between sections.",
          "In the last third, re-read each question once before marking."
        ],
        gain: null
      });
    }
    if (((_b = totals.accuracy) != null ? _b : 0) >= 0.85 && totals.attemptRate < 0.65) {
      out.push({
        id: "bolder",
        focus: "strategy",
        title: "Attempt more: your accuracy can afford it",
        why: `${pct(totals.accuracy)} of your answers are right, but you attempt only ${pct(totals.attemptRate)} of the paper.`,
        steps: [
          "Attempt any question where you can eliminate two options; at your accuracy the odds favour you.",
          `Aim to attempt ${pct(Math.min(0.9, totals.attemptRate + 0.15))} of the paper in the next test.`,
          "Work on speed with timed drills of 10 questions in 12 minutes."
        ],
        gain: null
      });
    }
    const strong = areas.filter((b) => b.verdict === "strong").sort((a, b) => {
      var _a2, _b2;
      return ((_a2 = b.edge) != null ? _a2 : 0) - ((_b2 = a.edge) != null ? _b2 : 0);
    })[0];
    if (strong && out.length < 4) {
      out.push({
        id: "maintain",
        focus: "maintain",
        title: `Keep ${strong.name} sharp`,
        why: `${pct(strong.accuracy)} accuracy${strong.edge !== null ? `, ${Math.round(strong.edge * 100)} points above other students` : ""}. It is a reliable source of marks.`,
        steps: ["One mixed set of 10 questions a week is enough to hold this level."],
        gain: null
      });
    }
    const order = (a) => {
      var _a2;
      return (_a2 = a.gain) != null ? _a2 : -1;
    };
    return out.sort((a, b) => (a.focus === "maintain" ? 1 : 0) - (b.focus === "maintain" ? 1 : 0) || order(b) - order(a)).slice(0, 4);
  }
  var MIN_ATTEMPTS = RULES.minAttempts;

  // src/lib/analytics/overview.ts
  var CUMULATIVE_MIN = 5;
  function statusOf2(b) {
    if (b.attempted < CUMULATIVE_MIN || b.accuracy === null) return "insufficient";
    if (b.edge !== null) return b.edge >= 0.05 && b.accuracy >= 0.6 ? "strength" : b.edge <= -0.1 || b.accuracy < 0.45 ? "weak" : "average";
    return b.accuracy >= 0.75 ? "strength" : b.accuracy <= 0.45 ? "weak" : "average";
  }
  var row = (b) => ({
    id: b.id,
    name: b.name,
    parentName: b.parentName,
    viewed: b.total,
    attempted: b.attempted,
    correct: b.correct,
    attemptRate: b.attemptRate,
    accuracy: b.accuracy,
    othersAccuracy: b.cohortAccuracy,
    status: statusOf2(b)
  });
  function stats(list, rows) {
    const pcts = list.map((t) => t.percentile).filter((p) => p !== null);
    const ids = new Set(list.map((t) => t.testId));
    const att = rows.filter((r) => ids.has(r.testId) && r.isAttempted);
    return {
      taken: list.length,
      avgPercentile: pcts.length ? pcts.reduce((s, x) => s + x, 0) / pcts.length : null,
      medianPercentile: pcts.length ? median(pcts) : null,
      accuracy: att.length ? att.filter((r) => r.isCorrect).length / att.length : null
    };
  }
  function buildOverview(data, microMax) {
    var _a;
    const byTest = /* @__PURE__ */ new Map();
    for (const a of data.attempts) ((_a = byTest.get(a.testId)) != null ? _a : byTest.set(a.testId, []).get(a.testId)).push(a);
    const questions = [];
    const tests = [...byTest].map(([testId, rows]) => {
      var _a2, _b, _c;
      questions.push(...classifyQuestions(rows, data.questionBenchmarks.get(testId)));
      const score = rows.reduce((s, r) => s + r.score, 0);
      const att = rows.filter((r) => r.isAttempted);
      const first = (_a2 = rows.map((r) => {
        var _a3, _b2;
        return (_b2 = (_a3 = r.firstViewedAt) != null ? _a3 : r.attemptedAt) != null ? _b2 : "";
      }).filter(Boolean).sort()[0]) != null ? _a2 : null;
      return {
        testId,
        testName: rows[0].testName,
        group: rows.length <= microMax ? "Quick practice" : (_b = rows[0].moduleName) != null ? _b : "Assessments",
        takenAt: first,
        score,
        maxScore: rows.reduce((s, r) => s + r.questionMarks, 0),
        percentile: percentileOf(score, (_c = data.scoreDistributions.get(testId)) != null ? _c : []),
        accuracy: att.length ? att.filter((r) => r.isCorrect).length / att.length : null,
        questions: rows.length
      };
    });
    tests.sort((a, b) => {
      var _a2, _b;
      return ((_a2 = b.takenAt) != null ? _a2 : "").localeCompare((_b = a.takenAt) != null ? _b : "");
    });
    const names = [...new Set(tests.map((t) => t.group))];
    const groups = names.map((name) => ({ name, ...stats(tests.filter((t) => t.group === name), data.attempts) }));
    const full = tests.filter((t) => t.questions > microMax);
    const sortRows = (rs) => rs.sort((a, b) => a.name.localeCompare(b.name));
    return {
      tests,
      groups,
      overall: stats(full, data.attempts),
      areas: sortRows(bucketize(questions, byArea).map(row)),
      subAreas: sortRows(bucketize(questions, bySubArea).map(row))
    };
  }

  // src/lib/analytics/question.ts
  var MICRO_MAX = 3;
  var DAY = 864e5;
  var isoDay = (t) => new Date(t).toISOString().slice(0, 10);
  function kindOf(type, marks) {
    const t = (type != null ? type : "").toLowerCase();
    if (/cod|program|prog/.test(t)) return "coding";
    if (/mcq|choice|single|multiple/.test(t)) return "mcq";
    return marks > 1 ? "other" : "mcq";
  }
  function bandsOf(times) {
    if (times.length < 10) return [];
    const sorted = times.map((x) => x.t).sort((a, b) => a - b);
    const hi = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
    const step = hi <= 120 ? 15 : hi <= 300 ? 30 : hi <= 900 ? 120 : 300;
    const n = Math.max(3, Math.min(10, Math.ceil(hi / step)));
    const bands = Array.from({ length: n }, (_, i) => ({ from: i * step, to: (i + 1) * step, attempts: 0, right: 0 }));
    for (const x of times) {
      const b = bands[Math.min(n - 1, Math.floor(x.t / step))];
      b.attempts++;
      if (x.ok) b.right++;
    }
    return bands;
  }
  function buildQuestionReport(data, testId, questionId) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
    const mine = data.attempts.find((a) => a.testId === testId && a.questionId === questionId);
    if (!mine) return null;
    const [q] = classifyQuestions([mine], data.questionBenchmarks.get(testId));
    const peers = ((_b = (_a = data.peerRows) == null ? void 0 : _a.get(testId)) != null ? _b : []).filter((r) => r.questionId === questionId);
    const kind = kindOf(mine.typeOfQues, mine.questionMarks);
    const share = mine.questionMarks > 0 ? Math.max(0, Math.min(1, mine.score / mine.questionMarks)) : 0;
    const outcome = !mine.isAttempted ? "skipped" : mine.isCorrect ? "right" : share > 0 ? "partial" : "wrong";
    const seen = peers.length || ((_d = (_c = data.questionBenchmarks.get(testId)) == null ? void 0 : _c.find((b) => b.questionId === questionId)) == null ? void 0 : _d.views) || 0;
    const solved = peers.length ? peers.filter((r) => r.isCorrect).length : q.cohortSolveRate !== null ? q.cohortSolveRate * seen : 0;
    const solveRate = seen ? solved / seen : null;
    const difficulty = solveRate !== null && seen >= 10 ? {
      solveRate,
      students: seen,
      label: solveRate >= 0.7 ? "Most students get this right" : solveRate >= 0.45 ? "About half get it right" : solveRate >= 0.2 ? "Tough: most students miss it" : "Very tough: few students solve it",
      attemptRate: peers.length ? peers.filter((r) => r.isAttempted).length / peers.length : null
    } : null;
    const att = peers.filter((r) => r.isAttempted && r.timeTaken > 0);
    const rightTimes = att.filter((r) => r.isCorrect).map((r) => r.timeTaken);
    const time = {
      you: mine.timeTaken,
      usual: q.cohortTime,
      medianRight: rightTimes.length >= 5 ? median(rightTimes) : null,
      fasterThan: att.length >= 10 && mine.isAttempted ? att.filter((r) => r.timeTaken > mine.timeTaken).length / att.length : null,
      bands: bandsOf(att.map((r) => ({ t: r.timeTaken, ok: r.isCorrect })))
    };
    let options = null;
    if (kind === "mcq" && att.length >= 10) {
      const right = (_f = (_e = att.find((r) => r.isCorrect && r.selectedAnswer)) == null ? void 0 : _e.selectedAnswer) != null ? _f : null;
      const counts = /* @__PURE__ */ new Map();
      for (const r of att) if (r.selectedAnswer) counts.set(r.selectedAnswer, ((_g = counts.get(r.selectedAnswer)) != null ? _g : 0) + 1);
      if (mine.selectedAnswer && !counts.has(mine.selectedAnswer)) counts.set(mine.selectedAnswer, 0);
      options = [...counts].sort((a, b) => a[0].localeCompare(b[0])).map(([letter, count]) => ({ letter, count, share: count / att.length, isRight: letter === right, isYours: letter === mine.selectedAnswer }));
    }
    let marks = null;
    if (kind !== "mcq" && att.length >= 10) {
      const byScore = /* @__PURE__ */ new Map();
      for (const r of att) {
        const s = Math.round(Math.max(0, r.score) * 10) / 10;
        byScore.set(s, ((_h = byScore.get(s)) != null ? _h : 0) + 1);
      }
      marks = {
        bins: [...byScore].sort((a, b) => a[0] - b[0]).map(([score, count]) => ({ score, count })),
        beat: mine.isAttempted ? att.filter((r) => r.score < mine.score).length / att.length : null,
        full: att.filter((r) => r.isCorrect).length / att.length
      };
    }
    const chrono = [...data.attempts].sort((a, b) => {
      var _a2, _b2, _c2, _d2;
      return ((_b2 = (_a2 = a.attemptedAt) != null ? _a2 : a.firstViewedAt) != null ? _b2 : "").localeCompare((_d2 = (_c2 = b.attemptedAt) != null ? _c2 : b.firstViewedAt) != null ? _d2 : "");
    });
    const inSub = chrono.filter((r) => r.subAreaId === mine.subAreaId && r.isAttempted);
    const inArea = chrono.filter((r) => r.areaId === mine.areaId && r.isAttempted);
    const othersOn = (rows) => {
      const rates = rows.map((r) => {
        var _a2;
        return (_a2 = data.questionBenchmarks.get(r.testId)) == null ? void 0 : _a2.find((b) => b.questionId === r.questionId);
      }).filter((b) => !!b && b.attempts >= 5 && b.accuracy !== null).map((b) => b.accuracy);
      return rates.length ? rates.reduce((s, x) => s + x, 0) / rates.length : null;
    };
    const history = {
      subAreaName: mine.subAreaName,
      areaTitle: mine.areaTitle,
      attempts: inSub.length,
      correct: inSub.filter((r) => r.isCorrect).length,
      accuracy: inSub.length ? inSub.filter((r) => r.isCorrect).length / inSub.length : null,
      othersAccuracy: othersOn(inSub),
      recent: inSub.slice(-10).map((r) => {
        var _a2;
        return { status: statusOf(r), at: (_a2 = r.attemptedAt) != null ? _a2 : r.firstViewedAt, testName: r.testName };
      }),
      areaAttempts: inArea.length,
      areaAccuracy: inArea.length ? inArea.filter((r) => r.isCorrect).length / inArea.length : null
    };
    const before = chrono.filter((r) => {
      var _a2, _b2;
      return r.questionId === questionId && r.testId !== testId && ((_a2 = r.updatedAt) != null ? _a2 : "") < ((_b2 = mine.updatedAt) != null ? _b2 : "");
    }).pop();
    const previous = before ? { at: (_i = before.attemptedAt) != null ? _i : before.firstViewedAt, status: statusOf(before), time: before.timeTaken, testName: before.testName } : null;
    const end = Math.max(
      0,
      ...data.attempts.map((r) => {
        var _a2, _b2;
        return Date.parse((_b2 = (_a2 = r.attemptedAt) != null ? _a2 : r.firstViewedAt) != null ? _b2 : "") || 0;
      })
    );
    const perDay = /* @__PURE__ */ new Map();
    for (const r of data.attempts) {
      const t = Date.parse((_k = (_j = r.attemptedAt) != null ? _j : r.firstViewedAt) != null ? _k : "");
      if (t && t <= end + DAY && t > end - 14 * DAY) perDay.set(isoDay(t), ((_l = perDay.get(isoDay(t))) != null ? _l : 0) + 1);
    }
    const activity = Array.from({ length: 14 }, (_, i) => {
      var _a2;
      const day = isoDay(end - (13 - i) * DAY);
      return { day, questions: (_a2 = perDay.get(day)) != null ? _a2 : 0 };
    });
    const base = {
      testId,
      testName: mine.testName,
      moduleName: mine.moduleName,
      takenAt: (_m = mine.attemptedAt) != null ? _m : mine.firstViewedAt,
      q,
      kind,
      outcome,
      scoreShare: share,
      difficulty,
      time,
      options,
      marks,
      history,
      previous,
      activity,
      insights: [],
      actions: []
    };
    base.insights = questionInsights(base);
    base.actions = questionActions(base);
    return base;
  }
  function bestBand(bands) {
    var _a;
    const ok = bands.filter((b) => b.attempts >= 5);
    return (_a = ok.sort((a, b) => b.right / b.attempts - a.right / a.attempts)[0]) != null ? _a : null;
  }
  var bandLabel = (b) => `${duration(b.from)}\u2013${duration(b.to)}`;
  function questionInsights(r) {
    var _a;
    const out = [];
    const d = r.difficulty;
    const solve = d ? Math.round(d.solveRate * 100) : null;
    if (r.outcome === "right") {
      out.push({
        id: "result",
        tone: "good",
        title: d && d.solveRate < 0.45 ? `Right, on a question only ${solve} out of 100 students solve` : "Right answer",
        detail: d ? `${d.label}. ${num(d.students)} students have tried it.` : "Well done."
      });
    } else if (r.outcome === "partial") {
      out.push({
        id: "result",
        tone: "warn",
        title: `You earned ${Math.round(r.scoreShare * 100)}% of the marks`,
        detail: ((_a = r.marks) == null ? void 0 : _a.beat) != null ? `More than ${Math.round(r.marks.beat * 100)} out of 100 students who attempted it scored. ${Math.round(r.marks.full * 100)}% of them earned full marks.` : "Part of the solution worked; the rest is usually edge cases."
      });
    } else if (r.outcome === "wrong") {
      out.push({
        id: "result",
        tone: d && d.solveRate >= 0.6 ? "bad" : "warn",
        title: d && d.solveRate >= 0.6 ? `Not this time, though ${solve} out of 100 students get it right` : "Not this time",
        detail: d && d.solveRate >= 0.6 ? "Most students solve it, so this is a mark you can win back." : d ? `${d.label}, so do not be hard on yourself; learn the method.` : "Review the method before trying a similar question."
      });
    } else {
      out.push({
        id: "result",
        tone: "info",
        title: "You left this one blank",
        detail: d ? `${d.label}. Even a wrong attempt teaches more than a skip in practice.` : "In practice, an attempt teaches more than a skip."
      });
    }
    const t = r.time;
    if (r.outcome !== "skipped" && t.usual) {
      const ratio = t.you / t.usual;
      if (r.outcome === "right" && t.medianRight && t.you <= t.medianRight) {
        out.push({ id: "time", tone: "good", title: `Faster than most students who got it right`, detail: `You took ${duration(t.you)}; they usually take ${duration(t.medianRight)}.` });
      } else if (r.outcome === "right" && ratio >= 1.6) {
        out.push({ id: "time", tone: "warn", title: `Right, but slow: ${duration(t.you)} against ${duration(t.usual)} usually`, detail: "In a timed test this question would cost time you need elsewhere. Practise similar ones against the clock." });
      } else if (r.outcome !== "right" && ratio < 0.5) {
        out.push({ id: "time", tone: "bad", title: `Answered in ${duration(t.you)}, under half the usual ${duration(t.usual)}`, detail: "This looks rushed. Read the question twice before answering." });
      } else if (r.outcome !== "right" && ratio >= 2) {
        out.push({ id: "time", tone: "warn", title: `${duration(t.you)} spent, twice the usual, without the marks`, detail: "When you are stuck past the usual time, move on and come back to the theory later." });
      }
    }
    const bb = bestBand(t.bands);
    const fastest = t.bands.find((b) => b.attempts >= 5);
    if (bb && fastest && bb !== fastest && bb.right / bb.attempts - fastest.right / fastest.attempts >= 0.25) {
      out.push({
        id: "bands",
        tone: "info",
        title: `Students who spent ${bandLabel(bb)} solved it ${pct(bb.right / bb.attempts)} of the time`,
        detail: `Those who answered in under ${duration(fastest.to)} solved it only ${pct(fastest.right / fastest.attempts)} of the time. Taking the right amount of time pays here.`
      });
    }
    if (r.options && r.outcome === "wrong") {
      const mine = r.options.find((o) => o.isYours);
      const topWrong = r.options.filter((o) => !o.isRight).sort((a, b) => b.share - a.share)[0];
      if (mine && topWrong && mine.letter === topWrong.letter && mine.share >= 0.15) {
        out.push({
          id: "trap",
          tone: "warn",
          title: `Option ${mine.letter} is the most common wrong answer: ${pct(mine.share)} of students chose it`,
          detail: "It is a trap answer. Find the step where this option comes from; that is the mistake to fix."
        });
      } else if (mine && mine.share < 0.1) {
        out.push({ id: "trap", tone: "info", title: `Few students chose option ${mine.letter} (${pct(mine.share)})`, detail: "An unusual answer often means a calculation slip. Redo the working slowly." });
      }
    }
    const h = r.history;
    if (h.attempts >= 3 && h.accuracy !== null) {
      const vs = h.othersAccuracy;
      const weak = vs !== null ? h.accuracy <= vs - 0.1 : h.accuracy < 0.5;
      const strong = vs !== null ? h.accuracy >= vs + 0.1 : h.accuracy >= 0.75;
      out.push({
        id: "history",
        tone: weak ? "bad" : strong ? "good" : "info",
        title: `${h.subAreaName}: ${h.correct} of ${h.attempts} right so far (${pct(h.accuracy)})`,
        detail: vs !== null ? `Other students get ${pct(vs)} of the same questions right. ${weak ? "This sub-topic needs work." : strong ? "This is one of your strengths." : "You are on par."}` : weak ? "This sub-topic needs work." : "Keep practising to build a clearer picture."
      });
    }
    if (r.previous) {
      const was = r.previous.status, now = r.outcome === "right" ? "correct" : r.outcome === "skipped" ? "skipped" : "wrong";
      if (was !== "correct" && now === "correct") out.push({ id: "again", tone: "good", title: "Got it right this time", detail: `You missed this question in ${r.previous.testName}. The revision worked.` });
      else if (was === "correct" && now !== "correct") out.push({ id: "again", tone: "warn", title: "You got this one right before", detail: `In ${r.previous.testName} you solved it. Something slipped this time; revisit the method.` });
    }
    const days = r.activity.filter((a) => a.questions > 0).length;
    const last7 = r.activity.slice(-7).filter((a) => a.questions > 0).length;
    if (days >= 1) {
      out.push({
        id: "habit",
        tone: last7 >= 4 ? "good" : "info",
        title: last7 >= 4 ? `You practised on ${last7} of the last 7 days` : `${plural(last7, "practice day")} in the last 7 days`,
        detail: last7 >= 4 ? "Little and often works. Keep the streak going." : "A few questions every day beats one long session a week."
      });
    }
    return out;
  }
  function questionActions(r) {
    const sub = r.history.subAreaName;
    const out = [];
    const usual = r.time.usual;
    if (r.outcome === "skipped") {
      out.push({ id: "try", focus: "strategy", title: "Attempt it now, untimed", why: "A skipped question teaches nothing; a wrong attempt shows you where you are stuck.", steps: [`Give it 10 minutes without a timer.`, `If you get stuck, read the ${sub} notes, then try again.`], gain: null });
    } else if (r.outcome === "wrong" && r.difficulty && r.difficulty.solveRate >= 0.6) {
      out.push({ id: "slip", focus: "accuracy", title: "Redo it slowly and find the slip", why: "Most students solve this question, so the method is within reach.", steps: ["Redo it on paper, writing every step.", "Compare each step with the method; mark where you went wrong.", `Then solve 3 easy ${sub} questions to lock it in.`], gain: null });
    } else if (r.outcome === "wrong" || r.outcome === "partial") {
      out.push(r.kind === "coding" ? { id: "edge", focus: "concepts", title: r.outcome === "partial" ? "Find the cases your code misses" : "Rebuild the approach", why: r.outcome === "partial" ? `You earned ${Math.round(r.scoreShare * 100)}% of the marks; the rest usually comes from edge cases.` : "None of the hidden tests passed.", steps: ["Test your code on: empty input, a single item, negative numbers, duplicates and very large values.", "Write the expected output for each case before running it.", `Then try one more ${sub} problem.`], gain: null } : { id: "concept", focus: "concepts", title: `Revise ${sub}`, why: "This question needs the method, not just more practice.", steps: [`Read the ${sub} notes and one solved example.`, `Solve 5 ${sub} questions untimed.`, "Come back to this question tomorrow and try it again."], gain: null });
    } else if (r.outcome === "right" && usual && r.time.you > usual * 1.6) {
      out.push({ id: "speed", focus: "speed", title: `Get faster at ${sub}`, why: `You took ${duration(r.time.you)}; others usually take ${duration(usual)}.`, steps: [`Do 5 ${sub} questions with a ${duration(Math.round(usual))} timer each.`, "Note the shortcut or pattern that saves the most time."], gain: null });
    } else if (r.outcome === "right") {
      out.push({ id: "up", focus: "strategy", title: "Level up", why: r.difficulty && r.difficulty.solveRate < 0.45 ? "You solved a question most students miss." : "You solved it comfortably.", steps: [`Try a Difficult ${r.history.areaTitle} question next.`, "Mix in a timed set so the speed holds under pressure."], gain: null });
    }
    out.push({ id: "streak", focus: "maintain", title: "One more tomorrow", why: "Daily practice builds the habit that shows up in test scores.", steps: [`Do one ${r.history.areaTitle} question tomorrow, then check this report again.`], gain: null });
    return out;
  }
  function buildMicroReport(data, testId) {
    var _a, _b;
    const rows = data.attempts.filter((a) => a.testId === testId).sort((a, b) => a.qno - b.qno);
    if (!rows.length) return null;
    const questions = rows.map((r) => buildQuestionReport(data, testId, r.questionId)).filter((x) => !!x);
    return {
      testId,
      testName: rows[0].testName,
      takenAt: (_b = (_a = questions[0]) == null ? void 0 : _a.takenAt) != null ? _b : null,
      questions,
      score: rows.reduce((s, r) => s + r.score, 0),
      maxScore: rows.reduce((s, r) => s + r.questionMarks, 0)
    };
  }

  // src/lib/analytics/standing.ts
  var quantile = (xs, q) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const pos = (s.length - 1) * q;
    const lo = Math.floor(pos);
    return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (pos - lo);
  };
  function curveOf(scores) {
    if (scores.length < 10) return [];
    const uniq = [...new Set(scores.map((s) => Math.round(s * 100) / 100))].sort((a, b) => a - b);
    const step = Math.max(1, Math.ceil(uniq.length / 60));
    const pts2 = uniq.filter((_, i) => i % step === 0 || i === uniq.length - 1);
    return pts2.map((score) => ({ score, percentile: percentileOf(score, scores) }));
  }
  function standingOf(id, name, b, scores) {
    const ok = scores.length >= 10;
    return {
      id,
      name,
      score: b.score,
      max: b.maxScore,
      correct: b.correct,
      wrong: b.wrong,
      skipped: b.skipped,
      percentile: ok ? percentileOf(b.score, scores) : null,
      students: scores.length,
      avgScore: ok ? scores.reduce((s, x) => s + x, 0) / scores.length : null,
      benchmark: ok ? quantile(scores, 0.9) : null,
      topScore: ok ? Math.max(...scores) : null,
      curve: curveOf(scores)
    };
  }
  function standingFor(data, testId, totals, sections) {
    var _a, _b, _c;
    const overall = standingOf("overall", "Overall", totals, (_a = data.scoreDistributions.get(testId)) != null ? _a : []);
    const bySection2 = (_b = data.sectionScores) == null ? void 0 : _b.get(testId);
    const secs = sections.map((s) => {
      var _a2;
      return standingOf(s.id, s.name, s, (_a2 = bySection2 == null ? void 0 : bySection2.get(s.id)) != null ? _a2 : []);
    });
    let toppers = null;
    const list = (_c = data.toppers) == null ? void 0 : _c.get(testId);
    if (list && list.length) {
      const sorted = [...list].sort((a2, b) => {
        var _a2, _b2;
        return b.score - a2.score || ((_a2 = a2.takenAt) != null ? _a2 : "").localeCompare((_b2 = b.takenAt) != null ? _b2 : "");
      });
      const rankOf = (score) => 1 + sorted.filter((x) => x.score > score).length;
      const mark = (x) => ({ ...x, rank: rankOf(x.score), isYou: x.studentId === data.studentId });
      const latest = sorted.reduce((m, x) => {
        var _a2, _b2;
        return ((_a2 = x.takenAt) != null ? _a2 : "") > m ? (_b2 = x.takenAt) != null ? _b2 : "" : m;
      }, "");
      const since = latest ? new Date(Date.parse(latest) - 7 * 864e5).toISOString() : "";
      toppers = {
        overall: sorted.slice(0, 10).map(mark),
        recent: sorted.filter((x) => {
          var _a2;
          return ((_a2 = x.takenAt) != null ? _a2 : "") >= since;
        }).slice(0, 10).map(mark),
        yourRank: sorted.some((x) => x.studentId === data.studentId) ? rankOf(totals.score) : null,
        students: sorted.length
      };
    }
    const t = sections.reduce((s, x) => s + x.time, 0);
    const a = sections.reduce((s, x) => s + x.attempted, 0);
    const p = sections.reduce((s, x) => s + Math.max(0, x.score), 0);
    const shares = sections.map((s) => ({
      id: s.id,
      name: s.name,
      time: t ? s.time / t : 0,
      attempted: a ? s.attempted / a : 0,
      score: p ? Math.max(0, s.score) / p : 0
    }));
    return { overall, sections: secs, toppers, shares };
  }

  // src/lib/analytics/journey.ts
  var avg = (xs) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
  function journeyInsights(j) {
    var _a;
    const out = [];
    const n = j.tests.length;
    const half2 = Math.max(1, Math.min(3, Math.floor(n / 2)));
    const early = j.tests.slice(0, half2);
    const recent = j.tests.slice(-half2);
    const hasPct = j.tests.every((t) => t.percentile !== null);
    const metric = (t) => hasPct ? t.percentile : t.scorePct * 100;
    const from = avg(early.map(metric));
    const to = avg(recent.map(metric));
    const delta = to - from;
    const fitted = ((_a = slope(j.tests.map(metric))) != null ? _a : 0) * (n - 1);
    const fmt = (x) => hasPct ? ordinal(x) : `${Math.round(x)}%`;
    if (delta >= 8 && fitted >= 8) {
      out.push({
        id: "direction",
        tone: "good",
        title: hasPct ? `Clearly improving: you now beat ${Math.round(to)} of every 100 students, up from ${Math.round(from)}` : `Clearly improving: score up from ${fmt(from)} to ${fmt(to)}`,
        detail: `Comparing your first ${plural(half2, "test")} with your latest ${plural(half2, "test")}, across ${plural(n, "test")} in all.`
      });
    } else if (delta <= -8 && fitted <= -8) {
      out.push({
        id: "direction",
        tone: "bad",
        title: hasPct ? `Slipping: you now beat ${Math.round(to)} of every 100 students, down from ${Math.round(from)}` : `Slipping: score down from ${fmt(from)} to ${fmt(to)}`,
        detail: `Your latest ${plural(half2, "test")} are below your first ${half2}. The areas and habits below show where it is coming from.`
      });
    } else {
      out.push({
        id: "direction",
        tone: "info",
        title: hasPct ? `Holding steady: you beat about ${Math.round(to)} of every 100 students` : `Holding steady at about ${fmt(to)} of full marks`,
        detail: `Little change across ${plural(n, "test")}. Steady is fine, but moving up needs the targeted work in the plan below.`
      });
    }
    const last = j.tests[n - 1];
    const best = Math.max(...j.tests.map(metric));
    if (metric(last) === best && n >= 3) {
      out.push({
        id: "best",
        tone: "good",
        title: `${last.testName} is your best result so far`,
        detail: hasPct ? `You beat ${Math.round(last.percentile)} of every 100 students, scoring ${num(last.score, 1)} out of ${num(last.maxScore)}.` : `${pct(last.scorePct)} of full marks.`
      });
    }
    const isStuck = (a) => {
      var _a2;
      return a.weakShare >= 0.5 && a.byTest.filter((x) => x !== null).length >= 3 && a.trend !== "improving" && ((_a2 = a.recentAccuracy) != null ? _a2 : 0) <= 0.6;
    };
    const moved = j.areaProgress.filter((a) => a.trend === "improving" || a.trend === "slipping");
    const delta2 = (a) => {
      var _a2, _b;
      return a.earlyEdge !== null && a.recentEdge !== null ? a.recentEdge - a.earlyEdge : ((_a2 = a.recentAccuracy) != null ? _a2 : 0) - ((_b = a.earlyAccuracy) != null ? _b : 0);
    };
    const up = moved.filter((a) => a.trend === "improving").sort((a, b) => delta2(b) - delta2(a))[0];
    if (up) {
      out.push({
        id: "area-up",
        tone: "good",
        title: `${up.title} has improved the most`,
        detail: `Accuracy went from ${pct(up.earlyAccuracy)} in earlier tests to ${pct(up.recentAccuracy)} recently.`
      });
    }
    const down = moved.filter((a) => a.trend === "slipping").sort((a, b) => delta2(a) - delta2(b))[0];
    if (down && !isStuck(down)) {
      out.push({
        id: "area-down",
        tone: "warn",
        title: `${down.title} is slipping`,
        detail: `Accuracy fell from ${pct(down.earlyAccuracy)} to ${pct(down.recentAccuracy)}. A short revision now stops it becoming a gap.`
      });
    }
    const stuck = j.areaProgress.filter(isStuck).sort((a, b) => b.weakShare - a.weakShare)[0];
    if (stuck) {
      const counted = stuck.byTest.filter((x) => x !== null).length;
      out.push({
        id: "stuck",
        tone: "bad",
        title: `${stuck.title} has been weak in ${Math.round(stuck.weakShare * counted)} of ${counted} tests`,
        detail: `Recent accuracy ${pct(stuck.recentAccuracy)}. Practice alone hasn't moved it, so go back to the concepts first.`
      });
    }
    const negRecent = avg(recent.map((t) => t.negative));
    const negEarly = avg(early.map((t) => t.negative));
    if (negRecent >= 6) {
      out.push({
        id: "negative",
        tone: negRecent < negEarly - 2 ? "warn" : "bad",
        title: `Negative marking still costs about ${num(negRecent)} marks a test`,
        detail: negRecent < negEarly - 2 ? `Down from about ${num(negEarly)}, so it's improving. Keep cutting guesses.` : "That's marks you had to earn twice. Answer only when you can eliminate options."
      });
    } else if (negEarly >= 6 && negRecent <= negEarly / 2) {
      out.push({
        id: "negative",
        tone: "good",
        title: "Far fewer penalty marks than before",
        detail: `About ${num(negRecent)} a test now, down from ${num(negEarly)}.`
      });
    }
    const easyRecent = avg(recent.map((t) => t.missedEasy));
    if (easyRecent >= 3) {
      out.push({
        id: "easy-habit",
        tone: "warn",
        title: `About ${Math.round(easyRecent)} easy questions go wrong every test`,
        detail: "These are questions most students get right. A re-check habit is worth more than new chapters here."
      });
    }
    if (j.spread !== null && j.spread >= 15 && n >= 4) {
      out.push({
        id: "spread",
        tone: "warn",
        title: "Results swing a lot from test to test",
        detail: `From one test to the next your result moves by about ${Math.round(j.spread)} points. A fixed test-day routine (same section order, a time plan) makes results steadier.`
      });
    }
    const order = { bad: 0, warn: 1, good: 2, info: 3 };
    const [head, ...rest] = out;
    return [head, ...rest.sort((a, b) => order[a.tone] - order[b.tone])].slice(0, 7);
  }

  // src/lib/analytics/report.ts
  var firstTime = (rows) => {
    var _a, _b;
    let best = null;
    for (const r of rows) {
      const t = (_b = (_a = r.firstViewedAt) != null ? _a : r.attemptedAt) != null ? _b : r.createdAt;
      if (t && (!best || t < best)) best = t;
    }
    return best;
  };
  var sortByAccuracy = (bs) => [...bs].sort((a, b) => {
    var _a, _b;
    return ((_a = b.accuracy) != null ? _a : -1) - ((_b = a.accuracy) != null ? _b : -1) || b.attempted - a.attempted;
  });
  function buildTestReport(data, testId) {
    var _a, _b;
    const rows = data.attempts.filter((a) => a.testId === testId);
    if (!rows.length) return null;
    const questions = classifyQuestions(rows, data.questionBenchmarks.get(testId));
    const totals = makeBucket(testId, rows[0].testName, questions);
    const bench = data.testBenchmarks.get(testId);
    const scores = (_a = data.scoreDistributions.get(testId)) != null ? _a : [];
    const report = {
      testId,
      testName: rows[0].testName,
      takenAt: firstTime(rows),
      totals,
      scorePct: totals.maxScore ? Math.max(0, totals.score) / totals.maxScore : 0,
      avgTimePerQ: totals.attempted ? questions.filter((q) => q.status !== "skipped").reduce((s, q) => s + q.time, 0) / totals.attempted : 0,
      percentile: percentileOf(totals.score, scores),
      cohort: bench ? { students: bench.students || scores.length, avgScore: bench.avgScore, accuracy: bench.accuracy, avgTime: bench.avgTime } : null,
      distribution: distributionOf(totals.score, scores),
      sections: bucketize(questions, bySection),
      areas: sortByAccuracy(bucketize(questions, byArea)),
      subAreas: sortByAccuracy(bucketize(questions, bySubArea)),
      lods: sortLods(bucketize(questions, byLod)),
      questions,
      patterns: patternsOf(questions),
      insights: [],
      actions: [],
      deep: null
    };
    report.deep = deepOf(report, rows, (_b = data.sectionBenchmarks) == null ? void 0 : _b.get(testId));
    report.deep.standing = standingFor(data, testId, report.totals, report.sections);
    report.insights = testInsights(report);
    report.actions = buildActions({ ...report, tests: 1, stamina: report.deep.stamina });
    return report;
  }
  function weakSubsOf(subAreas) {
    return subAreas.filter((b) => b.attempted >= 2 && b.accuracy !== null && (b.verdict === "weak" || b.accuracy <= 0.5)).sort((a, b) => {
      var _a, _b;
      return ((_a = a.edge) != null ? _a : a.accuracy - 0.6) - ((_b = b.edge) != null ? _b : b.accuracy - 0.6) || b.wrong - a.wrong;
    }).slice(0, 2);
  }
  function deepOf(r, rows, sectionBench) {
    var _a, _b, _c;
    const seen = new Map(rows.map((x) => {
      var _a2;
      return [x.questionId, (_a2 = x.firstViewedAt) != null ? _a2 : x.attemptedAt];
    }));
    const ordered = inOrder(r.questions, seen);
    const withUsual = r.questions.filter((q) => q.status !== "skipped" && q.cohortTime !== null);
    const usualTimePerQ = withUsual.length ? withUsual.reduce((s, q) => s + q.cohortTime, 0) / withUsual.length : null;
    const potential = potentialOf(r.questions, r.totals.score, r.totals.maxScore);
    const stamina = staminaOf(ordered);
    const quadrant = quadrantOf(r.areas, r.questions, (q) => q.areaId);
    const weakest2 = (_a = [...r.sections].filter((s) => s.maxScore > 0).sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)[0]) != null ? _a : null;
    return {
      mix: behaviourMix(r.questions),
      potential,
      stamina,
      pacing: pacingOf(ordered),
      quadrant,
      sectionCompare: sectionCompareOf(r.sections, sectionBench),
      targets: targetsOf({ score: r.totals.score, max: r.totals.maxScore, totals: r.totals, potential, avgTimePerQ: r.avgTimePerQ, usualTimePerQ }),
      weekPlan: weekPlanOf({
        weakSubs: weakSubsOf(r.subAreas),
        weakSection: r.sections.length > 1 ? weakest2 : null,
        strongArea: (_b = r.areas.filter((a) => a.verdict === "strong").sort((a, b) => {
          var _a2, _b2;
          return ((_a2 = b.edge) != null ? _a2 : 0) - ((_b2 = a.edge) != null ? _b2 : 0);
        })[0]) != null ? _b : null,
        accuracyIssue: ((_c = r.totals.accuracy) != null ? _c : 1) < 0.7 || r.patterns.missedEasy + r.patterns.rushed >= 3,
        speedIssue: usualTimePerQ !== null && r.avgTimePerQ > usualTimePerQ * 1.2,
        staminaIssue: (stamina == null ? void 0 : stamina.drop) !== null && stamina !== null && stamina.drop <= -0.15
      }),
      usualTimePerQ,
      standing: null
    };
  }
  function trendOf(ys) {
    var _a, _b;
    const vals = ys.filter((y) => y !== null);
    return {
      first: (_a = vals[0]) != null ? _a : null,
      last: (_b = vals[vals.length - 1]) != null ? _b : null,
      best: vals.length ? Math.max(...vals) : null,
      slope: slope(ys)
    };
  }
  function testOrder(data) {
    const byTest = /* @__PURE__ */ new Map();
    for (const a of data.attempts) {
      const list = byTest.get(a.testId);
      if (list) list.push(a);
      else byTest.set(a.testId, [a]);
    }
    return [...byTest].map(([testId, rows]) => ({ testId, testName: rows[0].testName, takenAt: firstTime(rows) })).sort((a, b) => {
      var _a, _b;
      return ((_a = a.takenAt) != null ? _a : "").localeCompare((_b = b.takenAt) != null ? _b : "");
    });
  }
  function buildJourney(data, reports) {
    var _a, _b, _c, _d;
    const all = reports.flatMap((r) => r.questions);
    const recentN = Math.min(3, Math.max(1, Math.ceil(reports.length / 2)));
    const recentReports = reports.slice(-recentN);
    const recentQs = recentReports.flatMap((r) => r.questions);
    const earlyReports = reports.slice(0, reports.length - recentN);
    const tests = reports.map((r) => ({
      testId: r.testId,
      testName: r.testName,
      takenAt: r.takenAt,
      score: r.totals.score,
      maxScore: r.totals.maxScore,
      scorePct: r.scorePct,
      accuracy: r.totals.accuracy,
      attemptRate: r.totals.attemptRate,
      percentile: r.percentile,
      avgTimePerQ: r.avgTimePerQ,
      negative: r.patterns.negative,
      rushed: r.patterns.rushed,
      missedEasy: r.patterns.missedEasy,
      timeSinks: r.patterns.timeSinks,
      edge: r.totals.edge
    }));
    const areaMeta = /* @__PURE__ */ new Map();
    for (const q of all) if (!areaMeta.has(q.areaId)) areaMeta.set(q.areaId, { title: q.areaTitle, sectionName: q.sectionName });
    const areaProgress = [...areaMeta].map(([id, meta]) => {
      var _a2, _b2;
      const perTest = reports.map((r) => {
        var _a3;
        return (_a3 = r.areas.find((a) => a.id === id)) != null ? _a3 : null;
      });
      const slice = (rs) => makeBucket(id, meta.title, rs.flatMap((r) => r.questions.filter((q) => q.areaId === id)));
      const early = earlyReports.length ? slice(earlyReports) : null;
      const recent = slice(recentReports);
      const delta = early && early.edge !== null && recent.edge !== null ? recent.edge - early.edge : early && early.accuracy !== null && recent.accuracy !== null ? recent.accuracy - early.accuracy : null;
      const taken = perTest.filter((b) => b && b.attempted >= 2);
      return {
        id,
        title: meta.title,
        sectionName: meta.sectionName,
        attempted: perTest.reduce((s, b) => {
          var _a3;
          return s + ((_a3 = b == null ? void 0 : b.attempted) != null ? _a3 : 0);
        }, 0),
        byTest: perTest.map((b) => b && b.attempted ? b.accuracy : null),
        byTestCounts: perTest.map((b) => b && b.attempted ? { correct: b.correct, attempted: b.attempted } : null),
        earlyEdge: (_a2 = early == null ? void 0 : early.edge) != null ? _a2 : null,
        recentEdge: recent.edge,
        earlyAccuracy: (_b2 = early == null ? void 0 : early.accuracy) != null ? _b2 : null,
        recentAccuracy: recent.accuracy,
        trend: !early || early.attempted < 3 || recent.attempted < 3 || delta === null ? "new" : delta >= 0.1 ? "improving" : delta <= -0.1 ? "slipping" : "steady",
        weakShare: taken.length ? taken.filter((b) => {
          var _a3;
          return b.verdict === "weak" || ((_a3 = b.accuracy) != null ? _a3 : 1) <= 0.45;
        }).length / taken.length : 0
      };
    });
    const percentiles = tests.map((t) => t.percentile);
    const usable = percentiles.filter((p) => p !== null);
    const journey = {
      tests,
      latest: reports[reports.length - 1],
      overall: {
        totals: makeBucket("all", "All tests", all),
        sections: bucketize(all, bySection),
        areas: sortByAccuracy(bucketize(all, byArea)),
        subAreas: sortByAccuracy(bucketize(all, bySubArea)),
        lods: sortLods(bucketize(all, byLod))
      },
      recent: {
        totals: makeBucket("recent", "Recent tests", recentQs),
        areas: sortByAccuracy(bucketize(recentQs, byArea)),
        subAreas: sortByAccuracy(bucketize(recentQs, bySubArea)),
        tests: recentN
      },
      areaProgress: areaProgress.sort((a, b) => a.sectionName.localeCompare(b.sectionName) || a.title.localeCompare(b.title)),
      trends: {
        scorePct: trendOf(tests.map((t) => t.scorePct)),
        percentile: trendOf(percentiles),
        accuracy: trendOf(tests.map((t) => t.accuracy)),
        attemptRate: trendOf(tests.map((t) => t.attemptRate))
      },
      spread: usable.length >= 3 ? stdev(usable) : stdev(tests.map((t) => t.scorePct * 100)),
      questionsAttempted: all.filter((q) => q.status !== "skipped").length,
      hoursSpent: all.reduce((s, q) => s + q.time, 0) / 3600,
      sectionTrend: sectionTrendOf(reports),
      recentMix: behaviourMix(recentQs),
      weekPlan: [],
      insights: [],
      actions: []
    };
    journey.insights = journeyInsights(journey);
    const latest = reports[reports.length - 1];
    const recentSections = bucketize(recentQs, bySection);
    journey.weekPlan = weekPlanOf({
      weakSubs: weakSubsOf(journey.recent.subAreas),
      weakSection: recentSections.length > 1 ? [...recentSections].sort((a, b) => a.score / (a.maxScore || 1) - b.score / (b.maxScore || 1))[0] : null,
      strongArea: (_a = journey.recent.areas.filter((a) => a.verdict === "strong").sort((a, b) => {
        var _a2, _b2;
        return ((_a2 = b.edge) != null ? _a2 : 0) - ((_b2 = a.edge) != null ? _b2 : 0);
      })[0]) != null ? _a : null,
      accuracyIssue: ((_b = journey.recent.totals.accuracy) != null ? _b : 1) < 0.7,
      speedIssue: latest.deep.usualTimePerQ !== null && latest.avgTimePerQ > latest.deep.usualTimePerQ * 1.2,
      staminaIssue: ((_d = (_c = latest.deep.stamina) == null ? void 0 : _c.drop) != null ? _d : 0) <= -0.15
    });
    journey.actions = buildActions({
      questions: recentQs,
      areas: journey.recent.areas,
      subAreas: journey.recent.subAreas,
      totals: journey.recent.totals,
      patterns: patternsOf(recentQs),
      tests: recentN,
      stamina: latest.deep.stamina
    });
    return journey;
  }
  function sectionTrendOf(reports) {
    const names = /* @__PURE__ */ new Map();
    for (const r of reports) for (const s of r.sections) names.set(s.id, s.name);
    return [...names].map(([id, name]) => ({
      id,
      name,
      byTest: reports.map((r) => {
        const s = r.sections.find((x) => x.id === id);
        return s && s.maxScore ? Math.max(0, s.score) / s.maxScore : null;
      })
    }));
  }
  function buildStudentReport(data) {
    var _a, _b;
    const sizes = /* @__PURE__ */ new Map();
    for (const a of data.attempts) sizes.set(a.testId, ((_a = sizes.get(a.testId)) != null ? _a : 0) + 1);
    const all = testOrder(data);
    const order = all.filter((t) => {
      var _a2;
      return ((_a2 = sizes.get(t.testId)) != null ? _a2 : 0) > MICRO_MAX;
    });
    const practice = all.filter((t) => {
      var _a2;
      return ((_a2 = sizes.get(t.testId)) != null ? _a2 : 0) <= MICRO_MAX;
    }).map((t) => {
      const rows = data.attempts.filter((a) => a.testId === t.testId);
      const max = rows.reduce((s, r) => s + r.questionMarks, 0);
      return {
        testId: t.testId,
        testName: t.testName,
        takenAt: t.takenAt,
        scorePct: max ? Math.max(0, rows.reduce((s, r) => s + r.score, 0)) / max : 0,
        questions: rows.length,
        moduleName: rows[0].moduleName
      };
    });
    const reports = order.map((t) => buildTestReport(data, t.testId)).filter((r) => !!r);
    const asOf = (_b = data.checkpoints.map((c) => c.lastRun).sort().pop()) != null ? _b : null;
    const base = {
      studentId: data.studentId,
      isDemo: data.isDemo,
      dataAsOf: asOf,
      tests: reports.map((r) => ({ testId: r.testId, testName: r.testName, takenAt: r.takenAt, scorePct: r.scorePct })),
      practice,
      overview: buildOverview(data, MICRO_MAX)
    };
    if (!reports.length) return { ...base, mode: "empty", single: null, journey: null };
    if (reports.length === 1) return { ...base, mode: "single", single: reports[0], journey: null };
    return { ...base, mode: "journey", single: null, journey: buildJourney(data, reports) };
  }

  // src/lib/sim/index.ts
  var sim_exports = {};
  __export(sim_exports, {
    LOD_B: () => LOD_B,
    LOD_TIME: () => LOD_TIME,
    aggregate: () => aggregate,
    hash: () => hash,
    normal: () => normal,
    randomProfile: () => randomProfile,
    rng: () => rng,
    sectionBenchmarks: () => sectionBenchmarks,
    sit: () => sit,
    studentData: () => studentData
  });
  function rng(seed) {
    let a = (typeof seed === "number" ? seed : hash(seed)) >>> 0;
    return () => {
      a = a + 1831565813 >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  var normal = (r, mean = 0, sd = 1) => mean + sd * Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  var sigmoid = (x) => 1 / (1 + Math.exp(-x));
  var LOD_B = { Easy: -1.1, Medium: 0.1, Difficult: 1.2 };
  var LOD_TIME = { Easy: 50, Medium: 85, Difficult: 130 };
  function randomProfile(r, mean = -0.15) {
    return {
      ability: normal(r, mean, 0.85),
      bias: {},
      growth: 0,
      focusGrowth: {},
      speed: Math.exp(normal(r, 0, 0.22)),
      threshold: 0.3 + r() * 0.25,
      careless: 0.03 + r() * 0.08,
      fatigue: r() * 0.08
    };
  }
  function sit(bp, p, r, o) {
    let clock = o.start;
    const n = bp.questions.length;
    return bp.questions.map((q, i) => {
      var _a, _b, _c, _d, _e, _f, _g;
      const theta = p.ability + p.growth * o.nth + ((_a = p.bias[q.areaId]) != null ? _a : 0) + ((_b = p.bias[q.sectionId]) != null ? _b : 0) + (((_c = p.focusGrowth[q.areaId]) != null ? _c : 0) + ((_d = p.focusGrowth[q.sectionId]) != null ? _d : 0)) * o.nth;
      const know = sigmoid(1.7 * (theta - q.b));
      const attempted = know + normal(r, 0, 0.18) > p.threshold;
      const slip = p.careless + p.fatigue * (i / Math.max(1, n - 1));
      let correct = false;
      if (attempted) correct = r() < know * (1 - slip) || q.options > 0 && r() < 1 / q.options;
      const effort = attempted ? 1 : 0.35;
      const time = Math.max(6, Math.round(q.baseTime * p.speed * effort * (1 + p.fatigue * (i / n)) * Math.exp(normal(r, 0, 0.3))));
      const viewed = new Date(clock).toISOString();
      clock += time * 1e3;
      const done = new Date(clock).toISOString();
      let frac = correct ? 1 : 0;
      if (attempted && !correct && q.partial) frac = Math.round(Math.min(0.9, Math.max(0, know * 0.9 + normal(r, 0, 0.2))) * 10) / 10;
      const score = !attempted ? 0 : q.partial ? Math.round(frac * q.marks * 10) / 10 : correct ? q.marks : -q.negative;
      return {
        studentId: o.studentId,
        testId: bp.testId,
        testName: bp.testName,
        questionId: q.questionId,
        uniqueQno: q.uniqueQno,
        qno: q.qno,
        sectionId: q.sectionId,
        sectionName: q.sectionName,
        areaId: q.areaId,
        areaTitle: q.areaTitle,
        subAreaId: q.subAreaId,
        subAreaName: q.subAreaName,
        moduleId: (_e = bp.moduleId) != null ? _e : null,
        moduleName: (_f = bp.moduleName) != null ? _f : null,
        lod: q.lod,
        typeOfQues: q.typeOfQues,
        attemptType: (_g = o.attemptType) != null ? _g : "test",
        isAttempted: attempted,
        isCorrect: correct,
        score,
        questionMarks: q.marks,
        timeTaken: time,
        selectedAnswer: attempted ? q.partial ? null : chosen(q, correct, r) : null,
        firstViewedAt: viewed,
        attemptedAt: attempted ? done : null,
        createdAt: viewed,
        updatedAt: done
      };
    });
  }
  function chosen(q, correct, r) {
    var _a;
    if (!q.options) return String(Math.floor(r() * 90) + 10);
    const right = (_a = q.answer) != null ? _a : 0;
    if (correct) return "ABCDEFGH"[right];
    const k = Math.floor(r() * (q.options - 1));
    return "ABCDEFGH"[k >= right ? k + 1 : k];
  }
  var acc = () => ({ attempts: 0, views: 0, correct: 0, wrong: 0, totalScore: 0, totalTime: 0 });
  function add(a, r) {
    a.views++;
    a.totalScore += r.score;
    if (r.isAttempted) {
      a.attempts++;
      a.totalTime += r.timeTaken;
      if (r.isCorrect) a.correct++;
      else a.wrong++;
    }
  }
  var finish = (a) => ({
    ...a,
    accuracy: a.attempts ? a.correct / a.attempts : null,
    avgTime: a.attempts ? a.totalTime / a.attempts : null,
    avgScore: a.attempts ? a.totalScore / a.attempts : null
  });
  function groupStats(rows, key) {
    var _a;
    const out = {};
    for (const r of rows) {
      const [id, name] = key(r);
      const g = (_a = out[id]) != null ? _a : out[id] = { id, name, attempts: 0, correct: 0, score: 0, max: 0, time: 0 };
      g.max += r.questionMarks;
      g.score += r.score;
      g.time += r.timeTaken;
      if (r.isAttempted) {
        g.attempts++;
        if (r.isCorrect) g.correct++;
      }
    }
    return out;
  }
  function aggregate(rows, lastRun = (/* @__PURE__ */ new Date()).toISOString()) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    const tq = /* @__PURE__ */ new Map();
    const q = /* @__PURE__ */ new Map();
    const t = /* @__PURE__ */ new Map();
    const st = /* @__PURE__ */ new Map();
    const s = /* @__PURE__ */ new Map();
    const m = /* @__PURE__ */ new Map();
    const sm = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const byQ = (_a = tq.get(r.testId)) != null ? _a : tq.set(r.testId, /* @__PURE__ */ new Map()).get(r.testId);
      const tqa = (_b = byQ.get(r.questionId)) != null ? _b : byQ.set(r.questionId, { ...acc(), qno: r.qno }).get(r.questionId);
      add(tqa, r);
      add((_c = q.get(r.questionId)) != null ? _c : q.set(r.questionId, acc()).get(r.questionId), r);
      const tt = (_d = t.get(r.testId)) != null ? _d : t.set(r.testId, { name: r.testName, a: acc(), students: /* @__PURE__ */ new Set(), scores: /* @__PURE__ */ new Map() }).get(r.testId);
      add(tt.a, r);
      tt.students.add(r.studentId);
      const key = `${r.studentId}::${r.testId}`;
      ((_e = st.get(key)) != null ? _e : st.set(key, []).get(key)).push(r);
      const ss = (_f = s.get(r.studentId)) != null ? _f : s.set(r.studentId, { a: acc(), tests: /* @__PURE__ */ new Set() }).get(r.studentId);
      add(ss.a, r);
      ss.tests.add(r.testId);
      if (r.moduleId) {
        const mm = (_h = m.get(r.moduleId)) != null ? _h : m.set(r.moduleId, { name: (_g = r.moduleName) != null ? _g : r.moduleId, a: acc(), students: /* @__PURE__ */ new Set() }).get(r.moduleId);
        add(mm.a, r);
        mm.students.add(r.studentId);
        const smKey = `${r.studentId}::${r.moduleId}`;
        add((_i = sm.get(smKey)) != null ? _i : sm.set(smKey, { ...acc(), studentId: r.studentId, moduleId: r.moduleId }).get(smKey), r);
      }
    }
    const studentTest = /* @__PURE__ */ new Map();
    for (const [key, list] of st) {
      const [studentId, testId] = key.split("::");
      const a = acc();
      for (const r of list) add(a, r);
      const areaStats = groupStats(list, (r) => [r.areaId, r.areaTitle]);
      const ranked = Object.values(areaStats).filter((g) => g.attempts >= 2);
      const doc = {
        studentId,
        testId,
        testName: list[0].testName,
        attempts: a.attempts,
        correct: a.correct,
        wrong: a.wrong,
        views: a.views,
        totalScore: a.totalScore,
        maxScore: list.reduce((x, r) => x + r.questionMarks, 0),
        totalTime: list.reduce((x, r) => x + r.timeTaken, 0),
        accuracy: a.attempts ? a.correct / a.attempts : null,
        avgTime: a.attempts ? a.totalTime / a.attempts : null,
        sectionStats: groupStats(list, (r) => [r.sectionId, r.sectionName]),
        areaStats,
        lodStats: groupStats(list, (r) => {
          var _a2, _b2;
          return [((_a2 = r.lod) != null ? _a2 : "na").toLowerCase(), (_b2 = r.lod) != null ? _b2 : "\u2014"];
        }),
        strongAreaIds: ranked.filter((g) => g.correct / g.attempts >= 0.75).map((g) => g.id),
        weakAreaIds: ranked.filter((g) => g.correct / g.attempts <= 0.45).map((g) => g.id),
        takenAt: (_j = list.map((r) => {
          var _a2, _b2;
          return (_b2 = (_a2 = r.firstViewedAt) != null ? _a2 : r.attemptedAt) != null ? _b2 : "";
        }).filter(Boolean).sort()[0]) != null ? _j : null,
        updatedAt: lastRun
      };
      ((_k = studentTest.get(testId)) != null ? _k : studentTest.set(testId, []).get(testId)).push(doc);
      t.get(testId).scores.set(studentId, a.totalScore);
    }
    return {
      student_question_analytics: rows.length,
      analytics_checkpoint_v2: [
        "student_analytics_v2",
        "question_analytics_v2",
        "test_analytics_v2",
        "test_question_analytics_v2",
        "module_analytics_v2",
        "student_test_analytics_v2",
        "student_module_analytics_v2"
      ].map((type) => ({ type, lastRun })),
      student_analytics_v2: new Map([...s].map(([id, v]) => [id, { ...finish(v.a), studentId: id, tests: v.tests.size }])),
      question_analytics_v2: new Map([...q].map(([id, a]) => [id, { ...finish(a), questionId: id }])),
      test_analytics_v2: new Map(
        [...t].map(([id, v]) => {
          const scores = [...v.scores.values()];
          return [
            id,
            {
              testId: id,
              testName: v.name,
              students: v.students.size,
              accuracy: v.a.attempts ? v.a.correct / v.a.attempts : null,
              avgScore: scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : null,
              avgTime: v.students.size ? (v.a.totalTime || 0) / v.students.size : null,
              updatedAt: lastRun
            }
          ];
        })
      ),
      test_question_analytics_v2: new Map(
        [...tq].map(([testId, byQ]) => [
          testId,
          [...byQ].map(([questionId, a]) => {
            const f = finish(a);
            return {
              testId,
              questionId,
              qno: a.qno,
              accuracy: f.accuracy,
              attempts: a.attempts,
              views: a.views,
              correct: a.correct,
              wrong: a.wrong,
              avgScore: f.avgScore,
              avgTime: f.avgTime
            };
          })
        ])
      ),
      module_analytics_v2: new Map([...m].map(([id, v]) => [id, { ...finish(v.a), moduleId: id, moduleName: v.name, students: v.students.size }])),
      student_test_analytics_v2: studentTest,
      student_module_analytics_v2: new Map([...sm].map(([k, a]) => [k, { ...finish(a), studentId: a.studentId, moduleId: a.moduleId }]))
    };
  }
  var quantile2 = (xs, q) => {
    if (!xs.length) return 0;
    const s = [...xs].sort((a, b) => a - b);
    const pos = (s.length - 1) * q;
    const lo = Math.floor(pos);
    return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (pos - lo);
  };
  function sectionBenchmarks(docs) {
    var _a;
    const by = /* @__PURE__ */ new Map();
    for (const d of docs) {
      for (const g of Object.values(d.sectionStats)) {
        const e = (_a = by.get(g.id)) != null ? _a : by.set(g.id, { name: g.name, pcts: [], accs: [] }).get(g.id);
        if (g.max > 0) e.pcts.push(Math.max(0, g.score) / g.max);
        if (g.attempts) e.accs.push(g.correct / g.attempts);
      }
    }
    return [...by].map(([sectionId, e]) => ({
      sectionId,
      sectionName: e.name,
      students: e.pcts.length,
      avgPct: e.pcts.reduce((x, y) => x + y, 0) / (e.pcts.length || 1),
      topPct: quantile2(e.pcts, 0.9),
      avgAccuracy: e.accs.length ? e.accs.reduce((x, y) => x + y, 0) / e.accs.length : null
    }));
  }
  function studentData(studentId, rows, idx, isDemo = true) {
    const mine = rows.filter((r) => r.studentId === studentId);
    const tests = new Set(mine.map((r) => r.testId));
    const pick = (m) => new Map([...m].filter(([k]) => tests.has(k)));
    const docs = pick(idx.student_test_analytics_v2);
    return {
      studentId,
      attempts: mine,
      testBenchmarks: pick(idx.test_analytics_v2),
      questionBenchmarks: pick(idx.test_question_analytics_v2),
      scoreDistributions: new Map([...docs].map(([k, list]) => [k, list.map((d) => d.totalScore)])),
      sectionBenchmarks: new Map([...docs].map(([k, list]) => [k, sectionBenchmarks(list)])),
      sectionScores: new Map(
        [...docs].map(([k, list]) => {
          var _a;
          const by = /* @__PURE__ */ new Map();
          for (const d of list) for (const g of Object.values(d.sectionStats)) ((_a = by.get(g.id)) != null ? _a : by.set(g.id, []).get(g.id)).push(g.score);
          return [k, by];
        })
      ),
      toppers: new Map([...docs].map(([k, list]) => [k, list.map((d) => ({ studentId: d.studentId, score: d.totalScore, takenAt: d.takenAt }))])),
      // Small practice sets: every student's rows for that set (an ES query on the raw index by testId).
      peerRows: new Map(
        [...tests].filter((t) => mine.filter((r) => r.testId === t).length <= 3).map((t) => [t, rows.filter((r) => r.testId === t)])
      ),
      checkpoints: idx.analytics_checkpoint_v2,
      isDemo
    };
  }
  return __toCommonJS(engine_exports);
})();
