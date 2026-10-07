import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { asApiError } from '../api/api-types';
import { PanelApi } from '../api/panel-api';
import { PortalApi } from '../api/portal-api';
import { CampusConfig, SyncRun } from '../models';
import { SessionStore } from '../session.store';
import { CampusService } from './campus.service';

/**
 * Pulls clients, batches, the student list and placement-cell accounts from
 * the Hitbullseye admin panel into the portal. Students added from Excel in
 * the panel show up here after a sync; rows that disappear there are marked
 * inactive here (never removed).
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private panel = inject(PanelApi);
  private portal = inject(PortalApi);
  private campuses = inject(CampusService);
  private session = inject(SessionStore);

  async syncCampuses(list: CampusConfig[], scope: string): Promise<SyncRun> {
    let added = 0, updated = 0, deactivated = 0, batches = 0;
    try {
      await this.campuses.refresh();
      for (const c of list) {
        const [students, admins] = await Promise.all([
          firstValueFrom(this.panel.getStudents(c.externalClientId)),
          firstValueFrom(this.panel.getAdmins(c.externalClientId))
        ]);
        const sum = await firstValueFrom(this.portal.applyRosterSync(c.id, students.map(s => ({
          campusId: c.id, batchId: s.batchId, uid: s.uid, email: s.email.toLowerCase(), name: s.name,
          department: s.department, programme: s.programme, course: s.course, session: s.session,
          username: s.username, studentRef: s.studentRef, panelStatus: s.status
        }))));
        added += sum.added; updated += sum.updated; deactivated += sum.deactivated;
        await firstValueFrom(this.portal.applyAdminSync(admins.map(a => ({
          adminRef: a.adminRef, campusId: c.id, name: a.name, email: a.email, username: a.username, panelStatus: a.status
        }))));

        /* a batch created in the panel gets portal settings (HQ then sets its access code) */
        const panelBatches = this.campuses.panelBatches().filter(b => b.clientId === c.externalClientId);
        batches += panelBatches.length;
        const missing = panelBatches.filter(b => !c.batches[b.batchId]);
        if (missing.length && this.session.isSuper()) {
          const next: CampusConfig = JSON.parse(JSON.stringify(c));
          missing.forEach(b => { next.batches[b.batchId] = { status: 'active', accessCode: '' }; });
          await this.campuses.save(next, 'New batch from the admin panel: ' + missing.map(b => b.name).join(', '));
        }
      }
      return await firstValueFrom(this.portal.addSyncRun({ scope, clients: list.length, batches, added, updated, deactivated, ok: true }));
    } catch (e) {
      return await firstValueFrom(this.portal.addSyncRun({
        scope, clients: list.length, batches, added, updated, deactivated, ok: false, error: asApiError(e).message
      }));
    }
  }

  syncAll(): Promise<SyncRun> {
    return this.syncCampuses(this.campuses.campuses(), 'all clients');
  }

  syncOne(campusId: string): Promise<SyncRun> {
    const c = this.campuses.byId(campusId);
    return this.syncCampuses(c ? [c] : [], c?.name || campusId);
  }
}
