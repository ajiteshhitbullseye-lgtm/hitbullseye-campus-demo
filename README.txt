HITBULLSEYE — CAMPUS ONBOARDING & ASSESSMENT (PROTOTYPE)
=========================================================

HOW TO RUN
----------
Double-click index.html. Opens straight in Chrome / Edge.
No server, no install. (First load after an update: press Ctrl+F5.)


THE FLOW (as agreed in the meeting)
-----------------------------------
1  WELCOME          index.html
   Campus-branded page. Shows the 4 steps the student has to follow,
   the assessment card, campus photo, FAQ.

2  VERIFY ID        verify.html          <-- the gate
   Field 1 is the CAMPUS ACCESS CODE — one code per client, e.g.
       Chitkara CHI123Y · LPU LPU123X · UPES UPES26K · Thapar THA26TP · Amity AMI26CRC
   Then the student enters University ID + email.
   We match BOTH against the campus master list (roster).
     - ID not on the list        -> blocked, told to contact the placement cell
     - email does not match      -> blocked, masked email shown as a hint
     - ID already registered     -> told to sign in instead
   On a match, a one-time code goes to the email on record. Verify -> gate pass.

3  REGISTRATION     register.html        <-- opens only after the gate
   The student fills everything themselves - name, department, programme,
   course, session, phone. Nothing is pre-filled from the master list.
   Only the EMAIL and the UNIVERSITY ID carry over and stay locked, because
   step 2 already verified them.
   Dependent chain:    Department -> Programme -> Course -> Session
                       (Chitkara: Course depends on Programme;
                        other campuses: Course depends on Department)
   Conditional fields: Specialisation only for CSE-type courses,
                       Internship only for the Business School,
                       Technical strength only for CSE / ECE at Thapar
   No captcha on this page — the access code is collected up front in step 2.

3b DECLARATION      (same page, after "Review & confirm")
   Every submitted line is listed with its value and a tick box, ITR style.
   The student has to confirm each row; "Confirm & submit" stays disabled until
   the counter reads "n of n confirmed". Optional fields left blank are marked
   "Not provided" and need no tick. The declaration (time + number of rows) is
   stored with the registration and shown on the confirmation page.

4  CONFIRMATION     thankyou.html
   Registration number, submitted details, auto-redirect.

5  DASHBOARD        dashboard.html  ->  test.html  ->  report.html
   The dashboard lists ONLY the assessments that student may see.
   Each campus can run several papers, and every paper carries an audience:
       audience = { departments:[], programmes:[], sessions:[] }
       empty list on a dimension  =  no restriction there
   Example (Chitkara):
       Campus Placement Aptitude Test   -> whole campus
       Technical Screening              -> Engineering & Computer Applications only
       Business Case & Analytics Test   -> Chitkara Business School only
   One result is stored per assessment. The report page has a switcher when the
   student has attempted more than one, and campus rank is computed inside
   that assessment only.

THREE LOGINS
------------
SUPER ADMIN  hq-login.html   (its own URL, not the campus one)
             super@hitbullseye.com / super@123   Hitbullseye HQ
   Every campus. Analytics, Students, Master list, Commercial (all clients),
   Campus profile, Form builder, Data & API. Can switch campus anywhere.

COLLEGE ADMIN  login.html?as=admin
               admin@hitbullseye.com / admin@123   the placement cell
   ONE campus only (chosen at sign-in, no campus switcher anywhere).
   Analytics, Students, Master list, Commercial (their own account),
   Campus profile. NO form builder, NO Data/JSON page.

STUDENT  any registered email + the one-time code shown on screen.

Students and college admins share one URL (login.html). HQ has its own page
(hq-login.html) with a different look, so nothing internal is advertised to
students. Every sign-in page has a click-to-fill demo-credentials card.


CONSOLE PAGES  (login.html?as=admin)
   admin-analytics.html   COHORT ANALYTICS - the bulk view
                          KPIs, registration funnel, score distribution,
                          section-wise averages, department table, top ten,
                          "needs attention" list. Filters: campus, assessment,
                          department, session. Export summary as CSV.
   admin-reports.html     every student, every attempt (row level)
   admin-roster.html      the STUDENT MASTER LIST
   admin.html             the form builder
   admin-commercial.html  COMMERCIAL
                          College admin: licences bought / used / remaining,
                          contract, billing contact, invoices with Paid / Due /
                          Overdue and the next due date.
                          Super admin: the same per client PLUS an "All clients"
                          roll-up - contracted value, collected, outstanding,
                          licences used, next due per campus. Export CSV.
   admin-profile.html     CAMPUS PROFILE - what the college fills in
                          Institute details, SPOC CONTACTS (as many as they
                          want, the first is primary and is used for billing),
                          NOMENCLATURE (what they call the ID field, department,
                          programme, course, session) and DEPARTMENTS with their
                          programmes, courses and DEPARTMENT-WISE STRENGTH
                          (total + final year). Institute-level strength is
                          computed from the departments, not typed.
                          Saving writes straight into the form config: field
                          labels, the gate ID label and the dependent dropdowns.
   admin.html             FORM BUILDER            (super admin only)
   admin-data.html        DATA & API - JSON in/out (super admin only)
   The console has an "All assessments" filter: pick one paper and the cohort
   narrows to the students that paper is open to, with that paper's scores.


