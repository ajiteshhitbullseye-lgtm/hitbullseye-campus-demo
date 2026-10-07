import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PortalApi } from '../../core/api/portal-api';
import { SyncRun } from '../../core/models';
import { ConsoleContext } from '../../core/services/console-context.service';
import { CampusPeople, Funnel, FunnelRow, PeopleService } from '../../core/services/people.service';
import { StatusService } from '../../core/services/status.service';
import { SyncService } from '../../core/services/sync.service';
import { ToastService } from '../../core/services/toast.service';
import { SessionStore } from '../../core/session.store';
import { ago, downloadCsv, fmtDateTime, lc, MAIL_RE, pctText } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { FunnelComponent, FunnelKey } from './funnel.component';

/**
 * The student master list. It is not edited here: campuses add students
 * from Excel in the Hitbullseye admin panel and they arrive by sync. What
 * the portal adds is the progress of every row, and Active / Inactive.
 */
@Component({
  selector: 'hb-roster',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, StatusBadgeComponent, FunnelComponent],
  templateUrl: './roster.component.html'
})
export class RosterComponent {
  readonly stage = input<string>('');
  readonly ctx = inject(ConsoleContext);
  readonly sessions = inject(SessionStore);
  private people = inject(PeopleService);
  private statuses = inject(StatusService);
  private sync = inject(SyncService);
  private api = inject(PortalApi);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly data = signal<CampusPeople | null>(null);
  readonly funnel = signal<Funnel | null>(null);
  readonly lastSync = signal<SyncRun | null>(null);
  readonly syncing = signal(false);
  readonly filter = signal<FunnelKey | 'bad'>('');
  readonly q = signal('');
  readonly page = signal(1);
  readonly pageSize = 50;
  readonly ago = ago;
  readonly fmtDateTime = fmtDateTime;

  readonly rows = computed(() => this.funnel()?.rows || []);
  readonly dupIds = computed(() => {
    const seen = new Map<string, number>();
    this.rows().forEach(r => seen.set(r.row.batchId + '|' + lc(r.row.uid), (seen.get(r.row.batchId + '|' + lc(r.row.uid)) || 0) + 1));
    return seen;
  });
  isBad(r: FunnelRow): boolean {
    return !r.row.uid || !MAIL_RE.test(r.row.email || '') || (this.dupIds().get(r.row.batchId + '|' + lc(r.row.uid)) || 0) > 1;
  }

  readonly filtered = computed(() => {
    const f = this.filter(), q = lc(this.q());
    return this.rows().filter(r => {
      switch (f) {
        case 'list': if (r.inactive) return false; break;
        case 'signed': if (r.inactive || r.stage === 'invited') return false; break;
        case 'registered': if (r.inactive || r.stage !== 'registered') return false; break;
        case 'draft': if (r.inactive || r.stage !== 'draft') return false; break;
        case 'signed_only': if (r.inactive || r.stage !== 'signed_in') return false; break;
        case 'invited': if (r.inactive || r.stage !== 'invited') return false; break;
        case 'attempted': if (r.inactive || !r.attempted) return false; break;
        case 'inactive': if (!r.inactive) return false; break;
        case 'bad': if (!this.isBad(r)) return false; break;
      }
      if (q) {
        const hay = lc([r.row.uid, r.row.name, r.row.email, r.row.department, r.row.programme, r.row.course, r.row.session].join(' '));
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  });
  readonly paged = computed(() => this.filtered().slice(0, this.page() * this.pageSize));

  readonly listStats = computed(() => {
    const rows = this.rows();
    const live = rows.filter(r => !r.inactive);
    const est = this.funnel()?.estimated || 0;
    const depts = new Set(live.map(r => r.row.department).filter(Boolean));
    const noDept = live.filter(r => !r.row.department).length;
    const bad = rows.filter(r => this.isBad(r)).length;
    const last = rows.map(r => r.at).filter(Boolean).sort().pop() || null;
    return { coverage: est ? pctText(live.length, est) : '—', est, live: live.length, depts: depts.size, noDept, bad, last };
  });

  constructor() {
    effect(() => {
      const id = this.ctx.campusId(), b = this.ctx.batchId();
      if (id) untracked(() => this.load(id, b));
    });
    effect(() => {
      const s = this.stage();
      untracked(() => this.filter.set((s as FunnelKey) || ''));
    });
  }

  async load(campusId: string, batchId: string): Promise<void> {
    const p = await this.people.load(campusId, batchId || undefined);
    this.data.set(p);
    this.funnel.set(this.people.funnel(p, this.ctx.batchesInView()));
    const runs = await firstValueFrom(this.api.getSyncRuns());
    const c = this.ctx.campus();
    this.lastSync.set(runs.find(r => r.ok && (r.scope === 'all clients' || r.scope === c?.name)) || null);
  }

  jump(k: FunnelKey | 'bad'): void {
    this.filter.set(this.filter() === k ? '' : k);
    this.page.set(1);
    this.router.navigate([], { queryParams: { stage: this.filter() || null }, replaceUrl: true });
  }

  async syncNow(): Promise<void> {
    const id = this.ctx.campusId();
    if (!id) return;
    this.syncing.set(true);
    const run = await this.sync.syncOne(id);
    this.syncing.set(false);
    if (run.ok) this.toast.ok('Synced from the admin panel: <b>' + run.added + '</b> new, ' + run.updated + ' changed, ' + run.deactivated + ' gone from the panel (kept, marked inactive).', 6000);
    else this.toast.warn('Sync failed: ' + run.error);
    await this.load(id, this.ctx.batchId());
  }

  async toggle(r: FunnelRow): Promise<void> {
    const c = this.ctx.campus();
    if (!c) return;
    const to = r.row.status === 'inactive' ? 'active' : 'inactive';
    const ok = await this.statuses.change('roster', c.id, r.row.key, r.row.name + ' (' + r.row.uid + ')', to, {
      what: 'list row',
      note: to === 'inactive' ? 'They will not be able to register or sign in.' : undefined
    });
    if (ok) await this.load(c.id, this.ctx.batchId());
  }

  batchName(id: string): string { return this.ctx.batches().find(b => b.batchId === id)?.name || id; }

  exportCsv(): void {
    const stg: Record<string, string> = { registered: 'Registration complete', draft: 'Draft (form half-filled)', signed_in: 'Signed in, form not started', invited: 'Not started' };
    downloadCsv((this.ctx.campusId() || 'campus') + '-master-list.csv',
      ['University ID', 'Email', 'Name', 'Batch', 'Department', 'Programme', 'Course', 'Session', 'Stage', 'Draft %', 'Signed in', 'Registration complete', 'Test attempted', 'Status', 'Status reason', 'Last synced'],
      this.filtered().map(r => [r.row.uid, r.row.email, r.row.name, this.batchName(r.row.batchId), r.row.department, r.row.programme, r.row.course, r.row.session,
        stg[r.stage], r.draft ? r.draft.completion : '', r.stage === 'invited' ? 'No' : 'Yes', r.stage === 'registered' ? 'Yes' : 'No', r.attempted ? 'Yes' : 'No',
        r.inactive ? 'Inactive' : 'Active', r.row.statusReason || (r.row.panelStatus !== 'active' ? 'Inactive in admin panel' : ''), r.row.syncedAt]));
    this.toast.ok('Exported ' + this.filtered().length + ' rows.');
  }
}
