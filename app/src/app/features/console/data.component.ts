import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PanelApi } from '../../core/api/panel-api';
import { PortalApi } from '../../core/api/portal-api';
import { MockDb } from '../../core/api/mock/mock-db';
import { MockPanelApi } from '../../core/api/mock/mock-panel-api';
import { DEMO_STUDENT_PASSWORD } from '../../core/api/mock/seed';
import { SyncRun } from '../../core/models';
import { CampusService } from '../../core/services/campus.service';
import { ConsoleContext } from '../../core/services/console-context.service';
import { DialogService } from '../../core/services/dialog.service';
import { SyncService } from '../../core/services/sync.service';
import { ToastService } from '../../core/services/toast.service';
import { StorageService } from '../../core/storage.service';
import { ago, downloadJson, fmtDateTime, lc, MAIL_RE, splitCsvLine } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';

const HEAD_ALIAS: Record<string, string> = {
  universityid: 'uid', uid: 'uid', id: 'uid', rollno: 'uid', rollnumber: 'uid', registrationnumber: 'uid', sapid: 'uid',
  enrolmentnumber: 'uid', enrollmentnumber: 'uid', email: 'email', emailaddress: 'email', emailonrecord: 'email',
  name: 'name', fullname: 'name', studentname: 'name', department: 'department', school: 'department', dept: 'department',
  programme: 'programme', program: 'programme', course: 'course', specialisation: 'course', specialization: 'course', branch: 'course',
  session: 'session', batch: 'batch'
};

interface PlanRow { line: number; uid: string; email: string; name: string; department: string; programme: string; course: string; session: string; }

/**
 * HQ: the link between this portal and the Hitbullseye admin panel —
 * sync history, what was sent back, downloads, and (demo only) a stand-in
 * for the admin panel's own Excel upload.
 */
@Component({
  selector: 'hb-data',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './data.component.html'
})
export class DataComponent implements OnInit {
  readonly ctx = inject(ConsoleContext);
  private campuses = inject(CampusService);
  private portal = inject(PortalApi);
  private panel = inject(PanelApi);
  private sync = inject(SyncService);
  private dialogs = inject(DialogService);
  private toast = inject(ToastService);
  private store = inject(StorageService);
  private db = environment.useMockApi ? inject(MockDb) : null;

  readonly env = environment;
  readonly runs = signal<SyncRun[]>([]);
  readonly syncing = signal(false);
  readonly ago = ago;
  readonly fmtDateTime = fmtDateTime;
  readonly outbox = computed(() => { this.tick(); return this.panel instanceof MockPanelApi ? this.panel.outbox.slice(0, 20) : []; });
  readonly tick = signal(0);
  readonly json = JSON.stringify;

  /* demo: Excel upload in the admin panel */
  csvText = '';
  batchId = '';
  readonly plan = signal<{ rows: PlanRow[]; bad: { line: number; why: string }[]; dupes: number; header: boolean } | null>(null);
  readonly batches = computed(() => this.ctx.batches());

  async ngOnInit(): Promise<void> {
    await this.loadRuns();
    this.batchId = this.batches().find(b => b.passingYear === 2027)?.batchId || this.batches()[0]?.batchId || '';
  }

  async loadRuns(): Promise<void> { this.runs.set(await firstValueFrom(this.portal.getSyncRuns())); }

  async syncAll(): Promise<void> {
    this.syncing.set(true);
    const r = await this.sync.syncAll();
    this.syncing.set(false);
    this.toast[r.ok ? 'ok' : 'warn'](r.ok ? 'Sync done: ' + r.added + ' new, ' + r.updated + ' changed, ' + r.deactivated + ' marked inactive.' : 'Sync failed: ' + r.error);
    await this.loadRuns();
    this.tick.update(v => v + 1);
  }

  async download(what: 'config' | 'roster' | 'registrations' | 'drafts' | 'audit' | 'all'): Promise<void> {
    const id = this.ctx.campusId() || undefined;
    if (what === 'config') return downloadJson(id + '-config.json', this.ctx.campus());
    if (what === 'roster') return downloadJson(id + '-master-list.json', await firstValueFrom(this.portal.getRoster({ campusId: id })));
    if (what === 'registrations') return downloadJson(id + '-registrations.json', await firstValueFrom(this.portal.getRegistrations({ campusId: id })));
    if (what === 'drafts') return downloadJson(id + '-drafts.json', await firstValueFrom(this.portal.getDrafts(id)));
    if (what === 'audit') return downloadJson(id + '-activity.json', await firstValueFrom(this.portal.getAudit({ campusId: id })));
    const all = await firstValueFrom(forkJoin({
      campuses: this.portal.getCampuses(), roster: this.portal.getRoster(), registrations: this.portal.getRegistrations(),
      drafts: this.portal.getDrafts(), signups: this.portal.getSignups(), audit: this.portal.getAudit(), syncRuns: this.portal.getSyncRuns()
    }));
    downloadJson('hitbullseye-portal-export.json', all);
  }

