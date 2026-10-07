import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PortalApi } from '../api/portal-api';
import { Draft } from '../models';
import { StorageService } from '../storage.service';
import { lc, nowIso } from '../util';

/**
 * Half-filled registration forms.
 * Every change is written to this browser at once (so closing the tab loses
 * nothing) and to the server a moment later (so the student can continue
 * from any device). On load the newer of the two wins.
 */
@Injectable({ providedIn: 'root' })
export class DraftService {
  private api = inject(PortalApi);
  private store = inject(StorageService);

  key(campusId: string, batchId: string, uid: string): string {
    return [campusId, batchId, lc(uid)].join('|');
  }

  private localKey(k: string): string { return 'draft:' + k; }

  local(k: string): Draft | null {
    return this.store.json<Draft | null>(this.localKey(k), null);
  }

  saveLocal(d: Draft): void {
    this.store.setJson(this.localKey(d.key), { ...d, updatedAt: nowIso() });
  }

  clearLocal(k: string): void {
    this.store.remove(this.localKey(k));
  }

  /** the freshest copy: server or this browser */
  async load(campusId: string, batchId: string, uid: string): Promise<Draft | null> {
    const k = this.key(campusId, batchId, uid);
    let server: Draft | null = null;
    try { server = await firstValueFrom(this.api.getDraft(campusId, batchId, uid)); } catch { server = null; }
    const local = this.local(k);
    if (server && local) return +new Date(local.updatedAt) > +new Date(server.updatedAt) ? local : server;
    return server || local;
  }

  async saveServer(d: Draft): Promise<Draft> {
    return firstValueFrom(this.api.saveDraft(d));
  }
}
