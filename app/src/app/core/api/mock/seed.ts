/* =====================================================================
   Demo seed. Turns the prototype's config into the portal model:
     - every campus becomes a panel client (CL-100x) + a portal config
     - each client gets two panel batches (2026, 2027), each with its own
       access code (the 2026 code is the one the prototype used)
     - the prototype master lists become the panel's student list
       (username = University ID, demo password student@123)
     - 25 seeded registrations, as in the prototype
     - a deterministic middle of the funnel: some students signed in and
       stopped, some left a half-filled draft
   One extra panel client (Chandigarh University) is active in the panel
   but has no portal yet, so HQ can demo "set up a new client".
   ===================================================================== */
import {
  AdminAccess, AuditEntry, BrandConfig, CampusConfig, Draft, PanelAdmin, PanelBatch, PanelClient,
  PanelStudent, Registration, RosterEntry, SignupMark
} from '../../models';
import { activeFields, clone, completionOf, fieldOptions, lc, regNo, splitName } from '../../util';
import { PROTOTYPE_CONFIG } from './prototype-config';

export const DEMO_STUDENT_PASSWORD = 'student@123';
export const DEMO_ADMIN_PASSWORD = 'admin@123';
export const DEMO_SUPER = { email: 'super@demo.com', password: 'super@123', name: 'Hitbullseye HQ' };

const CLIENT_IDS: Record<string, string> = {
  chitkara: 'CL-1001', lpu: 'CL-1002', upes: 'CL-1003', thapar: 'CL-1004', amity: 'CL-1005'
};
const CODES_2027: Record<string, string> = {
  chitkara: 'CHI27NX', lpu: 'LPU27NX', upes: 'UPES27N', thapar: 'THA27PF', amity: 'AMI27CRC'
};
/* two fresh IDs per campus in the 2027 batch, so the batch has something to register */
const EXTRA_2027: Record<string, string[][]> = {
  chitkara: [['2310991301', 'tanish.goel@chitkara.edu.in', 'Tanish Goel', 'Institute of Engineering & Technology', 'B.E.', 'Computer Science & Engineering', '2023-2027'],
             ['2310991302', 'mahi.arora@chitkara.edu.in', 'Mahi Arora', 'Chitkara Business School', 'BBA', 'Business Analytics', '2024-2027']],
  lpu: [['12205701', 'aditya.rana@lpu.in', 'Aditya Rana', 'School of Computer Science & Engineering', 'B.Tech', 'Data Science', '2023-2027']],
  upes: [['500108801', 'diya.bisht@stu.upes.ac.in', 'Diya Bisht', 'School of Computer Science', 'B.Tech', 'Cyber Security', '2023-2027']],
  thapar: [['102303501', 'ishaan.bedi@thapar.edu', 'Ishaan Bedi', 'Computer Science & Engineering', 'B.E.', 'Artificial Intelligence', '2023-2027']],
  amity: [['A5020101', 'kiara.sethi@s.amity.edu', 'Kiara Sethi', 'ASET', 'B.Tech', 'Computer Science & Engineering', '2023-2027']]
};

