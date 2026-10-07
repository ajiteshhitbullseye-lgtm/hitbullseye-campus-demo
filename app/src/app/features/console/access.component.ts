import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { asApiError } from '../../core/api/api-types';
import { PortalApi } from '../../core/api/portal-api';
import { AdminAccess, BatchView, Registration, RosterEntry } from '../../core/models';
import { CampusService } from '../../core/services/campus.service';
import { ConsoleContext } from '../../core/services/console-context.service';
import { StatusService } from '../../core/services/status.service';
import { SyncService } from '../../core/services/sync.service';
import { ToastService } from '../../core/services/toast.service';
import { SessionStore } from '../../core/session.store';
import { ago, clone, fmtDateTime, isActive, num } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

/**
 * Batches come from the admin panel; each gets its own access code here.
 * Placement-cell logins are created in the admin panel too; here an account
 * can be switched off for this portal (never deleted).
 */
@Component({
  selector: 'hb-access',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, StatusBadgeComponent],
  templateUrl: './access.component.html'
})
export class AccessComponent {
  readonly ctx = inject(ConsoleContext);
  readonly sessions = inject(SessionStore);
  private campuses = inject(CampusService);
  private api = inject(PortalApi);
  private statuses = inject(StatusService);
  private sync = inject(SyncService);
  private toast = inject(ToastService);

  readonly isSuper = this.sessions.isSuper;
  readonly admins = signal<AdminAccess[] | null>(null);
  readonly regs = signal<Registration[]>([]);
  readonly roster = signal<RosterEntry[]>([]);
  readonly codes = signal<Record<string, string>>({});
  readonly saving = signal(false);
  readonly syncing = signal(false);
  readonly fmtDateTime = fmtDateTime;
  readonly ago = ago;
  readonly num = num;

  readonly batches = computed(() => this.ctx.batches());
  readonly counts = computed(() => {
    const m: Record<string, { list: number; reg: number }> = {};
    this.batches().forEach(b => { m[b.batchId] = { list: 0, reg: 0 }; });
    this.roster().forEach(r => { if (m[r.batchId] && isActive(r)) m[r.batchId].list++; });
    this.regs().forEach(r => { if (m[r.batchId] && isActive(r)) m[r.batchId].reg++; });
    return m;
  });
  readonly codesDirty = computed(() => this.batches().some(b => (this.codes()[b.batchId] ?? '') !== (b.accessCode || '')));

  /* ---------- every client in one place (HQ only) ---------- */
  readonly scope = signal<'campus' | 'all'>('campus');
  readonly allAdmins = signal<AdminAccess[] | null>(null);
  readonly q = signal('');

  readonly allCampuses = computed(() => this.campuses.campuses());

  /** one row per login, with its campus and that campus's batch codes alongside */
  readonly allRows = computed(() => {
    const list = this.allAdmins() || [];
    const needle = this.q().trim().toLowerCase();
    return list
      .map(a => {
        const c = this.campuses.byId(a.campusId);
        const batches = c ? this.campuses.batchesOf(a.campusId) : [];
        return {
          a,
          campusName: c?.name || a.campusId,
          campusShort: c?.shortName || a.campusId,
          codes: batches.filter(b => isActive(b) && b.accessCode).map(b => ({ name: b.name, code: b.accessCode! }))
        };
      })
      .filter(r => !needle
        || r.a.name.toLowerCase().includes(needle)
        || r.a.email.toLowerCase().includes(needle)
        || r.a.username.toLowerCase().includes(needle)
        || r.campusName.toLowerCase().includes(needle))
      .sort((x, y) => x.campusName.localeCompare(y.campusName) || x.a.name.localeCompare(y.a.name));
  });

  readonly allTotals = computed(() => {
    const rows = this.allAdmins() || [];
    const on = rows.filter(a => isActive(a) && a.panelStatus === 'active').length;
    const campuses = this.allCampuses();
    const noCode = campuses.filter(c =>
      this.campuses.batchesOf(c.id).filter(b => isActive(b)).some(b => !b.accessCode)).length;
    return {
      campuses: campuses.length,
      logins: rows.length,
      on,
      off: rows.length - on,
      noCode
    };
  });

  constructor() {
    effect(() => {
      const id = this.ctx.campusId();
      if (id) untracked(() => this.load(id));
    });
    effect(() => {
      if (this.scope() === 'all' && this.isSuper()) untracked(() => this.loadAll());
    });
  }

