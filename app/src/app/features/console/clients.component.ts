import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { campusTemplate } from '../../core/api/mock/seed';
import { asApiError } from '../../core/api/api-types';
import { PortalApi } from '../../core/api/portal-api';
import { CampusConfig, PanelClient } from '../../core/models';
import { CampusService } from '../../core/services/campus.service';
import { ConsoleContext } from '../../core/services/console-context.service';
import { CampusPeople, Funnel, PeopleService } from '../../core/services/people.service';
import { StatusService } from '../../core/services/status.service';
import { SyncService } from '../../core/services/sync.service';
import { ToastService } from '../../core/services/toast.service';
import { downloadCsv, fmtDate, isActive, money, num, pctOf } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

interface ClientRow {
  c: CampusConfig;
  panel?: PanelClient;
  f: Funnel;
  complete: number;
  strength: number;
  finalYr: number;
  depts: number;
  spoc?: { name: string; email: string; role: string };
  spocs: number;
  value: number; due: number; overdue: number;
  tests: number; attempts: number;
  batches: number; batchesOpen: number;
}

/** HQ master view: every client, what they filled in, how far their students got, and their account. */
@Component({
  selector: 'hb-clients',
  standalone: true,
  imports: [IconComponent, StatusBadgeComponent],
  templateUrl: './clients.component.html'
})
export class ClientsComponent implements OnInit {
  private campuses = inject(CampusService);
  private people = inject(PeopleService);
  private ctx = inject(ConsoleContext);
  private statuses = inject(StatusService);
  private sync = inject(SyncService);
  private api = inject(PortalApi);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly data = signal<CampusPeople | null>(null);
  readonly syncing = signal(false);
  readonly settingUp = signal('');
  readonly money = money;
  readonly num = num;
  readonly fmtDate = fmtDate;

  /** clients live in the admin panel that have no portal yet */
  readonly fresh = computed(() => this.campuses.panelClients().filter(p =>
    !this.campuses.campuses().some(c => c.externalClientId === p.clientId)));

  readonly rows = computed<ClientRow[]>(() => {
    const d = this.data();
    if (!d) return [];
    return this.campuses.campuses().map(c => {
      const part: CampusPeople = {
        roster: d.roster.filter(x => x.campusId === c.id), registrations: d.registrations.filter(x => x.campusId === c.id),
        signups: d.signups.filter(x => x.campusId === c.id), drafts: d.drafts.filter(x => x.campusId === c.id)
      };
      const batches = this.campuses.batchesOf(c.id);
      const f = this.people.funnel(part, batches);
      const pf = c.profile;
      const depts = (pf.departments || []).filter(x => isActive(x));
      const spocs = (pf.spocs || []).filter(x => isActive(x));
      const checks = [!!pf.updatedAt, spocs.length > 0, depts.length > 0, depts.some(x => x.total > 0),
        !!pf.nomenclature?.uid, part.roster.length > 0, batches.every(b => !isActive(b) || (b.estimated || 0) > 0)];
      const items = (c.commercial?.items || []).filter(i => i.status !== 'Cancelled');
      return {
        c, panel: this.campuses.panelClientOf(c), f,
        complete: Math.round((checks.filter(Boolean).length * 100) / checks.length),
        strength: depts.reduce((a, b) => a + (+b.total || 0), 0),
        finalYr: depts.reduce((a, b) => a + (+b.finalYear || 0), 0),
        depts: depts.length,
        spoc: spocs.find(s => s.primary) || spocs[0], spocs: spocs.length,
        value: items.reduce((a, i) => a + (+i.amount || 0), 0),
        due: items.filter(i => i.status !== 'Paid').reduce((a, i) => a + (+i.amount || 0), 0),
        overdue: items.filter(i => i.status === 'Overdue').reduce((a, i) => a + (+i.amount || 0), 0),
        tests: (c.tests || []).filter(t => isActive(t)).length,
        attempts: part.registrations.reduce((a, r) => a + Object.keys(r.results || {}).length, 0),
        batches: batches.length, batchesOpen: batches.filter(b => isActive(b) && b.panelStatus === 'active').length
      };
    });
  });