/* the 25 demo students from the prototype (store.js) */
const SEED_STUDENTS: [string, string, string, string, string, string, string, number[] | null][] = [
  ['chitkara', 'Aarav Mehta', 'aarav.mehta@chitkara.edu.in', '9812345670', '2210991201', 'B.E. Computer Science', '2026', [14, 11, 13, 9]],
  ['chitkara', 'Ishita Bansal', 'ishita.bansal@chitkara.edu.in', '9812345671', '2210991202', 'B.E. Computer Science', '2026', [13, 14, 12, 11]],
  ['chitkara', 'Rohan Verma', 'rohan.verma@chitkara.edu.in', '9812345672', '2210991203', 'B.E. Electronics', '2026', [8, 9, 10, 6]],
  ['chitkara', 'Simran Kaur', 'simran.kaur@chitkara.edu.in', '9812345673', '2210991204', 'BBA', '2027', [11, 12, 14, 10]],
  ['chitkara', 'Kabir Sethi', 'kabir.sethi@chitkara.edu.in', '9812345674', '2210991205', 'B.E. Mechanical', '2026', [6, 7, 8, 5]],
  ['chitkara', 'Ananya Rao', 'ananya.rao@chitkara.edu.in', '9812345675', '2210991206', 'MBA', '2026', [15, 14, 15, 13]],
  ['chitkara', 'Devansh Gupta', 'devansh.gupta@chitkara.edu.in', '9812345676', '2210991207', 'BCA', '2027', null],
  ['chitkara', 'Nikita Sharma', 'nikita.sharma@chitkara.edu.in', '9812345677', '2210991208', 'B.E. Computer Science', '2026', [10, 8, 11, 9]],
  ['lpu', 'Harsh Chauhan', 'harsh.chauhan@lpu.in', '9876500011', '12105601', 'B.Tech', '2026', [12, 10, 13]],
  ['lpu', 'Meera Nair', 'meera.nair@lpu.in', '9876500012', '12105602', 'MBA', '2026', [15, 14, 13]],
  ['lpu', 'Yash Dhingra', 'yash.dhingra@lpu.in', '9876500013', '12105603', 'BCA', '2027', [7, 9, 8]],
  ['lpu', 'Tanya Sood', 'tanya.sood@lpu.in', '9876500014', '12105604', 'B.Tech', '2026', null],
  ['upes', 'Kritika Joshi', 'kritika.joshi@stu.upes.ac.in', '9720011201', '500098701', 'School of Computer Science', '2026', [14, 13, 12, 11]],
  ['upes', 'Aman Rawat', 'aman.rawat@stu.upes.ac.in', '9720011202', '500098702', 'School of Business', '2026', [11, 10, 13, 9]],
  ['upes', 'Sanya Thapliyal', 'sanya.thapliyal@stu.upes.ac.in', '9720011203', '500098703', 'School of Advanced Engineering', '2026', [9, 8, 10, 7]],
  ['upes', 'Dev Chauhan', 'dev.chauhan@stu.upes.ac.in', '9720011204', '500098704', 'School of Law', '2027', null],
  ['upes', 'Ira Negi', 'ira.negi@stu.upes.ac.in', '9720011205', '500098705', 'School of Design', '2026', [12, 14, 13, 12]],
  ['thapar', 'Gurleen Sidhu', 'gurleen.sidhu@thapar.edu', '9815500301', '102203401', 'Computer Science & Engineering', '2026', [14, 13, 13, 14]],
  ['thapar', 'Nikhil Bhatia', 'nikhil.bhatia@thapar.edu', '9815500302', '102203402', 'Electronics & Communication', '2026', [12, 11, 12, 10]],
  ['thapar', 'Aditi Sharma', 'aditi.sharma@thapar.edu', '9815500303', '102203403', 'Mechanical Engineering', '2026', [8, 9, 9, 7]],
  ['thapar', 'Rehan Qureshi', 'rehan.qureshi@thapar.edu', '9815500304', '102203404', 'Chemical Engineering', '2027', null],
  ['thapar', 'Pari Goyal', 'pari.goyal@thapar.edu', '9815500305', '102203405', 'MBA', '2026', [13, 12, 14, 11]],
  ['amity', 'Vivaan Khanna', 'vivaan.khanna@s.amity.edu', '9900011122', 'A4020261', 'ASET', '2026', [13, 11, 12, 10]],
  ['amity', 'Riya Malhotra', 'riya.malhotra@s.amity.edu', '9900011123', 'A4020262', 'Amity Business School', '2026', [14, 13, 14, 12]],
  ['amity', 'Arjun Pillai', 'arjun.pillai@s.amity.edu', '9900011124', 'A4020263', 'ASET', '2027', [9, 8, 10, 7]]
];

export interface SeedData {
  brand: BrandConfig;
  campuses: Record<string, CampusConfig>;
  panel: {
    clients: PanelClient[];
    batches: PanelBatch[];
    students: (PanelStudent & { password: string })[];
    admins: (PanelAdmin & { password: string })[];
  };
  registrations: Registration[];
  drafts: Draft[];
  signups: SignupMark[];
  adminAccess: AdminAccess[];
  audit: AuditEntry[];
}

