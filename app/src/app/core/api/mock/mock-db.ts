import { Injectable, inject } from '@angular/core';
import {
  AdminAccess, AuditEntry, BrandConfig, CampusConfig, Draft, PanelAdmin, PanelBatch, PanelClient, PanelStudent,
  Registration, RosterEntry, SignupMark, SyncRun
} from '../../models';
import { StorageService } from '../../storage.service';
import { buildSeed } from './seed';

/* =====================================================================
   The demo's "database": every table the two backends would hold, kept
   in localStorage so the demo survives a reload. Only the mock API
   classes touch this. Bump SEED_VERSION to reseed every browser.
   ===================================================================== */
const SEED_VERSION = 3;

export interface PanelTables {
  clients: PanelClient[];
  batches: PanelBatch[];
  students: (PanelStudent & { password: string })[];
  admins: (PanelAdmin & { password: string })[];
}

export interface OtpTicket { code: string; exp: number; }

@Injectable({ providedIn: 'root' })
export class MockDb {
  private store = inject(StorageService);

  brand!: BrandConfig;
  campuses!: Record<string, CampusConfig>;
  panel!: PanelTables;
  roster!: RosterEntry[];
  registrations!: Registration[];
  drafts!: Draft[];
  signups!: SignupMark[];
  adminAccess!: AdminAccess[];
  audit!: AuditEntry[];
  syncRuns!: SyncRun[];
  otps: Record<string, OtpTicket> = {};

  constructor() {
    this.load();
  }

  private load(): void {
    if (this.store.json<number>('seedVersion', 0) !== SEED_VERSION) {
      this.reseed();
      return;
    }
    this.brand = this.store.json('brand', null as unknown as BrandConfig);
    this.campuses = this.store.json('campuses', {});
    this.panel = this.store.json('panel', { clients: [], batches: [], students: [], admins: [] });
    this.roster = this.store.json('roster', []);
    this.registrations = this.store.json('registrations', []);
    this.drafts = this.store.json('drafts', []);
    this.signups = this.store.json('signups', []);
    this.adminAccess = this.store.json('adminAccess', []);
    this.audit = this.store.json('audit', []);
    this.syncRuns = this.store.json('syncRuns', []);
    if (!this.brand || !Object.keys(this.campuses).length) this.reseed();
  }

  /** Throw everything away and start from the demo seed. */
  reseed(): void {
    this.store.clearAll();
    const s = buildSeed();
    this.brand = s.brand;
    this.campuses = s.campuses;
    this.panel = s.panel;
    this.registrations = s.registrations;
    this.drafts = s.drafts;
    this.signups = s.signups;
    this.adminAccess = s.adminAccess;
    this.audit = s.audit;
    this.syncRuns = [];
    /* the roster starts as an exact copy of the panel, as if a first sync ran */
    const at = '2026-10-06T06:00:00.000Z';
    this.roster = s.panel.students
      .map(p => {
        const campusId = Object.keys(s.campuses).find(k => s.campuses[k].externalClientId === p.clientId);
        if (!campusId) return null;
        return {
          key: [campusId, p.batchId, p.uid.toLowerCase()].join('|'),
          campusId, batchId: p.batchId, uid: p.uid, email: p.email, name: p.name,
          department: p.department, programme: p.programme, course: p.course, session: p.session,
          username: p.username, studentRef: p.studentRef, panelStatus: p.status, status: 'active', syncedAt: at
        } as RosterEntry;
      })
      .filter((x): x is RosterEntry => !!x);
    this.syncRuns.push({
      id: 'SY-SEED', at, by: 'system', scope: 'all clients', clients: Object.keys(s.campuses).length,
      batches: s.panel.batches.length, added: this.roster.length, updated: 0, deactivated: 0, ok: true
    });
    this.store.setJson('seedVersion', SEED_VERSION);
    this.saveAll();
  }

  saveAll(): void {
    (['brand', 'campuses', 'panel', 'roster', 'registrations', 'drafts', 'signups', 'adminAccess', 'audit', 'syncRuns'] as const)
      .forEach(k => this.save(k));
  }

  save(table: 'brand' | 'campuses' | 'panel' | 'roster' | 'registrations' | 'drafts' | 'signups' | 'adminAccess' | 'audit' | 'syncRuns'): void {
    this.store.setJson(table, (this as unknown as Record<string, unknown>)[table]);
  }
}
