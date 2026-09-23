/* =====================================================================
   HITBULLSEYE — Campus Onboarding & Assessment (prototype)
   config.js — the whole site is driven by this object.
   Production: GET /api/campus/{slug}/onboarding-config
   Everything here is editable from  Admin → Form Builder.

   FIELD SCHEMA
     type       text | email | tel | number | date | select | radio | checkbox | textarea
     required   true / false
     half       true = half width
     prefill    email | uid   (only the values verified in step 2; the student
                types everything else)
     lock       true = read-only (comes from the verified campus record)
     dependsOn  parent field id  -> DEPENDENT field
     optionsMap { "<parent value>": [...], "*": [...fallback] }
     showIf     { field:"<id>", values:[...] }  -> shown only for those values

   DEPENDENCY CHAIN USED HERE
     Department -> Programme -> Session
     Department -> Course            (or Programme -> Course, see Chitkara)
   ===================================================================== */

var HBE_DEFAULT_CONFIG = {

  brand: {
    product: "Hitbullseye",
    logo: "assets/hitbullseye-real.png",
    supportEmail: "campus.support@demo.com",
    /* three logins: Hitbullseye super admin, the college placement cell, the student */
    superAdmin: { email: "super@demo.com", password: "super@123", name: "Hitbullseye HQ" },
    admin:      { email: "admin@demo.com", password: "admin@123", name: "Placement Cell" },

    steps: [
      { icon:"lock",   title:"Enter the campus access code",
        text:"Your placement cell shares one code with your batch." },
      { icon:"mail",   title:"Verify your University ID",
        text:"We match your ID with our records and email a one-time code." },
      { icon:"file",   title:"Fill the short form",
        text:"Your details, department, programme and course — takes two minutes." },
      { icon:"target", title:"Attempt the test",
        text:"Your report is ready the moment you submit." }
    ],

    faq: [
      { q: "Where do I get the access code?",        a: "From your placement cell — one code is shared with the whole batch." },
      { q: "Why do you ask for my University ID?",   a: "Only IDs your placement cell has shared with us can register." },
      { q: "My ID is not recognised.",               a: "Write to your placement cell — they update the list at their end." },
      { q: "Can I change my email?",                 a: "No. The code goes to the email on record for your ID." },
      { q: "Who sees my report?",                    a: "You and your placement cell. Nobody else." }
    ]
  },

  colleges: {

    /* ================================================================
       CHITKARA   (deep chain: Department -> Programme -> Course)
       ================================================================ */
    chitkara: {
      id: "chitkara",
      name: "Chitkara University",
      shortName: "Chitkara",
      campus: "Rajpura, Punjab",
      logo: "assets/chitkara.svg",
      logoHeight: 34,
      photo: "assets/campus-chitkara.jpg",
      theme: { primary: "#d1222a", primaryDark: "#88121a", accent: "#f7b32b" },

      welcome: {
        eyebrow: "Placement Readiness · Batch 2026",
        title: "Welcome to Hitbullseye",
        highlight: "Hitbullseye",
        subtitle: "Your campus placement assessment, start to finish.",
        points: [
          "TCS NQT, Infosys & Wipro patterns",
          "Section-wise accuracy and speed",
          "Campus rank + All India percentile",
          "A plan for what to practise next"
        ],
        stats: [
          { value: "12,400+", label: "Students assessed" },
          { value: "94%",     label: "Clearance rate" },
          { value: "4.8/5",   label: "Student rating" }
        ],
        cta: "Start Verification",
        note: "Access code + University ID are checked before the form opens."
      },

      campusPoints: [
        "One access code for the whole batch",
        "ID checked against the placement cell list",
        "Reports shared with faculty mentors",
        "Practice stays open between cycles"
      ],

      /* ---------- step 2: access code + ID gate ---------- */
      security: {
        enabled: true,
        code: "CHI123Y",
        label: "Campus access code",
        help: "Shared by your placement cell"
      },
      gate: {
        idLabel: "University Roll Number",
        idPlaceholder: "e.g. 2210991209",
        idHelp: "10-digit roll number printed on your ID card"
      },

      /* master list: uid, email, name, department, programme, course, session */
      roster: [
        { uid:"2210991209", email:"rahul.bansal@chitkara.edu.in", name:"Rahul Bansal",
          department:"Institute of Engineering & Technology", programme:"B.E.",
          course:"Computer Science & Engineering", session:"2022-2026" },
        { uid:"2210991210", email:"priya.chawla@chitkara.edu.in", name:"Priya Chawla",
          department:"Chitkara Business School", programme:"MBA",
          course:"Marketing", session:"2024-2026" },
        { uid:"2210991211", email:"manav.dhillon@chitkara.edu.in", name:"Manav Dhillon",
          department:"Institute of Engineering & Technology", programme:"B.E.",
          course:"Mechanical Engineering", session:"2022-2026" },
        { uid:"2210991201", email:"aarav.mehta@chitkara.edu.in", name:"Aarav Mehta",
          department:"Institute of Engineering & Technology", programme:"B.E.",
          course:"Computer Science & Engineering", session:"2022-2026" },
        { uid:"2210991202", email:"ishita.bansal@chitkara.edu.in", name:"Ishita Bansal",
          department:"Institute of Engineering & Technology", programme:"B.E.",
          course:"Computer Science & Engineering", session:"2022-2026" },
        { uid:"2210991206", email:"ananya.rao@chitkara.edu.in", name:"Ananya Rao",
          department:"Chitkara Business School", programme:"MBA",
          course:"Finance", session:"2024-2026" }
      ],

      /* ---------- assessments (audience = who can see it) ----------
         empty list in audience  ->  visible to everybody on the campus      */

      /* ---------- what the placement cell fills in (Campus profile tab) ---------- */
      profile: {
        website: "https://www.chitkara.edu.in", established: "2002",
        spocs: [
          { name:"Dr. Neha Arora", role:"Head, Placement Cell",
            email:"placements@chitkara.edu.in", phone:"+91 98150 00001", primary:true },
          { name:"Rohit Sharma", role:"Coordinator, Engineering",
            email:"rohit.sharma@chitkara.edu.in", phone:"+91 98150 00011", primary:false }
        ],
        departments: [
          { name:"Institute of Engineering & Technology", total:5200, finalYear:1300 },
          { name:"Chitkara Business School",              total:2400, finalYear:700 },
          { name:"School of Computer Applications",       total:1500, finalYear:400 },
          { name:"Chitkara College of Pharmacy",          total:1600, finalYear:120 },
          { name:"School of Mass Communication",          total:1300, finalYear:80 }
        ],
        nomenclature: { uid:"University Roll Number", department:"Department / School",
                        programme:"Programme", course:"Course / Branch", session:"Session" },
        updatedAt: "2026-08-12"
      },

      /* ---------- commercial: what they bought, what is due ---------- */
      commercial: {
        clientName: "Chitkara University",
        contract: { id:"HB-CU-2026-01", start:"01 Apr 2026", end:"31 Mar 2027", po:"PO-CU-8841" },
        rate: 120,
        items: [
          { id:"INV-2026-014", item:"Aptitude Cycle 1", tests:1, licences:1200, amount:144000,
            status:"Paid",    invoiced:"05 Aug 2026", due:"20 Aug 2026", paid:"12 Aug 2026" },
          { id:"INV-2026-041", item:"Technical Screening", tests:1, licences:600, amount:66000,
            status:"Due",     invoiced:"02 Sep 2026", due:"30 Sep 2026", paid:"" },
          { id:"INV-2026-052", item:"Business Case & Analytics", tests:1, licences:300, amount:36000,
            status:"Overdue", invoiced:"10 Aug 2026", due:"05 Sep 2026", paid:"" }
        ]
      },
      tests: [
        { id:"cu-apt-1", name:"Campus Placement Aptitude Test \u2014 Cycle 1", tag:"Aptitude",
          durationMin:60, questions:60,
          sections:["Quantitative Aptitude","Logical Reasoning","Verbal Ability","Data Interpretation"],
          window:"22 Sep \u2013 30 Sep 2026", attempts:"1 attempt per student",
          audience:{ departments:[], programmes:[], sessions:[] } },

        { id:"cu-tech-cse", name:"Technical Screening \u2014 Engineering & Computing", tag:"Technical",
          durationMin:45, questions:40,
          sections:["Technical Aptitude","Logical Reasoning"],
          window:"01 Oct \u2013 08 Oct 2026", attempts:"1 attempt per student",
          audience:{ departments:["Institute of Engineering & Technology","School of Computer Applications"],
                     programmes:[], sessions:[] } },

        { id:"cu-mba-case", name:"Business Case & Analytics Test", tag:"Management",
          durationMin:60, questions:50,
          sections:["Data Interpretation","Quantitative Aptitude","Verbal Ability"],
          window:"05 Oct \u2013 12 Oct 2026", attempts:"2 attempts allowed",
          audience:{ departments:["Chitkara Business School"], programmes:[], sessions:[] } }
      ],

      verification: { otpLength: 6, resendSeconds: 30 },

      fields: [
        { id:"firstName", label:"First Name", type:"text", required:true, half:true,
          placeholder:"As per campus record", section:"Your Details" },
        { id:"lastName", label:"Last Name", type:"text", required:true, half:true,
          placeholder:"Surname", section:"Your Details" },
        { id:"email", label:"Email Address", type:"email", required:true, half:true,
          prefill:"email", lock:true, section:"Your Details" },
        { id:"universityId", label:"University Roll Number", type:"text", required:true, half:true,
          prefill:"uid", lock:true, section:"Your Details" },
        { id:"phone", label:"Mobile Number", type:"tel", required:true, half:true,
          placeholder:"10-digit number", help:"For test reminders", section:"Your Details" },

        { id:"department", label:"Department / School", type:"select", required:true, half:true,
          section:"Academic Details",
          options:["Institute of Engineering & Technology","Chitkara Business School",
                   "School of Computer Applications","Chitkara College of Pharmacy",
                   "School of Mass Communication"] },

        { id:"programme", label:"Programme", type:"select", required:true, half:true,
          dependsOn:"department", section:"Academic Details",
          optionsMap:{
            "Institute of Engineering & Technology":["B.E.","B.Tech (Lateral Entry)","M.Tech"],
            "Chitkara Business School":["BBA","MBA","B.Com (Hons)"],
            "School of Computer Applications":["BCA","MCA"],
            "Chitkara College of Pharmacy":["B.Pharm","D.Pharm","M.Pharm"],
            "School of Mass Communication":["BA JMC","MA JMC"]
          } },

        { id:"course", label:"Course / Branch", type:"select", required:true, half:true,
          dependsOn:"programme", section:"Academic Details",
          optionsMap:{
            "B.E.":["Computer Science & Engineering","Electronics & Communication","Mechanical Engineering","Civil Engineering","Electrical Engineering"],
            "B.Tech (Lateral Entry)":["Computer Science & Engineering","Mechanical Engineering"],
            "M.Tech":["Computer Science & Engineering","VLSI Design","Structural Engineering"],
            "BBA":["General","Business Analytics","Family Business"],
            "MBA":["Marketing","Finance","Human Resources","Business Analytics"],
            "B.Com (Hons)":["General","Professional"],
            "BCA":["General","Data Science","Cloud & Security"],
            "MCA":["General","Artificial Intelligence"],
            "B.Pharm":["Pharmaceutics","Pharmacology"],
            "D.Pharm":["General"],
            "M.Pharm":["Pharmaceutics","Pharmaceutical Chemistry"],
            "BA JMC":["Journalism","Advertising & PR"],
            "MA JMC":["Journalism","Film & Television"]
          } },

        { id:"session", label:"Session", type:"select", required:true, half:true,
          dependsOn:"programme", section:"Academic Details",
          optionsMap:{
            "B.E.":["2022-2026","2023-2027"],
            "B.Tech (Lateral Entry)":["2023-2026","2024-2027"],
            "M.Tech":["2024-2026","2025-2027"],
            "MBA":["2024-2026","2025-2027"], "MCA":["2024-2026","2025-2027"],
            "M.Pharm":["2024-2026"], "MA JMC":["2024-2026"], "D.Pharm":["2024-2026"],
            "*":["2023-2026","2024-2027"]
          } },

        { id:"placementTrack", label:"Preferred placement track", type:"select", required:true, half:true,
          section:"Academic Details",
          showIf:{ field:"department", values:["Institute of Engineering & Technology","School of Computer Applications"] },
          options:["Software Development","Data & Analytics","Core / Domain","Testing & QA"] },

        { id:"internship", label:"Summer internship completed?", type:"radio", required:true, half:true,
          section:"Academic Details",
          showIf:{ field:"department", values:["Chitkara Business School"] },
          options:["Yes","No","In progress"] },

        { id:"cgpa", label:"Current CGPA", type:"number", required:false, half:true,
          placeholder:"e.g. 8.2", help:"Out of 10", section:"Academic Details" },

        { id:"consent", label:"My details are correct and my reports may be shared with the placement cell.",
          type:"checkbox", required:true, section:"Declaration" }
      ],

      testimonials: [
        { quote: "The sectional report showed exactly where my marks were leaking.",
          name: "Ishita Bansal", meta: "B.E. CSE · Placed at Deloitte" },
        { quote: "Felt like the real TCS NQT screen. Nothing surprised me.",
          name: "Aarav Mehta", meta: "B.E. CSE · Class of 2026" },
        { quote: "One dashboard, every student's readiness. That is all I needed.",
          name: "Dr. Neha Arora", meta: "Placement Cell, Chitkara" }
      ],

      thankyou: {
        title: "You're all set!",
        message: "Your account is created and your slot is confirmed.",
        redirectSeconds: 8, dashboardUrl: "dashboard.html", dashboardLabel: "Go to My Dashboard"
      }
    },

    /* ================================================================
       LPU
       ================================================================ */
    lpu: {
      id: "lpu",
      name: "Lovely Professional University",
      shortName: "LPU",
      campus: "Phagwara, Punjab",
      logo: "assets/lpu.svg",
      logoHeight: 48,
      photo: "assets/campus-lpu.jpg",
      theme: { primary: "#d96412", primaryDark: "#8a3d05", accent: "#ffc44d" },

      welcome: {
        eyebrow: "LPU × Hitbullseye Drive",
        title: "Welcome to Hitbullseye",
        highlight: "Hitbullseye",
        subtitle: "Benchmark your aptitude before the recruiters do.",
        points: [
          "5,000+ question adaptive bank",
          "Live All India ranking",
          "Recruiter-ready skill report",
          "Unlimited sectional practice"
        ],
        stats: [
          { value: "38,000+", label: "Students on platform" },
          { value: "220+",    label: "Recruiters referencing" },
          { value: "4.7/5",   label: "Student rating" }
        ],
        cta: "Start Verification",
        note: "Access code + registration number are checked before the form."
      },

      campusPoints: [
        "One access code for the whole batch",
        "ID checked against the university list",
        "Two attempts inside the window",
        "Instant score card on submit"
      ],

      security: { enabled:true, code:"LPU123X", label:"Campus access code", help:"Shared by the placement cell" },
      gate: { idLabel:"LPU Registration Number", idPlaceholder:"e.g. 12105609",
              idHelp:"8-digit registration number on your UMS profile" },

      roster: [
        { uid:"12105609", email:"jaspreet.kaur@lpu.in", name:"Jaspreet Kaur",
          department:"School of Computer Science & Engineering", programme:"B.Tech",
          course:"Computer Science & Engineering", session:"2022-2026" },
        { uid:"12105610", email:"rohit.malhotra@lpu.in", name:"Rohit Malhotra",
          department:"Mittal School of Business", programme:"MBA",
          course:"Marketing", session:"2024-2026" },
        { uid:"12105611", email:"simran.walia@lpu.in", name:"Simran Walia",
          department:"School of Mechanical Engineering", programme:"B.Tech",
          course:"Mechanical Engineering", session:"2022-2026" },
        { uid:"12105601", email:"harsh.chauhan@lpu.in", name:"Harsh Chauhan",
          department:"School of Computer Science & Engineering", programme:"B.Tech",
          course:"Computer Science & Engineering", session:"2022-2026" },
        { uid:"12105602", email:"meera.nair@lpu.in", name:"Meera Nair",
          department:"Mittal School of Business", programme:"MBA",
          course:"Finance", session:"2024-2026" }
      ],


      profile: {
        website: "https://www.lpu.in", established: "2005",
        spocs: [
          { name:"Rajat Sethi", role:"Head, Career Services",
            email:"careers@lpu.in", phone:"+91 98140 00002", primary:true }
        ],
        departments: [
          { name:"School of Computer Science & Engineering", total:11000, finalYear:2800 },
          { name:"Mittal School of Business",                total:8000,  finalYear:2100 },
          { name:"School of Mechanical Engineering",         total:7000,  finalYear:1700 },
          { name:"School of Pharmaceutical Sciences",        total:4000,  finalYear:600 }
        ],
        nomenclature: { uid:"LPU Registration Number", department:"School",
                        programme:"Programme", course:"Course / Specialisation", session:"Session" },
        updatedAt: "2026-08-20"
      },

      commercial: {
        clientName: "Lovely Professional University",
        contract: { id:"HB-LPU-2026-03", start:"01 Jun 2026", end:"31 May 2027", po:"PO-LPU-2291" },
        rate: 95,
        items: [
          { id:"INV-2026-021", item:"Aptitude Benchmark", tests:1, licences:4000, amount:380000,
            status:"Paid", invoiced:"12 Jun 2026", due:"30 Jun 2026", paid:"25 Jun 2026" },
          { id:"INV-2026-048", item:"Software Skills Test", tests:1, licences:1500, amount:142500,
            status:"Due",  invoiced:"05 Sep 2026", due:"05 Oct 2026", paid:"" },
          { id:"INV-2026-049", item:"Management Aptitude", tests:1, licences:900, amount:85500,
            status:"Due",  invoiced:"05 Sep 2026", due:"05 Oct 2026", paid:"" }
        ]
      },
      tests: [
        { id:"lpu-apt-1", name:"LPU Aptitude Benchmark Test", tag:"Aptitude",
          durationMin:45, questions:50,
          sections:["Quantitative Aptitude","Verbal Ability","Logical Reasoning"],
          window:"25 Sep \u2013 05 Oct 2026", attempts:"2 attempts allowed",
          audience:{ departments:[], programmes:[], sessions:[] } },

        { id:"lpu-code", name:"Software Skills Test", tag:"Technical",
          durationMin:45, questions:40,
          sections:["Technical Aptitude","Logical Reasoning"],
          window:"02 Oct \u2013 10 Oct 2026", attempts:"1 attempt per student",
          audience:{ departments:["School of Computer Science & Engineering"], programmes:[], sessions:[] } },

        { id:"lpu-mgmt", name:"Management Aptitude Test", tag:"Management",
          durationMin:50, questions:45,
          sections:["Data Interpretation","Verbal Ability","Quantitative Aptitude"],
          window:"04 Oct \u2013 12 Oct 2026", attempts:"1 attempt per student",
          audience:{ departments:["Mittal School of Business"], programmes:[], sessions:[] } }
      ],

      verification: { otpLength: 6, resendSeconds: 30 },

      fields: [
        { id:"firstName", label:"First Name", type:"text", required:true, half:true,
          placeholder:"As per campus record", section:"Your Details" },
        { id:"lastName", label:"Last Name", type:"text", required:true, half:true,
          placeholder:"Surname", section:"Your Details" },
        { id:"email", label:"Email Address", type:"email", required:true, half:true,
          prefill:"email", lock:true, section:"Your Details" },
        { id:"universityId", label:"LPU Registration Number", type:"text", required:true, half:true,
          prefill:"uid", lock:true, section:"Your Details" },
        { id:"phone", label:"Mobile Number", type:"tel", required:true, half:true,
          placeholder:"10-digit number", section:"Your Details" },

        { id:"department", label:"School", type:"select", required:true, half:true,
          section:"Academic Details",
          options:["School of Computer Science & Engineering","Mittal School of Business",
                   "School of Mechanical Engineering","School of Pharmaceutical Sciences"] },

        { id:"programme", label:"Programme", type:"select", required:true, half:true,
          dependsOn:"department", section:"Academic Details",
          optionsMap:{
            "School of Computer Science & Engineering":["B.Tech","M.Tech","MCA"],
            "Mittal School of Business":["BBA","MBA","B.Com (Hons)"],
            "School of Mechanical Engineering":["B.Tech","M.Tech"],
            "School of Pharmaceutical Sciences":["B.Pharm","M.Pharm"]
          } },

        { id:"course", label:"Course / Specialisation", type:"select", required:true, half:true,
          dependsOn:"department", section:"Academic Details",
          optionsMap:{
            "School of Computer Science & Engineering":["Computer Science & Engineering","Information Technology","Data Science","Cyber Security"],
            "Mittal School of Business":["Marketing","Finance","Human Resources","Operations"],
            "School of Mechanical Engineering":["Mechanical Engineering","Automobile Engineering","Thermal Engineering"],
            "School of Pharmaceutical Sciences":["Pharmaceutics","Pharmacology"]
          } },

        { id:"session", label:"Session", type:"select", required:true, half:true,
          dependsOn:"programme", section:"Academic Details",
          optionsMap:{ "B.Tech":["2022-2026","2023-2027"], "M.Tech":["2024-2026"],
                       "MCA":["2024-2026"], "MBA":["2024-2026","2025-2027"],
                       "M.Pharm":["2024-2026"], "*":["2023-2026","2024-2027"] } },

        { id:"placementTrack", label:"Preferred placement track", type:"select", required:true, half:true,
          section:"Academic Details",
          showIf:{ field:"department", values:["School of Computer Science & Engineering"] },
          options:["Software Development","Data & Analytics","Testing / QA","Support & Operations"] },

        { id:"consent", label:"I accept the assessment terms.", type:"checkbox", required:true, section:"Declaration" }
      ],

      testimonials: [
        { quote: "Sectional practice fixed my accuracy, not the mocks alone.",
          name: "Meera Nair", meta: "MBA · Class of 2026" },
        { quote: "Comparing across campuses was the wake-up call I needed.",
          name: "Harsh Chauhan", meta: "B.Tech · Class of 2026" },
        { quote: "Slots, reminders and reports in one place. No spreadsheets.",
          name: "Rajat Sethi", meta: "Career Services, LPU" }
      ],

      thankyou: {
        title: "Registration confirmed",
        message: "Your slot is locked. Attempt any time in the window.",
        redirectSeconds: 8, dashboardUrl: "dashboard.html", dashboardLabel: "Go to My Dashboard"
      }
    },

    /* ================================================================
       UPES
       ================================================================ */
    upes: {
      id: "upes",
      name: "UPES",
      shortName: "UPES",
      campus: "Dehradun, Uttarakhand",
      logo: "assets/upes.svg",
      logoHeight: 36,
      photo: "assets/campus-upes.jpg",
      theme: { primary: "#d61f69", primaryDark: "#8a1244", accent: "#fcd810" },

      welcome: {
        eyebrow: "Placement Drive · Batch 2026",
        title: "Welcome to Hitbullseye",
        highlight: "Hitbullseye",
        subtitle: "One test. A clear picture of where you stand.",
        points: [
          "Company-pattern aptitude sets",
          "Sectional accuracy and speed",
          "All India percentile, live",
          "A practice plan after every attempt"
        ],
        stats: [
          { value: "18,000+", label: "Students assessed" },
          { value: "92%",     label: "Clearance rate" },
          { value: "4.7/5",   label: "Student rating" }
        ],
        cta: "Start Verification",
        note: "Access code + SAP ID are checked before the form opens."
      },

      campusPoints: [
        "One access code for all UPES schools",
        "SAP ID checked before registration",
        "Score card the moment you submit",
        "Practice open between cycles"
      ],

      security: { enabled:true, code:"UPES26K", label:"Campus access code", help:"Shared by the placement cell" },
      gate: { idLabel:"SAP ID", idPlaceholder:"e.g. 500098706", idHelp:"9-digit SAP ID from your student portal" },

      roster: [
        { uid:"500098706", email:"tanvi.rana@stu.upes.ac.in", name:"Tanvi Rana",
          department:"School of Computer Science", programme:"B.Tech",
          course:"Computer Science & Engineering", session:"2022-2026" },
        { uid:"500098707", email:"arjun.pant@stu.upes.ac.in", name:"Arjun Pant",
          department:"School of Business", programme:"BBA",
          course:"Analytics & Big Data", session:"2023-2026" },
        { uid:"500098708", email:"mehak.dobhal@stu.upes.ac.in", name:"Mehak Dobhal",
          department:"School of Design", programme:"B.Des",
          course:"Product Design", session:"2022-2026" },
        { uid:"500098701", email:"kritika.joshi@stu.upes.ac.in", name:"Kritika Joshi",
          department:"School of Computer Science", programme:"B.Tech",
          course:"Artificial Intelligence & ML", session:"2022-2026" },
        { uid:"500098702", email:"aman.rawat@stu.upes.ac.in", name:"Aman Rawat",
          department:"School of Business", programme:"MBA",
          course:"Business Analytics", session:"2024-2026" }
      ],


      profile: {
        website: "https://www.upes.ac.in", established: "2003",
        spocs: [
          { name:"Ms. Ritu Bhatt", role:"Head, Placement Cell",
            email:"placements@upes.ac.in", phone:"+91 99170 00003", primary:true },
          { name:"Karan Negi", role:"Coordinator, Business & Law",
            email:"karan.negi@upes.ac.in", phone:"+91 99170 00013", primary:false }
        ],
        departments: [
          { name:"School of Computer Science",     total:4200, finalYear:1100 },
          { name:"School of Advanced Engineering", total:3600, finalYear:900 },
          { name:"School of Business",             total:2800, finalYear:700 },
          { name:"School of Law",                  total:1600, finalYear:250 },
          { name:"School of Design",               total:1100, finalYear:100 },
          { name:"School of Health Sciences",      total:700,  finalYear:50 }
        ],
        nomenclature: { uid:"SAP ID", department:"School",
                        programme:"Programme", course:"Specialisation", session:"Session" },
        updatedAt: "2026-08-28"
      },

      commercial: {
        clientName: "UPES",
        contract: { id:"HB-UPES-2026-02", start:"01 May 2026", end:"30 Apr 2027", po:"PO-UPES-7734" },
        rate: 110,
        items: [
          { id:"INV-2026-033", item:"Placement Readiness Cycle 1", tests:1, licences:2500, amount:275000,
            status:"Paid", invoiced:"20 Jul 2026", due:"10 Aug 2026", paid:"04 Aug 2026" },
          { id:"INV-2026-055", item:"Tech Stack Screening", tests:1, licences:1200, amount:132000,
            status:"Due",  invoiced:"08 Sep 2026", due:"08 Oct 2026", paid:"" }
        ]
      },
      tests: [
        { id:"upes-apt-1", name:"UPES Placement Readiness Test \u2014 Cycle 1", tag:"Aptitude",
          durationMin:60, questions:60,
          sections:["Quantitative Aptitude","Logical Reasoning","Verbal Ability","Data Interpretation"],
          window:"24 Sep \u2013 03 Oct 2026", attempts:"1 attempt per student",
          audience:{ departments:[], programmes:[], sessions:[] } },

        { id:"upes-tech", name:"Tech Stack Screening", tag:"Technical",
          durationMin:45, questions:40,
          sections:["Technical Aptitude","Logical Reasoning"],
          window:"01 Oct \u2013 09 Oct 2026", attempts:"1 attempt per student",
          audience:{ departments:["School of Computer Science"], programmes:["B.Tech","MCA"], sessions:[] } },

        { id:"upes-biz", name:"Business Analytics Case Test", tag:"Management",
          durationMin:50, questions:45,
          sections:["Data Interpretation","Quantitative Aptitude","Verbal Ability"],
          window:"03 Oct \u2013 11 Oct 2026", attempts:"1 attempt per student",
          audience:{ departments:["School of Business"], programmes:[], sessions:[] } }
      ],

      verification: { otpLength: 6, resendSeconds: 30 },

      fields: [
        { id:"firstName", label:"First Name", type:"text", required:true, half:true,
          placeholder:"As per campus record", section:"Your Details" },
        { id:"lastName", label:"Last Name", type:"text", required:true, half:true,
          placeholder:"Surname", section:"Your Details" },
        { id:"email", label:"Email Address", type:"email", required:true, half:true,
          prefill:"email", lock:true, section:"Your Details" },
        { id:"universityId", label:"SAP ID", type:"text", required:true, half:true,
          prefill:"uid", lock:true, section:"Your Details" },
        { id:"phone", label:"Mobile Number", type:"tel", required:true, half:true,
          placeholder:"10-digit number", section:"Your Details" },

        { id:"department", label:"School", type:"select", required:true, half:true,
          section:"Academic Details",
          options:["School of Computer Science","School of Advanced Engineering","School of Business",
                   "School of Law","School of Design","School of Health Sciences"] },

        { id:"programme", label:"Programme", type:"select", required:true, half:true,
          dependsOn:"department", section:"Academic Details",
          optionsMap:{
            "School of Computer Science":["B.Tech","BCA","MCA"],
            "School of Advanced Engineering":["B.Tech","M.Tech"],
            "School of Business":["BBA","MBA","B.Com (Hons)"],
            "School of Law":["BA LLB","BBA LLB","LLM"],
            "School of Design":["B.Des","M.Des"],
            "School of Health Sciences":["B.Pharm","B.Sc"]
          } },

        { id:"course", label:"Specialisation", type:"select", required:true, half:true,
          dependsOn:"department", section:"Academic Details",
          optionsMap:{
            "School of Computer Science":["Computer Science & Engineering","Artificial Intelligence & ML","Cyber Security","Full Stack Development"],
            "School of Advanced Engineering":["Mechanical","Electrical","Chemical","Aerospace"],
            "School of Business":["Marketing","Finance","Analytics & Big Data","Business Analytics","Oil & Gas Management"],
            "School of Law":["Corporate Law","Criminal Law","Energy Law"],
            "School of Design":["Product Design","Graphics & Communication","Transportation Design"],
            "School of Health Sciences":["Pharmaceutics","Food Technology"]
          } },

        { id:"session", label:"Session", type:"select", required:true, half:true,
          dependsOn:"programme", section:"Academic Details",
          optionsMap:{ "B.Tech":["2022-2026","2023-2027"], "M.Tech":["2024-2026"],
                       "MCA":["2024-2026"], "MBA":["2024-2026","2025-2027"], "M.Des":["2024-2026"],
                       "LLM":["2024-2026"], "BA LLB":["2021-2026","2022-2027"], "BBA LLB":["2021-2026","2022-2027"],
                       "*":["2023-2026","2024-2027"] } },

        { id:"preferredRole", label:"Target role", type:"select", required:true, half:true,
          section:"Academic Details",
          showIf:{ field:"department", values:["School of Computer Science"] },
          options:["Software Engineer","Data Analyst","Cloud / DevOps","Security Analyst"] },

        { id:"internship", label:"Summer internship completed?", type:"radio", required:true, half:true,
          section:"Academic Details",
          showIf:{ field:"department", values:["School of Business"] },
          options:["Yes","No","In progress"] },

        { id:"cgpa", label:"Current CGPA", type:"number", required:false, half:true,
          placeholder:"e.g. 8.4", help:"Out of 10", section:"Academic Details" },

        { id:"consent", label:"My details are correct and my reports may be shared with the placement cell.",
          type:"checkbox", required:true, section:"Declaration" }
      ],

      testimonials: [
        { quote: "Three mocks and my quant timing dropped by twenty seconds a question.",
          name: "Kritika Joshi", meta: "School of Computer Science · 2026" },
        { quote: "The percentile told me the truth my practice scores were hiding.",
          name: "Aman Rawat", meta: "School of Business · 2026" },
        { quote: "We track the whole batch from one screen now.",
          name: "Ms. Ritu Bhatt", meta: "Placement Cell, UPES" }
      ],

      thankyou: {
        title: "You are all set!",
        message: "Your account is created and your slot is confirmed.",
        redirectSeconds: 8, dashboardUrl: "dashboard.html", dashboardLabel: "Go to My Dashboard"
      }
    },

    /* ================================================================
       THAPAR
       ================================================================ */
    thapar: {
      id: "thapar",
      name: "Thapar Institute of Engineering & Technology",
      shortName: "Thapar",
      campus: "Patiala, Punjab",
      logo: "assets/thapar.png",
      logoHeight: 42,
      photo: "assets/campus-thapar.jpg",
      theme: { primary: "#8c1420", primaryDark: "#55070f", accent: "#d9a441" },

      welcome: {
        eyebrow: "T&P Cell · Batch 2026",
        title: "Welcome to Hitbullseye",
        highlight: "Hitbullseye",
        subtitle: "Know your standing before the companies arrive.",
        points: [
          "Aptitude plus a technical section",
          "Branch-wise benchmarking",
          "Campus rank and All India percentile",
          "Focused plan after every attempt"
        ],
        stats: [
          { value: "7,600+", label: "Students assessed" },
          { value: "96%",    label: "Clearance rate" },
          { value: "4.8/5",  label: "Student rating" }
        ],
        cta: "Start Verification",
        note: "Access code + roll number are checked before the form opens."
      },

      campusPoints: [
        "One access code for the whole batch",
        "Roll number verified before the form",
        "Technical section for your branch",
        "Reports go to the T&P cell"
      ],

      security: { enabled:true, code:"THA26TP", label:"Campus access code", help:"Shared by the T&P cell" },
      gate: { idLabel:"Thapar Roll Number", idPlaceholder:"e.g. 102203406",
              idHelp:"9-digit roll number on your institute ID card" },

      roster: [
        { uid:"102203406", email:"harnoor.singh@thapar.edu", name:"Harnoor Singh",
          department:"Computer Science & Engineering", programme:"B.E.",
          course:"Computer Engineering", session:"2022-2026" },
        { uid:"102203407", email:"ananya.mittal@thapar.edu", name:"Ananya Mittal",
          department:"Electronics & Communication", programme:"B.E.",
          course:"Electronics & Communication", session:"2022-2026" },
        { uid:"102203408", email:"kabir.jain@thapar.edu", name:"Kabir Jain",
          department:"LM Thapar School of Management", programme:"MBA",
          course:"Marketing", session:"2024-2026" },
        { uid:"102203401", email:"gurleen.sidhu@thapar.edu", name:"Gurleen Sidhu",
          department:"Computer Science & Engineering", programme:"B.E.",
          course:"Computer Engineering", session:"2022-2026" },
        { uid:"102203402", email:"nikhil.bhatia@thapar.edu", name:"Nikhil Bhatia",
          department:"Electronics & Communication", programme:"B.E.",
          course:"Electronics & Communication", session:"2022-2026" }
      ],


      profile: {
        website: "https://www.thapar.edu", established: "1956",
        spocs: [
          { name:"Dr. A. S. Grewal", role:"Head, Training & Placement",
            email:"tnp@thapar.edu", phone:"+91 98720 00004", primary:true },
          { name:"Simran Kohli", role:"Placement Officer",
            email:"simran.kohli@thapar.edu", phone:"+91 98720 00014", primary:false }
        ],
        departments: [
          { name:"Computer Science & Engineering",   total:2600, finalYear:640 },
          { name:"Electronics & Communication",      total:1700, finalYear:420 },
          { name:"Mechanical Engineering",           total:1500, finalYear:370 },
          { name:"Civil Engineering",                total:1200, finalYear:290 },
          { name:"Chemical Engineering",             total:1100, finalYear:260 },
          { name:"Biotechnology",                    total:900,  finalYear:220 },
          { name:"LM Thapar School of Management",   total:500,  finalYear:250 }
        ],
        nomenclature: { uid:"Thapar Roll Number", department:"Department",
                        programme:"Programme", course:"Course / Branch", session:"Session" },
        updatedAt: "2026-09-01"
      },

      commercial: {
        clientName: "Thapar Institute of Engineering & Technology",
        contract: { id:"HB-TIET-2026-05", start:"01 Jul 2026", end:"30 Jun 2027", po:"PO-TIET-5512" },
        rate: 140,
        items: [
          { id:"INV-2026-038", item:"Placement Aptitude Cycle 1", tests:1, licences:1800, amount:252000,
            status:"Paid",    invoiced:"28 Jul 2026", due:"15 Aug 2026", paid:"09 Aug 2026" },
          { id:"INV-2026-057", item:"Core Engineering Technical", tests:1, licences:1100, amount:154000,
            status:"Due",     invoiced:"10 Sep 2026", due:"10 Oct 2026", paid:"" },
          { id:"INV-2026-058", item:"LMTSOM Management Aptitude", tests:1, licences:250, amount:35000,
            status:"Overdue", invoiced:"01 Aug 2026", due:"01 Sep 2026", paid:"" }
        ]
      },
      tests: [
        { id:"tha-apt-1", name:"Thapar Placement Aptitude Test \u2014 Cycle 1", tag:"Aptitude",
          durationMin:75, questions:70,
          sections:["Quantitative Aptitude","Logical Reasoning","Verbal Ability","Technical Aptitude"],
          window:"28 Sep \u2013 08 Oct 2026", attempts:"1 attempt per student",
          audience:{ departments:[], programmes:[], sessions:[] } },

        { id:"tha-core", name:"Core Engineering Technical Test", tag:"Technical",
          durationMin:60, questions:50,
          sections:["Technical Aptitude","Quantitative Aptitude"],
          window:"05 Oct \u2013 14 Oct 2026", attempts:"1 attempt per student",
          audience:{ departments:["Computer Science & Engineering","Electronics & Communication",
                                  "Mechanical Engineering","Chemical Engineering"],
                     programmes:["B.E."], sessions:[] } },

        { id:"tha-mba", name:"LMTSOM Management Aptitude", tag:"Management",
          durationMin:50, questions:45,
          sections:["Data Interpretation","Verbal Ability","Logical Reasoning"],
          window:"06 Oct \u2013 15 Oct 2026", attempts:"2 attempts allowed",
          audience:{ departments:["LM Thapar School of Management"], programmes:[], sessions:[] } }
      ],

      verification: { otpLength: 6, resendSeconds: 30 },

      fields: [
        { id:"firstName", label:"First Name", type:"text", required:true, half:true,
          placeholder:"As per campus record", section:"Your Details" },
        { id:"lastName", label:"Last Name", type:"text", required:true, half:true,
          placeholder:"Surname", section:"Your Details" },
        { id:"email", label:"Thapar Email ID", type:"email", required:true, half:true,
          prefill:"email", lock:true, section:"Your Details" },
        { id:"universityId", label:"Roll Number", type:"text", required:true, half:true,
          prefill:"uid", lock:true, section:"Your Details" },
        { id:"phone", label:"Mobile Number", type:"tel", required:true, half:true,
          placeholder:"10-digit number", section:"Your Details" },

        { id:"department", label:"Department", type:"select", required:true, half:true,
          section:"Academic Details",
          options:["Computer Science & Engineering","Electronics & Communication","Mechanical Engineering",
                   "Civil Engineering","Chemical Engineering","Biotechnology","LM Thapar School of Management"] },

        { id:"programme", label:"Programme", type:"select", required:true, half:true,
          dependsOn:"department", section:"Academic Details",
          optionsMap:{
            "Computer Science & Engineering":["B.E.","M.E."],
            "Electronics & Communication":["B.E.","M.E."],
            "Mechanical Engineering":["B.E.","M.E."],
            "Civil Engineering":["B.E.","M.E."],
            "Chemical Engineering":["B.E.","M.E."],
            "Biotechnology":["B.E.","M.Sc"],
            "LM Thapar School of Management":["MBA","MBA (Business Analytics)"]
          } },

        { id:"course", label:"Course / Branch", type:"select", required:true, half:true,
          dependsOn:"department", section:"Academic Details",
          optionsMap:{
            "Computer Science & Engineering":["Computer Engineering","Computer Science & Business Systems","Artificial Intelligence"],
            "Electronics & Communication":["Electronics & Communication","Electronics & Computer Engineering"],
            "Mechanical Engineering":["Mechanical Engineering","Production & Industrial"],
            "Civil Engineering":["Civil Engineering","Structural Engineering"],
            "Chemical Engineering":["Chemical Engineering","Process Engineering"],
            "Biotechnology":["Biotechnology","Industrial Biotechnology"],
            "LM Thapar School of Management":["Marketing","Finance","Operations","Business Analytics"]
          } },

        { id:"session", label:"Session", type:"select", required:true, half:true,
          dependsOn:"programme", section:"Academic Details",
          optionsMap:{ "B.E.":["2022-2026","2023-2027"], "M.E.":["2024-2026"], "M.Sc":["2024-2026"],
                       "MBA":["2024-2026","2025-2027"], "MBA (Business Analytics)":["2024-2026"],
                       "*":["2022-2026","2023-2027"] } },

        { id:"techStack", label:"Primary technical strength", type:"select", required:true, half:true,
          section:"Academic Details",
          showIf:{ field:"department", values:["Computer Science & Engineering","Electronics & Communication"] },
          options:["DSA & Problem Solving","Web / Full Stack","Embedded & VLSI","Data & ML","Networks"] },

        { id:"backlogs", label:"Active backlogs", type:"radio", required:true, half:true,
          section:"Academic Details", options:["None","One","More than one"] },

        { id:"cgpa", label:"Current CGPA", type:"number", required:false, half:true,
          placeholder:"e.g. 8.7", help:"Out of 10", section:"Academic Details" },

        { id:"consent", label:"I confirm my details are correct.", type:"checkbox", required:true, section:"Declaration" }
      ],

      testimonials: [
        { quote: "The technical section is what set this apart from a plain aptitude mock.",
          name: "Gurleen Sidhu", meta: "CSE · Class of 2026" },
        { quote: "Two weeks on my weak areas moved me forty places on campus.",
          name: "Nikhil Bhatia", meta: "ECE · Class of 2026" },
        { quote: "Branch-wise readiness before the drive. That is gold for us.",
          name: "Dr. A. S. Grewal", meta: "T&P Cell, Thapar" }
      ],

      thankyou: {
        title: "Registration complete",
        message: "Your slot is confirmed. Your dashboard is ready.",
        redirectSeconds: 8, dashboardUrl: "dashboard.html", dashboardLabel: "Go to My Dashboard"
      }
    },

    /* ================================================================
       AMITY
       ================================================================ */
    amity: {
      id: "amity",
      name: "Amity University",
      shortName: "Amity",
      campus: "Noida, Uttar Pradesh",
      logo: "assets/amity.png",
      logoHeight: 36,
      photo: "assets/campus-amity.jpg",
      theme: { primary: "#1f3c88", primaryDark: "#122457", accent: "#f0b429" },

      welcome: {
        eyebrow: "Career Readiness 2026",
        title: "Welcome to Hitbullseye",
        highlight: "Hitbullseye",
        subtitle: "Aptitude and domain, tested in one sitting.",
        points: [
          "Aptitude + domain in one paper",
          "Instant sectional score card",
          "Reports shared with your mentor",
          "National talent-pool benchmark"
        ],
        stats: [
          { value: "9,800+", label: "Students assessed" },
          { value: "31",     label: "Schools covered" },
          { value: "4.6/5",  label: "Student rating" }
        ],
        cta: "Start Verification",
        note: "Access code + enrolment number are checked before the form."
      },

      campusPoints: [
        "One access code per batch",
        "Enrolment number verified first",
        "Mentor sees your report same day",
        "One attempt, 90 minutes"
      ],

      security: { enabled:true, code:"AMI26CRC", label:"Campus access code", help:"Shared by the CRC" },
      gate: { idLabel:"Enrolment Number", idPlaceholder:"e.g. A4020264",
              idHelp:"Enrolment number printed on your Amity ID card" },

      roster: [
        { uid:"A4020264", email:"sara.kapoor@s.amity.edu", name:"Sara Kapoor",
          department:"ASET", programme:"B.Tech", course:"Computer Science & Engineering", session:"2022-2026" },
        { uid:"A4020265", email:"yash.dubey@s.amity.edu", name:"Yash Dubey",
          department:"Amity Business School", programme:"MBA", course:"Marketing", session:"2024-2026" },
        { uid:"A4020266", email:"noor.fatima@s.amity.edu", name:"Noor Fatima",
          department:"Amity Law School", programme:"BA LLB", course:"Corporate Law", session:"2021-2026" },
        { uid:"A4020261", email:"vivaan.khanna@s.amity.edu", name:"Vivaan Khanna",
          department:"ASET", programme:"B.Tech", course:"Computer Science & Engineering", session:"2022-2026" },
        { uid:"A4020262", email:"riya.malhotra@s.amity.edu", name:"Riya Malhotra",
          department:"Amity Business School", programme:"MBA", course:"Finance", session:"2024-2026" }
      ],


      profile: {
        website: "https://www.amity.edu", established: "1995",
        spocs: [
          { name:"Prof. S. Iyer", role:"Director, Corporate Resource Centre",
            email:"crc@amity.edu", phone:"+91 99990 00005", primary:true }
        ],
        departments: [
          { name:"ASET",                  total:8000, finalYear:1900 },
          { name:"Amity Business School",  total:5200, finalYear:1400 },
          { name:"AIIT",                   total:3200, finalYear:800 },
          { name:"Amity Law School",       total:2800, finalYear:500 },
          { name:"AIBAS",                  total:1800, finalYear:200 }
        ],
        nomenclature: { uid:"Enrolment Number", department:"School / Institute",
                        programme:"Programme", course:"Specialisation", session:"Session" },
        updatedAt: "2026-09-04"
      },

      commercial: {
        clientName: "Amity University",
        contract: { id:"HB-AMITY-2026-04", start:"01 Apr 2026", end:"31 Mar 2027", po:"PO-AMI-3390" },
        rate: 105,
        items: [
          { id:"INV-2026-026", item:"Placement Readiness Test", tests:1, licences:3000, amount:315000,
            status:"Paid", invoiced:"18 Jul 2026", due:"05 Aug 2026", paid:"31 Jul 2026" },
          { id:"INV-2026-060", item:"ASET Domain Test", tests:1, licences:1400, amount:147000,
            status:"Due",  invoiced:"12 Sep 2026", due:"12 Oct 2026", paid:"" },
          { id:"INV-2026-061", item:"Legal Reasoning Test", tests:1, licences:400, amount:42000,
            status:"Due",  invoiced:"12 Sep 2026", due:"12 Oct 2026", paid:"" }
        ]
      },
      tests: [
        { id:"amity-apt-1", name:"Amity Placement Readiness Test", tag:"Aptitude",
          durationMin:90, questions:75,
          sections:["Quantitative Aptitude","Verbal Ability","Logical Reasoning","Domain Knowledge"],
          window:"01 Oct \u2013 12 Oct 2026", attempts:"1 attempt per student",
          audience:{ departments:[], programmes:[], sessions:[] } },

        { id:"amity-domain", name:"ASET Domain Test", tag:"Domain",
          durationMin:45, questions:40,
          sections:["Domain Knowledge","Technical Aptitude"],
          window:"05 Oct \u2013 14 Oct 2026", attempts:"1 attempt per student",
          audience:{ departments:["ASET","AIIT"], programmes:[], sessions:[] } },

        { id:"amity-law", name:"Legal Reasoning Test", tag:"Law",
          durationMin:60, questions:50,
          sections:["Verbal Ability","Logical Reasoning"],
          window:"07 Oct \u2013 16 Oct 2026", attempts:"1 attempt per student",
          audience:{ departments:["Amity Law School"], programmes:[], sessions:[] } }
      ],

      verification: { otpLength: 4, resendSeconds: 20 },

      fields: [
        { id:"firstName", label:"First Name", type:"text", required:true, half:true,
          placeholder:"As per campus record", section:"Your Details" },
        { id:"lastName", label:"Last Name", type:"text", required:true, half:true,
          placeholder:"Surname", section:"Your Details" },
        { id:"email", label:"Amity Email ID", type:"email", required:true, half:true,
          prefill:"email", lock:true, section:"Your Details" },
        { id:"universityId", label:"Enrolment Number", type:"text", required:true, half:true,
          prefill:"uid", lock:true, section:"Your Details" },
        { id:"phone", label:"Mobile Number", type:"tel", required:false, half:true,
          placeholder:"10-digit number", section:"Your Details" },

        { id:"department", label:"School / Institute", type:"select", required:true, half:true,
          section:"Academic Details",
          options:["ASET","Amity Business School","AIIT","Amity Law School","AIBAS"] },

        { id:"programme", label:"Programme", type:"select", required:true, half:true,
          dependsOn:"department", section:"Academic Details",
          optionsMap:{
            "ASET":["B.Tech","M.Tech"],
            "Amity Business School":["BBA","MBA"],
            "AIIT":["BCA","MCA"],
            "Amity Law School":["BA LLB","BBA LLB","LLM"],
            "AIBAS":["B.Sc","MA"]
          } },

        { id:"course", label:"Specialisation", type:"select", required:true, half:true,
          dependsOn:"department", section:"Academic Details",
          optionsMap:{
            "ASET":["Computer Science & Engineering","Electronics & Communication","Mechanical Engineering"],
            "Amity Business School":["Marketing","Finance","Human Resources"],
            "AIIT":["General","Data Science"],
            "Amity Law School":["Corporate Law","Criminal Law"],
            "AIBAS":["Psychology","Applied Behavioural Science"]
          } },

        { id:"session", label:"Session", type:"select", required:true, half:true,
          dependsOn:"programme", section:"Academic Details",
          optionsMap:{ "B.Tech":["2022-2026","2023-2027"], "M.Tech":["2024-2026"], "MCA":["2024-2026"],
                       "MBA":["2024-2026","2025-2027"], "LLM":["2024-2026"], "MA":["2024-2026"],
                       "BA LLB":["2021-2026","2022-2027"], "BBA LLB":["2021-2026","2022-2027"],
                       "*":["2023-2026","2024-2027"] } },

        { id:"domainSubject", label:"Domain paper", type:"select", required:true, half:true,
          section:"Academic Details",
          showIf:{ field:"department", values:["ASET","AIIT"] },
          options:["Computer Science","Electronics","Mechanical","Information Technology"] },

        { id:"consent", label:"I confirm my details are correct.", type:"checkbox", required:true, section:"Declaration" }
      ],

      testimonials: [
        { quote: "The only mock that tests aptitude and core subjects together.",
          name: "Riya Malhotra", meta: "Amity Business School · 2026" },
        { quote: "My mentor saw the report the same evening. We planned from there.",
          name: "Vivaan Khanna", meta: "ASET · Class of 2026" },
        { quote: "Honest scoring. Students actually trust the percentile.",
          name: "Prof. S. Iyer", meta: "Corporate Resource Centre" }
      ],

      thankyou: {
        title: "Registration complete",
        message: "Your dashboard is ready. Start practising now.",
        redirectSeconds: 8, dashboardUrl: "dashboard.html", dashboardLabel: "Go to My Dashboard"
      }
    }
  }
};
