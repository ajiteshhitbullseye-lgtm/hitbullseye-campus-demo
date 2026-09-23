/* =====================================================================
   store.js — storage, session, students, UI helpers
   Prototype only: everything lives in localStorage so the files can be
   opened straight from disk. In production each block maps to an API.
   ===================================================================== */

var K_CFG   = "hbe_cfg_v5";
var K_STUD  = "hbe_students_v10";
var K_SESS  = "hbe_session_v2";
var K_LASTC = "hbe_last_college_v2";
var K_GATE  = "hbe_gate_v1";      /* verified University ID pass */
var _mem = {};

/* ---------------- storage primitives ---------------- */
function hbeSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){ _mem[k]=v; } }
function hbeGet(k){ try{ var v=localStorage.getItem(k); return v===null?(_mem[k]||null):v; }catch(e){ return _mem[k]||null; } }
function hbeDel(k){ try{ localStorage.removeItem(k); }catch(e){} delete _mem[k]; }
function hbeClone(o){ return JSON.parse(JSON.stringify(o)); }
function hbeJson(k,fb){ var r=hbeGet(k); if(!r) return fb; try{ return JSON.parse(r); }catch(e){ return fb; } }

/* ---------------- config ----------------
   A saved config must never hide new keys that shipped later, so what is in
   localStorage is layered on top of the defaults instead of replacing them.
   Objects merge key by key; arrays and plain values keep the saved version.  */
function hbeMerge(def, saved){
  if(saved === undefined || saved === null) return hbeClone(def);
  if(def === null || typeof def !== "object" || Array.isArray(def)) return saved;
  if(typeof saved !== "object" || Array.isArray(saved)) return saved;
  var out = {};
  Object.keys(def).forEach(function(k){ out[k] = hbeMerge(def[k], saved[k]); });
  Object.keys(saved).forEach(function(k){ if(!(k in out)) out[k] = saved[k]; });
  return out;
}
function hbeGetConfig(){
  var saved = hbeJson(K_CFG, null);
  if(!saved) return hbeClone(HBE_DEFAULT_CONFIG);
  return hbeMerge(HBE_DEFAULT_CONFIG, saved);
}
function hbeSaveConfig(c){ hbeSet(K_CFG, JSON.stringify(c)); }
function hbeResetConfig(){ hbeDel(K_CFG); }

/* ---------------- college ---------------- */
function hbeParam(n){
  var m = new RegExp("[?&]"+n+"=([^&#]*)").exec(window.location.search);
  return m ? decodeURIComponent(m[1].replace(/\+/g," ")) : null;
}
function hbeCollegeId(cfg){
  var id = hbeParam("college") || hbeGet(K_LASTC);
  if(!id || !cfg.colleges[id]) id = Object.keys(cfg.colleges)[0];
  hbeSet(K_LASTC, id);
  return id;
}
function hbeCollege(){ var c=hbeGetConfig(); return c.colleges[hbeCollegeId(c)]; }

