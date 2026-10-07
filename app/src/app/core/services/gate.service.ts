import { Injectable, inject } from '@angular/core';
import { GatePass } from '../models';
import { StorageService } from '../storage.service';

/**
 * The pass a student carries from step 2 (ID verified, by OTP or by
 * credentials) to the registration form. Valid for 12 hours.
 */
@Injectable({ providedIn: 'root' })
export class GateService {
  private store = inject(StorageService);
  private readonly ttl = 12 * 3600 * 1000;

  get(): GatePass | null {
    const g = this.store.json<GatePass | null>('gate', null);
    if (!g) return null;
    if (Date.now() - g.at > this.ttl) { this.clear(); return null; }
    return g;
  }

  set(g: GatePass): void {
    this.store.setJson('gate', g);
  }

  clear(): void {
    this.store.remove('gate');
  }
}