WHERE EVERYTHING IS EDITED  (Admin -> Form builder)
---------------------------------------------------
Campus            name, city, logo (upload), logo height, 3 brand colours
Access code       on/off, THE CODE ITSELF (what you hand each client),
                  field label, helper text
Step 2 gate       ID field label, placeholder, helper text, OTP length, resend timer
Master list       moved to its own page: admin-roster.html
                  Only ID + email are actually required. Department, programme,
                  course and session are optional reference columns now that
                  nothing is pre-filled into the form.
                     - table of every ID with Registered / Pending status
                     - search, campus switch, add / edit / remove a row
                     - Upload CSV, Download CSV, bulk paste
                     - flags invalid emails and duplicate IDs
                     - dropdowns follow the campus department/programme/course
                       config, so the master list can never hold a value the
                       form does not offer
                  Only these IDs can register.
Welcome page      eyebrow, headline, highlighted word, sub-headline, bullets,
                  trust stats, CTA label, footer note
Assessments       a list, not one paper. Add / delete / reorder, and per paper:
                    name, tag, test id, duration, questions, window, attempts,
                    sections, and the AUDIENCE:
                      visible to departments / only these programmes /
                      only these sessions   (leave empty = whole campus)
Form fields       add / edit / delete / reorder, and per field:
                    - label, backend id, type, section heading
                    - placeholder, helper text, options
                    - PRE-FILL FROM VERIFIED ID
                        email / uid  (what step 2 verified). Everything else is
                        typed by the student, so leave this on "none".
                    - LOCKED (read-only)
                    - DEPENDENT FIELD: parent field + "options by parent value"
                         Institute of Engineering & Technology > B.E. CSE, B.E. ECE
                         Chitkara Business School > BBA, MBA
                         *  > fallback list for any other parent value
                    - SHOW ONLY WHEN <field> HAS ONE OF <values>   (dept-specific fields)
                    - required, half width
Confirmation      title, message, redirect delay, dashboard URL
Export / Import   the whole configuration as JSON


SIGN-IN (PROTOTYPE)
-------------------
Admin     admin@hitbullseye.com  /  admin@123
Student   any registered email (the one-time code is shown on screen)

Access code + fresh IDs to test the full flow (the verify page lists them
under "Prototype" — click one and it fills the code, ID and email):
  Chitkara  CHI123Y   2210991209 / rahul.bansal@chitkara.edu.in
  LPU       LPU123X   12105609   / jaspreet.kaur@lpu.in
  UPES      UPES26K   500098706  / tanvi.rana@stu.upes.ac.in
  Thapar    THA26TP   102203406  / harnoor.singh@thapar.edu
  Amity     AMI26CRC  A4020264   / sara.kapoor@s.amity.edu


CAMPUSES
--------
Chitkara University · Lovely Professional University · UPES ·
Thapar Institute of Engineering & Technology · Amity University
  index.html?college=chitkara | lpu | upes | thapar | amity
Logos from the official university sites, campus photos from Wikimedia Commons.
Add more campuses from the form builder ("+ Add a campus").


BACKEND MAPPING
---------------
GET  /api/campus/{slug}/onboarding-config     the whole config object
POST /api/campus/{slug}/verify-id             { accessCode, uid, email } -> roster match
POST /api/otp/send   /api/otp/verify          step 2 code
POST /api/registration                        creates the student
GET  /api/student/{id}/report                 report page
GET  /api/campus/{slug}/students              admin cohort table
GET  /api/campus/{slug}/tests?student={id}    assessments visible to that student
redirect -> existing Hitbullseye dashboard with an SSO token

Prototype storage (browser localStorage):
  hbe_cfg_v4        campus + form configuration
  hbe_students_v9   registrations and attempts (25 demo students, results per paper)
  hbe_session_v2    who is signed in
  hbe_gate_v1       the verified-ID pass between step 2 and step 3


FILES
-----
index.html  verify.html  register.html  thankyou.html  login.html
dashboard.html  test.html  report.html
admin-analytics.html  admin-reports.html  admin-roster.html
admin.html  admin-data.html
css/app.css     one stylesheet; campus colours are CSS variables set at runtime
js/config.js    default configuration for all campuses (field schema documented on top)
js/store.js     storage, session, roster/gate, dependent-field helpers, scoring, UI
assets/         official logos + campus photos
