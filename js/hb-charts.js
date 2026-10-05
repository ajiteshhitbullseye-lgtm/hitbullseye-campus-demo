/* =====================================================================
   HITBULLSEYE — CHARTS (plain SVG, no library)
   Every chart draws at the container's real width (text never scales) and
   redraws on resize. Hover / keyboard focus on any mark shows a tooltip
   (data-tip); values are always also available as text or a table.
   ===================================================================== */
var HBC = (function(){
  "use strict";
  var mounts = [];
  var esc = function(s){ return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); };

  /* ---------------- mount / resize ---------------- */
  function mount(el, draw){
    if(!el) return;
    var m = { el: el, draw: draw };
    mounts.push(m);
    render(m);
  }
  function render(m){
    var w = Math.max(260, Math.floor(m.el.clientWidth || m.el.parentNode.clientWidth || 600));
    m.el.innerHTML = m.draw(w);
  }
  var rt;
  window.addEventListener("resize", function(){
    clearTimeout(rt);
    rt = setTimeout(function(){
      mounts = mounts.filter(function(m){ return document.body.contains(m.el); });
      mounts.forEach(render);
    }, 120);
  });

  /* ---------------- tooltip ---------------- */
  var tip;
  function tipEl(){
    if(!tip){ tip = document.createElement("div"); tip.id = "an-tip"; document.body.appendChild(tip); }
    return tip;
  }
  function show(target, x, y){
    var t = tipEl();
    t.innerHTML = target.getAttribute("data-tip");
    t.style.display = "block";
    var w = t.offsetWidth, h = t.offsetHeight;
    var left = x + 14 + w > window.innerWidth ? x - w - 14 : x + 14;
    var top = y - h - 12 < 6 ? y + 16 : y - h - 12;
    t.style.left = left + "px"; t.style.top = top + "px";
    var svg = target.closest("svg, .an-heat");
    if(svg){
      svg.classList.add("an-dim");
      var grp = target.getAttribute("data-grp");
      svg.querySelectorAll(".an-mark").forEach(function(n){
        n.classList.toggle("on", grp ? n.getAttribute("data-grp") === grp : n === target);
      });
    }
  }
  function hide(target){
    if(tip) tip.style.display = "none";
    var svg = target && target.closest && target.closest("svg, .an-heat");
    if(svg){ svg.classList.remove("an-dim"); svg.querySelectorAll(".an-mark.on").forEach(function(n){ n.classList.remove("on"); }); }
  }
  document.addEventListener("pointermove", function(e){
    var t = e.target.closest && e.target.closest("[data-tip]");
    if(t) show(t, e.clientX, e.clientY);
    else if(tip && tip.style.display === "block") hide(document.querySelector(".an-dim"));
  });
  document.addEventListener("focusin", function(e){
    var t = e.target.closest && e.target.closest("[data-tip]");
    if(t){ var r = t.getBoundingClientRect(); show(t, r.left + r.width / 2, r.top); }
  });
  document.addEventListener("focusout", function(e){ hide(e.target); });

  function tipRows(title, rows, sub){
    return "<b>" + esc(title) + "</b>" + (sub ? '<div style="color:var(--muted)">' + esc(sub) + "</div>" : "") +
      rows.map(function(r){
        return '<div class="r"><span>' + (r[2] ? '<i style="background:' + r[2] + '"></i>' : "") + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b></div>";
      }).join("");
  }

  /* ---------------- helpers ---------------- */
  function niceMax(v){
    if(v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
    var steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for(var i = 0; i < steps.length; i++) if(f <= steps[i]) return steps[i] * p;
    return 10 * p;
  }
  function bar(x, y, w, h, r){                      /* rounded top, square base */
    if(h <= 0) return "";
    r = Math.min(r == null ? 4 : r, w / 2, h);
    return "M" + x + "," + (y + h) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y +
           "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h) + "Z";
  }
  function hbar(x, y, w, h, r){                     /* rounded right end */
    if(w <= 0) return "";
    r = Math.min(r == null ? 4 : r, h / 2, w);
    return "M" + x + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) +
           "V" + (y + h - r) + "Q" + (x + w) + "," + (y + h) + " " + (x + w - r) + "," + (y + h) + "H" + x + "Z";
  }
  function txt(x, y, s, o){
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" font-size="' + (o.size || 11) + '" fill="' + (o.fill || "var(--muted)") + '"' +
      (o.anchor ? ' text-anchor="' + o.anchor + '"' : "") + (o.weight ? ' font-weight="' + o.weight + '"' : "") +
      ' font-family="Inter, sans-serif">' + esc(s) + "</text>";
  }
  function grid(x1, x2, y, label, o){
    return '<line x1="' + x1 + '" x2="' + x2 + '" y1="' + y + '" y2="' + y + '" stroke="' + ((o && o.axis) ? "var(--viz-axis)" : "var(--viz-grid)") + '"/>' +
      (label != null ? txt(x1 - 6, y + 4, label, { anchor: "end", size: 10.5 }) : "");
  }
  function svg(w, h, body, label){
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + esc(label || "") + '">' + body + "</svg>";
  }
  function dur(s){
    s = Math.round(s);
    if(s < 60) return s + "s";
    var m = Math.floor(s / 60);
    return s % 60 ? m + "m " + (s % 60) + "s" : m + "m";
  }
  function pct(x){ return x == null ? "—" : Math.round(x * 100) + "%"; }

  /* ---------------- 1. score distribution ---------------- */
  function histogram(dist, score){
    return function(W){
      var H = 200, p = { l: 34, r: 8, t: 24, b: 26 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      var bins = dist.bins, slot = iw / bins.length, bw = Math.min(26, Math.max(4, slot - 3));
      var max = niceMax(Math.max.apply(null, bins.map(function(b){ return b.count; })));
      var y = function(v){ return p.t + ih - v / max * ih; };
      var s = grid(p.l, W - p.r, y(max), max) + grid(p.l, W - p.r, y(max / 2), max / 2);
      var every = Math.ceil(bins.length / Math.max(2, Math.floor(iw / 48)));
      bins.forEach(function(b, i){
        var you = i === dist.studentBin, x = p.l + i * slot + (slot - bw) / 2;
        s += '<path class="an-mark" d="' + bar(x, y(b.count), bw, y(0) - y(b.count)) + '" fill="' + (you ? "var(--viz-you)" : "var(--viz-peer)") + '" opacity="' + (you ? 1 : .6) + '"/>';
        s += '<rect x="' + (p.l + i * slot) + '" y="' + p.t + '" width="' + slot + '" height="' + ih + '" fill="transparent" tabindex="0" data-tip="' +
          esc(tipRows("Score " + fmt(b.from) + " to " + fmt(b.to), [["Students", b.count, you ? "var(--viz-you)" : "var(--viz-peer)"]], you ? "Your score is in this band" : "")) + '"/>';
        if(i % every === 0) s += txt(p.l + i * slot, H - 8, fmt(b.from), { size: 10.5 });
      });
      s += grid(p.l, W - p.r, y(0), 0, { axis: 1 });
      if(dist.studentBin == null) return svg(W, H, s, "How every student scored");
      var cx = p.l + dist.studentBin * slot + slot / 2;
      s += txt(cx, Math.max(12, y(bins[dist.studentBin].count) - 7), "You · " + fmt(score), { anchor: cx < 60 ? "start" : cx > W - 60 ? "end" : "middle", fill: "var(--ink)", weight: 700, size: 11.5 });
      return svg(W, H, s, "How every student scored, your band highlighted");
    };
  }
  function fmt(n){ return Math.round(n * 10) / 10; }

  /* ---------------- 2. potential-score waterfall ---------------- */
  function waterfall(pot){
    return function(W){
      var cols = [{ label: "Your score", v: pot.score, base: 0, kind: "you" }];
      var run = pot.score;
      pot.steps.forEach(function(s){ cols.push({ label: s.label, v: s.gain, base: run, kind: "gain", detail: s.detail }); run += s.gain; });
      cols.push({ label: "Within reach", v: pot.potential, base: 0, kind: "pot" });
      var H = 230, p = { l: 34, r: 10, t: 26, b: 46 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      var max = niceMax(Math.max(pot.max, 1)), slot = iw / cols.length, bw = Math.min(64, slot * 0.62);
      var y = function(v){ return p.t + ih - v / max * ih; };
      var s = grid(p.l, W - p.r, y(max), max) + grid(p.l, W - p.r, y(max / 2), max / 2);
      cols.forEach(function(c, i){
        var x = p.l + i * slot + (slot - bw) / 2, top = y(c.base + c.v), h = y(c.base) - top;
        var fill = c.kind === "you" ? "var(--viz-you)" : c.kind === "gain" ? "var(--viz-ok)" : "rgba(37,99,201,.28)";
        s += '<path class="an-mark" d="' + bar(x, top, bw, h) + '" fill="' + fill + '" tabindex="0" data-tip="' +
          esc(tipRows(c.label, [[c.kind === "gain" ? "Marks" : "Score", (c.kind === "gain" ? "+" : "") + c.v + " / " + pot.max]], c.detail || "")) + '"/>';
        if(c.kind === "pot") s += '<path d="' + bar(x, top, bw, h) + '" fill="none" stroke="var(--viz-you)" stroke-width="1.5" stroke-dasharray="4 3"/>';
        if(i < cols.length - 1){
          var nx = p.l + (i + 1) * slot + (slot - bw) / 2;
          s += '<line x1="' + (x + bw) + '" x2="' + nx + '" y1="' + top + '" y2="' + top + '" stroke="var(--viz-axis)" stroke-dasharray="3 3"/>';
        }
        s += txt(x + bw / 2, top - 7, (c.kind === "gain" ? "+" : "") + c.v, { anchor: "middle", fill: "var(--ink)", weight: 700, size: 12 });
        wrapLabel(c.label, Math.max(60, slot - 6)).forEach(function(line, k){ s += txt(x + bw / 2, H - 28 + k * 13, line, { anchor: "middle", size: 11 }); });
      });
      s += grid(p.l, W - p.r, y(0), 0, { axis: 1 });
      return svg(W, H, s, "From your score to the marks within reach");
    };
  }
  function wrapLabel(s, px){
    var max = Math.floor(px / 6.2), words = s.split(" "), lines = [""];
    words.forEach(function(w){ var l = lines[lines.length - 1]; if((l + " " + w).trim().length > max && l) lines.push(w); else lines[lines.length - 1] = (l + " " + w).trim(); });
    return lines.slice(0, 2);
  }

  /* ---------------- 3. speed × accuracy quadrant ---------------- */
  function quadrant(points, zones){
    return function(W){
      var H = Math.min(360, Math.max(280, W * 0.62)), p = { l: 44, r: 16, t: 16, b: 38 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      var xMax = Math.max(2.5, Math.ceil(Math.max.apply(null, points.map(function(q){ return q.speed; }).concat([1])) * 2) / 2);
      var x = function(v){ return p.l + Math.min(v, xMax) / xMax * iw; };
      var y = function(v){ return p.t + ih - v * ih; };
      var xm = x(1.15), ym = y(0.6);
      var s = "";
      /* zone washes */
      s += '<rect x="' + p.l + '" y="' + p.t + '" width="' + (xm - p.l) + '" height="' + (ym - p.t) + '" fill="rgba(15,138,86,.06)"/>';
      s += '<rect x="' + xm + '" y="' + ym + '" width="' + (p.l + iw - xm) + '" height="' + (p.t + ih - ym) + '" fill="rgba(211,58,58,.06)"/>';
      [0, .25, .5, .75, 1].forEach(function(v){ s += grid(p.l, W - p.r, y(v), Math.round(v * 100) + "%", v === 0 ? { axis: 1 } : null); });
      for(var v = 0.5; v <= xMax + 1e-9; v += 0.5) s += txt(x(v), H - 20, v + "×", { anchor: "middle", size: 10.5 });
      s += '<line x1="' + xm + '" x2="' + xm + '" y1="' + p.t + '" y2="' + (p.t + ih) + '" stroke="var(--viz-axis)" stroke-dasharray="4 4"/>';
      s += '<line x1="' + p.l + '" x2="' + (p.l + iw) + '" y1="' + ym + '" y2="' + ym + '" stroke="var(--viz-axis)" stroke-dasharray="4 4"/>';
      s += txt(p.l + 6, p.t + 13, zones.master.label, { fill: "var(--ok)", weight: 700, size: 11 });
      s += txt(p.l + iw - 6, p.t + 13, zones["slow-sure"].label, { anchor: "end", weight: 700, size: 11 });
      s += txt(p.l + 6, p.t + ih - 7, zones["fast-loose"].label, { weight: 700, size: 11 });
      s += txt(p.l + iw - 6, p.t + ih - 7, zones.rebuild.label, { anchor: "end", fill: "var(--err)", weight: 700, size: 11 });
      s += txt(p.l + iw / 2, H - 4, "Time taken vs usual (1× = same as other students)", { anchor: "middle", size: 11 });
      var placed = [];
      points.forEach(function(q){
        var cx = x(q.speed), cy = y(q.accuracy), r = 5 + Math.min(5, q.attempted);
        var col = q.zone === "master" ? "var(--viz-ok)" : q.zone === "rebuild" ? "var(--viz-err)" : "var(--viz-you)";
        s += '<circle class="an-mark" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + col + '" fill-opacity=".85" stroke="#fff" stroke-width="2" tabindex="0" data-tip="' +
          esc(tipRows(q.name, [["Accuracy", pct(q.accuracy)], ["Time vs usual", q.speed.toFixed(1) + "×"], ["Attempted", q.attempted]], zones[q.zone].label + " · " + zones[q.zone].hint)) + '"/>';
        /* direct label unless it would collide */
        var lx = cx + r + 4, ly = cy + 4, clash = placed.some(function(o){ return Math.abs(o[0] - lx) < 70 && Math.abs(o[1] - ly) < 13; });
        if(!clash && lx < W - 60){ s += txt(lx, ly, q.name.length > 18 ? q.name.slice(0, 17) + "…" : q.name, { fill: "var(--ink)", size: 11 }); placed.push([lx, ly]); }
      });
      return svg(W, H, s, "Topics by accuracy and speed");
    };
  }

  /* ---------------- 4. pacing: cumulative time ---------------- */
  function pacing(points){
    return function(W){
      var H = 220, p = { l: 46, r: 46, t: 14, b: 30 }, iw = W - p.l - p.r, ih = H - p.t - p.b, n = points.length;
      var last = points[n - 1];
      var max = niceMax(Math.max(last.own, last.usual || 0) / 60) * 60;
      var x = function(i){ return p.l + (n === 1 ? iw / 2 : i / (n - 1) * iw); };
      var y = function(v){ return p.t + ih - v / max * ih; };
      var s = grid(p.l, W - p.r, y(max), dur(max)) + grid(p.l, W - p.r, y(max / 2), dur(max / 2)) + grid(p.l, W - p.r, y(0), "0", { axis: 1 });
      var own = "", usual = "", hasUsual = points.every(function(q){ return q.usual != null; });
      points.forEach(function(q, i){
        own += (i ? "L" : "M") + x(i) + "," + y(q.own);
        if(hasUsual) usual += (i ? "L" : "M") + x(i) + "," + y(q.usual);
      });
      if(hasUsual){
        s += '<path d="' + usual + '" fill="none" stroke="var(--viz-peer)" stroke-width="2" stroke-dasharray="5 4"/>';
        s += txt(W - p.r + 6, y(last.usual) + 4, "Usual", { size: 11, weight: 600 });
      }
      s += '<path d="M' + x(0) + "," + y(0) + "L" + own.slice(1) + "L" + x(n - 1) + "," + y(0) + 'Z" fill="var(--viz-you)" opacity=".08"/>';
      s += '<path d="' + own + '" fill="none" stroke="var(--viz-you)" stroke-width="2" stroke-linejoin="round"/>';
      s += txt(W - p.r + 6, y(last.own) + 4, "You", { size: 11, weight: 700, fill: "var(--ink)" });
      var every = Math.ceil(n / Math.max(2, Math.floor(iw / 34)));
      points.forEach(function(q, i){
        if(i % every === 0 || i === n - 1) s += txt(x(i), H - 10, "Q" + q.qno, { anchor: "middle", size: 10 });
        var half = n === 1 ? iw / 2 : iw / (n - 1) / 2;
        s += '<rect x="' + (x(i) - half) + '" y="' + p.t + '" width="' + half * 2 + '" height="' + ih + '" fill="transparent" tabindex="0" data-tip="' +
          esc(tipRows((i + 1) + " questions in (Q" + q.qno + ")", [["You", dur(q.own), "var(--viz-you)"]].concat(q.usual != null ? [["Usual pace", dur(q.usual), "var(--viz-peer)"]] : []))) + '"/>';
      });
      return svg(W, H, s, "Time used as the test went on, you vs the usual pace");
    };
  }

  /* ---------------- 5. question strip ---------------- */
  var STATUS = { correct: ["Correct", "var(--viz-ok)"], wrong: ["Wrong", "var(--viz-err)"], skipped: ["Skipped", "var(--viz-skip)"] };
  function strip(qs, highlight, tagLabels){
    return function(W){
      var H = 220, p = { l: 46, r: 6, t: 28, b: 34 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      var slot = iw / qs.length, bw = Math.min(26, Math.max(3, slot - 3));
      var longest = Math.max.apply(null, qs.map(function(q){ return Math.max(q.time, q.cohortTime || 0); }).concat([60]));
      var max = Math.ceil(longest / 60) * 60;
      var y = function(v){ return p.t + ih - Math.min(v, max) / max * ih; };
      var s = grid(p.l, W - p.r, y(max), dur(max)) + grid(p.l, W - p.r, y(max / 2), dur(max / 2));
      var secStart = 0;
      qs.forEach(function(q, i){
        if(i === 0 || q.sectionName !== qs[i - 1].sectionName){
          var x0 = p.l + i * slot;
          if(i) s += '<line x1="' + x0 + '" x2="' + x0 + '" y1="' + (p.t - 18) + '" y2="' + y(0) + '" stroke="var(--viz-axis)"/>';
          var span = 1; while(i + span < qs.length && qs[i + span].sectionName === q.sectionName) span++;
          var room = Math.floor(span * slot / 6.4);
          s += txt(x0 + 4, p.t - 10, q.sectionName.length > room ? q.sectionName.slice(0, Math.max(1, room - 1)) + "…" : q.sectionName, { weight: 700, size: 11 });
          secStart = i;
        }
        var x = p.l + i * slot + (slot - bw) / 2, on = !highlight || highlight(q);
        var st = STATUS[q.status];
        var rows = [["Your time", dur(q.time), st[1]]];
        if(q.cohortTime != null) rows.push(["Usual time", dur(q.cohortTime), "var(--ink)"]);
        if(q.cohortSolveRate != null) rows.push(["Solved by", pct(q.cohortSolveRate) + " of students"]);
        var sub = q.areaTitle + " › " + q.subAreaName + (q.lod ? " · " + q.lod : "") + (q.tags.length ? " · " + q.tags.map(function(t){ return tagLabels[t]; }).join(", ") : "");
        s += '<g class="an-mark' + (on ? "" : " off") + '" opacity="' + (on ? 1 : .18) + '">' +
          '<path d="' + bar(x, y(q.time), bw, y(0) - y(q.time), Math.min(4, bw / 2)) + '" fill="' + st[1] + '"/>' +
          (q.cohortTime != null ? '<line x1="' + (x - 1.5) + '" x2="' + (x + bw + 1.5) + '" y1="' + y(q.cohortTime) + '" y2="' + y(q.cohortTime) + '" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"/>' : "") +
          "</g>";
        if(slot >= 12 && q.status !== "skipped"){
          var cx = p.l + i * slot + slot / 2, cy = y(0) + 9;
          s += q.status === "correct"
            ? '<path d="M' + (cx - 3) + "," + cy + " L" + (cx - 1) + "," + (cy + 2.5) + " L" + (cx + 3) + "," + (cy - 2.5) + '" stroke="var(--muted)" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
            : '<path d="M' + (cx - 2.5) + "," + (cy - 2.5) + " L" + (cx + 2.5) + "," + (cy + 2.5) + " M" + (cx + 2.5) + "," + (cy - 2.5) + " L" + (cx - 2.5) + "," + (cy + 2.5) + '" stroke="var(--muted)" stroke-width="1.6" stroke-linecap="round"/>';
        }
        var step = slot >= 22 ? 1 : slot >= 11 ? 5 : 10;
        if(i % step === 0) s += txt(p.l + i * slot + slot / 2, H - 6, q.qno, { anchor: "middle", size: 10 });
        s += '<rect x="' + (p.l + i * slot) + '" y="' + p.t + '" width="' + slot + '" height="' + (ih + 16) + '" fill="transparent" tabindex="0" data-tip="' +
          esc(tipRows("Q" + q.qno + " · " + st[0] + (q.status !== "skipped" ? " (" + (q.score > 0 ? "+" : "") + q.score + ")" : ""), rows, sub)) + '"/>';
      });
      s += grid(p.l, W - p.r, y(0), "0s", { axis: 1 });
      return svg(W, H, s, "Time on every question, coloured by result");
    };
  }

  /* ---------------- 6. small-multiple trend line ---------------- */
  function trend(tests, valueFn, o){
    o = o || {};
    return function(W){
      var vals = tests.map(valueFn), H = o.height || 150, p = { l: 30, r: 44, t: 12, b: 24 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      var max = o.max || niceMax(Math.max.apply(null, vals.filter(function(v){ return v != null; }).concat([1])));
      var n = tests.length;
      var x = function(i){ return p.l + (n === 1 ? iw / 2 : i / (n - 1) * iw); };
      var y = function(v){ return p.t + ih - v / max * ih; };
      var s = grid(p.l, W - p.r, y(max), max) + grid(p.l, W - p.r, y(max / 2), max / 2) + grid(p.l, W - p.r, y(0), 0, { axis: 1 });
      var d = "", area = "", first = null, lastI = -1;
      vals.forEach(function(v, i){
        if(v == null) return;
        d += (d ? "L" : "M") + x(i) + "," + y(v);
        if(first == null) first = i;
        lastI = i;
      });
      if(lastI > first) s += '<path d="' + d.replace(/^M/, "M" + x(first) + "," + y(0) + "L") + "L" + x(lastI) + "," + y(0) + 'Z" fill="' + (o.color || "var(--viz-you)") + '" opacity=".08"/>';
      if(o.ref != null) s += '<line x1="' + p.l + '" x2="' + (W - p.r) + '" y1="' + y(o.ref) + '" y2="' + y(o.ref) + '" stroke="var(--viz-peer)" stroke-dasharray="4 4"/>' + txt(W - p.r + 6, y(o.ref) + 4, o.refLabel || "Avg", { size: 10.5 });
      s += '<path d="' + d + '" fill="none" stroke="' + (o.color || "var(--viz-you)") + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      vals.forEach(function(v, i){
        if(v == null) return;
        s += '<circle class="an-mark" cx="' + x(i) + '" cy="' + y(v) + '" r="4.5" fill="' + (o.color || "var(--viz-you)") + '" stroke="#fff" stroke-width="2"/>';
      });
      if(lastI >= 0) s += txt(x(lastI) + 9, y(vals[lastI]) + 4, o.fmt ? o.fmt(vals[lastI]) : vals[lastI], { fill: "var(--ink)", weight: 700, size: 11.5 });
      tests.forEach(function(t, i){
        s += txt(x(i), H - 6, (n > 10 && i % 2) ? "" : "#" + (i + 1), { anchor: "middle", size: 10 });
        var half = n === 1 ? iw / 2 : iw / (n - 1) / 2;
        s += '<rect x="' + (x(i) - half) + '" y="' + p.t + '" width="' + half * 2 + '" height="' + (ih + 12) + '" fill="transparent" tabindex="0" data-tip="' +
          esc(tipRows(t.testName, [[o.label || "Value", vals[i] == null ? "—" : (o.fmt ? o.fmt(vals[i]) : vals[i]), o.color || "var(--viz-you)"]].concat(o.extra ? o.extra(t) : []), o.sub ? o.sub(t) : "")) + '"/>';
      });
      return svg(W, H, s, o.label || "Trend");
    };
  }

  /* ---------------- 7. bars per test (habits) ---------------- */
  function bars(tests, valueFn, o){
    o = o || {};
    return function(W){
      var vals = tests.map(valueFn);
      if(vals.every(function(v){ return !v; }))
        return '<div class="an-wf-note" style="padding:26px 0;text-align:center">' + esc(o.none || "None in any test.") + "</div>";
      var H = 128, p = { l: 26, r: 6, t: 16, b: 22 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      var max = niceMax(Math.max.apply(null, vals.concat([1]))), slot = iw / tests.length, bw = Math.min(24, Math.max(6, slot - 8));
      var y = function(v){ return p.t + ih - v / max * ih; };
      var s = grid(p.l, W - p.r, y(max), max) + grid(p.l, W - p.r, y(0), 0, { axis: 1 });
      tests.forEach(function(t, i){
        var x = p.l + i * slot + (slot - bw) / 2;
        s += '<path class="an-mark" d="' + bar(x, y(vals[i]), bw, y(0) - y(vals[i])) + '" fill="' + (o.color || "var(--viz-you)") + '"/>';
        s += '<rect x="' + (p.l + i * slot) + '" y="' + p.t + '" width="' + slot + '" height="' + (ih + 10) + '" fill="transparent" tabindex="0" data-tip="' +
          esc(tipRows(t.testName, [[o.label || "Value", fmt(vals[i]), o.color || "var(--viz-you)"]])) + '"/>';
        if(i === tests.length - 1) s += txt(x + bw / 2, y(vals[i]) - 5, fmt(vals[i]), { anchor: "middle", fill: "var(--ink)", weight: 700 });
        s += txt(p.l + i * slot + slot / 2, H - 6, (tests.length > 10 && i % 2) ? "" : "#" + (i + 1), { anchor: "middle", size: 10 });
      });
      return svg(W, H, s, o.label || "Per test");
    };
  }

  /* ---------------- 8. donut ring (score) ---------------- */
  function ring(value, color){
    var r = 74, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
    return '<svg viewBox="0 0 170 170" aria-hidden="true"><circle cx="85" cy="85" r="' + r + '" fill="none" stroke="var(--line-2)" stroke-width="14"/>' +
      '<circle cx="85" cy="85" r="' + r + '" fill="none" stroke="' + (color || "var(--viz-you)") + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + (c * v) + " " + c + '"/></svg>';
  }

  return { mount: mount, histogram: histogram, waterfall: waterfall, quadrant: quadrant, pacing: pacing,
           strip: strip, trend: trend, bars: bars, ring: ring, tipRows: tipRows, esc: esc, dur: dur, pct: pct };
})();