function hbeRgb(hex){
  hex = String(hex||"#0b4f9e").replace("#","");
  if(hex.length===3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  var n = parseInt(hex,16);
  return [(n>>16)&255, (n>>8)&255, n&255].join(",");
}
function hbeApplyTheme(c){
  var s = document.documentElement.style, t = c.theme||{};
  s.setProperty("--brand", t.primary);
  s.setProperty("--brand-dk", t.primaryDark);
  s.setProperty("--brand-rgb", hbeRgb(t.primary));
  s.setProperty("--accent", t.accent);
  s.setProperty("--accent-rgb", hbeRgb(t.accent));
  document.title = (c.shortName||"Campus") + " · Hitbullseye";
}

/* ---------------- icons ---------------- */
var ICO = {
  check:'<polyline points="20 6 9 17 4 12"/>',
  arrow:'<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  back:'<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  chart:'<line x1="3" y1="21" x2="21" y2="21"/><rect x="5" y="11" width="4" height="8"/><rect x="11" y="6" width="4" height="13"/><rect x="17" y="14" width="4" height="5"/>',
  rocket:'<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M14 4c3 0 6 3 6 6 0 4-5 8-8 10-2-3-6-6-6-8 0-3 3-8 8-8z"/><circle cx="14" cy="10" r="2"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 21a6.5 6.5 0 0 1 13 0"/><path d="M16 5.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/>',
  clock:'<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
  file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/>',
  search:'<circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.5" y2="16.5"/>',
  down:'<line x1="12" y1="4" x2="12" y2="17"/><polyline points="6 12 12 18 18 12"/>',
  up:'<line x1="12" y1="20" x2="12" y2="7"/><polyline points="6 12 12 6 18 12"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  info:'<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="8"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  settings:'<circle cx="12" cy="12" r="3.2"/><path d="M19.9 13.6a8 8 0 0 0 0-3.2l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2.8-1.6L14.4 2h-4l-.3 2.9a8 8 0 0 0-2.8 1.6l-2.4-1-2 3.4 2 1.5a8 8 0 0 0 0 3.2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2.8 1.6l.3 2.9h4l.3-2.9a8 8 0 0 0 2.8-1.6l2.4 1 2-3.4z"/>',  medal:'<circle cx="12" cy="15" r="6"/><path d="m8.5 9.5-3-6.5h5l2 4"/><path d="m15.5 9.5 3-6.5h-5l-2 4"/>',
  book:'<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z"/>',
  alert:'<path d="M12 3 2 20h20z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17"/>'
};
function ico(n, cls){
  return '<svg class="'+(cls||"")+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
         'stroke-linecap="round" stroke-linejoin="round">' + (ICO[n]||"") + "</svg>";
}

/* ---------------- navbar ---------------- */
/* some lockups are wide and thin, others square — each campus can set its own height */
function hbeLogoStyle(college, plus, cap){
  var h = (+college.logoHeight || 34) + (plus || 0);
  if(cap) h = Math.min(h, cap);           /* navbar: one height for every campus */
  return ' style="max-height:' + h + 'px"';
}

function hbeNav(college, links){
  var cfg = hbeGetConfig();
  return '<nav class="nav"><div class="nav-in">' +
    '<a class="logo-plate" href="index.html?college=' + college.id + '" title="' + hbeEsc(college.name) + '">' +
      '<img src="' + college.logo + '" alt="' + hbeEsc(college.name) + '"' + hbeLogoStyle(college, 0, 34) + '></a>' +
    '<div class="co">' + hbeEsc(college.shortName || college.name) +
      '<small>Assessment Portal</small></div>' +
    '<div class="sep"></div>' +
    '<div class="logo-plate bare"><img src="' + cfg.brand.logo + '" alt="Hitbullseye"></div>' +
    '<div class="nav-links">' + (links || "") + '</div>' +
  '</div></nav>';
}

/* campus + Hitbullseye lockup, used on the hero */
function hbeLockup(college){
  var cfg = hbeGetConfig();
  return '<div class="lockup">' +
    '<span class="plate"><img src="' + college.logo + '" alt="' + hbeEsc(college.name) + '"' + hbeLogoStyle(college,4) + '></span>' +
    '<span class="txt"><b>' + hbeEsc(college.name) + '</b>' +
      hbeEsc(college.campus || "") + ' &middot; in partnership with Hitbullseye</span>' +
  '</div>';
}

/* reveal-on-scroll */
function hbeReveal(){
  var els = document.querySelectorAll(".reveal");
  if(!window.IntersectionObserver){
    for(var i=0;i<els.length;i++) els[i].className += " in";
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.className += " in"; io.unobserve(e.target); }
    });
  }, { threshold:.12, rootMargin:"0px 0px -40px 0px" });
  for(var j=0;j<els.length;j++) io.observe(els[j]);
}

/* shared 5-step progress bar: 0 Welcome, 1 Verify, 2 Register, 3 Confirm, 4 Dashboard */
function hbeSteps(active){
  var names = ["Welcome","Verify ID","Registration","Confirmation","Dashboard"];
  var out = "";
  for(var i=0;i<names.length;i++){
    var cls = i < active ? "stp ok" : (i === active ? "stp on" : "stp");
    var mark = i < active ? "\u2713" : (i+1);
    out += '<div class="'+cls+'"><i>'+mark+'</i> '+names[i]+"</div>";
    if(i < names.length-1) out += '<div class="stp-line"></div>';
  }
  return out;
}

