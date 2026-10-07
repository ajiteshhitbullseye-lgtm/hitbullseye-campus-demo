import { Injectable, computed, inject, signal } from '@angular/core';
import { CampusConfig } from '../models';
import { SessionStore } from '../session.store';
import { StorageService } from '../storage.service';
import { CampusService } from './campus.service';

/**
 * Which campus (and which batch) the console is looking at.
 * A college admin is locked to their own campus; HQ picks any client from the
 * app bar and stays on the same tab. The batch filter applies to every page.
 */
@Injectable({ providedIn: 'root' })
export class ConsoleContext {
  private campuses = inject(CampusService);
  private sessions = inject(SessionStore);
  private store = inject(StorageService);

  private readonly _campusId = signal<string | null>(this.store.get('consoleCampus'));
  private readonly _batchId = signal<string>(this.store.get('consoleBatch') || '');

  /** the campus in view */
  readonly campusId = computed(() => {
    const s = this.sessions.session();
    if (s?.role === 'college_admin') return s.campusId || null;
    const want = this._campusId();
    const list = this.campuses.campuses();
    return (list.find(c => c.id === want) || list[0])?.id || null;
  });

  readonly campus = computed<CampusConfig | null>(() => this.campuses.byId(this.campusId()));

  /** '' = all batches */
  readonly batchId = computed(() => {
    const b = this._batchId();
    const id = this.campusId();
    if (!b || !id) return '';
    return this.campuses.batchesOf(id).some(x => x.batchId === b) ? b : '';
  });

  readonly batches = computed(() => (this.campusId() ? this.campuses.batchesOf(this.campusId()!) : []));
  readonly batchesInView = computed(() => {
    const b = this.batchId();
    return b ? this.batches().filter(x => x.batchId === b) : this.batches();
  });

  /** "Batch 2026" or "all batches" */
  readonly batchLabel = computed(() => (this.batchId() ? this.batchesInView()[0]?.name || '' : 'all batches'));

  setCampus(id: string): void {
    if (this.sessions.session()?.role === 'college_admin') return;
    this._campusId.set(id);
    this.store.set('consoleCampus', id);
    this.setBatch('');
  }

  setBatch(id: string): void {
    this._batchId.set(id);
    this.store.set('consoleBatch', id);
  }
}