  /** logins for every campus at once */
  async loadAll(): Promise<void> {
    const list = this.campuses.campuses();
    const per = await Promise.all(
      list.map(c => firstValueFrom(this.api.getAdminAccess(c.id)).catch(() => [] as AdminAccess[]))
    );
    this.allAdmins.set(per.flat());
  }

  setScope(v: 'campus' | 'all'): void { this.scope.set(v); }

  async load(campusId: string): Promise<void> {
    const [admins, regs, roster] = await Promise.all([
      firstValueFrom(this.api.getAdminAccess(campusId)),
      firstValueFrom(this.api.getRegistrations({ campusId })),
      firstValueFrom(this.api.getRoster({ campusId }))
    ]);
    this.admins.set(admins);
    this.regs.set(regs);
    this.roster.set(roster);
    const c: Record<string, string> = {};
    this.batches().forEach(b => { c[b.batchId] = b.accessCode || ''; });
    this.codes.set(c);
  }

  setCode(id: string, v: string): void {
    this.codes.update(c => ({ ...c, [id]: v.toUpperCase().replace(/[^A-Z0-9]/g, '') }));
  }

  async saveCodes(): Promise<void> {
    const c = this.ctx.campus();
    if (!c) return;
    const list = Object.entries(this.codes());
    if (list.some(([, v]) => v && v.length < 5)) { this.toast.warn('Access codes need at least 5 letters or digits.'); return; }
    const used = list.map(([, v]) => v).filter(Boolean);
    if (new Set(used).size !== used.length) { this.toast.warn('Each batch needs its own access code.'); return; }
    const next = clone(c);
    list.forEach(([id, v]) => { next.batches[id] = { ...(next.batches[id] || { status: 'active' }), accessCode: v }; });
    this.saving.set(true);
    try {
      await this.campuses.save(next, 'Batch access codes changed');
      this.toast.ok('Access codes saved. Share the new code with that batch — the old one stops working now.');
    } catch (e) {
      this.toast.warn(asApiError(e).message);
    } finally {
      this.saving.set(false);
    }
  }

  async toggleBatch(b: BatchView): Promise<void> {
    const ok = await this.statuses.change('batch', this.ctx.campusId()!, b.batchId, b.name, isActive(b) ? 'inactive' : 'active', {
      what: 'batch', note: 'Its access code stops working and its students cannot sign in. Registrations and results are kept.'
    });
    if (ok) await this.load(this.ctx.campusId()!);
  }

  async toggleAdmin(a: AdminAccess): Promise<void> {
    const ok = await this.statuses.change('admin', a.campusId, a.adminRef, a.name + ' (' + a.email + ')', isActive(a) ? 'inactive' : 'active', {
      what: 'login', note: 'They can no longer sign in to this portal. The account itself lives in the Hitbullseye admin panel.'
    });
    if (!ok) return;
    if (a.campusId === this.ctx.campusId()) await this.load(a.campusId);
    if (this.scope() === 'all') await this.loadAll();
  }

  /** jump the whole console to that client */
  openCampus(campusId: string): void {
    this.ctx.setCampus(campusId);
    this.scope.set('campus');
  }

  exportAll(): void {
    const rows = this.allRows();
    const head = ['Client', 'Name', 'Username', 'Email', 'Admin panel', 'Portal', 'Last sign-in', 'Access codes'];
    const body = rows.map(r => [
      r.campusName, r.a.name, r.a.username, r.a.email,
      r.a.panelStatus === 'active' ? 'Active' : 'Inactive',
      isActive(r.a) ? 'Active' : 'Switched off',
      r.a.lastLoginAt ? fmtDateTime(r.a.lastLoginAt) : 'never',
      r.codes.map(c => c.name + ': ' + c.code).join(' | ')
    ].map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','));

    const blob = new Blob([head.join(',') + '\n' + body.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hitbullseye-client-logins.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    this.toast.ok('Exported ' + rows.length + ' logins across ' + this.allTotals().campuses + ' clients.');
  }

  copy(code: string): void {
    navigator.clipboard?.writeText(code).then(() => this.toast.ok('Copied <b>' + code + '</b>.'), () => this.toast.show(code, 'key'));
  }

  async syncNow(): Promise<void> {
    const id = this.ctx.campusId();
    if (!id) return;
    this.syncing.set(true);
    const run = await this.sync.syncOne(id);
    this.syncing.set(false);
    if (run.ok) this.toast.ok('Batches, students and logins synced from the admin panel.');
    else this.toast.warn('Sync failed: ' + run.error);
    await this.load(id);
  }
}
