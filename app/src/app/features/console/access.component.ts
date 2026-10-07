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

  constructor() {
    effect(() => {
      const id = this.ctx.campusId();
      if (id) untracked(() => this.load(id));
    });
  }

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
    if (ok) await this.load(a.campusId);
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