  /* ---------------- demo: the admin panel's Excel upload ---------------- */
  sample(): void {
    const c = this.ctx.campus();
    if (!c) return;
    const d = c.profile.departments[0]?.name || 'Department';
    const dom = 'demo.' + c.id + '.edu';
    const n = 9000 + Math.floor(Math.random() * 900);
    this.csvText = ['University ID,Email,Name,Department,Programme,Course,Session',
      ...['Aditi Raman', 'Karan Vohra', 'Meher Singh'].map((nm, i) => [String(n + i), nm.toLowerCase().replace(' ', '.') + '@' + dom, nm, d, 'B.Tech', 'Computer Science', '2023-2027'].join(','))
    ].join('\n');
    this.check();
  }

  check(): void {
    const txt = this.csvText.replace(/\r/g, '').trim();
    if (!txt) { this.plan.set(null); return; }
    const lines = txt.split('\n').filter(l => l.trim());
    const first = splitCsvLine(lines[0]).map(h => HEAD_ALIAS[h.toLowerCase().replace(/[^a-z]/g, '')] || '');
    const header = first.filter(Boolean).length >= 2;
    const cols = header ? first : ['uid', 'email', 'name', 'department', 'programme', 'course', 'session'];
    const body = header ? lines.slice(1) : lines;
    const c = this.ctx.campus()!;
    const existing = new Set((this.db?.panel.students || []).filter(s => s.clientId === c.externalClientId).map(s => lc(s.uid)));
    const taken = new Set((this.db?.panel.students || []).map(s => lc(s.email)));
    const seen = new Set<string>();
    const rows: PlanRow[] = [], bad: { line: number; why: string }[] = [];
    let dupes = 0;
    body.forEach((l, i) => {
      const p = splitCsvLine(l), r: Record<string, string> = {};
      cols.forEach((k, ci) => { if (k) r[k] = p[ci] || ''; });
      const line = i + (header ? 2 : 1);
      if (!r['uid']) return bad.push({ line, why: 'no University ID' });
      if (!MAIL_RE.test(r['email'] || '')) return bad.push({ line, why: 'email looks wrong: ' + (r['email'] || '(empty)') });
      if (seen.has(lc(r['uid']))) return bad.push({ line, why: 'ID ' + r['uid'] + ' is repeated in this file' });
      if (taken.has(lc(r['email']))) return bad.push({ line, why: r['email'] + ' is already used by another student (one email = one student)' });
      seen.add(lc(r['uid']));
      if (existing.has(lc(r['uid']))) { dupes++; return; }
      rows.push({ line, uid: r['uid'], email: lc(r['email']), name: r['name'] || '', department: r['department'] || '', programme: r['programme'] || '', course: r['course'] || '', session: r['session'] || '' });
      return;
    });
    this.plan.set({ rows, bad, dupes, header });
  }

  file(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { this.csvText = String(r.result); this.check(); };
    r.readAsText(f);
    (ev.target as HTMLInputElement).value = '';
  }

  async uploadToPanel(): Promise<void> {
    const p = this.plan(), c = this.ctx.campus();
    if (!p || !p.rows.length || !c || !this.db) return;
    p.rows.forEach((r, i) => this.db!.panel.students.push({
      studentRef: 'ST-' + c.externalClientId.slice(3) + '-X' + Date.now().toString(36) + i, clientId: c.externalClientId, batchId: this.batchId,
      uid: r.uid, email: r.email, name: r.name, department: r.department, programme: r.programme, course: r.course, session: r.session,
      username: r.uid, password: DEMO_STUDENT_PASSWORD, status: 'active'
    }));
    this.db.save('panel');
    this.toast.ok('<b>' + p.rows.length + '</b> students added in the (demo) admin panel. Now press <b>Sync</b> to bring them into the portal.', 7000);
    this.csvText = '';
    this.plan.set(null);
  }

  async reset(): Promise<void> {
    if (!this.db) return;
    const ok = await this.dialogs.confirm('Reset the demo data?', 'Every registration, draft, attempt and change made in this browser goes; the demo starts again from the seed. Nothing on a real server is touched.', 'Reset demo', true);
    if (!ok) return;
    this.db.reseed();
    this.store.clearAll();
    this.db.saveAll();
    location.href = '/';
  }
}