/* ---------------- session / auth ---------------- */
function hbeSession(){ return hbeJson(K_SESS, null); }
function hbeLogin(o){ hbeSet(K_SESS, JSON.stringify(o)); }
function hbeLogout(){ hbeDel(K_SESS); window.location.href = "login.html"; }
function hbeRequire(role){
  var s = hbeSession();
  if(!s || (role && s.role !== role)){ window.location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop()); return null; }
  return s;
}

/* ---------------- step 2 gate: University ID + email ----------------
   The roster is the list the placement cell shares with us. In production:
        POST /api/campus/{slug}/verify-id   { uid, email }
   Here it is just college.roster in config.js.                        */
function hbeRosterFind(college, uid){
  var list = college.roster || [], k = String(uid||"").trim().toLowerCase();
  for(var i=0;i<list.length;i++){
    if(String(list[i].uid).trim().toLowerCase() === k) return list[i];
  }
  return null;
}
function hbeMaskEmail(e){
  e = String(e||"");
  var at = e.indexOf("@");
  if(at < 2) return e;
  return e.slice(0,2) + new Array(Math.max(3, at-1)).join("\u2022") + e.slice(at);
}
function hbeGate(){ return hbeJson(K_GATE, null); }
function hbeSetGate(o){ hbeSet(K_GATE, JSON.stringify(o)); }
function hbeClearGate(){ hbeDel(K_GATE); }

/* ---------------- dependent / conditional field helpers ---------------- */
function hbeFieldOptions(field, values){
  if(field.dependsOn){
    var parent = values[field.dependsOn];
    var map = field.optionsMap || {};
    if(parent && map[parent]) return map[parent];
    if(map["*"]) return map["*"];
    return [];
  }
  return field.options || [];
}
function hbeFieldVisible(field, values){
  var r = field.showIf;
  if(!r || !r.field) return true;
  var v = values[r.field];
  if(!v) return false;
  return (r.values || []).indexOf(v) > -1;
}

/* ---------------- roles: superadmin | admin | student ---------------- */
function hbeIsSuper(sess){ return !!sess && sess.role === "superadmin"; }
function hbeIsAdminish(sess){ return !!sess && (sess.role === "admin" || sess.role === "superadmin"); }

/* guard for every console page. level "superadmin" locks the page to HQ. */
function hbeRequireAdmin(level){
  var sess = hbeSession();
  var page = location.pathname.split("/").pop();
  var ok = hbeIsAdminish(sess) && (level !== "superadmin" || hbeIsSuper(sess));
  if(!ok){
    location.href = "login.html?as=admin&next=" + encodeURIComponent(page);
    return null;
  }
  return sess;
}

/* a college admin is locked to their own campus; HQ can move around */
function hbeAdminCampus(sess, cfg){
  if(hbeIsSuper(sess)) {
    var want = hbeParam("college") || hbeGet(K_LASTC) || sess.collegeId;
    return cfg.colleges[want] ? want : Object.keys(cfg.colleges)[0];
  }
  return cfg.colleges[sess.collegeId] ? sess.collegeId : Object.keys(cfg.colleges)[0];
}

/* one navigation for every console page */
function hbeAdminNav(college, sess, active){
  var items = [
    { k:"analytics",  href:"admin-analytics.html",  label:"Analytics" },
    { k:"students",   href:"admin-reports.html",    label:"Students" },
    { k:"roster",     href:"admin-roster.html",     label:"Master list" },
    { k:"commercial", href:"admin-commercial.html", label:"Commercial" },
    { k:"profile",    href:"admin-profile.html",    label:"Profile" }
  ];
  if(hbeIsSuper(sess)){
    items.push({ k:"builder", href:"admin.html",      label:"Builder" });
    items.push({ k:"data",    href:"admin-data.html", label:"Data" });
  }
  var links = items.map(function(i){
    return '<a class="nav-link' + (i.k === active ? " on" : "") + '" href="' + i.href + '">' + i.label + "</a>";
  }).join("");

  links += hbeIsSuper(sess)
    ? '<span class="badge brand">' + ico("shield") + " HQ</span>"
    : '<span class="badge">' + ico("users") + " Placement cell</span>";
  links += '<a class="btn btn-ghost btn-sm" href="#" onclick="hbeLogout();return false">' + ico("logout") + " Sign out</a>";

  return hbeNav(college, links).replace('<div class="nav-links">', '<div class="nav-links dense">');
}