  readonly kpi = computed(() => {
    const l = this.rows().filter(r => isActive(r.c));
    const sum = (k: (r: ClientRow) => number) => l.reduce((a, r) => a + k(r), 0);
    const est = sum(r => r.f.estimated || 0);
    return {
      clients: l.length, all: this.rows().length, fresh: this.fresh().length,
      est, onList: sum(r => r.f.onList), signedIn: sum(r => r.f.signedIn), registered: sum(r => r.f.registered),
      draft: sum(r => r.f.draft), signedOnly: sum(r => r.f.signedInOnly),
      value: sum(r => r.value), due: sum(r => r.due), pending: l.filter(r => r.complete < 100).length
    };
  });

  readonly pctOf = pctOf;

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.data.set(await this.people.load());
  }

  open(c: CampusConfig, page: string): void {
    this.ctx.setCampus(c.id);
    this.router.navigateByUrl('/console/' + page);
  }

  bar(f: Funnel): { reg: number; draft: number; signed: number; idle: number } {
    const t = f.onList || 1;
    const reg = pctOf(f.registered, t), draft = pctOf(f.draft, t), signed = pctOf(f.signedInOnly, t);
    return { reg, draft, signed, idle: Math.max(0, 100 - reg - draft - signed) };
  }

  async toggle(r: ClientRow, e: Event): Promise<void> {
    e.stopPropagation();
    const to = isActive(r.c) ? 'inactive' : 'active';
    const ok = await this.statuses.change('client', r.c.id, r.c.id, r.c.name, to, {
      what: 'client portal',
      note: to === 'inactive' ? 'Its students will not be able to register or sign in, and its placement-cell logins stop working.' : undefined
    });
    if (ok) await this.load();
  }

  async syncAll(): Promise<void> {
    this.syncing.set(true);
    const run = await this.sync.syncAll();
    this.syncing.set(false);
    if (run.ok) this.toast.ok('Synced ' + run.clients + ' clients: <b>' + run.added + '</b> new students, ' + run.updated + ' changed, ' + run.deactivated + ' marked inactive.', 6000);
    else this.toast.warn('Sync failed: ' + run.error);
    await this.load();
  }

  /** a client that exists in the admin panel but has no portal yet */
  async setUp(p: PanelClient): Promise<void> {
    const words = p.name.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\b(university|institute|college|of|the|and)\b/g, ' ').trim().split(/\s+/).filter(Boolean);
    let slug = words.length > 1 ? words.map(w => w[0]).join('') : words[0] || '';
    if (slug.length < 2) slug = p.clientId.toLowerCase();
    if (this.campuses.byId(slug)) slug += '-' + p.clientId.replace(/\D/g, '');
    this.settingUp.set(p.clientId);
    try {
      const cfg = campusTemplate(slug, p, this.campuses.panelBatches().filter(b => b.clientId === p.clientId));
      const made = await firstValueFrom(this.api.createCampus(cfg));
      this.campuses.replaceLocal(made);
      await this.sync.syncOne(made.id);
      this.toast.ok('<b>' + p.name + '</b> is set up. Fill its form, assessments and access codes next.', 6000);
      this.ctx.setCampus(made.id);
      this.router.navigateByUrl('/console/form');
    } catch (e) {
      this.toast.warn(asApiError(e).message);
    } finally {
      this.settingUp.set('');
    }
  }

  csv(): void {
    downloadCsv('hitbullseye-clients.csv',
      ['Client', 'Panel id', 'Portal status', 'Panel status', 'City', 'Profile %', 'Last updated', 'SPOC', 'SPOC email', 'Departments', 'Total strength', 'Final year',
        'Batches', 'Estimated', 'On master list', 'Signed in', 'Drafts', 'Registered', 'Attempted', 'Inactive', 'Contract value', 'Outstanding'],
      this.rows().map(r => [r.c.name, r.c.externalClientId, isActive(r.c) ? 'Active' : 'Inactive', r.panel?.status || '', r.c.campus, r.complete,
        r.c.profile.updatedAt || '', r.spoc?.name || '', r.spoc?.email || '', r.depts, r.strength, r.finalYr, r.batches,
        r.f.estimated ?? '', r.f.onList, r.f.signedIn, r.f.draft, r.f.registered, r.f.attempted, r.f.inactive, r.value, r.due]));
    this.toast.ok('Exported ' + this.rows().length + ' clients.');
  }

  print(): void { window.print(); }
}