export function batchIdFor(slug: string, year: number): string {
  return 'B-' + CLIENT_IDS[slug].replace('CL-', '') + '-' + year;
}

/** graduation year from a session like "2022-2026" */
function yearOf(session: string | undefined): number {
  const m = /(\d{4})\s*$/.exec(String(session || ''));
  return m ? +m[1] : 2026;
}

/* Work out a consistent department / programme / course for a seeded student
   from a loose seed value (a programme like "MBA" or a course). Same rules as
   the prototype's hbeAcadFor. */
function acadFor(c: CampusConfig, raw: string) {
  const dep = c.fields.find(f => f.id === 'department');
  const prog = c.fields.find(f => f.id === 'programme');
  const crs = c.fields.find(f => f.id === 'course');
  const depts = dep?.options || [];
  const progMap = prog?.optionsMap || {};
  const crsMap = crs?.optionsMap || {};
  const crsOn = crs?.dependsOn || 'department';
  const coursesFor = (d: string, p: string) => crsMap[crsOn === 'programme' ? p : d] || crsMap['*'] || [];
  const build = (d: string, p: string) => ({ department: d, programme: p, course: coursesFor(d, p)[0] || '' });

  for (const d of Object.keys(progMap)) if ((progMap[d] || []).indexOf(raw) > -1) return build(d, raw);
  for (const k of Object.keys(crsMap)) {
    if (k === '*') continue;
    if ((crsMap[k] || []).indexOf(raw) > -1) {
      if (crsOn === 'programme') {
        for (const d2 of Object.keys(progMap)) if ((progMap[d2] || []).indexOf(k) > -1) return { department: d2, programme: k, course: raw };
        return { department: depts[0] || '', programme: k, course: raw };
      }
      return { department: k, programme: (progMap[k] || [])[0] || '', course: raw };
    }
  }
  const d0 = depts[0] || '';
  return build(d0, (progMap[d0] || [])[0] || '');
}

function toCampus(slug: string, raw: any): CampusConfig {
  const c = clone(raw);
  const code2026 = c.security?.code || '';
  const cfg: CampusConfig = {
    id: slug,
    externalClientId: CLIENT_IDS[slug],
    status: 'active',
    name: c.name, shortName: c.shortName, campus: c.campus,
    logo: c.logo, logoHeight: c.logoHeight, photo: c.photo, theme: c.theme,
    welcome: c.welcome, campusPoints: c.campusPoints || [],
    security: { enabled: !!c.security?.enabled, label: c.security?.label || 'Campus access code', help: c.security?.help || '' },
    gate: c.gate, verification: c.verification || { otpLength: 6, resendSeconds: 30 },
    fields: (c.fields || []).map((f: any) => ({ ...f, status: 'active' })),
    tests: (c.tests || []).map((t: any) => ({ ...t, status: 'active', audience: { batches: [], ...t.audience } })),
    testimonials: c.testimonials || [],
    thankyou: {
      title: c.thankyou?.title || "You're all set!", message: c.thankyou?.message || '',
      redirectSeconds: c.thankyou?.redirectSeconds ?? 8, dashboardLabel: c.thankyou?.dashboardLabel || 'Go to my dashboard'
    },
    profile: {
      ...c.profile,
      spocs: (c.profile?.spocs || []).map((s: any) => ({ ...s, status: 'active' })),
      departments: (c.profile?.departments || []).map((d: any) => ({ ...d, status: 'active' }))
    },
    commercial: c.commercial,
    batches: {},
    updatedAt: '2026-09-01T10:00:00.000Z'
  };
  const finalYear = cfg.profile.departments.reduce((a, d) => a + (+d.finalYear || 0), 0);
  cfg.batches[batchIdFor(slug, 2026)] = {
    status: 'active', accessCode: code2026, estimated: finalYear,
    estimatedBy: cfg.profile.spocs[0]?.name || 'Placement cell', estimatedAt: '2026-08-20T10:00:00.000Z'
  };
  cfg.batches[batchIdFor(slug, 2027)] = {
    status: 'active', accessCode: CODES_2027[slug],
    /* Amity has not told us yet - shows the "fill in your estimate" prompt */
    estimated: slug === 'amity' ? undefined : Math.round(finalYear * 1.08),
    estimatedBy: slug === 'amity' ? undefined : cfg.profile.spocs[0]?.name,
    estimatedAt: slug === 'amity' ? undefined : '2026-08-20T10:00:00.000Z'
  };
  return cfg;
}