/* commercial roll-up for one campus */
function hbeCommercial(college){
  var com = college.commercial || { items: [] };
  var items = com.items || [];
  var licences = 0, value = 0, paid = 0, due = 0, overdue = 0, tests = 0, nextDue = null;
  items.forEach(function(i){
    licences += (+i.licences || 0);
    value    += (+i.amount || 0);
    tests    += (+i.tests || 0);
    if(i.status === "Paid") paid += (+i.amount || 0);
    else {
      due += (+i.amount || 0);
      if(i.status === "Overdue") overdue += (+i.amount || 0);
      if(!nextDue) nextDue = i.due;
    }
  });
  return { com:com, items:items, licences:licences, value:value, paid:paid,
           due:due, overdue:overdue, tests:tests, nextDue:nextDue };
}
function hbeMoney(n){
  n = Math.round(+n || 0);
  var s = String(n), out = "", last3 = s.slice(-3), rest = s.slice(0, -3);
  if(rest) out = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  else out = last3;
  return "₹" + out;
}

/* ---------------- students ---------------- */
function hbeStudents(){
  var list = hbeJson(K_STUD, null);
  if(!list){ list = hbeSeedStudents(); hbeSaveStudents(list); }
  return list;
}
function hbeSaveStudents(l){ hbeSet(K_STUD, JSON.stringify(l)); }
function hbeAddStudent(s){ var l=hbeStudents(); l.unshift(s); hbeSaveStudents(l); return s; }
function hbeStudentById(id){ return hbeStudents().filter(function(s){ return s.id===id; })[0] || null; }
function hbeStudentByEmail(e){
  e = String(e||"").toLowerCase();
  return hbeStudents().filter(function(s){ return (s.email||"").toLowerCase()===e; })[0] || null;
}
function hbeUpdateStudent(id, patch){
  var l = hbeStudents();
  for(var i=0;i<l.length;i++){ if(l[i].id===id){ for(var k in patch) l[i][k]=patch[k]; hbeSaveStudents(l); return l[i]; } }
  return null;
}

/* ---------------- result maths ---------------- */
function hbePercentile(pct){                 /* score % -> percentile (demo curve) */
  var p = Math.round(12 + pct * 0.92);
  return Math.max(3, Math.min(99.4, p));
}
function hbeBand(pct){
  if(pct >= 75) return { label:"Excellent",  cls:"ok"   };
  if(pct >= 55) return { label:"Good",       cls:"brand"};
  if(pct >= 40) return { label:"Average",    cls:"warn" };
  return          { label:"Needs Work",  cls:"err"  };
}
function hbeMakeResult(sections, timeMin){
  /* sections: [{name, total, correct, wrong, skipped}] */
  var score=0, max=0, att=0, corr=0;
  sections.forEach(function(s){
    s.score = s.correct;               /* 1 mark each, no negative in demo */
    s.max = s.total;
    s.attempted = s.correct + s.wrong;
    s.accuracy = s.attempted ? Math.round(s.correct*100/s.attempted) : 0;
    s.pct = Math.round(s.score*100/s.max);
    score += s.score; max += s.max; att += s.attempted; corr += s.correct;
  });
  var pct = Math.round(score*100/max);
  var strong = sections.slice().sort(function(a,b){ return b.pct-a.pct; });
  return {
    attemptedAt: new Date().toISOString(),
    score: score, max: max, pct: pct,
    accuracy: att ? Math.round(corr*100/att) : 0,
    attempted: att, timeMin: timeMin || 0,
    percentile: hbePercentile(pct),
    sections: sections,
    strengths: strong.slice(0,2).map(function(s){ return s.name; }),
    improve: strong.slice(-2).map(function(s){ return s.name; })
  };
}

