/* =====================================================================
   HITBULLSEYE — PERFORMANCE REPORT (report.html)
   Two views:
     · Test report   — one attempt, question by question
     · Progress      — every test so far (long-journey students)
   All numbers come from HBA (the analytics engine) over the student's
   question-level rows; nothing on this page is typed in by hand.
   ===================================================================== */
var HBR = (function(){
  "use strict";
  var esc = HBC.esc, pct = HBC.pct, dur = HBC.dur;
  var F = HBA.format;

  var TONE = { good:["check","Going well"], warn:["alert","Watch"], bad:["target","Fix first"], info:["info","Note"] };
  var FOCUS = { concepts:"Concepts", accuracy:"Accuracy", speed:"Time", strategy:"Test strategy", maintain:"Keep it up" };
  var TAGS = { "missed-easy":"Missed easy", rushed:"Rushed", "time-sink":"Time sink", "slow-correct":"Slow but right",
               "missed-chance":"Skipped easy", "smart-skip":"Smart skip", "tough-cracked":"Tough cracked" };
  var MIX_COLOR = { "tough-cracked":"#047857", solid:"#10a36b", "smart-skip":"#6ee7b7", "slow-right":"#f59e0b",
                    skipped:"#cbd5e1", careless:"#e0453a", rushed:"#f97316", stuck:"#991b1b",
                    "concept-gap":"#f87171", "skipped-easy":"#fda4af" };
  var VERDICT = { strong:"Strong", weak:"Weak", par:"On par", thin:"Few attempts" };
  var TREND = { improving:"Improving", slipping:"Slipping", steady:"Steady", new:"Not enough yet" };

  /* ---------------- small builders ---------------- */
  function head(kicker, title, sub, aside){
    return '<div class="an-head"><div><span class="an-kicker">' + esc(kicker) + "</span><h2>" + esc(title) + "</h2>" +
      (sub ? "<p>" + sub + "</p>" : "") + "</div>" + (aside || "") + "</div>";
  }
  function sec(kicker, title, sub, body, aside){ return '<section class="an-sec">' + head(kicker, title, sub, aside) + body + "</section>"; }
  function tile(l, v, s){ return '<div class="an-tile"><div class="l">' + l + '</div><div class="v">' + v + "</div>" + (s ? '<div class="s">' + s + "</div>" : "") + "</div>"; }
  function edge(e){
    if(e == null) return '<span class="edge flat">—</span>';
    var cls = e >= 0.05 ? "up" : e <= -0.05 ? "down" : "flat";
    return '<span class="edge ' + cls + '">' + F.pts(e) + "</span>";
  }
  function meter(v, peer, top){
    return '<div class="an-meter">' + (v != null ? '<i style="width:' + Math.max(2, v * 100) + '%"></i>' : "") +
      (peer != null ? '<em style="left:' + peer * 100 + '%"></em>' : "") + (top != null ? '<u style="left:' + top * 100 + '%"></u>' : "") + "</div>";
  }
  function legendMeter(top){
    return '<div class="an-legend"><span><i style="background:var(--viz-you)"></i>You</span>' +
      '<span><i class="an-tk" style="background:var(--viz-peer)"></i>Average of other students (same questions)</span>' +
      (top ? '<span><i class="an-tk" style="background:var(--viz-top)"></i>Top 10%</span>' : "") + "</div>";
  }

  function insights(list){
    return '<div class="an-grid an-2">' + list.map(function(i, k){
      var t = TONE[i.tone];
      return '<div class="an-ins ' + i.tone + '"' + (k === 0 && list.length % 2 ? ' style="grid-column:1/-1"' : "") + '>' +
        '<span class="an-tone ' + i.tone + '">' + ico(t[0]) + t[1] + "</span><h4>" + esc(i.title) + "</h4><p>" + esc(i.detail) + "</p></div>";
    }).join("") + "</div>";
  }

  function actions(list, perTest){
    if(!list.length) return '<div class="an-card mut">No clear gaps in this data. Keep taking full tests to build a trend.</div>';
    return '<div class="an-grid an-2">' + list.map(function(a, k){
      return '<div class="an-act"><div class="n">' + (k + 1) + '</div><div class="grow">' +
        '<div class="row" style="gap:8px;flex-wrap:wrap"><span class="an-focus">' + esc(FOCUS[a.focus]) + "</span>" +
        (a.gain ? '<span class="an-gain">up to +' + F.num(a.gain, 1) + " mark" + (a.gain === 1 ? "" : "s") + (perTest ? " a test" : "") + "</span>" : "") + "</div>" +
        "<h4>" + esc(a.title) + '</h4><div class="why">' + esc(a.why) + "</div><ul>" +
        a.steps.map(function(s){ return "<li>" + ico("check") + "<span>" + esc(s) + "</span></li>"; }).join("") + "</ul></div></div>";
    }).join("") + "</div>";
  }

  function weekPlan(days, key){
    var done = {};
    try { done = JSON.parse(localStorage.getItem(key) || "{}"); } catch(e){}
    var n = days.filter(function(d){ return done[d.day]; }).length;
    return '<div class="an-card"><div class="row-b"><div><h3>Your next 7 days</h3><div class="sub">Tap a day when it is done. About ' +
      Math.round(days.reduce(function(a, d){ return a + d.minutes; }, 0) / 60 * 10) / 10 + ' hours in all.</div></div>' +
      '<div style="min-width:180px"><div class="xs mut" style="margin-bottom:5px"><b id="wkN">' + n + "</b> of 7 done</div>" +
      '<div class="an-progress"><i id="wkBar" style="width:' + (n / 7 * 100) + '%"></i></div></div></div>' +
      '<div class="an-week mt-s" data-key="' + esc(key) + '">' + days.map(function(d){
        return '<div class="an-day' + (done[d.day] ? " done" : "") + '" data-day="' + d.day + '" role="button" tabindex="0" aria-pressed="' + !!done[d.day] + '">' +
          '<span class="an-daytick">' + ico("check") + '</span><div class="d">Day ' + d.day + "</div><b>" + esc(d.title) + "</b><p>" + esc(d.task) + '</p><div class="m">' + d.minutes + " min</div></div>";
      }).join("") + "</div></div>";
  }
  function bindWeek(root){
    root.querySelectorAll(".an-week").forEach(function(w){
      var key = w.getAttribute("data-key");
      function toggle(el){
        var done = {};
        try { done = JSON.parse(localStorage.getItem(key) || "{}"); } catch(e){}
        var d = el.getAttribute("data-day");
        done[d] = !done[d];
        try { localStorage.setItem(key, JSON.stringify(done)); } catch(e){}
        el.classList.toggle("done", !!done[d]);
        el.setAttribute("aria-pressed", !!done[d]);
        var n = Object.keys(done).filter(function(k){ return done[k]; }).length;
        var c = w.closest(".an-card");
        c.querySelector("#wkN").textContent = n;
        c.querySelector("#wkBar").style.width = (n / 7 * 100) + "%";
        if(n === 7) hbeToast("All 7 days done. Take your next test and compare!", "check", 5000);
      }
      w.addEventListener("click", function(e){ var d = e.target.closest(".an-day"); if(d) toggle(d); });
      w.addEventListener("keydown", function(e){ var d = e.target.closest(".an-day"); if(d && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); toggle(d); } });
    });
  }

  function targets(list){
    return '<div class="an-card"><h3>Targets for your next test</h3><div class="sub">Set from this attempt, so they are within reach.</div>' +
      '<div class="mt-s">' + list.map(function(t){
        return '<div class="an-target"><div class="lbl">' + esc(t.label) + "<small>" + esc(t.why) + '</small></div><span class="now">' + esc(t.now) + "</span>" +
          ico("arrow") + '<span class="to">' + esc(t.target) + "</span></div>";
      }).join("") + "</div></div>";
  }

  function mix(m, total, title, sub){
    return '<div class="an-card"><h3>' + esc(title) + '</h3><div class="sub">' + esc(sub) + "</div>" +
      '<div class="an-stack mt-s" role="img" aria-label="Answers by what happened">' + m.map(function(x){
        var b = HBA.BEHAVIOUR[x.key];
        return '<div style="flex:' + x.count + ";background:" + MIX_COLOR[x.key] + '" tabindex="0" data-tip="' +
          esc(HBC.tipRows(b.label, [["Questions", x.count]], b.hint)) + '">' + (x.count / total >= 0.07 ? x.count : "") + "</div>";
      }).join("") + "</div>" +
      '<div class="an-mix">' + m.map(function(x){
        var b = HBA.BEHAVIOUR[x.key];
        return '<div><i style="background:' + MIX_COLOR[x.key] + '"></i><div><b>' + x.count + "</b> " + esc(b.label) + "<span>" + esc(b.hint) + "</span></div></div>";
      }).join("") + "</div></div>";
  }

  function topicRows(areas, subAreas){
    return '<div class="an-rows"><div class="an-row head"><span>Topic</span><span>Right / tried</span><span>You vs others</span><span style="text-align:right">Edge</span></div>' +
      areas.map(function(a){
        var subs = subAreas.filter(function(s){ return s.parentId === a.id; });
        return '<details class="an-area"><summary class="an-row"><span class="nm"><span class="car">›</span><span>' + esc(a.name) +
          '</span><span class="an-verdict ' + a.verdict + '">' + VERDICT[a.verdict] + "</span></span>" +
          '<span class="num">' + a.correct + "/" + a.attempted + (a.skipped ? " · " + a.skipped + " skipped" : "") + "</span>" +
          meter(a.accuracy, a.cohortAccuracy) + edge(a.edge) + "</summary>" +
          subs.map(function(s){
            return '<div class="an-row subrow"><span class="nm"><span>' + esc(s.name) + '</span></span><span class="num">' + s.correct + "/" + s.attempted +
              (s.skipped ? " · " + s.skipped + " skipped" : "") + "</span>" + meter(s.accuracy, s.cohortAccuracy) + edge(s.edge) + "</div>";
          }).join("") + "</details>";
      }).join("") + "</div>" + legendMeter(false);
  }

  function lodRows(lods){
    return '<div class="an-rows">' + lods.map(function(l){
      return '<div class="an-row"><span class="nm"><span>' + esc(l.name) + '</span></span><span class="num">' + l.correct + "/" + l.attempted + " right</span>" +
        meter(l.accuracy, l.cohortAccuracy) + edge(l.edge) + "</div>";
    }).join("") + "</div>";
  }

  function sectionCompare(list){
    var hasBench = list.some(function(s){ return s.avg != null; });
    return '<div class="an-rows">' + list.map(function(s){
      var lead = s.avg == null ? null : s.you - s.avg;
      return '<div class="an-row"><span class="nm"><span>' + esc(s.name) + '</span></span><span class="num">' + pct(s.you) + " scored</span>" +
        meter(s.you, s.avg, s.top) + edge(lead) + "</div>";
    }).join("") + "</div>" + (hasBench ? legendMeter(true).replace("Average of other students (same questions)", "Average of all students") : "");
  }

  /* ---------------- question review ---------------- */
  function review(r, rows){
    var byQ = {};
    rows.forEach(function(x){ byQ[x.questionId] = x; });
    var counts = {};
    r.questions.forEach(function(q){ q.tags.forEach(function(t){ counts[t] = (counts[t] || 0) + 1; }); });
    var chips = '<div class="an-filters" role="group" aria-label="Filter questions">' +
      '<button class="an-chip on" data-f="">All ' + r.questions.length + "</button>" +
      '<button class="an-chip" data-f="status:wrong">Wrong ' + r.totals.wrong + "</button>" +
      '<button class="an-chip" data-f="status:skipped">Skipped ' + r.totals.skipped + "</button>" +
      Object.keys(TAGS).filter(function(t){ return counts[t]; }).map(function(t){
        return '<button class="an-chip" data-f="tag:' + t + '">' + TAGS[t] + " " + counts[t] + "</button>";
      }).join("") + "</div>";
    var list = '<div class="an-qlist">' + r.questions.map(function(q){
      var it = HBX.ITEMS[q.questionId], row = byQ[q.questionId] || {};
      var sel = row.selectedAnswer ? "ABCDEFGH".indexOf(row.selectedAnswer) : -1;
      var label = q.status === "correct" ? "Correct" : q.status === "wrong" ? "Wrong" : "Skipped";
      return '<div class="an-q" data-status="' + q.status + '" data-tags="' + q.tags.join(" ") + '">' +
        '<div class="top"><span class="qn">Q' + q.qno + '</span><span class="an-res ' + q.status + '">' + label + "</span>" +
        "<span>" + esc(q.sectionName) + " · " + esc(q.subAreaName) + " · " + esc(q.lod || "") + "</span>" +
        (q.tags.length ? '<span class="tagl">' + q.tags.map(function(t){ return TAGS[t]; }).join(" · ") + "</span>" : "") + "</div>" +
        (it ? '<div class="txt">' + esc(it.text) + "</div>" : "") +
        '<div class="ans">' +
          (it ? "<span>Your answer: <b>" + (sel > -1 && it.choices[sel] ? esc(it.choices[sel]) : "—") + "</b></span>" +
                (q.status !== "correct" ? "<span>Correct answer: <b>" + esc(it.choices[it.answer]) + "</b></span>" : "") : "") +
          "<span>Your time: <b>" + dur(q.time) + "</b>" + (q.cohortTime != null ? " · usual " + dur(q.cohortTime) : "") + "</span>" +
          (q.cohortSolveRate != null ? "<span>Solved by <b>" + pct(q.cohortSolveRate) + "</b> of students</span>" : "") +
        "</div></div>";
    }).join("") + "</div>";
    return chips + list;
  }
  function bindReview(root, r, mountStrip){
    var box = root.querySelector(".an-filters");
    if(!box) return;
    box.addEventListener("click", function(e){
      var b = e.target.closest(".an-chip"); if(!b) return;
      box.querySelectorAll(".an-chip").forEach(function(c){ c.classList.toggle("on", c === b); });
      var f = b.getAttribute("data-f"), kind = f.split(":")[0], val = f.split(":")[1];
      root.querySelectorAll(".an-q").forEach(function(q){
        var show = !f || (kind === "status" ? q.getAttribute("data-status") === val : (" " + q.getAttribute("data-tags") + " ").indexOf(" " + val + " ") > -1);
        q.style.display = show ? "" : "none";
      });
      mountStrip(!f ? null : function(q){ return kind === "status" ? q.status === val : q.tags.indexOf(val) > -1; });
    });
  }

  /* ---------------- TEST VIEW ---------------- */
  function testView(ctx, r){
    var t = r.totals, d = r.deep, st = ctx.st;
    var rows = ctx.data.attempts.filter(function(x){ return x.testId === r.testId; });
    var res = (st.results || {})[r.testId];
    var rankLine = ctx.rank(r.testId);
    var best = r.insights.filter(function(i){ return i.tone === "good"; })[0];
    var worst = r.insights.filter(function(i){ return i.tone === "bad"; })[0] || r.insights.filter(function(i){ return i.tone === "warn"; })[0];
    var first = r.actions[0];

    var html =
      '<section class="an-card rise"><div class="an-hero">' +
        '<div class="an-ring">' + HBC.ring(r.scorePct) + '<div class="in"><b>' + Math.round(r.scorePct * 100) + '%</b><span>Score</span><small>' +
          F.num(t.score) + " / " + F.num(t.maxScore) + " marks</small></div></div>" +
        "<div>" +
          '<div class="row-b"><div><h2 style="font-size:22px">' + esc(r.testName) + '</h2><p class="sm mut">Attempted ' + esc(F.dateTime(r.takenAt)) +
            " · " + t.attempted + " of " + t.total + " attempted · " + dur(t.time) + " in all</p></div>" +
            (res ? '<span class="badge ' + hbeBand(res.pct).cls + '">' + hbeBand(res.pct).label + "</span>" : "") + "</div>" +
          '<div class="an-tiles mt-s">' +
            tile("Percentile", r.percentile != null ? F.ordinal(r.percentile) : "—", r.distribution ? "of " + r.distribution.students + " students" : "awaiting comparison") +
            tile("Accuracy", pct(t.accuracy), t.correct + " right · " + t.wrong + " wrong") +
            tile("Campus rank", rankLine ? rankLine.rank + "<small>/" + rankLine.of + "</small>" : "—", ctx.college.shortName + " · this test") +
            tile("Time per question", dur(r.avgTimePerQ), d.usualTimePerQ ? "usual " + dur(d.usualTimePerQ) : "") +
            tile("Within reach", F.num(d.potential.potential) + "<small>/" + F.num(t.maxScore) + "</small>", d.potential.potential > t.score ? "+" + F.num(d.potential.potential - t.score) + " marks, no new chapters" : "no easy marks lost") +
            tile("vs class average", r.cohort && r.cohort.avgScore != null ? F.signed(t.score - r.cohort.avgScore, 1) + "<small> marks</small>" : "—", r.cohort && r.cohort.avgScore != null ? "average " + F.num(r.cohort.avgScore, 1) : "") +
          "</div></div></div>" +
        '<div class="an-tldr">' +
          (best ? '<div><i style="background:var(--ok-bg);color:var(--ok)">' + ico("medal") + "</i><div><b>" + esc(best.title) + "</b><span>Your strongest signal</span></div></div>" : "") +
          (worst ? '<div><i style="background:var(--err-bg);color:var(--err)">' + ico("target") + "</i><div><b>" + esc(worst.title) + "</b><span>The biggest thing to fix</span></div></div>" : "") +
          (first ? '<div><i style="background:rgba(var(--brand-rgb),.08);color:var(--brand)">' + ico("arrow") + "</i><div><b>" + esc(first.title) + "</b><span>Do this first" + (first.gain ? " · up to +" + F.num(first.gain, 1) + " marks" : "") + "</span></div></div>" : "") +
        "</div></section>";

    html += sec("Insights", "What your answers are telling us", "Read from every answer, the time you spent on it, and how other students did on the same questions.", insights(r.insights));

    html += sec("Score potential", "Where the next marks will come from", "No new chapters needed: these marks were on questions most students get right.",
      '<div class="an-grid an-12">' + (d.potential.steps.length
        ? '<div class="an-card"><h3>From ' + F.num(t.score) + " to " + F.num(d.potential.potential) + "</h3>" +
          '<div class="sub">Each green step is marks you lost on questions that most students answer correctly.</div><div class="an-chart" id="c-wf"></div></div>'
        : '<div class="an-card"><h3>No easy marks lost</h3><div class="sub">Every question most students get right, you got right too.</div>' +
          '<p class="sm mt-s">Your next marks are in the harder questions: the topics marked <b>Weak</b> below and the questions tagged <b>Concept gap</b> in the review.</p></div>') +
        targets(d.targets) + "</div>");

    html += sec("Answer behaviour", "How each answer went", "Every question sorted by what happened, so you can see habits, not just marks.",
      mix(d.mix, r.questions.length, "Your " + r.questions.length + " answers", "Hover a block for what it means."));

    html += sec("Sections", "Section by section", "Your share of section marks against the average and the top 10% of students on this paper.",
      sectionCompare(d.sectionCompare));

    if(d.quadrant.length >= 2){
      html += sec("Speed × accuracy", "Which topics are fast, which are shaky", "Each dot is a topic: higher is more accurate, further right is slower than other students on the same questions. Bigger dots = more questions.",
        '<div class="an-card"><div class="an-chart" id="c-quad"></div></div>');
    }

    html += sec("Pacing", "How your time went", "Your running time through the paper against the usual pace for the same questions.",
      '<div class="an-grid an-12"><div class="an-card"><h3>Time used, question by question</h3><div class="an-chart" id="c-pace"></div>' +
        '<div class="an-legend"><span><i class="line" style="background:var(--viz-you)"></i>You</span><span><i class="line" style="background:var(--viz-peer)"></i>Usual pace</span></div></div>' +
        staminaCard(d.stamina) + "</div>");

    if(r.distribution){
      html += sec("Standing", "Where you stand", "How every student on this paper scored.",
        '<div class="an-card"><div class="an-chart" id="c-dist"></div><div class="an-legend"><span><i style="background:var(--viz-you)"></i>Your score band</span><span><i style="background:var(--viz-peer)"></i>Other students</span>' +
        "<span>" + r.distribution.students + " students · middle score " + F.num(r.distribution.median, 1) + "</span></div></div>");
    }

    html += sec("Topics", "Topic by topic", "Open a topic to see its sub-topics. Compared with students who attempted the same questions.", topicRows(r.areas, r.subAreas));
    if(r.lods.length) html += sec("Difficulty", "By difficulty level", "", lodRows(r.lods) + legendMeter(false));

    html += sec("Every question", "Question by question", "Bar height is your time; the dark line is the usual time. Filter to spot a pattern, then review the questions below.",
      '<div class="an-card"><div class="an-chart" id="c-strip"></div><div class="an-legend"><span><i style="background:var(--viz-ok)"></i>Correct</span><span><i style="background:var(--viz-err)"></i>Wrong</span>' +
      '<span><i style="background:var(--viz-skip)"></i>Skipped</span><span><i class="line" style="background:var(--ink)"></i>Usual time</span></div></div>' +
      '<div class="mt-s">' + review(r, rows) + "</div>");

    html += sec("Action plan", "What to do next", "Ordered by how many marks each step can win back.", actions(r.actions, false));
    html += '<section class="an-sec">' + weekPlan(d.weekPlan, "hbe_plan_" + st.id + "_" + r.testId) + "</section>";

    return {
      html: html,
      after: function(root){
        if(d.potential.steps.length) HBC.mount(root.querySelector("#c-wf"), HBC.waterfall(d.potential));
        if(d.quadrant.length >= 2) HBC.mount(root.querySelector("#c-quad"), HBC.quadrant(d.quadrant, HBA.ZONES));
        HBC.mount(root.querySelector("#c-pace"), HBC.pacing(d.pacing));
        if(r.distribution) HBC.mount(root.querySelector("#c-dist"), HBC.histogram(r.distribution, t.score));
        var stripEl = root.querySelector("#c-strip");
        var drawStrip = function(hl){ stripEl.innerHTML = ""; HBC.mount(stripEl, HBC.strip(r.questions, hl, TAGS)); };
        drawStrip(null);
        bindReview(root, r, drawStrip);
        bindWeek(root);
      }
    };
  }

  function staminaCard(s){
    if(!s) return '<div class="an-card"><h3>First half vs second half</h3><p class="sub">Needs at least 8 questions.</p></div>';
    var drop = s.drop;
    var msg = drop == null ? "Not enough attempts in one half to compare." :
      drop <= -0.15 ? "Accuracy fell in the second half — build stamina with full-length timed practice." :
      drop >= 0.15 ? "You warmed up as you went. A short warm-up set before the test helps." :
      "Steady from start to finish.";
    function h(l, x){ return '<div><div class="l">' + l + '</div><div class="v">' + pct(x.accuracy) + '</div><div class="s">' + x.correct + "/" + x.attempted + " right" +
      (x.pace != null ? " · " + x.pace.toFixed(1) + "× usual time" : "") + "</div></div>"; }
    return '<div class="an-card"><h3>First half vs second half</h3><div class="sub">Accuracy in the order you met the questions.</div>' +
      '<div class="an-halves">' + h("First half", s.first) + h("Second half", s.second) + "</div>" +
      '<p class="sm mt-s"><b class="an-delta ' + (drop == null ? "flat" : drop <= -0.15 ? "down" : drop >= 0.15 ? "up" : "flat") + '">' +
      (drop == null ? "" : F.pts(drop) + " ") + "</b>" + esc(msg) + "</p></div>";
  }

  /* ---------------- PROGRESS VIEW ---------------- */
  function progressView(ctx, j){
    var tests = j.tests, latest = tests[tests.length - 1], first = tests[0];
    var usePct = tests.every(function(t){ return t.percentile != null; });
    var change = usePct ? latest.percentile - first.percentile : (latest.scorePct - first.scorePct) * 100;
    var simulated = HBX.hasSimulatedJourney(ctx.st.id);

    var html = (simulated ? '<div class="an-sim no-print"><div class="grow"><b>Includes 5 simulated practice mocks.</b> <span class="sm mut">Generated from your real attempt to show how the progress report works. Remove them any time.</span></div>' +
      '<button class="btn btn-ghost btn-sm" id="unsim">Remove simulated mocks</button></div>' : "") +
      '<section class="an-card rise' + (simulated ? " mt-s" : "") + '"><div class="an-hero">' +
        '<div class="an-ring">' + HBC.ring(usePct ? latest.percentile / 100 : latest.scorePct) + '<div class="in"><b>' + (usePct ? F.ordinal(latest.percentile) : pct(latest.scorePct)) +
          "</b><span>" + (usePct ? "Percentile" : "Score") + '</span><small class="an-delta ' + (change >= 3 ? "up" : change <= -3 ? "down" : "flat") + '">' + F.signed(Math.round(change)) + " since test #1</small></div></div>" +
        '<div><h2 style="font-size:22px">Your progress across ' + tests.length + " tests</h2>" +
          '<p class="sm mut">Since ' + esc(F.date(first.takenAt, true)) + " · latest: " + esc(latest.testName) + "</p>" +
          '<div class="an-tiles mt-s">' +
            tile("Tests taken", tests.length, "latest " + F.date(latest.takenAt)) +
            tile("Questions attempted", F.num(j.questionsAttempted)) +
            tile("Time in tests", F.num(j.hoursSpent, 1) + "<small> h</small>") +
            tile("Accuracy, last " + j.recent.tests, pct(j.recent.totals.accuracy), j.recent.totals.edge != null ? F.signed(Math.round(j.recent.totals.edge * 100)) + " pts vs others" : "") +
            tile("Best percentile", j.trends.percentile.best != null ? F.ordinal(j.trends.percentile.best) : "—") +
            tile("Improvement rate", j.trends.scorePct.slope != null ? F.signed(Math.round(j.trends.scorePct.slope * 1000) / 10, 1) + "<small> pts/test</small>" : "—", "score, fitted across all tests") +
          "</div></div></div></section>";

    html += sec("Insights", "What your tests are telling us", "Patterns across all your tests, not just the last one.", insights(j.insights));
    html += sec("Action plan", "Your plan for the coming week", "Built from your last " + j.recent.tests + " tests, ordered by marks each step can win back.", actions(j.actions, true));
    html += '<section class="an-sec">' + weekPlan(j.weekPlan, "hbe_plan_" + ctx.st.id + "_journey_" + tests.length) + "</section>";

    html += sec("Trend", "Progress across tests", "Hover a point for that test. #1 is your first test.",
      '<div class="an-grid an-2">' +
        trendCard("Percentile", "Share of students you beat", "c-tp", tests.some(function(t){ return t.percentile != null; })) +
        trendCard("Score", "Share of full marks", "c-ts", true) +
        trendCard("Accuracy", "Right ÷ attempted", "c-ta", true) +
        trendCard("Attempted", "Share of the paper attempted", "c-tt", true) + "</div>");

    html += sec("Sections", "Section by section, over time", "Your share of section marks in every test that had that section.",
      '<div class="an-grid an-2">' + j.sectionTrend.map(function(s, i){
        return '<div class="an-card"><h3>' + esc(s.name) + '</h3><div class="an-chart" id="c-sec' + i + '"></div></div>';
      }).join("") + "</div>");

    html += sec("Topics", "Area by area, test by test", "Each cell is your accuracy in that area in that test. Trend compares recent tests with earlier ones.",
      '<div class="an-card"><div class="an-scroll">' + heatmap(j) + "</div>" + heatLegend() + "</div>");

    html += sec("Habits", "Test-taking habits", "Lower is better on every chart here.",
      '<div class="an-grid an-2">' +
        habitCard("Easy questions missed", "Wrong on questions most students solve", "c-h1") +
        habitCard("Rushed answers", "Wrong in under half the usual time", "c-h2") +
        habitCard("Time sinks", "Over twice the usual time, no marks", "c-h3") +
        mix(j.recentMix, j.recentMix.reduce(function(a, x){ return a + x.count; }, 0), "Answer behaviour, last " + j.recent.tests + " tests", "Every recent answer by what happened.") + "</div>");

    var focus = j.recent.subAreas.filter(function(s){ return s.attempted >= 3 && s.accuracy != null && (s.verdict === "weak" || (s.edge || 0) < -0.05 || s.accuracy < 0.5); }).slice(0, 6);
    if(focus.length){
      html += sec("Focus list", "Sub-topics to work on", "From your last " + j.recent.tests + " tests.",
        '<div class="an-rows">' + focus.map(function(s){
          return '<div class="an-row"><span class="nm"><span>' + esc(s.name) + "<small>" + esc(s.parentName || "") + '</small></span></span><span class="num">' + s.correct + "/" + s.attempted + " right</span>" +
            meter(s.accuracy, s.cohortAccuracy) + edge(s.edge) + "</div>";
        }).join("") + "</div>" + legendMeter(false));
    }

    html += sec("All tests", "Every test you have taken", "",
      '<div class="tbl-wrap"><table><thead><tr><th>#</th><th>Test</th><th>Date</th><th>Score</th><th>Percentile</th><th>Accuracy</th><th>Attempted</th><th></th></tr></thead><tbody>' +
      tests.slice().reverse().map(function(t){
        var i = tests.indexOf(t);
        return "<tr><td>" + (i + 1) + '</td><td class="nm">' + esc(t.testName) + "</td><td>" + esc(F.date(t.takenAt)) + "</td><td><b>" + F.num(t.score) + "</b>/" + F.num(t.maxScore) +
          "</td><td>" + (t.percentile != null ? F.ordinal(t.percentile) : "—") + "</td><td>" + pct(t.accuracy) + "</td><td>" + pct(t.attemptRate) + "</td>" +
          '<td><a class="btn btn-ghost btn-sm" href="' + ctx.href({ test: t.testId }) + '">Report' + ico("arrow") + "</a></td></tr>";
      }).join("") + "</tbody></table></div>");

    return {
      html: html,
      after: function(root){
        var pctFmt = function(v){ return Math.round(v) + "%"; };
        var extra = function(t){ return [["Score", F.num(t.score) + " / " + F.num(t.maxScore)], ["Accuracy", pct(t.accuracy)]]; };
        var sub = function(t){ return F.date(t.takenAt, true); };
        HBC.mount(root.querySelector("#c-tp"), HBC.trend(tests, function(t){ return t.percentile; }, { max: 100, fmt: F.ordinal, label: "Percentile", extra: extra, sub: sub }));
        HBC.mount(root.querySelector("#c-ts"), HBC.trend(tests, function(t){ return t.scorePct * 100; }, { max: 100, fmt: pctFmt, label: "Score", extra: extra, sub: sub }));
        HBC.mount(root.querySelector("#c-ta"), HBC.trend(tests, function(t){ return t.accuracy == null ? null : t.accuracy * 100; }, { max: 100, fmt: pctFmt, label: "Accuracy", sub: sub }));
        HBC.mount(root.querySelector("#c-tt"), HBC.trend(tests, function(t){ return t.attemptRate * 100; }, { max: 100, fmt: pctFmt, label: "Attempted", sub: sub }));
        j.sectionTrend.forEach(function(s, i){
          HBC.mount(root.querySelector("#c-sec" + i), HBC.trend(tests, function(t, k){ return s.byTest[tests.indexOf(t)] == null ? null : s.byTest[tests.indexOf(t)] * 100; },
            { max: 100, fmt: pctFmt, label: s.name, height: 130, sub: sub }));
        });
        HBC.mount(root.querySelector("#c-h1"), HBC.bars(tests, function(t){ return t.missedEasy; }, { label: "Easy questions missed", none: "No easy question missed in any test." }));
        HBC.mount(root.querySelector("#c-h2"), HBC.bars(tests, function(t){ return t.rushed; }, { label: "Rushed answers", none: "No rushed wrong answers in any test." }));
        HBC.mount(root.querySelector("#c-h3"), HBC.bars(tests, function(t){ return t.timeSinks; }, { label: "Time sinks", none: "No time sinks in any test." }));
        bindWeek(root);
        var un = root.querySelector("#unsim");
        if(un) un.addEventListener("click", function(){ HBX.clearJourney(ctx.st.id); location.href = ctx.href({}); });
      }
    };
  }
  function trendCard(title, sub, id, show){
    return show ? '<div class="an-card"><h3>' + title + '</h3><div class="sub">' + sub + '</div><div class="an-chart" id="' + id + '"></div></div>' : "";
  }
  function habitCard(title, sub, id){ return '<div class="an-card"><h3>' + title + '</h3><div class="sub">' + sub + '</div><div class="an-chart" id="' + id + '"></div></div>'; }

  var HEAT = [[0.2, "var(--seq-1)", 0], [0.4, "var(--seq-2)", 0], [0.6, "var(--seq-3)", 1], [0.8, "var(--seq-4)", 1], [1.01, "var(--seq-5)", 1]];
  function heatStep(v){ for(var i = 0; i < HEAT.length; i++) if(v < HEAT[i][0]) return HEAT[i]; return HEAT[HEAT.length - 1]; }
  function heatmap(j){
    var n = j.tests.length, cols = "minmax(140px,1.4fr) repeat(" + n + ",minmax(34px,1fr)) 110px";
    var secs = [];
    j.areaProgress.forEach(function(a){ if(secs.indexOf(a.sectionName) < 0) secs.push(a.sectionName); });
    var html = '<div class="an-heat" style="grid-template-columns:' + cols + '"><div class="h" style="text-align:left">Area</div>' +
      j.tests.map(function(t, i){ return '<div class="h" title="' + esc(t.testName) + '">#' + (i + 1) + "</div>"; }).join("") + '<div class="h">Trend</div>';
    secs.forEach(function(s){
      html += '<div class="sec">' + esc(s) + "</div>";
      j.areaProgress.filter(function(a){ return a.sectionName === s; }).forEach(function(a){
        html += '<div class="rh">' + esc(a.title) + "</div>";
        a.byTest.forEach(function(v, i){
          var c = a.byTestCounts[i], t = j.tests[i];
          if(v == null){ html += '<div class="c na">–</div>'; return; }
          var st = heatStep(v);
          html += '<div class="c an-mark" tabindex="0" style="background:' + st[1] + ";color:" + (st[2] ? "#fff" : "#0a1523") + (c && c.attempted === 1 ? ";opacity:.55" : "") + '" data-tip="' +
            esc(HBC.tipRows(a.title, [["Accuracy", pct(v)], ["Right", c ? c.correct + " of " + c.attempted : "—"]], t.testName)) + '">' + Math.round(v * 100) + "</div>";
        });
        html += '<div style="display:flex;align-items:center;padding-left:8px"><span class="an-trend ' + a.trend + '">' + TREND[a.trend] + "</span></div>";
      });
    });
    return html + "</div>";
  }
  function heatLegend(){
    return '<div class="an-legend"><span>Accuracy</span>' + HEAT.map(function(h, i){
      return '<span><i style="background:' + h[1] + '"></i>' + (i === 0 ? "under 20%" : i === HEAT.length - 1 ? "80%+" : Math.round(HEAT[i - 1][0] * 100) + "–" + Math.round(h[0] * 100) + "%") + "</span>";
    }).join("") + '<span><i style="background:var(--line-2)"></i>not attempted</span><span>faded = one question only</span></div>';
  }

  /* ---------------- analysing overlay (after a live submit) ---------------- */
  function analysing(info, done){
    var steps = [
      ["Saving your answers", info.questions + " answers with the time spent on each"],
      ["Updating question analytics", "aggregating " + F.num(info.rows) + " answers from " + F.num(info.students) + " students"],
      ["Comparing with other students", info.peers + " students on this paper"],
      ["Building your insights and plan", "behaviour, pacing, targets, 7-day plan"]
    ];
    var el = document.createElement("div");
    el.className = "an-busy";
    el.innerHTML = '<div class="box"><span class="an-kicker">Analysing your attempt</span><h3 style="margin-top:6px">Your report is being prepared</h3><ol>' +
      steps.map(function(s){ return "<li><i></i><div>" + esc(s[0]) + "<small>" + esc(s[1]) + "</small></div></li>"; }).join("") + "</ol></div>";
    document.body.appendChild(el);
    var lis = el.querySelectorAll("li"), k = 0;
    (function next(){
      if(k > 0){ lis[k - 1].className = "ok"; lis[k - 1].querySelector("i").innerHTML = ico("check"); }
      if(k === lis.length){ setTimeout(function(){ el.remove(); done(); }, 350); return; }
      lis[k].className = "run"; k++;
      setTimeout(next, 520);
    })();
  }

  return { testView: testView, progressView: progressView, analysing: analysing };
})();