export function buildSeed(): SeedData {
  const P = PROTOTYPE_CONFIG;
  const brand: BrandConfig = {
    product: P.brand.product, logo: P.brand.logo, supportEmail: P.brand.supportEmail,
    steps: P.brand.steps, faq: P.brand.faq
  };

  const campuses: Record<string, CampusConfig> = {};
  const clients: PanelClient[] = [];
  const batches: PanelBatch[] = [];
  const students: (PanelStudent & { password: string })[] = [];
  const admins: (PanelAdmin & { password: string })[] = [];

  Object.keys(P.colleges).forEach(slug => {
    const raw = P.colleges[slug];
    const cfg = toCampus(slug, raw);
    campuses[slug] = cfg;
    clients.push({ clientId: cfg.externalClientId, name: cfg.name, city: cfg.campus, status: 'active' });
    [2026, 2027].forEach(y => batches.push({
      batchId: batchIdFor(slug, y), clientId: cfg.externalClientId, name: 'Batch ' + y, passingYear: y, status: 'active'
    }));
    const sp = cfg.profile.spocs[0];
    admins.push({
      adminRef: 'AD-' + cfg.externalClientId.slice(3), clientId: cfg.externalClientId,
      name: sp?.name || 'Placement Cell', email: 'placement@' + slug + '.demo',
      username: 'placement@' + slug + '.demo', password: DEMO_ADMIN_PASSWORD, status: 'active'
    });
  });

  /* a client that is live in the panel but has no portal yet */
  clients.push({ clientId: 'CL-1006', name: 'Chandigarh University', city: 'Mohali, Punjab', status: 'active' });
  batches.push({ batchId: 'B-1006-2026', clientId: 'CL-1006', name: 'Batch 2026', passingYear: 2026, status: 'active' });
  admins.push({
    adminRef: 'AD-1006', clientId: 'CL-1006', name: 'Training & Placement', email: 'placement@cu.demo',
    username: 'placement@cu.demo', password: DEMO_ADMIN_PASSWORD, status: 'active'
  });
  students.push({
    studentRef: 'ST-1006-1', clientId: 'CL-1006', batchId: 'B-1006-2026', uid: '22BCS10001',
    email: 'rhea.kapoor@cuchd.in', name: 'Rhea Kapoor', department: 'University Institute of Engineering',
    programme: 'B.E.', course: 'Computer Science & Engineering', session: '2022-2026',
    username: '22BCS10001', password: DEMO_STUDENT_PASSWORD, status: 'active'
  });

  /* ---------------- registrations (the 25 demo students) ---------------- */
  const base = Date.parse('2026-10-06T10:00:00.000Z');
  const registrations: Registration[] = SEED_STUDENTS.map((r, i) => {
    const c = campuses[r[0]];
    const ros = (P.colleges[r[0]].roster || []).find((x: any) => lc(x.email) === lc(r[2]));
    const acad = ros ? { department: ros.department, programme: ros.programme || '', course: ros.course } : acadFor(c, r[5]);
    const session = ros ? ros.session : (String(r[6]).length === 4 ? (Number(r[6]) - 4) + '-' + r[6] : r[6]);
    const nm = splitName(r[1]);
    return {
      id: 'S' + (1000 + i),
      regNo: regNo(c, 4021 + i),
      campusId: r[0],
      batchId: batchIdFor(r[0], yearOf(session)),
      uid: r[4], email: r[2], name: r[1], phone: r[3],
      department: acad.department, programme: acad.programme, course: acad.course, session,
      data: {
        firstName: { label: 'First Name', value: nm.first },
        lastName: { label: 'Last Name', value: nm.last },
        email: { label: 'Email Address', value: r[2] },
        universityId: { label: c.gate.idLabel, value: r[4] },
        phone: { label: 'Mobile Number', value: r[3] },
        department: { label: c.profile.nomenclature.department, value: acad.department },
        programme: { label: c.profile.nomenclature.programme, value: acad.programme },
        course: { label: c.profile.nomenclature.course, value: acad.course },
        session: { label: c.profile.nomenclature.session, value: session }
      },
      declaration: { at: new Date(base - (i + 1) * 86400000 * 1.4).toISOString(), rows: 9, mode: 'self-verified' },
      verifiedEmail: true,
      verifiedVia: i % 4 === 0 ? 'credentials' : 'otp',
      registeredAt: new Date(base - (i + 1) * 86400000 * 1.4).toISOString(),
      results: {},
      status: 'active',
      _seedRaw: r[7],
      _seedIdx: i
    } as Registration;
  });
  /* one inactive student, so the filter and the badge have something to show */
  const inactive = registrations.find(x => x.email === 'kabir.sethi@chitkara.edu.in');
  if (inactive) {
    inactive.status = 'inactive';
    inactive.statusReason = 'Left the programme (transfer to another university)';
    inactive.statusAt = '2026-09-28T09:30:00.000Z';
    inactive.statusBy = 'Dr. Neha Arora';
  }

  /* ---------------- panel student list = prototype rosters + seeded students ---------------- */
  Object.keys(P.colleges).forEach(slug => {
    const c = campuses[slug];
    const seen = new Set<string>();
    const add = (row: { uid: string; email: string; name: string; department?: string; programme?: string; course?: string; session?: string }) => {
      if (seen.has(lc(row.email))) return;
      seen.add(lc(row.email));
      students.push({
        studentRef: 'ST-' + c.externalClientId.slice(3) + '-' + (seen.size),
        clientId: c.externalClientId,
        batchId: batchIdFor(slug, yearOf(row.session)),
        uid: row.uid, email: lc(row.email), name: row.name,
        department: row.department || '', programme: row.programme || '', course: row.course || '', session: row.session || '',
        username: row.uid, password: DEMO_STUDENT_PASSWORD, status: 'active'
      });
    };
    (P.colleges[slug].roster || []).forEach((r: any) => add(r));
    registrations.filter(s => s.campusId === slug).forEach(s => add({
      uid: s.uid, email: s.email, name: s.name, department: s.department, programme: s.programme, course: s.course, session: s.session
    }));
    (EXTRA_2027[slug] || []).forEach(x => add({ uid: x[0], email: x[1], name: x[2], department: x[3], programme: x[4], course: x[5], session: x[6] }));
  });

  /* results are not seeded here: the analytics layer (test-platform.service.ts)
     derives them from each seeded student's simulated answer rows */

  /* ---------------- middle of the funnel: signed in, some left a draft ---------------- */
  const signups: SignupMark[] = [];
  const drafts: Draft[] = [];
  const done = new Set(registrations.map(x => lc(x.email)));
  const now = base;
  Object.keys(campuses).forEach(slug => {
    const c = campuses[slug];
    const open = students.filter(s => s.clientId === c.externalClientId && !done.has(lc(s.email)));
    const take = Math.min(open.length, Math.max(1, Math.round(open.length * 0.45)));
    open.slice(0, take).forEach((r, i) => {
      const key = [slug, r.batchId, lc(r.uid)].join('|');
      const startedAt = new Date(now - (i + 2) * 43200000).toISOString();
      const touchedAt = new Date(now - (i + 1) * 21600000).toISOString();
      signups.push({ key, campusId: slug, batchId: r.batchId, uid: r.uid, email: r.email, via: i % 2 ? 'credentials' : 'otp', startedAt, touchedAt });
      if (i % 3 !== 0) return;
      /* a half-filled form: name, phone and the first academic choice */
      const nm = splitName(r.name);
      const values: Record<string, string> = {};
      activeFields(c).forEach(f => {
        if (f.prefill === 'email') values[f.id] = r.email;
        else if (f.prefill === 'uid') values[f.id] = r.uid;
        else values[f.id] = '';
      });
      values['firstName'] = nm.first;
      values['lastName'] = nm.last;
      values['phone'] = '98' + String(r.uid).replace(/\D/g, '').padEnd(8, '7').slice(-8);
      const dep = c.fields.find(f => f.id === 'department');
      if (dep && r.department && fieldOptions(dep, values).indexOf(r.department) > -1) values['department'] = r.department;
      drafts.push({
        key, campusId: slug, batchId: r.batchId, uid: r.uid, email: r.email, values, step: 'form',
        completion: completionOf(c, values), createdAt: startedAt, updatedAt: touchedAt, state: 'open'
      });
    });
  });

  const adminAccess: AdminAccess[] = admins.filter(a => a.clientId !== 'CL-1006').map(a => ({
    adminRef: a.adminRef,
    campusId: Object.keys(CLIENT_IDS).find(k => CLIENT_IDS[k] === a.clientId) || '',
    name: a.name, email: a.email, username: a.username, panelStatus: a.status, status: 'active'
  }));

  const audit: AuditEntry[] = [];
  if (inactive) {
    audit.push({
      id: 'AU-SEED-1', at: inactive.statusAt!, actor: { role: 'college_admin', name: 'Dr. Neha Arora', email: 'placement@chitkara.demo' },
      campusId: 'chitkara', entity: 'student', entityId: inactive.id, entityLabel: inactive.name + ' (' + inactive.uid + ')',
      action: 'inactivate', reason: inactive.statusReason
    });
  }

  return {
    brand, campuses,
    panel: { clients, batches, students, admins },
    registrations, drafts, signups, adminAccess, audit
  };
}