/* "Rahul Bansal" -> { first:"Rahul", last:"Bansal" } */
function hbeSplitName(name){
  var parts = String(name || "").trim().split(/\s+/);
  if(parts.length < 2) return { first: parts[0] || "", last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/* ---------------- assessments: many per campus, each with an audience ----------------
   audience = { departments:[], programmes:[], sessions:[] }
   an empty list means "no restriction on that dimension"                     */
function hbeTests(college){
  return college.tests || (college.test ? [college.test] : []);
}
function hbePrimaryTest(college){
  return hbeTests(college)[0] || { id:"t1", name:"Assessment", durationMin:60, questions:60,
                                   sections:["Quantitative Aptitude"], window:"", attempts:"" };
}
function hbeTestById(college, id){
  var l = hbeTests(college).filter(function(t){ return t.id === id; });
  return l[0] || null;
}
function hbeAudienceOk(test, student){
  var a = test.audience || {};
  function ok(list, value){ return !list || !list.length || list.indexOf(value) > -1; }
  return ok(a.departments, student.department) &&
         ok(a.programmes,  student.programme) &&
         ok(a.sessions,    student.batch);
}
function hbeTestsFor(college, student){
  return hbeTests(college).filter(function(t){ return hbeAudienceOk(t, student); });
}
function hbeAudienceText(test){
  var a = test.audience || {}, bits = [];
  if(a.departments && a.departments.length) bits.push(a.departments.join(", "));
  if(a.programmes  && a.programmes.length)  bits.push(a.programmes.join(", "));
  if(a.sessions    && a.sessions.length)    bits.push(a.sessions.join(", "));
  return bits.length ? bits.join(" \u00b7 ") : "Open to the whole campus";
}

/* ---------------- a student holds one result per assessment ---------------- */
function hbeResults(st){ return (st && st.results) || {}; }
function hbeResultList(st){
  var r = hbeResults(st), out = [];
  for(var k in r) out.push(r[k]);
  out.sort(function(a,b){ return new Date(b.attemptedAt) - new Date(a.attemptedAt); });
  return out;
}
function hbeLatestResult(st){ return hbeResultList(st)[0] || null; }
function hbeBestResult(st){
  var l = hbeResultList(st);
  if(!l.length) return null;
  return l.slice().sort(function(a,b){ return b.pct - a.pct; })[0];
}
function hbeSaveResult(studentId, testId, result){
  var st = hbeStudentById(studentId);
  if(!st) return null;
  var map = st.results || {};
  map[testId] = result;
  return hbeUpdateStudent(studentId, { results: map, result: result });
}

/* Work out a consistent department / programme / course for a seeded student,
   starting from whatever the seed row says (it may be a programme like "MBA"
   or a course like "B.E. Computer Science"). Reads the campus field config.   */
function hbeAcadFor(college, raw){
  var dep = null, prog = null, crs = null;
  (college.fields || []).forEach(function(f){
    if(f.id === "department") dep = f;
    if(f.id === "programme")  prog = f;
    if(f.id === "course")     crs = f;
  });
  var depts = (dep && dep.options) || [];
  var progMap = (prog && prog.optionsMap) || {};
  var crsMap  = (crs && crs.optionsMap) || {};
  var crsOn   = (crs && crs.dependsOn) || "department";

  function coursesFor(department, programme){
    var key = crsOn === "programme" ? programme : department;
    return crsMap[key] || crsMap["*"] || [];
  }
  function build(department, programme){
    var list = coursesFor(department, programme);
    return { department: department, programme: programme, course: list[0] || "" };
  }

  /* 1. the seed value is a programme */
  for(var d in progMap){
    if((progMap[d] || []).indexOf(raw) > -1) return build(d, raw);
  }
  /* 2. the seed value is a course */
  for(var k in crsMap){
    if(k === "*") continue;
    if((crsMap[k] || []).indexOf(raw) > -1){
      if(crsOn === "programme"){
        for(var d2 in progMap){
          if((progMap[d2] || []).indexOf(k) > -1) return { department:d2, programme:k, course:raw };
        }
        return { department: depts[0] || "", programme: k, course: raw };
      }
      return { department: k, programme: (progMap[k] || [])[0] || "", course: raw };
    }
  }
  /* 3. nothing matched — first department, first programme, first course */
  var d0 = depts[0] || "";
  var p0 = (progMap[d0] || [])[0] || "";
  return build(d0, p0);
}

/* ---------------- seed demo data ---------------- */
function hbeSeedStudents(){
  var cfg = hbeGetConfig();
  var seed = [
    ["chitkara","Aarav Mehta","aarav.mehta@chitkara.edu.in","9812345670","2210991201","B.E. Computer Science","2026",[14,11,13,9]],
    ["chitkara","Ishita Bansal","ishita.bansal@chitkara.edu.in","9812345671","2210991202","B.E. Computer Science","2026",[13,14,12,11]],
    ["chitkara","Rohan Verma","rohan.verma@chitkara.edu.in","9812345672","2210991203","B.E. Electronics","2026",[8,9,10,6]],
    ["chitkara","Simran Kaur","simran.kaur@chitkara.edu.in","9812345673","2210991204","BBA","2027",[11,12,14,10]],
    ["chitkara","Kabir Sethi","kabir.sethi@chitkara.edu.in","9812345674","2210991205","B.E. Mechanical","2026",[6,7,8,5]],
    ["chitkara","Ananya Rao","ananya.rao@chitkara.edu.in","9812345675","2210991206","MBA","2026",[15,14,15,13]],
    ["chitkara","Devansh Gupta","devansh.gupta@chitkara.edu.in","9812345676","2210991207","BCA","2027",null],
    ["chitkara","Nikita Sharma","nikita.sharma@chitkara.edu.in","9812345677","2210991208","B.E. Computer Science","2026",[10,8,11,9]],
    ["lpu","Harsh Chauhan","harsh.chauhan@lpu.in","9876500011","12105601","B.Tech","2026",[12,10,13]],
    ["lpu","Meera Nair","meera.nair@lpu.in","9876500012","12105602","MBA","2026",[15,14,13]],
    ["lpu","Yash Dhingra","yash.dhingra@lpu.in","9876500013","12105603","BCA","2027",[7,9,8]],
    ["lpu","Tanya Sood","tanya.sood@lpu.in","9876500014","12105604","B.Tech","2026",null],
    ["upes","Kritika Joshi","kritika.joshi@stu.upes.ac.in","9720011201","500098701","School of Computer Science","2026",[14,13,12,11]],
    ["upes","Aman Rawat","aman.rawat@stu.upes.ac.in","9720011202","500098702","School of Business","2026",[11,10,13,9]],
    ["upes","Sanya Thapliyal","sanya.thapliyal@stu.upes.ac.in","9720011203","500098703","School of Advanced Engineering","2026",[9,8,10,7]],
    ["upes","Dev Chauhan","dev.chauhan@stu.upes.ac.in","9720011204","500098704","School of Law","2027",null],
    ["upes","Ira Negi","ira.negi@stu.upes.ac.in","9720011205","500098705","School of Design","2026",[12,14,13,12]],
    ["thapar","Gurleen Sidhu","gurleen.sidhu@thapar.edu","9815500301","102203401","Computer Science & Engineering","2026",[14,13,13,14]],
    ["thapar","Nikhil Bhatia","nikhil.bhatia@thapar.edu","9815500302","102203402","Electronics & Communication","2026",[12,11,12,10]],
    ["thapar","Aditi Sharma","aditi.sharma@thapar.edu","9815500303","102203403","Mechanical Engineering","2026",[8,9,9,7]],
    ["thapar","Rehan Qureshi","rehan.qureshi@thapar.edu","9815500304","102203404","Chemical Engineering","2027",null],
    ["thapar","Pari Goyal","pari.goyal@thapar.edu","9815500305","102203405","MBA","2026",[13,12,14,11]],
    ["amity","Vivaan Khanna","vivaan.khanna@s.amity.edu","9900011122","A4020261","ASET","2026",[13,11,12,10]],
    ["amity","Riya Malhotra","riya.malhotra@s.amity.edu","9900011123","A4020262","Amity Business School","2026",[14,13,14,12]],
    ["amity","Arjun Pillai","arjun.pillai@s.amity.edu","9900011124","A4020263","ASET","2027",[9,8,10,7]]
  ];

  var out = [], base = Date.now();
  seed.forEach(function(r, i){
    var col = cfg.colleges[r[0]];

    /* department + session: from the roster when the email is on it, else derived */
    var ros = (col.roster || []).filter(function(x){
      return String(x.email).toLowerCase() === String(r[2]).toLowerCase(); })[0];
    var acad = ros ? { department:ros.department, programme:ros.programme || "", course:ros.course }
                   : hbeAcadFor(col, r[5]);
    var dept = acad.department, prog = acad.programme, course = acad.course;
    var sess = ros ? ros.session
                   : (String(r[6]).length === 4 ? (Number(r[6]) - 4) + "-" + r[6] : r[6]);

    var st = {
      id: "S" + (1000 + i),
      collegeId: r[0],
      collegeName: col.name,
      regNo: hbeRegNo(col, 4021 + i),
      name: r[1], email: r[2], phone: r[3],
      rollNo: r[4], department: dept, programme: prog, course: course, batch: sess,
      verifiedEmail: true, verifiedPhone: Math.random() > .4,
      registeredAt: new Date(base - (i+1)*86400000*1.4).toISOString(),
      data: {
        firstName:{label:"First Name", value:hbeSplitName(r[1]).first},
        lastName:{label:"Last Name", value:hbeSplitName(r[1]).last},
        email:{label:"Email Address", value:r[2]},
        universityId:{label:"University ID", value:r[4]},
        phone:{label:"Mobile Number", value:r[3]},
        department:{label:"Department / School", value:dept},
        programme:{label:"Programme", value:prog},
        course:{label:"Course", value:course},
        session:{label:"Session", value:sess}
      },
      result: null
    };
    /* results: one per test the student is allowed to see */
    if(r[7]){
      st.results = {};
      var eligible = hbeTestsFor(col, st);
      eligible.slice(0, 2).forEach(function(t, k){
        if(k === 1 && i % 3 === 0) return;              /* not everyone attempts the second one */
        var per = Math.max(5, Math.round((t.questions || 60) / (t.sections.length || 1)));
        var secs = t.sections.map(function(name, idx){
          var raw = r[7][idx % r[7].length];
          if(k === 1) raw = Math.max(4, raw - 1);        /* second paper runs a bit harder */
          var got   = Math.min(per, Math.round(raw / 15 * per));
          var wrong = Math.min(per - got, Math.round((per - got) * 0.65));
          return { name:name, total:per, correct:got, wrong:wrong, skipped: per - got - wrong };
        });
        var res = hbeMakeResult(secs, (t.durationMin || 60) - (5 + (i % 9)));
        res.testId = t.id; res.testName = t.name;
        res.attemptedAt = new Date(base - (i+1)*86400000 - k*43200000).toISOString();
        st.results[t.id] = res;
      });
      st.result = hbeLatestResult(st);                   /* convenience pointer */
    }
    out.push(st);
  });
  /* every seeded student must also exist on the campus master list —
     nobody can register without being on it                         */
  var touched = false;
  out.forEach(function(st){
    var col = cfg.colleges[st.collegeId];
    if(!col) return;
    var list = col.roster || (col.roster = []);
    var seen = list.filter(function(r){
      return String(r.email).toLowerCase() === String(st.email).toLowerCase(); }).length;
    if(!seen){
      list.push({ uid:st.rollNo, email:st.email, name:st.name, department:st.department,
                  programme:st.programme, course:st.course, session:st.batch });
      touched = true;
    }
  });
  if(touched) hbeSaveConfig(cfg);

  return out;
}

/* ---------------- misc ---------------- */
function hbeEsc(s){
  return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;")
        .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function hbeRegNo(c, n){
  var p = (c.shortName||"HB").replace(/[^A-Za-z]/g,"").substring(0,3).toUpperCase();
  return "HB-" + p + "-26-" + (n || Math.floor(1000+Math.random()*8999));
}
function hbeInitials(n){
  var p = String(n||"S").trim().split(/\s+/);
  var a = (p[0]||"")[0] || "S", b = (p[1]||"")[0] || "";
  return (a + b).toUpperCase();
}
function hbeDate(iso){
  if(!iso) return "—";
  var d = new Date(iso), m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return d.getDate() + " " + m[d.getMonth()] + " " + d.getFullYear();
}
function hbeToast(msg, icon, ms){
  var box = document.getElementById("toast");
  if(!box){ box = document.createElement("div"); box.id="toast"; document.body.appendChild(box); }
  var t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = ico(icon||"info") + "<div>" + msg + "</div>";
  box.appendChild(t);
  setTimeout(function(){ t.remove(); }, ms||5000);
}
