/* =====================================================================
   HITBULLSEYE — CHARTS (plain SVG, no library)
   Every chart draws at the container's real width (text never scales) and
   redraws on resize. Hover / keyboard focus on any mark shows a tooltip
   (data-tip); values are always also available as text or a table.

   Look: gradient fills, rounded marks, value pills on the key point, a soft
   halo on "you", and a short draw-in animation on first paint (skipped when
   the visitor prefers reduced motion — see analytics.css).
   Colour roles never change: blue = you, grey = other students,
   green = right / gain, red = wrong / loss, amber = watch.
   ===================================================================== */
var HBC = (function(){
  "use strict";
  var mounts = [];
  var uid = 0;
  var esc = function(s){ return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); };

  var C = {
    you: "#2563eb", youLt: "#60a5fa", youDk: "#1d4ed8",
    peer: "#94a3b8", peerLt: "#cbd5e1",
    ok: "#10a36b", okLt: "#4ade80",
    err: "#e0453a", errLt: "#fb8a7e",
    warn: "#f59e0b",
    skip: "#d5dce7", skipLt: "#e8edf4",
    ink: "#0a1523", muted: "#6d7f96", grid: "#edf1f7", axis: "#cfd8e4"
  };

  /* ---------------- mount / resize ---------------- */
  function mount(el, draw){
    if(!el) return;
    var m = { el: el, draw: draw, first: true };
    mounts.push(m);
    render(m);
  }
  function render(m){
    var w = Math.max(260, Math.floor(m.el.clientWidth || m.el.parentNode.clientWidth || 600));
    m.el.innerHTML = m.draw(w);
    var svg = m.el.querySelector("svg");
    if(svg && m.first) svg.classList.add("an-anim");     /* animate the first paint only */
    m.first = false;
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

  /* ---------------- drawing helpers ---------------- */
  function niceMax(v){
    if(v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
    var steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for(var i = 0; i < steps.length; i++) if(f <= steps[i]) return steps[i] * p;
    return 10 * p;
  }
  function bar(x, y, w, h, r){                      /* rounded top, square base */
    if(h <= 0) return "";
    r = Math.min(r == null ? 5 : r, w / 2, h);
    return "M" + x + "," + (y + h) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y +
           "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h) + "Z";
  }
  function txt(x, y, s, o){
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" font-size="' + (o.size || 11) + '" fill="' + (o.fill || C.muted) + '"' +
      (o.anchor ? ' text-anchor="' + o.anchor + '"' : "") + (o.weight ? ' font-weight="' + o.weight + '"' : "") +
      (o.cls ? ' class="' + o.cls + '"' : "") +
      ' font-family="Inter, sans-serif">' + esc(s) + "</text>";
  }
  function grid(x1, x2, y, label, o){
    return '<line x1="' + x1 + '" x2="' + x2 + '" y1="' + y + '" y2="' + y + '" stroke="' + ((o && o.axis) ? C.axis : C.grid) + '"/>' +
      (label != null ? txt(x1 - 7, y + 4, label, { anchor: "end", size: 10.5 }) : "");
  }
  /* a filled pill with a value — the one label a chart leads with */
  function pill(x, y, s, o){
    o = o || {};
    var w = Math.max(26, String(s).length * 6.6 + 14), h = 20;
    var x0 = o.anchor === "start" ? x : o.anchor === "end" ? x - w : x - w / 2;
    return '<g class="an-pill"><rect x="' + x0 + '" y="' + (y - h / 2) + '" width="' + w + '" height="' + h + '" rx="10" fill="' + (o.fill || C.you) + '"' +
      (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="1.5"' : "") + "/>" +
      txt(x0 + w / 2, y + 4, s, { anchor: "middle", fill: o.text || "#fff", weight: 700, size: 11.5 }) + "</g>";
  }
  function vgrad(id, top, bottom, o1, o2){
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + top + '" stop-opacity="' + (o1 == null ? 1 : o1) + '"/>' +
      '<stop offset="1" stop-color="' + bottom + '" stop-opacity="' + (o2 == null ? 1 : o2) + '"/></linearGradient>';
  }
  function svg(w, h, defs, body, label){
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + esc(label || "") + '">' +
      (defs ? "<defs>" + defs + "</defs>" : "") + body + "</svg>";
  }
  function dur(s){
    s = Math.round(s);
    if(s < 60) return s + "s";
    var m = Math.floor(s / 60);
    return s % 60 ? m + "m " + (s % 60) + "s" : m + "m";
  }
  function pct(x){ return x == null ? "—" : Math.round(x * 100) + "%"; }
  function fmt(n){ return Math.round(n * 10) / 10; }

  /* ---------------- 1. score distribution ---------------- */
  function histogram(dist, score){
    return function(W){
      var id = "h" + (++uid);
      var H = 220, p = { l: 34, r: 10, t: 34, b: 26 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      var bins = dist.bins, slot = iw / bins.length, bw = Math.min(30, Math.max(5, slot - 4));
      var max = niceMax(Math.max.apply(null, bins.map(function(b){ return b.count; })));
      var y = function(v){ return p.t + ih - v / max * ih; };
      var defs = vgrad(id + "p", C.peerLt, C.peer, .9, .55) + vgrad(id + "y", C.youLt, C.youDk);
      var s = grid(p.l, W - p.r, y(max), max) + grid(p.l, W - p.r, y(max / 2), max / 2);
      var every = Math.ceil(bins.length / Math.max(2, Math.floor(iw / 44)));
      bins.forEach(function(b, i){
        var you = i === dist.studentBin, x = p.l + i * slot + (slot - bw) / 2;
        if(you) s += '<rect x="' + (x - 5) + '" y="' + (y(b.count) - 5) + '" width="' + (bw + 10) + '" height="' + (y(0) - y(b.count) + 5) + '" rx="9" fill="' + C.you + '" opacity=".12"/>';
        s += '<path class="an-mark grow" style="animation-delay:' + (i * 25) + 'ms" d="' + bar(x, y(b.count), bw, y(0) - y(b.count)) + '" fill="url(#' + id + (you ? "y" : "p") + ')"/>';
        s += '<rect x="' + (p.l + i * slot) + '" y="' + p.t + '" width="' + slot + '" height="' + ih + '" fill="transparent" tabindex="0" data-tip="' +
          esc(tipRows("Score " + fmt(b.from) + " to " + fmt(b.to), [["Students", b.count, you ? C.you : C.peer]], you ? "Your score is in this band" : "")) + '"/>';
        if(i % every === 0) s += txt(p.l + i * slot, H - 8, fmt(b.from), { size: 10.5, anchor: "middle" });
      });
      s += grid(p.l, W - p.r, y(0), 0, { axis: 1 });
      if(dist.median != null){
        var lo = bins[0].from, hi = bins[bins.length - 1].to;
        var mx = p.l + (dist.median - lo) / (hi - lo) * iw;
        s += '<line x1="' + mx + '" x2="' + mx + '" y1="' + (p.t - 6) + '" y2="' + y(0) + '" stroke="' + C.ink + '" stroke-width="1.5" stroke-dasharray="4 4" opacity=".55"/>' +
          txt(mx + 5, p.t - 2, "Median " + fmt(dist.median), { size: 10.5, weight: 600, fill: C.ink });
      }
      if(dist.studentBin == null) return svg(W, H, defs, s, "How every student scored");
      var cx = p.l + dist.studentBin * slot + slot / 2;
      s += pill(Math.min(W - 40, Math.max(40, cx)), Math.max(12, y(bins[dist.studentBin].count) - 18), "You · " + fmt(score));
      return svg(W, H, defs, s, "How every student scored, your band highlighted");
    };
  }

  /* ---------------- 2. potential-score waterfall ---------------- */
  function waterfall(pot){
    return function(W){
      var id = "w" + (++uid);
      var cols = [{ label: "Your score", v: pot.score, base: 0, kind: "you" }];
      var run = pot.score;
      pot.steps.forEach(function(s){ cols.push({ label: s.label, v: s.gain, base: run, kind: "gain", detail: s.detail }); run += s.gain; });
      cols.push({ label: "Within reach", v: pot.potential, base: 0, kind: "pot" });
      var H = 250, p = { l: 34, r: 10, t: 30, b: 46 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      var max = niceMax(Math.max(pot.max, 1)), slot = iw / cols.length, bw = Math.min(70, slot * 0.6);
      var y = function(v){ return p.t + ih - v / max * ih; };
      var defs = vgrad(id + "y", C.youLt, C.youDk) + vgrad(id + "g", C.okLt, C.ok) + vgrad(id + "p", C.youLt, C.you, .35, .12) +
        '<pattern id="' + id + 's" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="' + C.you + '" stroke-width="2" opacity=".25"/></pattern>';
      var s = grid(p.l, W - p.r, y(max), max) + grid(p.l, W - p.r, y(max / 2), max / 2);
      cols.forEach(function(c, i){
        var x = p.l + i * slot + (slot - bw) / 2, top = y(c.base + c.v), h = y(c.base) - top;
        var fill = c.kind === "you" ? "url(#" + id + "y)" : c.kind === "gain" ? "url(#" + id + "g)" : "url(#" + id + "p)";
        s += '<path class="an-mark grow" style="animation-delay:' + (i * 120) + 'ms" d="' + bar(x, top, bw, h, 7) + '" fill="' + fill + '" tabindex="0" data-tip="' +
          esc(tipRows(c.label, [[c.kind === "gain" ? "Marks" : "Score", (c.kind === "gain" ? "+" : "") + c.v + " / " + pot.max]], c.detail || "")) + '"/>';
        if(c.kind === "pot") s += '<path d="' + bar(x, top, bw, h, 7) + '" fill="url(#' + id + 's)"/><path d="' + bar(x, top, bw, h, 7) + '" fill="none" stroke="' + C.you + '" stroke-width="2" stroke-dasharray="5 4"/>';
        if(i < cols.length - 1){
          var nx = p.l + (i + 1) * slot + (slot - bw) / 2;
          s += '<line x1="' + (x + bw) + '" x2="' + nx + '" y1="' + top + '" y2="' + top + '" stroke="' + C.axis + '" stroke-width="1.5" stroke-dasharray="3 3"/>';
        }
        s += pill(x + bw / 2, top - 14, (c.kind === "gain" ? "+" : "") + c.v, { fill: c.kind === "gain" ? C.ok : c.kind === "pot" ? "#fff" : C.you, text: c.kind === "pot" ? C.you : "#fff", stroke: c.kind === "pot" ? C.you : null });
        wrapLabel(c.label, Math.max(60, slot - 6)).forEach(function(line, k){ s += txt(x + bw / 2, H - 28 + k * 13, line, { anchor: "middle", size: 11, weight: k ? 400 : 600, fill: k ? C.muted : C.ink }); });
      });
      s += grid(p.l, W - p.r, y(0), 0, { axis: 1 });
      return svg(W, H, defs, s, "From your score to the marks within reach");
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
      var id = "q" + (++uid);
      var H = Math.min(380, Math.max(290, W * 0.6)), p = { l: 44, r: 16, t: 14, b: 40 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      var xMax = Math.max(2.5, Math.ceil(Math.max.apply(null, points.map(function(q){ return q.speed; }).concat([1])) * 2) / 2);
      var x = function(v){ return p.l + Math.min(v, xMax) / xMax * iw; };
      var y = function(v){ return p.t + ih - (v + 0.07) / 1.19 * ih; };  /* headroom so 0% / 100% dots clear the edges and zone labels */
      var xm = x(1.15), ym = y(0.6), R = p.l + iw, B = p.t + ih;
      var defs =
        '<radialGradient id="' + id + 'a" cx="0" cy="0" r="1.2"><stop offset="0" stop-color="#10a36b" stop-opacity=".16"/><stop offset="1" stop-color="#10a36b" stop-opacity=".03"/></radialGradient>' +
        '<radialGradient id="' + id + 'b" cx="1" cy="0" r="1.2"><stop offset="0" stop-color="#2563eb" stop-opacity=".13"/><stop offset="1" stop-color="#2563eb" stop-opacity=".02"/></radialGradient>' +
        '<radialGradient id="' + id + 'c" cx="0" cy="1" r="1.2"><stop offset="0" stop-color="#f59e0b" stop-opacity=".16"/><stop offset="1" stop-color="#f59e0b" stop-opacity=".03"/></radialGradient>' +
        '<radialGradient id="' + id + 'd" cx="1" cy="1" r="1.2"><stop offset="0" stop-color="#e0453a" stop-opacity=".16"/><stop offset="1" stop-color="#e0453a" stop-opacity=".03"/></radialGradient>' +
        ["master", "slow-sure", "fast-loose", "rebuild"].map(function(z){
          var c = { master: [C.okLt, C.ok], "slow-sure": [C.youLt, C.you], "fast-loose": ["#fcd34d", C.warn], rebuild: [C.errLt, C.err] }[z];
          return '<radialGradient id="' + id + z + '" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></radialGradient>';
        }).join("");
      var s = "";
      s += '<rect x="' + p.l + '" y="' + p.t + '" width="' + (xm - p.l) + '" height="' + (ym - p.t) + '" fill="url(#' + id + 'a)" rx="10"/>';
      s += '<rect x="' + xm + '" y="' + p.t + '" width="' + (R - xm) + '" height="' + (ym - p.t) + '" fill="url(#' + id + 'b)" rx="10"/>';
      s += '<rect x="' + p.l + '" y="' + ym + '" width="' + (xm - p.l) + '" height="' + (B - ym) + '" fill="url(#' + id + 'c)" rx="10"/>';
      s += '<rect x="' + xm + '" y="' + ym + '" width="' + (R - xm) + '" height="' + (B - ym) + '" fill="url(#' + id + 'd)" rx="10"/>';
      [0, .25, .5, .75, 1].forEach(function(v){ s += txt(p.l - 7, y(v) + 4, Math.round(v * 100) + "%", { anchor: "end", size: 10.5 }); });
      for(var v = 0.5; v <= xMax + 1e-9; v += 0.5) s += txt(x(v), H - 22, v + "×", { anchor: "middle", size: 10.5 });
      s += '<line x1="' + xm + '" x2="' + xm + '" y1="' + p.t + '" y2="' + B + '" stroke="#fff" stroke-width="3"/>';
      s += '<line x1="' + p.l + '" x2="' + R + '" y1="' + ym + '" y2="' + ym + '" stroke="#fff" stroke-width="3"/>';
      var zl = function(xx, yy, label, color, anchor){
        var w = label.length * 6.4 + 18, x0 = anchor === "end" ? xx - w : xx;
        return '<rect x="' + x0 + '" y="' + (yy - 11) + '" width="' + w + '" height="20" rx="10" fill="#fff" opacity=".9"/>' +
          txt(x0 + w / 2, yy + 3, label, { anchor: "middle", weight: 700, size: 11, fill: color });
      };
      s += zl(p.l + 8, p.t + 16, zones.master.label, C.ok);
      s += zl(R - 8, p.t + 16, zones["slow-sure"].label, C.youDk, "end");
      s += zl(p.l + 8, B - 14, zones["fast-loose"].label, "#b45309");
      s += zl(R - 8, B - 14, zones.rebuild.label, C.err, "end");
      s += txt(p.l + iw / 2, H - 5, "Time taken vs usual  (1× = same as other students)", { anchor: "middle", size: 11 });
      var placed = [], labels = "";
      points.slice().sort(function(a, b){ return b.attempted - a.attempted; }).forEach(function(q, k){
        var cx = x(q.speed), cy = y(q.accuracy), r = 7 + Math.min(7, q.attempted * 1.2);
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r + 5) + '" fill="url(#' + id + q.zone + ')" opacity=".18"/>';
        s += '<circle class="an-mark pop" style="animation-delay:' + (k * 60) + 'ms" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#' + id + q.zone + ')" stroke="#fff" stroke-width="2.5" tabindex="0" data-tip="' +
          esc(tipRows(q.name, [["Accuracy", pct(q.accuracy)], ["Time vs usual", q.speed.toFixed(1) + "×"], ["Attempted", q.attempted]], zones[q.zone].label + " · " + zones[q.zone].hint)) + '"/>';
        var lx = cx + r + 5, ly = cy + 4, clash = placed.some(function(o){ return Math.abs(o[0] - lx) < 80 && Math.abs(o[1] - ly) < 14; });
        if(!clash && lx < W - 70){
          var nm = q.name.length > 18 ? q.name.slice(0, 17) + "…" : q.name;
          labels += '<text x="' + lx + '" y="' + ly + '" font-size="11.5" font-weight="600" fill="' + C.ink + '" stroke="#fff" stroke-width="3" paint-order="stroke" font-family="Inter, sans-serif">' + esc(nm) + "</text>";
          placed.push([lx, ly]);
        }
      });
      return svg(W, H, defs, s + labels, "Topics by accuracy and speed");
    };
  }

  /* ---------------- 4. pacing: cumulative time ---------------- */
  function pacing(points){
    return function(W){
      var id = "p" + (++uid);
      var H = 240, p = { l: 46, r: 116, t: 16, b: 30 }, iw = W - p.l - p.r, ih = H - p.t - p.b, n = points.length;
      var last = points[n - 1];
      var max = niceMax(Math.max(last.own, last.usual || 0) / 60) * 60;
      var x = function(i){ return p.l + (n === 1 ? iw / 2 : i / (n - 1) * iw); };
      var y = function(v){ return p.t + ih - v / max * ih; };
      var defs = vgrad(id + "a", C.you, C.you, .26, 0) + vgrad(id + "s", C.ok, C.ok, .22, .08) + vgrad(id + "l", C.err, C.err, .2, .06);
      var s = grid(p.l, W - p.r, y(max), dur(max)) + grid(p.l, W - p.r, y(max / 2), dur(max / 2)) + grid(p.l, W - p.r, y(0), "0", { axis: 1 });
      var own = "", usual = "", hasUsual = points.every(function(q){ return q.usual != null; });
      points.forEach(function(q, i){
        own += (i ? "L" : "M") + x(i) + "," + y(q.own);
        if(hasUsual) usual += (i ? "L" : "M") + x(i) + "," + y(q.usual);
      });
      s += '<path d="M' + x(0) + "," + y(0) + "L" + own.slice(1) + "L" + x(n - 1) + "," + y(0) + 'Z" fill="url(#' + id + 'a)"/>';
      if(hasUsual){
        /* the gap between the two curves: green where you were ahead of the usual pace, red where behind */
        for(var i = 1; i < n; i++){
          var a = points[i - 1], b = points[i], ahead = (a.own + b.own) <= (a.usual + b.usual);
          s += '<path d="M' + x(i - 1) + "," + y(a.own) + "L" + x(i) + "," + y(b.own) + "L" + x(i) + "," + y(b.usual) + "L" + x(i - 1) + "," + y(a.usual) + 'Z" fill="url(#' + id + (ahead ? "s" : "l") + ')"/>';
        }
        s += '<path class="draw" d="' + usual + '" fill="none" stroke="' + C.peer + '" stroke-width="2" stroke-dasharray="6 5" pathLength="1"/>';
      }
      s += '<path class="draw" d="' + own + '" fill="none" stroke="' + C.you + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" pathLength="1"/>';
      s += '<circle cx="' + x(n - 1) + '" cy="' + y(last.own) + '" r="11" fill="' + C.you + '" opacity=".15"/><circle cx="' + x(n - 1) + '" cy="' + y(last.own) + '" r="5" fill="' + C.you + '" stroke="#fff" stroke-width="2"/>';
      var ly1 = y(last.own), ly2 = hasUsual ? y(last.usual) : null;
      if(ly2 != null && Math.abs(ly1 - ly2) < 24){ if(ly1 < ly2){ ly1 -= 12; ly2 += 12; } else { ly1 += 12; ly2 -= 12; } }
      s += pill(W - p.r + 10, ly1, "You " + dur(last.own), { anchor: "start" });
      if(hasUsual) s += pill(W - p.r + 10, ly2, "Usual " + dur(last.usual), { anchor: "start", fill: "#eef2f7", text: C.ink });
      var every = Math.ceil(n / Math.max(2, Math.floor(iw / 34)));
      points.forEach(function(q, i){
        if(i % every === 0 || i === n - 1) s += txt(x(i), H - 10, "Q" + q.qno, { anchor: "middle", size: 10 });
        var half = n === 1 ? iw / 2 : iw / (n - 1) / 2;
        var diff = q.usual != null ? q.own - q.usual : null;
        s += '<rect x="' + (x(i) - half) + '" y="' + p.t + '" width="' + half * 2 + '" height="' + ih + '" fill="transparent" tabindex="0" data-tip="' +
          esc(tipRows((i + 1) + " questions in (Q" + q.qno + ")", [["You", dur(q.own), C.you]].concat(q.usual != null ? [["Usual pace", dur(q.usual), C.peer],
            [diff <= 0 ? "Ahead by" : "Behind by", dur(Math.abs(diff))]] : []))) + '"/>';
      });
      return svg(W, H, defs, s, "Time used as the test went on, you vs the usual pace");
    };
  }

  /* ---------------- 5. question strip ---------------- */
  var STATUS = { correct: ["Correct", C.ok, C.okLt], wrong: ["Wrong", C.err, C.errLt], skipped: ["Skipped", "#c3ccd9", C.skipLt] };
  function strip(qs, highlight, tagLabels){
    return function(W){
      var id = "s" + (++uid);
      var H = 240, p = { l: 46, r: 6, t: 32, b: 34 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      var slot = iw / qs.length, bw = Math.min(28, Math.max(3, slot - 3));
      var longest = Math.max.apply(null, qs.map(function(q){ return Math.max(q.time, q.cohortTime || 0); }).concat([60]));
      var max = Math.ceil(longest / 60) * 60;
      var y = function(v){ return p.t + ih - Math.min(v, max) / max * ih; };
      var defs = Object.keys(STATUS).map(function(k){ return vgrad(id + k, STATUS[k][2], STATUS[k][1]); }).join("");
      var s = grid(p.l, W - p.r, y(max), dur(max)) + grid(p.l, W - p.r, y(max / 2), dur(max / 2));
      var band = 0;
      qs.forEach(function(q, i){
        if(i === 0 || q.sectionName !== qs[i - 1].sectionName){
          var x0 = p.l + i * slot;
          var span = 1; while(i + span < qs.length && qs[i + span].sectionName === q.sectionName) span++;
          if(band++ % 2 === 1) s += '<rect x="' + x0 + '" y="' + (p.t - 22) + '" width="' + span * slot + '" height="' + (ih + 22) + '" fill="#f6f8fc"/>';
          var room = Math.floor(span * slot / 6.6);
          s += txt(x0 + 6, p.t - 9, q.sectionName.length > room ? q.sectionName.slice(0, Math.max(1, room - 1)) + "…" : q.sectionName, { weight: 700, size: 11, fill: C.ink });
        }
      });
      qs.forEach(function(q, i){
        var x = p.l + i * slot + (slot - bw) / 2, on = !highlight || highlight(q);
        var st = STATUS[q.status];
        var rows = [["Your time", dur(q.time), st[1]]];
        if(q.cohortTime != null) rows.push(["Usual time", dur(q.cohortTime), C.ink]);
        if(q.cohortSolveRate != null) rows.push(["Solved by", pct(q.cohortSolveRate) + " of students"]);
        var sub = q.areaTitle + " › " + q.subAreaName + (q.lod ? " · " + q.lod : "") + (q.tags.length ? " · " + q.tags.map(function(t){ return tagLabels[t]; }).join(", ") : "");
        s += '<g class="an-mark" opacity="' + (on ? 1 : .15) + '">' +
          '<path class="grow" style="animation-delay:' + (i * 18) + 'ms" d="' + bar(x, y(q.time), bw, y(0) - y(q.time), Math.min(5, bw / 2)) + '" fill="url(#' + id + q.status + ')"/>' +
          (q.cohortTime != null ? '<line x1="' + (x - 2) + '" x2="' + (x + bw + 2) + '" y1="' + y(q.cohortTime) + '" y2="' + y(q.cohortTime) + '" stroke="' + C.ink + '" stroke-width="2.5" stroke-linecap="round"/>' : "") +
          "</g>";
        if(slot >= 12 && q.status !== "skipped"){
          var cx = p.l + i * slot + slot / 2, cy = y(0) + 10;
          s += '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="' + (q.status === "correct" ? "#e7f7ef" : "#fdeceb") + '"/>' +
            (q.status === "correct"
              ? '<path d="M' + (cx - 2.8) + "," + cy + " L" + (cx - 0.8) + "," + (cy + 2.2) + " L" + (cx + 2.8) + "," + (cy - 2.2) + '" stroke="' + C.ok + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
              : '<path d="M' + (cx - 2.2) + "," + (cy - 2.2) + " L" + (cx + 2.2) + "," + (cy + 2.2) + " M" + (cx + 2.2) + "," + (cy - 2.2) + " L" + (cx - 2.2) + "," + (cy + 2.2) + '" stroke="' + C.err + '" stroke-width="1.6" stroke-linecap="round"/>');
        }
        var step = slot >= 22 ? 1 : slot >= 11 ? 5 : 10;
        if(i % step === 0) s += txt(p.l + i * slot + slot / 2, H - 4, q.qno, { anchor: "middle", size: 10 });
        s += '<rect x="' + (p.l + i * slot) + '" y="' + p.t + '" width="' + slot + '" height="' + (ih + 18) + '" fill="transparent" tabindex="0" data-tip="' +
          esc(tipRows("Q" + q.qno + " · " + st[0] + (q.status !== "skipped" ? " (" + (q.score > 0 ? "+" : "") + q.score + ")" : ""), rows, sub)) + '"/>';
      });
      s += grid(p.l, W - p.r, y(0), "0s", { axis: 1 });
      return svg(W, H, defs, s, "Time on every question, coloured by result");
    };
  }

  /* ---------------- 6. small-multiple trend line ---------------- */
  function trend(tests, valueFn, o){
    o = o || {};
    return function(W){
      var id = "t" + (++uid), col = o.color || C.you;
      var vals = tests.map(valueFn), H = o.height || 170, p = { l: 30, r: 16, t: 30, b: 26 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      var max = o.max || niceMax(Math.max.apply(null, vals.filter(function(v){ return v != null; }).concat([1])));
      var n = tests.length;
      var x = function(i){ return p.l + (n === 1 ? iw / 2 : i / (n - 1) * iw); };
      var y = function(v){ return p.t + ih - v / max * ih; };
      var defs = vgrad(id + "a", col, col, .3, 0);
      var s = grid(p.l, W - p.r, y(max), max) + grid(p.l, W - p.r, y(max / 2), max / 2) + grid(p.l, W - p.r, y(0), 0, { axis: 1 });
      var pts = [];
      vals.forEach(function(v, i){ if(v != null) pts.push([x(i), y(v), i, v]); });
      /* smooth curve through the points (monotone-ish Catmull-Rom) */
      var d = "";
      pts.forEach(function(pt, k){
        if(!k){ d = "M" + pt[0] + "," + pt[1]; return; }
        var p0 = pts[k - 2] || pts[k - 1], p1 = pts[k - 1], p2 = pt, p3 = pts[k + 1] || pt, t = 0.18;
        var c1x = p1[0] + (p2[0] - p0[0]) * t, c1y = p1[1] + (p2[1] - p0[1]) * t;
        var c2x = p2[0] - (p3[0] - p1[0]) * t, c2y = p2[1] - (p3[1] - p1[1]) * t;
        c1y = Math.min(Math.max(c1y, Math.min(p1[1], p2[1])), Math.max(p1[1], p2[1]));
        c2y = Math.min(Math.max(c2y, Math.min(p1[1], p2[1])), Math.max(p1[1], p2[1]));
        d += "C" + c1x + "," + c1y + " " + c2x + "," + c2y + " " + p2[0] + "," + p2[1];
      });
      if(pts.length > 1) s += '<path d="' + d + "L" + pts[pts.length - 1][0] + "," + y(0) + "L" + pts[0][0] + "," + y(0) + 'Z" fill="url(#' + id + 'a)"/>';
      if(o.ref != null) s += '<line x1="' + p.l + '" x2="' + (W - p.r) + '" y1="' + y(o.ref) + '" y2="' + y(o.ref) + '" stroke="' + C.peer + '" stroke-dasharray="4 4"/>';
      s += '<path class="draw" d="' + d + '" fill="none" stroke="' + col + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" pathLength="1"/>';
      var best = pts.reduce(function(a, b){ return !a || b[3] > a[3] ? b : a; }, null);
      pts.forEach(function(pt, k){
        var last = k === pts.length - 1;
        if(last) s += '<circle cx="' + pt[0] + '" cy="' + pt[1] + '" r="12" fill="' + col + '" opacity=".14"/>';
        s += '<circle class="an-mark pop" style="animation-delay:' + (300 + k * 70) + 'ms" cx="' + pt[0] + '" cy="' + pt[1] + '" r="' + (last ? 5.5 : 4.5) + '" fill="' + (last ? col : "#fff") + '" stroke="' + (last ? "#fff" : col) + '" stroke-width="' + (last ? 2.5 : 2.2) + '"/>';
      });
      if(pts.length){
        var L = pts[pts.length - 1], lab = o.fmt ? o.fmt(L[3]) : L[3];
        s += pill(Math.min(W - p.r - 4, Math.max(p.l + 24, L[0])), Math.max(11, L[1] - 20), lab, { fill: col, anchor: L[0] > W - 60 ? "end" : "middle" });
        if(best && best !== L && pts.length > 2 && Math.abs(best[0] - L[0]) > 50)
          s += txt(best[0], Math.max(10, best[1] - 11), "Best " + (o.fmt ? o.fmt(best[3]) : best[3]), { anchor: "middle", size: 10.5, weight: 700, fill: C.ok });
      }
      tests.forEach(function(t, i){
        s += txt(x(i), H - 6, (n > 10 && i % 2) ? "" : "#" + (i + 1), { anchor: "middle", size: 10 });
        var half = n === 1 ? iw / 2 : iw / (n - 1) / 2;
        s += '<rect x="' + (x(i) - half) + '" y="' + p.t + '" width="' + half * 2 + '" height="' + (ih + 12) + '" fill="transparent" tabindex="0" data-tip="' +
          esc(tipRows(t.testName, [[o.label || "Value", vals[i] == null ? "—" : (o.fmt ? o.fmt(vals[i]) : vals[i]), col]].concat(o.extra ? o.extra(t) : []), o.sub ? o.sub(t) : "")) + '"/>';
      });
      return svg(W, H, defs, s, o.label || "Trend");
    };
  }

  /* ---------------- 7. bars per test (habits; lower is better) ---------------- */
  function bars(tests, valueFn, o){
    o = o || {};
    return function(W){
      var vals = tests.map(valueFn);
      if(vals.every(function(v){ return !v; }))
        return '<div class="an-none">' + '<span>' + "✓" + "</span>" + esc(o.none || "None in any test.") + "</div>";
      var id = "b" + (++uid);
      var H = 140, p = { l: 26, r: 6, t: 26, b: 22 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      var max = niceMax(Math.max.apply(null, vals.concat([1]))), slot = iw / tests.length, bw = Math.min(30, Math.max(8, slot - 10));
      var y = function(v){ return p.t + ih - v / max * ih; };
      var defs = vgrad(id + "a", "#fdba74", C.warn) + vgrad(id + "z", C.peerLt, C.peer, .7, .5);
      var s = grid(p.l, W - p.r, y(max), max) + grid(p.l, W - p.r, y(0), 0, { axis: 1 });
      tests.forEach(function(t, i){
        var x = p.l + i * slot + (slot - bw) / 2, last = i === tests.length - 1;
        if(last) s += '<rect x="' + (x - 4) + '" y="' + p.t + '" width="' + (bw + 8) + '" height="' + ih + '" rx="8" fill="#fff7ed"/>';
        s += '<path class="an-mark grow" style="animation-delay:' + (i * 50) + 'ms" d="' + bar(x, y(vals[i]), bw, y(0) - y(vals[i])) + '" fill="url(#' + id + (last ? "a" : "z") + ')"/>';
        s += '<rect x="' + (p.l + i * slot) + '" y="' + p.t + '" width="' + slot + '" height="' + (ih + 10) + '" fill="transparent" tabindex="0" data-tip="' +
          esc(tipRows(t.testName, [[o.label || "Value", fmt(vals[i]), last ? C.warn : C.peer]])) + '"/>';
        if(last) s += pill(x + bw / 2, Math.max(11, y(vals[i]) - 13), fmt(vals[i]), { fill: C.warn });
        s += txt(p.l + i * slot + slot / 2, H - 6, (tests.length > 10 && i % 2) ? "" : "#" + (i + 1), { anchor: "middle", size: 10, weight: last ? 700 : 400, fill: last ? C.ink : C.muted });
      });
      return svg(W, H, defs, s, o.label || "Per test");
    };
  }

  /* ---------------- 9. speed vs success (one question) ----------------
     Each column is a time band: how many students answered in that time,
     green = right, red = wrong. The dashed line marks the student's own time. */
  function timeBands(bands, you){
    return function(W){
      var id = "tb" + (++uid);
      var H = 230, p = { l: 34, r: 12, t: 34, b: 30 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      var max = niceMax(Math.max.apply(null, bands.map(function(b){ return b.attempts; }).concat([1])));
      var slot = iw / bands.length, bw = Math.min(46, slot - 8);
      var span = bands[bands.length - 1].to;
      var y = function(v){ return p.t + ih - v / max * ih; };
      var defs = vgrad(id + "o", C.okLt, C.ok) + vgrad(id + "e", C.errLt, C.err);
      var s = grid(p.l, W - p.r, y(max), max) + grid(p.l, W - p.r, y(max / 2), max / 2);
      bands.forEach(function(b, i){
        var x = p.l + i * slot + (slot - bw) / 2, wrong = b.attempts - b.right;
        var yr = y(b.right), yw = y(b.attempts);
        if(b.right) s += '<path class="an-mark grow" style="animation-delay:' + (i * 50) + 'ms" d="M' + x + "," + y(0) + "V" + yr + "H" + (x + bw) + "V" + y(0) + 'Z" fill="url(#' + id + 'o)"/>';
        if(wrong) s += '<path class="an-mark grow" style="animation-delay:' + (i * 50 + 80) + 'ms" d="' + bar(x, yw, bw, yr - yw - (b.right ? 2 : 0)) + '" fill="url(#' + id + 'e)"/>';
        else if(b.right) s += '<path d="' + bar(x, yr, bw, 6) + '" fill="url(#' + id + 'o)"/>';
        var rate = b.attempts ? Math.round(b.right / b.attempts * 100) : null;
        if(b.attempts >= 3) s += txt(x + bw / 2, yw - 6, rate + "%", { anchor: "middle", weight: 700, size: 11, fill: rate >= 50 ? C.ok : C.err });
        /* narrow screens: label fewer bands, and only by their start */
        var every = Math.ceil(78 / slot), wide = slot >= 78;
        if(i % every === 0) s += txt(wide ? x + bw / 2 : p.l + i * slot, H - 10, wide ? dur(b.from) + "–" + dur(b.to) : dur(b.from), { anchor: wide ? "middle" : "start", size: 10 });
        s += '<rect x="' + (p.l + i * slot) + '" y="' + p.t + '" width="' + slot + '" height="' + ih + '" fill="transparent" tabindex="0" data-tip="' +
          esc(tipRows("Answered in " + dur(b.from) + "–" + dur(b.to), [["Students", b.attempts], ["Got it right", b.right, C.ok], ["Got it wrong", wrong, C.err],
            ["Success rate", rate == null ? "—" : rate + "%"]])) + '"/>';
      });
      s += grid(p.l, W - p.r, y(0), 0, { axis: 1 });
      if(you != null){
        var yx = p.l + Math.min(you, span) / span * iw;
        s += '<line x1="' + yx + '" x2="' + yx + '" y1="' + (p.t - 8) + '" y2="' + y(0) + '" stroke="' + C.you + '" stroke-width="2.5" stroke-dasharray="5 4"/>';
        s += pill(Math.min(W - 46, Math.max(46, yx)), p.t - 18, "You · " + dur(you));
      }
      return svg(W, H, defs, s, "How long students took and how often they got it right");
    };
  }

  /* ---------------- 10. marks spread (partial credit) ---------------- */
  function marksSpread(bins, mine, full){
    return function(W){
      var id = "ms" + (++uid);
      var H = 210, p = { l: 34, r: 10, t: 34, b: 28 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      var max = niceMax(Math.max.apply(null, bins.map(function(b){ return b.count; }).concat([1])));
      var slot = iw / bins.length, bw = Math.min(40, slot - 6);
      var y = function(v){ return p.t + ih - v / max * ih; };
      var defs = vgrad(id + "p", C.peerLt, C.peer, .9, .55) + vgrad(id + "y", C.youLt, C.youDk) + vgrad(id + "f", C.okLt, C.ok);
      var s = grid(p.l, W - p.r, y(max), max) + grid(p.l, W - p.r, y(max / 2), max / 2);
      bins.forEach(function(b, i){
        var x = p.l + i * slot + (slot - bw) / 2, you = mine != null && Math.abs(b.score - mine) < 0.05, isFull = b.score >= full;
        if(you) s += '<rect x="' + (x - 5) + '" y="' + (y(b.count) - 5) + '" width="' + (bw + 10) + '" height="' + (y(0) - y(b.count) + 5) + '" rx="9" fill="' + C.you + '" opacity=".12"/>';
        s += '<path class="an-mark grow" style="animation-delay:' + (i * 40) + 'ms" d="' + bar(x, y(b.count), bw, y(0) - y(b.count)) + '" fill="url(#' + id + (you ? "y" : isFull ? "f" : "p") + ')"/>';
        s += txt(x + bw / 2, H - 9, b.score, { anchor: "middle", size: 10.5, weight: you ? 700 : 400, fill: you ? C.ink : C.muted });
        s += '<rect x="' + (p.l + i * slot) + '" y="' + p.t + '" width="' + slot + '" height="' + ih + '" fill="transparent" tabindex="0" data-tip="' +
          esc(tipRows(b.score + " marks", [["Students", b.count, you ? C.you : isFull ? C.ok : C.peer]], you ? "Your marks" : isFull ? "Full marks" : "")) + '"/>';
        if(you) s += pill(Math.min(W - 40, Math.max(40, x + bw / 2)), Math.max(11, y(b.count) - 18), "You · " + b.score);
      });
      s += grid(p.l, W - p.r, y(0), 0, { axis: 1 });
      return svg(W, H, defs, s, "Marks every student earned on this question");
    };
  }

  /* ---------------- 11. gauge: a value on Need improvement / Good / Very good bands ---------------- */
  var BANDS = [[0, 40, "#f2705f", "Need improvement"], [40, 75, "#f6b73c", "Good"], [75, 100, "#22a06b", "Very good"]];
  function bandOf(v){ for(var i = 0; i < BANDS.length; i++) if(v < BANDS[i][1] || i === BANDS.length - 1) return BANDS[i]; }
  function gauge(value, o){
    o = o || {};
    var W = o.width || 220, H = W * 0.62, cx = W / 2, cy = H - 18, R = W / 2 - 18, th = 16;
    var ang = function(v){ return Math.PI * (1 - v / 100); };
    var pt = function(v, r){ return [cx + r * Math.cos(ang(v)), cy - r * Math.sin(ang(v))]; };
    var arc = function(a, b, color){
      var p1 = pt(a, R), p2 = pt(b, R), p3 = pt(b, R - th), p4 = pt(a, R - th);
      return '<path d="M' + p1 + " A" + R + "," + R + " 0 0 1 " + p2 + " L" + p3 + " A" + (R - th) + "," + (R - th) + " 0 0 0 " + p4 + 'Z" fill="' + color + '"/>';
    };
    var s = BANDS.map(function(b){ return arc(b[0] + 0.6, b[1] - 0.6, b[2]); }).join("");
    if(value != null){
      var v = Math.max(0, Math.min(100, value)), tip = pt(v, R - th - 6), b = bandOf(v);
      s += '<g class="an-needle" style="transform-origin:' + cx + "px " + cy + 'px;--a:' + (-(v * 1.8)) + 'deg">' +
        '<line x1="' + cx + '" y1="' + cy + '" x2="' + tip[0] + '" y2="' + tip[1] + '" stroke="#0a1523" stroke-width="3" stroke-linecap="round"/></g>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="#0a1523"/><circle cx="' + cx + '" cy="' + cy + '" r="3" fill="#fff"/>';
      /* value and band sit under the pivot, so the needle never crosses them */
      s += txt(cx, cy + 30, o.fmt ? o.fmt(v) : Math.round(v), { anchor: "middle", weight: 800, size: o.big || 22, fill: "#0a1523" });
      s += txt(cx, cy + 47, b[3], { anchor: "middle", weight: 700, size: 11, fill: b[2] === "#f6b73c" ? "#a86f00" : b[2] });
    } else {
      s += txt(cx, cy - 10, "No data yet", { anchor: "middle", weight: 600, size: 12 });
    }
    s += txt(18, cy + 15, "0", { size: 10 }) + txt(W - 18, cy + 15, "100", { anchor: "end", size: 10 });
    return '<svg width="' + W + '" height="' + (H + 40) + '" viewBox="0 0 ' + W + " " + (H + 40) + '" role="img" aria-label="' + esc((o.label || "") + ": " + (value == null ? "no data" : Math.round(value))) + '">' + s + "</svg>";
  }

  /* ---------------- 12. mini donut: right / wrong / blank ---------------- */
  function miniDonut(right, wrong, blank, size){
    size = size || 96;
    var total = right + wrong + blank || 1, r = size / 2 - 9, c = 2 * Math.PI * r, off = 0, s = "";
    [[right, C.ok, "Right"], [wrong, C.err, "Wrong"], [blank, "#cbd5e1", "Left blank"]].forEach(function(seg){
      if(!seg[0]) return;
      var len = seg[0] / total * c;
      s += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + seg[1] + '" stroke-width="14" stroke-dasharray="' + Math.max(0, len - 2) + " " + (c - len + 2) +
        '" stroke-dashoffset="' + (-off) + '" tabindex="0" data-tip="' + esc(tipRows(seg[2], [["Questions", seg[0], seg[1]]])) + '"/>';
      off += len;
    });
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '" style="transform:rotate(-90deg)" role="img" aria-label="' + right + " right, " + wrong + " wrong, " + blank + ' left blank">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#eef2f8" stroke-width="14"/>' + s + "</svg>";
  }

  /* ---------------- 13. score vs percentile curve ---------------- */
  function curve(points, you, label){
    return function(W){
      var id = "cv" + (++uid);
      var H = 240, p = { l: 44, r: 16, t: 20, b: 34 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      if(!points.length) return '<div class="an-wf-note" style="padding:40px 0;text-align:center">Not enough students yet to draw the curve.</div>';
      var lo = Math.min(points[0].score, 0), hi = niceMax(Math.max(points[points.length - 1].score, you ? you.score : 0, 1));
      var x = function(v){ return p.l + (v - lo) / (hi - lo) * iw; };
      var y = function(v){ return p.t + ih - v / 100 * ih; };
      var defs = vgrad(id + "a", C.you, C.you, .22, 0);
      var s = "";
      [0, 25, 50, 75, 100].forEach(function(v){ s += grid(p.l, W - p.r, y(v), v, v === 0 ? { axis: 1 } : null); });
      [lo, (lo + hi) / 2, hi].forEach(function(v){ s += txt(x(v), H - 16, fmt(v), { anchor: "middle", size: 10.5 }); });
      s += txt(p.l + iw / 2, H - 2, "Score", { anchor: "middle", size: 11 });
      var d = points.map(function(q, i){ return (i ? "L" : "M") + x(q.score) + "," + y(q.percentile); }).join("");
      s += '<path d="' + d + "L" + x(points[points.length - 1].score) + "," + y(0) + "L" + x(points[0].score) + "," + y(0) + 'Z" fill="url(#' + id + 'a)"/>';
      s += '<path class="draw" d="' + d + '" fill="none" stroke="' + C.you + '" stroke-width="2.5" stroke-linejoin="round" pathLength="1"/>';
      points.forEach(function(q){
        s += '<circle cx="' + x(q.score) + '" cy="' + y(q.percentile) + '" r="9" fill="transparent" tabindex="0" data-tip="' +
          esc(tipRows("Score " + fmt(q.score), [["Better than", Math.round(q.percentile) + "% of students", C.you]])) + '"/>';
      });
      if(you && you.percentile != null){
        var yx = x(you.score), yy = y(you.percentile);
        s += '<line x1="' + yx + '" x2="' + yx + '" y1="' + yy + '" y2="' + y(0) + '" stroke="' + C.ink + '" stroke-dasharray="3 3" opacity=".5"/>' +
          '<line x1="' + p.l + '" x2="' + yx + '" y1="' + yy + '" y2="' + yy + '" stroke="' + C.ink + '" stroke-dasharray="3 3" opacity=".5"/>' +
          '<circle cx="' + yx + '" cy="' + yy + '" r="12" fill="' + C.err + '" opacity=".18"/><circle cx="' + yx + '" cy="' + yy + '" r="6" fill="' + C.err + '" stroke="#fff" stroke-width="2"/>';
        s += pill(Math.min(W - 70, Math.max(70, yx)), Math.max(12, yy - 22), "You · " + fmt(you.score) + " → " + Math.round(you.percentile) + "%", { fill: C.err });
      }
      s += '<text transform="translate(12,' + (p.t + ih / 2) + ') rotate(-90)" text-anchor="middle" font-size="11" fill="' + C.muted + '" font-family="Inter, sans-serif">Percentile</text>';
      return svg(W, H, defs, s, label || "Score vs percentile");
    };
  }

  /* ---------------- 14. shares: time / attempted / score by section (100% columns) ---------------- */
  var CAT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#4a3aa7"];   /* validated categorical order */
  function shares(list){
    return function(W){
      var H = 250, p = { l: 40, r: 10, t: 14, b: 30 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
      var cols = [["time", "Time spent"], ["attempted", "Questions answered"], ["score", "Marks scored"]];
      var slot = iw / 3, bw = Math.min(110, slot * 0.55);
      var y = function(v){ return p.t + ih - v * ih; };
      var s = [0, .25, .5, .75, 1].map(function(v){ return grid(p.l, W - p.r, y(v), Math.round(v * 100) + "%", v === 0 ? { axis: 1 } : null); }).join("");
      cols.forEach(function(cl, ci){
        var x = p.l + ci * slot + (slot - bw) / 2, acc = 0;
        list.forEach(function(sec, si){
          var v = sec[cl[0]] || 0; if(v <= 0) return;
          var top = y(acc + v), h = y(acc) - top;
          s += '<rect class="an-mark" x="' + x + '" y="' + top + '" width="' + bw + '" height="' + Math.max(0, h - 2) + '" rx="4" fill="' + CAT[si % CAT.length] + '" tabindex="0" data-grp="s' + si + '" data-tip="' +
            esc(tipRows(sec.name, [["Time spent", pct(sec.time)], ["Questions answered", pct(sec.attempted)], ["Marks scored", pct(sec.score)]], cl[1])) + '"/>';
          if(h >= 18) s += txt(x + bw / 2, top + h / 2 + 4, Math.round(v * 100) + "%", { anchor: "middle", weight: 700, size: 11, fill: "#fff" });
          acc += v;
        });
        s += txt(x + bw / 2, H - 10, cl[1], { anchor: "middle", size: 11, weight: 600, fill: C.ink });
      });
      return svg(W, H, "", s, "Share of time, answers and marks by section");
    };
  }

  /* ---------------- 15. section bars: you vs average (grey tick) and top 10% (dark tick) ----------------
     list: [{sectionId, name, you, avg, top}] (0–1); standings: [{id, percentile}] for the %ile pill. */
  /* one hue per section (identity, fixed order) */
  var SB = [["#60a5fa", "#2563eb"], ["#fdba74", "#ea580c"], ["#5eead4", "#0d9488"], ["#c4b5fd", "#7c3aed"], ["#f9a8d4", "#db2777"], ["#fcd34d", "#d97706"]];
  function sectionBars(list, standings){
    return function(W){
      var id = "sb" + (++uid);
      var narrow = W < 480;   /* phones: name above the bar instead of beside it */
      var row = narrow ? 58 : 46, p = { l: narrow ? 4 : Math.min(170, W * 0.34), r: 96, t: narrow ? 20 : 8 }, iw = W - p.l - p.r, H = p.t + list.length * row + 18;
      var x = function(v){ return p.l + Math.max(0, Math.min(1, v)) * iw; };
      var defs = '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + C.youLt + '"/><stop offset="1" stop-color="' + C.youDk + '"/></linearGradient>';
      var s = "";
      [0, .5, 1].forEach(function(v){
        s += '<line x1="' + x(v) + '" x2="' + x(v) + '" y1="' + p.t + '" y2="' + (H - 18) + '" stroke="' + C.grid + '"/>' + txt(x(v), H - 4, Math.round(v * 100) + "%", { anchor: v === 0 ? "start" : v === 1 ? "end" : "middle", size: 10 });
      });
      list.forEach(function(it, i){
        var y = p.t + i * row + 10, h = 16;
        var stg = (standings || []).filter(function(q){ return q.id === it.sectionId; })[0];
        var room = narrow ? 60 : Math.floor((p.l - 14) / 6.6);
        var nm = it.name.length > room ? it.name.slice(0, room - 1) + "…" : it.name;
        s += narrow ? txt(p.l, y - 6, nm, { size: 12, weight: 600, fill: C.ink }) : txt(p.l - 10, y + 12, nm, { anchor: "end", size: 12, weight: 600, fill: C.ink });
        s += '<rect x="' + p.l + '" y="' + y + '" width="' + iw + '" height="' + h + '" rx="8" fill="#edf2fa"/>';
        var hue = SB[i % SB.length];
        s += '<rect class="an-mark grow-x" style="animation-delay:' + (i * 80) + 'ms" x="' + p.l + '" y="' + y + '" width="' + Math.max(4, x(it.you) - p.l) + '" height="' + h + '" rx="8" fill="url(#' + id + i + ')"/>';
        defs += '<linearGradient id="' + id + i + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + hue[0] + '"/><stop offset="1" stop-color="' + hue[1] + '"/></linearGradient>';
        if(it.avg != null) s += '<rect x="' + (x(it.avg) - 2) + '" y="' + (y - 4) + '" width="4" height="' + (h + 8) + '" rx="2" fill="#64748b" stroke="#fff" stroke-width="1.5"/>';
        if(it.top != null) s += '<rect x="' + (x(it.top) - 2) + '" y="' + (y - 4) + '" width="4" height="' + (h + 8) + '" rx="2" fill="' + C.ink + '" stroke="#fff" stroke-width="1.5"/>';
        s += txt(W - p.r + 8, y + 12, Math.round(it.you * 100) + "%", { size: 12.5, weight: 800, fill: C.ink });
        if(stg && stg.percentile != null) s += txt(W - 6, y + 12, Math.round(stg.percentile) + "%ile", { anchor: "end", size: 10.5, weight: 700, fill: stg.percentile >= 75 ? C.ok : stg.percentile >= 40 ? "#a86f00" : C.err });
        s += '<rect x="0" y="' + (y - 8) + '" width="' + W + '" height="' + row + '" fill="transparent" tabindex="0" data-tip="' +
          esc(tipRows(it.name, [["You", pct(it.you), C.you]].concat(it.avg != null ? [["Average student", pct(it.avg), "#64748b"]] : []).concat(it.top != null ? [["Top 10%", pct(it.top), C.ink]] : [])
            .concat(stg && stg.percentile != null ? [["Your percentile", Math.round(stg.percentile) + "%"]] : []))) + '"/>';
      });
      return svg(W, H, defs, s, "Section scores against the average and the top 10%");
    };
  }

  /* ---------------- 8. donut ring (score) ---------------- */
  function ring(value){
    var id = "r" + (++uid), r = 72, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
    return '<svg viewBox="0 0 170 170" aria-hidden="true" class="an-ringsvg"><defs>' +
      '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".55" stop-color="' + C.you + '"/><stop offset="1" stop-color="#4338ca"/></linearGradient></defs>' +
      '<circle cx="85" cy="85" r="' + r + '" fill="none" stroke="#eef2f8" stroke-width="15"/>' +
      '<circle cx="85" cy="85" r="' + r + '" fill="none" stroke="#e3ebfb" stroke-width="15" stroke-dasharray="2 6" opacity=".9"/>' +
      (v > 0 ? '<circle class="an-ringarc" cx="85" cy="85" r="' + r + '" fill="none" stroke="url(#' + id + ')" stroke-width="15" stroke-linecap="round" stroke-dasharray="' + (c * v) + " " + c + '" style="--len:' + (c * v) + '"/>' : "") + "</svg>";
  }

  return { mount: mount, histogram: histogram, waterfall: waterfall, quadrant: quadrant, pacing: pacing,
           strip: strip, trend: trend, bars: bars, ring: ring, timeBands: timeBands, marksSpread: marksSpread, gauge: gauge, bandOf: bandOf, BANDS: BANDS,
           miniDonut: miniDonut, curve: curve, shares: shares, CAT: CAT, sectionBars: sectionBars, tipRows: tipRows, esc: esc, dur: dur, pct: pct, C: C };
})();
