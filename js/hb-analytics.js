/* =====================================================================
   HITBULLSEYE — ANALYTICS LAYER (prototype)
   ---------------------------------------------------------------------
   Plays the part of the test platform + its analytics pipeline, in the
   browser:
     1. QUESTION BANK  every question tagged section > area > sub-area > LOD
     2. PAPERS         each campus assessment and the practice-mock series
     3. RAW ROWS       one row per student per question, in the exact
                       `student_question_analytics` (Elasticsearch) shape
     4. AGGREGATION    rebuilds the 8 other *_v2 indexes from the raw rows
     5. REPORTS        HBA (js/hb-engine.js) turns them into insights

   Sources of rows
     · the real student taking a test in test.html     (localStorage)
     · the 25 seeded demo students                     (simulated, fixed)
     · a simulated cohort of peers per paper           (simulated, fixed)
   Simulated rows are deterministic: same numbers on every load.

   For the developer: in production steps 1–4 are the existing test engine
   and Elasticsearch; only step 5 ships. See hitbullseye-reports/docs.
   ===================================================================== */
var HBX = (function(){
  "use strict";
  var sim = HBA.sim;
  var K_ATT = "hbe_attempts_v1";           /* live rows written by test.html */
  var SIM_VERSION = 5;                      /* bump when the simulation changes */
  var DAY = 86400000;

  /* ------------------------------------------------------------------
     1. QUESTION BANK
     [area, sub-area, LOD, question, options, correct index]
     ------------------------------------------------------------------ */
  var BANK = {
    "Quantitative Aptitude": { id:"QA", items:[
      ["Arithmetic","Profit & Loss","Medium","A shopkeeper marks an item 40% above cost and then allows a 25% discount. What is his profit percentage?",["5%","10%","15%","12.5%"],0],
      ["Arithmetic","Time, Speed & Distance","Easy","A train 180 m long crosses a pole in 9 seconds. What is its speed?",["54 km/h","64 km/h","72 km/h","80 km/h"],2],
      ["Arithmetic","Ratio & Proportion","Easy","If the ratio of two numbers is 3:5 and their sum is 96, the larger number is:",["36","54","60","64"],2],
      ["Arithmetic","Time & Work","Medium","Two pipes fill a tank in 12 and 18 minutes. Working together, they fill it in:",["6.8 min","7.2 min","8.4 min","9 min"],1],
      ["Arithmetic","Percentages","Easy","What is 15% of 240?",["32","36","38","40"],1],
      ["Arithmetic","Interest","Medium","₹10,000 is invested at 10% a year, compounded annually. What interest does it earn in 2 years?",["₹2,000","₹2,100","₹2,200","₹2,010"],1],
      ["Number System","HCF & LCM","Easy","What is the LCM of 12, 18 and 30?",["90","120","180","360"],2],
      ["Modern Maths","Probability","Difficult","Two dice are thrown. What is the probability that the sum is 8?",["1/6","5/36","1/9","7/36"],1],
      ["Algebra","Linear Equations","Medium","If 3x − 7 = 2x + 5, then x equals:",["10","12","−2","2.4"],1],
      ["Arithmetic","Averages","Difficult","The average age of 30 students is 15. When the teacher's age is included, the average rises by 1. What is the teacher's age?",["31","45","46","47"],2]
    ]},
    "Logical Reasoning": { id:"LR", items:[
      ["Series","Number Series","Easy","Find the next term in the series: 3, 6, 11, 18, 27, ?",["36","38","40","42"],1],
      ["Coding-Decoding","Letter Coding","Easy","If CAT is coded as 3-1-20, how is DOG coded?",["4-15-7","4-14-7","3-15-7","5-15-8"],0],
      ["Blood Relations","Family Tree","Medium","Pointing to a girl, Rahul says, “She is the daughter of my mother's only son.” How is the girl related to Rahul?",["Sister","Daughter","Niece","Cousin"],1],
      ["Syllogisms","Two-Statement","Medium","All pens are books. Some books are red. Which conclusion definitely follows?",["All pens are red","Some pens are red","No pen is red","None of these"],3],
      ["Direction Sense","Distance","Medium","Riya walks 6 km north, turns right and walks 8 km. How far is she from where she started?",["10 km","12 km","14 km","2 km"],0],
      ["Arrangements","Linear Seating","Medium","Five friends A, B, C, D and E sit in a row facing north. E is at the extreme left and C at the extreme right. D is immediately to the left of C, and A is immediately to the left of B. Who sits in the middle?",["A","B","D","E"],1],
      ["Series","Letter Series","Medium","What comes next: B, E, H, K, ?",["M","N","O","L"],1],
      ["Analogies","Word Analogy","Easy","Book is to Author as Painting is to:",["Canvas","Painter","Brush","Gallery"],1],
      ["Coding-Decoding","Letter Coding","Difficult","In a code, MONKEY is written as XDJMNL. How is TIGER written in that code?",["QDFHS","SHFDQ","UJHFS","QDFGS"],0],
      ["Syllogisms","Two-Statement","Difficult","No cat is a dog. All dogs are animals. Conclusions: I. Some animals are not cats. II. No animal is a cat.",["Only I follows","Only II follows","Both follow","Neither follows"],0]
    ]},
    "Verbal Ability": { id:"VA", items:[
      ["Vocabulary","Antonyms","Easy","Choose the word most nearly OPPOSITE in meaning to ‘CANDID’.",["Frank","Evasive","Blunt","Honest"],1],
      ["Vocabulary","Spellings","Easy","Select the correctly spelt word.",["Occurence","Occurrance","Occurrence","Ocurrence"],2],
      ["Grammar","Fill in the Blanks","Easy","Fill in the blank: She is not only intelligent ____ hardworking.",["and","but also","as well","either"],1],
      ["Grammar","Error Spotting","Medium","Identify the error: ‘Each of the students have submitted their assignment.’",["Each of","have submitted","their assignment","No error"],1],
      ["Vocabulary","Synonyms","Medium","Choose the word closest in meaning to ‘METICULOUS’.",["Careless","Thorough","Hasty","Generous"],1],
      ["Grammar","Sentence Correction","Medium","Choose the grammatically correct sentence.",["He don't like coffee.","He doesn't likes coffee.","He doesn't like coffee.","He not like coffee."],2],
      ["Reading Comprehension","Inference","Difficult","“Remote work cut commuting time for many employees, yet surveys show a large share of them now work longer hours than before.” Which inference is best supported?",["Remote work reduces total working hours","Time saved on commuting is often spent working","Employees dislike remote work","Commuting time has increased"],1],
      ["Verbal Reasoning","Para Jumbles","Difficult","Arrange into a sentence — P: she started a small bakery  Q: After losing her job,  R: which now employs twenty people.  S: with her savings",["QSPR","SQPR","QPSR","PQSR"],0],
      ["Vocabulary","Idioms","Medium","‘To burn the midnight oil’ means:",["To waste resources","To work late into the night","To start a fire","To be very angry"],1],
      ["Reading Comprehension","Main Idea","Medium","“Bees pollinate a third of the crops we eat. Their numbers are falling because of pesticides and habitat loss.” What is the main point?",["Bees are dangerous insects","Pesticides are cheap","Falling bee numbers put food production at risk","Habitat loss only affects bees"],2]
    ]},
    "Data Interpretation": { id:"DI", items:[
      ["Tables","Growth Rates","Medium","A company's sales were 120, 150, 180 and 210 units over four quarters. What was the percentage growth from Q1 to Q4?",["60%","75%","80%","90%"],1],
      ["Pie Charts","Share of Total","Medium","In a pie chart of a ₹7,200 budget, marketing takes 60°. What is the marketing spend?",["₹1,200","₹1,440","₹1,800","₹2,400"],0],
      ["Tables","Averages","Medium","The average of 5 observations is 48. If one observation of 60 is removed, the new average is:",["44","45","46","47"],1],
      ["Bar Charts","Share of Total","Easy","A bar chart shows quarterly profits of 20, 25, 15 and 40 lakh. Which quarter made 40% of the annual profit?",["Q1","Q2","Q3","Q4"],3],
      ["Line Graphs","Growth Rates","Medium","Revenue was ₹50 cr in 2021, ₹60 cr in 2022 and ₹75 cr in 2023. By what percentage did revenue grow in 2023?",["15%","20%","25%","50%"],2],
      ["Tables","Percentages","Medium","Department A has 120 students (40% girls) and Department B has 80 (55% girls). How many girls are there in all?",["88","92","96","100"],1],
      ["Caselets","Sets","Difficult","Of 200 employees, 120 speak Hindi, 90 speak English and 30 speak neither. How many speak both?",["30","40","50","60"],1],
      ["Pie Charts","Comparison","Difficult","Rent takes 25% and food 35% of a ₹40,000 monthly budget. How much more is spent on food than on rent?",["₹2,000","₹4,000","₹6,000","₹10,000"],1],
      ["Bar Charts","Ratios","Difficult","Production was 400, 500 and 450 tonnes in three years. What is the ratio of the third year's output to the three-year average?",["1 : 1","9 : 10","10 : 9","5 : 4"],0],
      ["Bar Charts","Comparison","Easy","Sales were 30 units in January and 45 in February. How many more units were sold in February?",["10","15","20","25"],1]
    ]},
    "Technical Aptitude": { id:"TA", items:[
      ["DBMS","Keys","Easy","In a relational database, which key uniquely identifies each row in a table?",["Foreign key","Primary key","Candidate key","Composite key"],1],
      ["Data Structures & Algorithms","Complexity","Medium","What is the time complexity of binary search on a sorted array of n elements?",["O(n)","O(n log n)","O(log n)","O(1)"],2],
      ["Computer Networks","OSI Model","Medium","Which layer of the OSI model routes packets between networks?",["Data link","Network","Transport","Session"],1],
      ["OOP","Concepts","Easy","In object-oriented programming, hiding internal state behind methods is called:",["Inheritance","Polymorphism","Encapsulation","Abstraction"],2],
      ["Operating Systems","Deadlocks","Difficult","Which of these is NOT one of the four conditions needed for a deadlock?",["Mutual exclusion","Hold and wait","Preemption","Circular wait"],2],
      ["Data Structures & Algorithms","Data Structures","Easy","Which data structure works on Last In, First Out?",["Queue","Stack","Linked list","Tree"],1],
      ["DBMS","SQL","Medium","Which SQL clause filters groups after aggregation?",["WHERE","GROUP BY","HAVING","ORDER BY"],2],
      ["Programming","Output","Difficult","In Python, what does print(len([1, [2, 3], 4])) output?",["3","4","2","Error"],0],
      ["Computer Networks","Protocols","Easy","Which protocol is used to send email?",["FTP","SMTP","HTTP","DNS"],1],
      ["Data Structures & Algorithms","Sorting","Medium","What is the worst-case time complexity of quicksort?",["O(n log n)","O(n)","O(n²)","O(log n)"],2]
    ]},
    "Domain Knowledge": { id:"DK", items:[
      ["Electrical","Ohm's Law","Easy","A 12 V supply drives current through a 4 Ω resistor. What is the current?",["2 A","3 A","4 A","48 A"],1],
      ["Mechanics","Units","Easy","What is the SI unit of force?",["Joule","Pascal","Newton","Watt"],2],
      ["Digital Electronics","Logic Gates","Medium","Which gate outputs 1 only when both inputs are 1?",["OR","AND","XOR","NAND"],1],
      ["Thermodynamics","Laws","Medium","The first law of thermodynamics is a statement of the conservation of:",["Mass","Momentum","Energy","Charge"],2],
      ["Materials","Properties","Medium","Which property describes a material's resistance to scratching or indentation?",["Ductility","Hardness","Malleability","Elasticity"],1],
      ["Electrical","Power","Medium","An appliance on a 230 V supply draws 2 A. How much power does it use?",["115 W","230 W","460 W","920 W"],2],
      ["Digital Electronics","Number Systems","Medium","The binary number 1011 equals which decimal number?",["9","10","11","13"],2],
      ["Mechanics","Kinematics","Difficult","A body starts from rest with an acceleration of 2 m/s². How far does it travel in 5 seconds?",["10 m","20 m","25 m","50 m"],2],
      ["Electronics","Semiconductors","Medium","In an n-type semiconductor, the majority charge carriers are:",["Holes","Electrons","Protons","Ions"],1],
      ["Mechanics","Energy","Difficult","A 2 kg ball moves at 3 m/s. What is its kinetic energy?",["3 J","6 J","9 J","18 J"],2]
    ]}
  };

  function slug(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function sectionOf(name){
    if(BANK[name]) return name;
    var n = String(name).toLowerCase();
    if(/quant|numer|math/.test(n)) return "Quantitative Aptitude";
    if(/logic|reason/.test(n))     return "Logical Reasoning";
    if(/verbal|english|language/.test(n)) return "Verbal Ability";
    if(/data|interpret/.test(n))   return "Data Interpretation";
    if(/tech|code|software|program/.test(n)) return "Technical Aptitude";
    return "Domain Knowledge";
  }

  /* every bank item as a tagged question (shared ids across papers, like a real item bank) */
  var ITEMS = {};
  Object.keys(BANK).forEach(function(sec){
    var s = BANK[sec];
    s.items.forEach(function(it, i){
      var id = s.id + "-" + String(i + 1).padStart(3, "0");
      var r = sim.rng("item-" + id);
      ITEMS[id] = {
        questionId: id, sectionId: s.id, sectionName: sec,
        areaId: s.id + "-" + slug(it[0]), areaTitle: it[0],
        subAreaId: s.id + "-" + slug(it[0]) + "-" + slug(it[1]), subAreaName: it[1],
        lod: it[2], typeOfQues: "MCQ", marks: 1, negative: 0,
        b: sim.LOD_B[it[2]] + sim.normal(r, 0, 0.3),
        baseTime: Math.round(sim.LOD_TIME[it[2]] * (0.8 + r() * 0.5)),
        options: it[4].length,
        text: it[3], choices: it[4], answer: it[5]
      };
    });
  });

  /* ------------------------------------------------------------------
     2. PAPERS
     ------------------------------------------------------------------ */
  var PER_SECTION = 5;

  function pickItems(sectionName, seed, n){
    var s = BANK[sectionOf(sectionName)];
    var ids = s.items.map(function(_, i){ return s.id + "-" + String(i + 1).padStart(3, "0"); });
    var r = sim.rng(seed + "|" + s.id);
    for(var i = ids.length - 1; i > 0; i--){ var j = Math.floor(r() * (i + 1)); var t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
    /* keep the paper in a sensible order: easy → difficult within a section */
    var order = { Easy:0, Medium:1, Difficult:2 };
    return ids.slice(0, n).sort(function(a, b){ return order[ITEMS[a].lod] - order[ITEMS[b].lod]; });
  }

  function blueprint(testId, testName, sections, opts){
    opts = opts || {};
    var qs = [], qno = 0;
    sections.forEach(function(sec){
      pickItems(sec, testId, opts.perSection || PER_SECTION).forEach(function(id){
        var it = ITEMS[id]; qno++;
        /* section label follows the paper (e.g. "Domain Knowledge" may map to a bank twin) */
        qs.push(Object.assign({}, it, { qno: qno, uniqueQno: testId + "#" + qno,
          sectionName: sec, sectionId: it.sectionId }));
      });
    });
    return { testId: testId, testName: testName, moduleId: opts.moduleId || null,
             moduleName: opts.moduleName || null, questions: qs };
  }

  function paperFor(college, test){
    return blueprint(test.id, test.name, test.sections || ["Quantitative Aptitude"]);
  }

  /* practice-mock series: the long-journey track every student can follow */
  var PRACTICE = [1,2,3,4,5,6].map(function(n){
    return blueprint("pm-0" + n, "Placement Practice Mock " + n,
      ["Quantitative Aptitude","Logical Reasoning","Verbal Ability","Data Interpretation"],
      { moduleId:"PRACTICE", moduleName:"Placement Practice Series", perSection:8 });
  });

  /* ------------------------------------------------------------------
     3. RAW ROWS
     ------------------------------------------------------------------ */
  function liveRows(){
    try { return JSON.parse(localStorage.getItem(K_ATT) || "[]"); } catch(e){ return []; }
  }
  function saveLiveRows(rows){
    try { localStorage.setItem(K_ATT, JSON.stringify(rows)); } catch(e){}
    _world = null;
  }

  function dayStart(){ var d = new Date(); d.setHours(10, 0, 0, 0); return d.getTime(); }

  /* a seeded student's profile from their seed scores (marks out of 15 per section) */
  function seededProfile(st, idx){
    var r = sim.rng("seed-" + st.id);
    var raw = st._seedRaw || [10, 10, 10, 10];
    var avg = raw.reduce(function(a, b){ return a + b; }, 0) / raw.length;
    var p = sim.randomProfile(r, 0);
    p.ability = (avg / 15 - 0.55) * 3.2;
    ["Quantitative Aptitude","Logical Reasoning","Verbal Ability","Data Interpretation"].forEach(function(sec, k){
      p.bias[BANK[sec].id] = ((raw[k % raw.length] - avg) / 15) * 2.5;
    });
    p.speed = Math.min(1.25, Math.max(0.8, p.speed));    /* personas below set the extremes on purpose */
    /* a few recognisable habits across the demo group */
    var kind = idx % 5;
    if(kind === 0){ p.growth = 0.16; }                                    /* steady climber */
    if(kind === 1){ p.speed = 0.62; p.threshold = 0.14; p.careless = 0.15; } /* rushes */
    if(kind === 2){ p.speed = 1.5; p.threshold = 0.66; p.careless = 0.02; }  /* over-careful */
    if(kind === 3){ p.fatigue = 0.3; p.growth = 0.05; }                   /* fades late */
    if(kind === 4){ p.growth = 0.08; p.focusGrowth[BANK["Quantitative Aptitude"].id] = 0.12; }
    return p;
  }

  var _world = null;

  /* every row in the system: simulated cohort + seeded students + live attempts */
  function world(){
    if(_world) return _world;
    var t0 = performance.now();
    var cfg = hbeGetConfig();
    var rows = [], papers = {}, start = dayStart();
    var seeded = seededStudents();

    /* campus assessments */
    Object.keys(cfg.colleges).forEach(function(cid){
      var col = cfg.colleges[cid];
      hbeTests(col).forEach(function(t, ti){
        var bp = paperFor(col, t);
        papers[t.id] = bp;
        var r = sim.rng("cohort-" + t.id);
        for(var i = 0; i < 120; i++){
          sim.sit(bp, sim.randomProfile(r, -0.1), r, { studentId: "PEER-" + cid + "-" + i, nth: 0,
            start: start - (3 + (i % 9)) * DAY }).forEach(function(x){ rows.push(x); });
        }
      });
    });

    /* practice mocks: national cohort */
    PRACTICE.forEach(function(bp, k){
      papers[bp.testId] = bp;
      var r = sim.rng("cohort-" + bp.testId);
      for(var i = 0; i < 170 - k * 10; i++){
        sim.sit(bp, sim.randomProfile(r, -0.15), r, { studentId: "NAT-" + i, nth: k,
          start: start - (50 - k * 7) * DAY }).forEach(function(x){ rows.push(x); });
      }
    });

    /* seeded demo students: practice journey, then their campus papers */
    seeded.forEach(function(sd, idx){
      var st = sd.st, col = cfg.colleges[st.collegeId];
      var p = seededProfile(sd, idx);
      var r = sim.rng("journey-" + st.id);
      var mocks = 3 + (idx % 4);                       /* 3–6 practice mocks */
      for(var k = 0; k < mocks; k++){
        sim.sit(PRACTICE[k], p, r, { studentId: st.id, nth: k,
          start: start - (45 - k * 7 - (idx % 3)) * DAY }).forEach(function(x){ rows.push(x); });
      }
      sd.tests.forEach(function(t, k){
        sim.sit(papers[t.id], p, r, { studentId: st.id, nth: mocks + k,
          start: start - (idx + 1) * DAY - k * DAY / 2 }).forEach(function(x){ rows.push(x); });
      });
    });

    /* live rows (real attempts in this browser) replace any simulated row for the same student/test */
    var live = liveRows();
    var liveKeys = {};
    live.forEach(function(x){ liveKeys[x.studentId + "|" + x.testId] = 1; });
    rows = rows.filter(function(x){ return !liveKeys[x.studentId + "|" + x.testId]; }).concat(live);

    var lastRun = new Date().toISOString();
    var idx = sim.aggregate(rows, lastRun);
    _world = { rows: rows, idx: idx, papers: papers, ms: Math.round(performance.now() - t0), builtAt: lastRun };
    return _world;
  }

  /* which seeded students exist and which campus papers they sat (same rule as the original seed) */
  function seededStudents(){
    var cfg = hbeGetConfig();
    var list = hbeJson(K_STUD, null) || [];
    return list.filter(function(st){ return st._seedRaw; }).map(function(st, i){
      var col = cfg.colleges[st.collegeId];
      var eligible = col ? hbeTestsFor(col, st) : [];
      var tests = eligible.slice(0, 2).filter(function(t, k){ return !(k === 1 && st._seedIdx % 3 === 0); });
      return { st: st, id: st.id, _seedRaw: st._seedRaw, tests: tests };
    });
  }

  /* ------------------------------------------------------------------
     4/5. REPORTS
     ------------------------------------------------------------------ */
  function dataFor(studentId){
    var w = world();
    return sim.studentData(studentId, w.rows, w.idx, true);
  }
  function reportFor(studentId){ return HBA.buildStudentReport(dataFor(studentId)); }
  function testReportFor(studentId, testId){ return HBA.buildTestReport(dataFor(studentId), testId); }

  /* the campus "result" object (used by dashboard / admin pages) built from raw rows */
  function resultFromRows(rows, testId){
    var mine = rows.filter(function(x){ return x.testId === testId; });
    if(!mine.length) return null;
    var bySec = {}, order = [];
    mine.forEach(function(x){
      var s = bySec[x.sectionName];
      if(!s){ s = bySec[x.sectionName] = { name:x.sectionName, total:0, correct:0, wrong:0, skipped:0 }; order.push(x.sectionName); }
      s.total++;
      if(!x.isAttempted) s.skipped++; else if(x.isCorrect) s.correct++; else s.wrong++;
    });
    var secs = order.map(function(n){ return bySec[n]; });
    var secsTime = mine.reduce(function(a, x){ return a + x.timeTaken; }, 0);
    var res = hbeMakeResult(secs, Math.max(1, Math.round(secsTime / 60)));
    var w = world();
    var scores = (w.idx.student_test_analytics_v2.get(testId) || []).map(function(d){ return d.totalScore; });
    if(scores.length >= 10){
      var below = 0, tied = 0;
      scores.forEach(function(s){ if(s < res.score) below++; else if(s === res.score) tied++; });
      res.percentile = Math.round((below + tied / 2) / scores.length * 1000) / 10;
    }
    res.testId = testId;
    res.testName = mine[0].testName;
    res.attemptedAt = mine.reduce(function(a, x){ var t = x.attemptedAt || x.updatedAt; return t > a ? t : a; }, "");
    res.fromRows = true;
    return res;
  }

  /* Seeded students: results come from their simulated rows, so every page agrees. */
  function syncSeeded(list){
    var changed = false;
    list.forEach(function(st){
      if(!st._seedRaw || st._simV === SIM_VERSION) return;
      changed = true;
    });
    if(!changed) return list;
    _world = null;
    hbeSaveStudents(list);             /* world() reads the list from storage */
    var w = world();
    list.forEach(function(st){
      if(!st._seedRaw) return;
      var rows = w.rows.filter(function(x){ return x.studentId === st.id; });
      var tests = {};
      rows.forEach(function(x){ if(x.moduleId !== "PRACTICE") tests[x.testId] = 1; });
      st.results = {};
      Object.keys(tests).forEach(function(tid){ st.results[tid] = resultFromRows(rows, tid); });
      st.result = hbeLatestResult(st);
      st._simV = SIM_VERSION;
    });
    hbeSaveStudents(list);
    return list;
  }

  /* ------------------------------------------------------------------
     LIVE ATTEMPTS (test.html)
     ------------------------------------------------------------------ */
  function recordAttempt(rows){
    var live = liveRows();
    var key = rows[0].studentId + "|" + rows[0].testId;
    live = live.filter(function(x){ return x.studentId + "|" + x.testId !== key; }).concat(rows);
    saveLiveRows(live);
  }

  /* "Simulate my journey": practice mocks for a real student, from their measured accuracy */
  function simulateJourney(studentId){
    var mine = liveRows().filter(function(x){ return x.studentId === studentId && x.moduleId !== "PRACTICE"; });
    var att = mine.filter(function(x){ return x.isAttempted; });
    var acc = att.length ? att.filter(function(x){ return x.isCorrect; }).length / att.length : 0.55;
    var p = sim.randomProfile(sim.rng("me-" + studentId), 0);
    p.ability = (acc - 0.6) * 3.5 - 0.6;            /* start a little below today… */
    p.growth = 0.14;                                 /* …and climb towards it */
    var r = sim.rng("me-j-" + studentId), start = dayStart(), rows = [];
    for(var k = 0; k < 5; k++){
      sim.sit(PRACTICE[k], p, r, { studentId: studentId, nth: k, start: start - (36 - k * 7) * DAY })
        .forEach(function(x){ x.simulated = true; rows.push(x); });
    }
    var live = liveRows().filter(function(x){ return !(x.studentId === studentId && x.moduleId === "PRACTICE"); });
    saveLiveRows(live.concat(rows));
  }
  function clearJourney(studentId){
    saveLiveRows(liveRows().filter(function(x){ return !(x.studentId === studentId && x.simulated); }));
  }
  function hasSimulatedJourney(studentId){
    return liveRows().some(function(x){ return x.studentId === studentId && x.simulated; });
  }

  function rebuild(){ _world = null; return world(); }
  function clearLive(){ saveLiveRows([]); }

  return {
    rebuild: rebuild, clearLive: clearLive,
    BANK: BANK, ITEMS: ITEMS, PRACTICE: PRACTICE, sectionOf: sectionOf,
    paperFor: paperFor, world: world, dataFor: dataFor,
    reportFor: reportFor, testReportFor: testReportFor,
    resultFromRows: resultFromRows, syncSeeded: syncSeeded,
    recordAttempt: recordAttempt, liveRows: liveRows,
    simulateJourney: simulateJourney, clearJourney: clearJourney, hasSimulatedJourney: hasSimulatedJourney,
    SIM_VERSION: SIM_VERSION
  };
})();
