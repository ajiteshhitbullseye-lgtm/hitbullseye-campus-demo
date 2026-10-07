/* Small pure helpers shared across the app (ported from the prototype's store.js). */
import { Assessment, CampusConfig, FormField, Registration, SectionResult, Status, TestResult } from './models';

export const MAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
export const PHONE_RE = /^[6-9]\d{9}$/;

export function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(prefix: string): string {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function isActive(x: { status?: Status } | null | undefined): boolean {
  return !!x && (x.status || 'active') === 'active';
}

export function lc(s: unknown): string {
  return String(s ?? '').trim().toLowerCase();
}

export function initials(n: string | undefined): string {
  const p = String(n || 'S').trim().split(/\s+/);
  return (((p[0] || '')[0] || 'S') + ((p[1] || '')[0] || '')).toUpperCase();
}

export function splitName(name: string): { first: string; last: string } {
  const parts = String(name || '').trim().split(/\s+/);
  if (parts.length < 2) return { first: parts[0] || '', last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

export function maskEmail(e: string): string {
  e = String(e || '');
  const at = e.indexOf('@');
  if (at < 2) return e;
  return e.slice(0, 2) + new Array(Math.max(3, at - 1)).join('•') + e.slice(at);
}

/** Indian digit grouping with the rupee sign: 1234567 -> ₹12,34,567 */
export function money(n: number): string {
  const v = Math.round(+n || 0);
  const s = String(Math.abs(v));
  const last3 = s.slice(-3), rest = s.slice(0, -3);
  const out = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  return (v < 0 ? '-' : '') + '₹' + out;
}

export function num(n: number): string {
  return (+n || 0).toLocaleString('en-IN');
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
}

export function fmtDateTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return fmtDate(iso) + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/** "05 Oct 2026" <-> "2026-10-05" for <input type=date> */
export function toIsoDay(v: string | Date | undefined | null): string {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
export function prettyDay(isoDay: string): string {
  if (!isoDay) return '';
  const p = String(isoDay).split('-');
  if (p.length !== 3) return isoDay;
  return p[2] + ' ' + MON[+p[1] - 1] + ' ' + p[0];
}

export function ago(iso: string | undefined | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '—';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + ' min ago';
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
  const days = Math.round(hrs / 24);
  if (days < 31) return days + (days === 1 ? ' day ago' : ' days ago');
  const mo = Math.round(days / 30);
  return mo + (mo === 1 ? ' month ago' : ' months ago');
}

export function pctOf(part: number, whole: number): number {
  return whole ? Math.round((part * 100) / whole) : 0;
}

/** a tiny share should read "under 1%", not "0%" */
export function pctText(part: number, whole: number): string {
  if (!whole) return '—';
  const p = (part * 100) / whole;
  return p > 0 && p < 1 ? 'under 1%' : Math.round(p) + '%';
}

export function csvList(v: string): string[] {
  return String(v || '').split(',').map(x => x.trim()).filter(Boolean);
}
export function lines(v: string): string[] {
  return String(v || '').split('\n').map(x => x.trim()).filter(Boolean);
}

export function regNo(c: CampusConfig, n?: number): string {
  const p = (c.shortName || 'HB').replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
  return 'HB-' + p + '-26-' + (n || Math.floor(1000 + Math.random() * 8999));
}

/* ---------------- downloads ---------------- */
export function downloadBlob(blob: Blob, name: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

export function downloadCsv(name: string, head: string[], rows: unknown[][]): void {
  const q = (v: unknown) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const text = [head.map(q).join(','), ...rows.map(r => r.map(q).join(','))].join('\n');
  downloadBlob(new Blob([text], { type: 'text/csv' }), name);
}

export function downloadJson(name: string, payload: unknown): void {
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), name);
}

/* ---------------- form engine ---------------- */
export function activeFields(c: CampusConfig): FormField[] {
  return (c.fields || []).filter(f => isActive(f));
}

export function fieldOptions(field: FormField, values: Record<string, string>): string[] {
  if (field.dependsOn) {
    const parent = values[field.dependsOn];
    const map = field.optionsMap || {};
    if (parent && map[parent]) return map[parent];
    if (map['*']) return map['*'];
    return [];
  }
  return field.options || [];
}

export function fieldVisible(field: FormField, values: Record<string, string>): boolean {
  const r = field.showIf;
  if (!r || !r.field) return true;
  const v = values[r.field];
  if (!v) return false;
  return (r.values || []).indexOf(v) > -1;
}

export function fieldError(f: FormField, raw: string): string {
  const v = String(raw ?? '').trim();
  if (f.required && !v) {
    return f.type === 'checkbox' ? 'Please accept this to continue'
      : (f.type === 'select' || f.type === 'radio') ? 'Please select an option'
        : 'This field is required';
  }
  if (v && f.type === 'email' && !MAIL_RE.test(v)) return 'Enter a valid email address';
  if (v && f.type === 'tel' && !PHONE_RE.test(v)) return 'Enter a valid 10-digit mobile number';
  if (v && f.type === 'number' && isNaN(Number(v))) return 'Numbers only';
  return '';
}

/** Share (0..100) of the visible required fields that are filled in and valid. */
export function completionOf(c: CampusConfig, values: Record<string, string>): number {
  const req = activeFields(c).filter(f => f.required && fieldVisible(f, values));
  if (!req.length) return 100;
  const ok = req.filter(f => !fieldError(f, values[f.id] || '')).length;
  return Math.round((ok * 100) / req.length);
}

/* ---------------- assessments ---------------- */
export function activeTests(c: CampusConfig): Assessment[] {
  return (c.tests || []).filter(t => isActive(t));
}

export function audienceOk(test: Assessment, st: Pick<Registration, 'department' | 'programme' | 'session' | 'batchId'>): boolean {
  const a = test.audience || { departments: [], programmes: [], sessions: [] };
  const ok = (list: string[] | undefined, value: string) => !list || !list.length || list.indexOf(value) > -1;
  return ok(a.departments, st.department) && ok(a.programmes, st.programme) &&
    ok(a.sessions, st.session) && ok(a.batches, st.batchId);
}

export function testsFor(c: CampusConfig, st: Registration): Assessment[] {
  return activeTests(c).filter(t => audienceOk(t, st));
}

export function audienceText(test: Assessment, batchName?: (id: string) => string): string {
  const a = test.audience || { departments: [], programmes: [], sessions: [] };
  const bits: string[] = [];
  if (a.departments?.length) bits.push(a.departments.join(', '));
  if (a.programmes?.length) bits.push(a.programmes.join(', '));
  if (a.sessions?.length) bits.push(a.sessions.join(', '));
  if (a.batches?.length) bits.push(a.batches.map(b => batchName ? batchName(b) : b).join(', '));
  return bits.length ? bits.join(' · ') : 'Open to the whole campus';
}

export function isRestricted(test: Assessment): boolean {
  const a = test.audience || { departments: [], programmes: [], sessions: [] };
  return !!(a.departments?.length || a.programmes?.length || a.sessions?.length || a.batches?.length);
}

/* ---------------- results ---------------- */
export function resultList(st: Registration | null | undefined): TestResult[] {
  const out = Object.values(st?.results || {}).filter(Boolean) as TestResult[];
  return out.sort((a, b) => +new Date(b.attemptedAt) - +new Date(a.attemptedAt));
}
export function latestResult(st: Registration | null | undefined): TestResult | null {
  return resultList(st)[0] || null;
}

export function band(pct: number): { label: string; cls: string } {
  if (pct >= 75) return { label: 'Excellent', cls: 'ok' };
  if (pct >= 55) return { label: 'Good', cls: 'brand' };
  if (pct >= 40) return { label: 'Average', cls: 'warn' };
  return { label: 'Needs Work', cls: 'err' };
}

export function percentileFromPct(pct: number): number {
  const p = Math.round(12 + pct * 0.92);
  return Math.max(3, Math.min(99.4, p));
}

export function makeResult(sections: SectionResult[], timeMin: number): TestResult {
  let score = 0, max = 0, att = 0, corr = 0;
  sections.forEach(s => {
    s.score = s.correct;
    s.max = s.total;
    s.attempted = s.correct + s.wrong;
    s.accuracy = s.attempted ? Math.round((s.correct * 100) / s.attempted) : 0;
    s.pct = Math.round((s.score * 100) / s.max);
    score += s.score; max += s.max; att += s.attempted; corr += s.correct;
  });
  const pct = Math.round((score * 100) / max);
  const strong = sections.slice().sort((a, b) => (b.pct || 0) - (a.pct || 0));
  return {
    testId: '', testName: '',
    attemptedAt: nowIso(),
    score, max, pct,
    accuracy: att ? Math.round((corr * 100) / att) : 0,
    attempted: att, timeMin: timeMin || 0,
    percentile: percentileFromPct(pct),
    sections,
    strengths: strong.slice(0, 2).map(s => s.name),
    improve: strong.slice(-2).map(s => s.name)
  };
}

/* ---------------- colours ---------------- */
export function hexToRgb(hex: string): string {
  let h = String(hex || '#0b4f9e').replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
}

/** split a CSV line, honouring "quoted, values" */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim());
}
