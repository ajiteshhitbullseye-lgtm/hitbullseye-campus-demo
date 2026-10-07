import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { PanelApi } from '../api/panel-api';
import { PortalApi } from '../api/portal-api';
import { BatchView, BrandConfig, CampusConfig, PanelBatch, PanelClient } from '../models';
import { StorageService } from '../storage.service';
import { hexToRgb, isActive } from '../util';

/**
 * Campus configuration, kept in memory for the whole app (it is small and
 * every page needs it). Loaded once at start-up and refreshed after a save.
 */
@Injectable({ providedIn: 'root' })
export class CampusService {
  private portal = inject(PortalApi);
  private panel = inject(PanelApi);
  private store = inject(StorageService);

  readonly brand = signal<BrandConfig | null>(null);
  readonly campuses = signal<CampusConfig[]>([]);
  readonly panelClients = signal<PanelClient[]>([]);
  readonly panelBatches = signal<PanelBatch[]>([]);

  readonly activeCampuses = computed(() => this.campuses().filter(c => isActive(c)));

  async init(): Promise<void> {
    const r = await firstValueFrom(forkJoin({
      brand: this.portal.getBrand(),
      campuses: this.portal.getCampuses(),
      clients: this.panel.getClients(),
      batches: this.panel.getBatches()
    }));
    this.brand.set(r.brand);
    this.campuses.set(r.campuses);
    this.panelClients.set(r.clients);
    this.panelBatches.set(r.batches);
  }

  async refresh(): Promise<void> {
    const [campuses, clients, batches] = await Promise.all([
      firstValueFrom(this.portal.getCampuses()),
      firstValueFrom(this.panel.getClients()),
      firstValueFrom(this.panel.getBatches())
    ]);
    this.campuses.set(campuses);
    this.panelClients.set(clients);
    this.panelBatches.set(batches);
  }

  byId(id: string | null | undefined): CampusConfig | null {
    if (!id) return null;
    return this.campuses().find(c => c.id === id) || null;
  }

  /** The campus a public page should show: the one in the URL, else the last one used, else the first. */
  resolve(slug: string | null | undefined): CampusConfig | null {
    const list = this.campuses();
    const want = slug || this.store.get('lastCampus');
    const c = list.find(x => x.id === want) || list.find(x => isActive(x)) || list[0] || null;
    if (c) this.store.set('lastCampus', c.id);
    return c;
  }

  lastCampusId(): string | null {
    return this.store.get('lastCampus');
  }

  rememberCampus(id: string): void {
    this.store.set('lastCampus', id);
  }

  panelClientOf(c: CampusConfig): PanelClient | undefined {
    return this.panelClients().find(p => p.clientId === c.externalClientId);
  }

  /** Batches of a campus: the panel's list joined with the portal's settings. */
  batchesOf(campusId: string): BatchView[] {
    const c = this.byId(campusId);
    if (!c) return [];
    return this.panelBatches()
      .filter(b => b.clientId === c.externalClientId)
      .map(b => {
        const s = c.batches[b.batchId] || { status: 'active' as const, accessCode: '' };
        return { ...s, batchId: b.batchId, clientId: b.clientId, name: b.name, passingYear: b.passingYear, panelStatus: b.status };
      })
      .sort((a, b) => (a.passingYear || 0) - (b.passingYear || 0));
  }

  batchName(batchId: string | null | undefined): string {
    if (!batchId) return '';
    return this.panelBatches().find(b => b.batchId === batchId)?.name || batchId;
  }

  async save(cfg: CampusConfig, note?: string): Promise<CampusConfig> {
    const saved = await firstValueFrom(this.portal.saveCampus(cfg, note));
    this.campuses.update(list => list.map(c => (c.id === saved.id ? saved : c)));
    return saved;
  }

  replaceLocal(cfg: CampusConfig): void {
    this.campuses.update(list => (list.some(c => c.id === cfg.id) ? list.map(c => (c.id === cfg.id ? cfg : c)) : [...list, cfg]));
  }

  /** Paint the campus colours into the CSS variables Bootstrap and our styles read. */
  applyTheme(c: CampusConfig | null, title?: string): void {
    const s = document.documentElement.style;
    const t = c?.theme || { primary: '#0b4f9e', primaryDark: '#062f61', accent: '#f5a524' };
    s.setProperty('--brand', t.primary);
    s.setProperty('--brand-dk', t.primaryDark);
    s.setProperty('--brand-rgb', hexToRgb(t.primary));
    s.setProperty('--accent', t.accent);
    s.setProperty('--accent-rgb', hexToRgb(t.accent));
    s.setProperty('--bs-primary', t.primary);
    s.setProperty('--bs-primary-rgb', hexToRgb(t.primary));
    s.setProperty('--bs-link-color', t.primary);
    s.setProperty('--bs-link-color-rgb', hexToRgb(t.primary));
    s.setProperty('--bs-link-hover-color', t.primaryDark);
    document.title = title || ((c?.shortName || 'Campus') + ' · Hitbullseye');
  }

  /** HQ pages wear the Hitbullseye colours, not a client's. */
  applyHqTheme(title: string): void {
    this.applyTheme({ theme: { primary: '#0b4f9e', primaryDark: '#062f61', accent: '#f5a524' } } as CampusConfig, title);
  }
}