/** A fresh portal for a client that exists in the panel but not here yet. */
export function campusTemplate(slug: string, client: PanelClient, batchList: PanelBatch[]): CampusConfig {
  const base = toCampus('chitkara', PROTOTYPE_CONFIG.colleges.chitkara);
  const short = client.name.split(' ')[0];
  base.id = slug;
  base.externalClientId = client.clientId;
  base.name = client.name;
  base.shortName = short;
  base.campus = client.city || '';
  base.logo = 'assets/hitbullseye-real.png';
  base.logoHeight = 34;
  base.photo = 'assets/campus-chitkara.jpg';
  base.theme = { primary: '#0b4f9e', primaryDark: '#062f61', accent: '#f5a524' };
  base.welcome = { ...base.welcome, eyebrow: 'Placement Readiness · ' + short };
  base.testimonials = [];
  base.gate = { idLabel: 'University ID', idPlaceholder: '', idHelp: '' };
  base.profile = {
    website: '', established: '', spocs: [], departments: [],
    nomenclature: { uid: 'University ID', department: 'Department', programme: 'Programme', course: 'Course', session: 'Session' }
  };
  base.commercial = { clientName: client.name, contract: { id: '', start: '', end: '', po: '' }, rate: 0, items: [] };
  base.tests = base.tests.slice(0, 1).map(t => ({ ...t, id: slug + '-apt-1', name: 'Placement Aptitude Test', audience: { departments: [], programmes: [], sessions: [], batches: [] } }));
  base.fields = base.fields.map(f => {
    if (f.id === 'universityId') return { ...f, label: 'University ID' };
    if (f.id === 'department') return { ...f, label: 'Department', options: [] };
    if (f.dependsOn) return { ...f, optionsMap: {} };
    if (f.showIf) return { ...f, showIf: undefined };
    return f;
  });
  base.batches = {};
  batchList.forEach(b => {
    base.batches[b.batchId] = {
      status: 'active',
      accessCode: (short.slice(0, 3) + String(b.passingYear || '').slice(-2) + Math.random().toString(36).slice(2, 5)).toUpperCase()
    };
  });
  base.updatedAt = new Date().toISOString();
  return base;
}
