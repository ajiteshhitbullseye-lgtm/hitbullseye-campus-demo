import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PanelAdmin, PanelAuthResult, PanelBatch, PanelClient, PanelStudent, Status } from '../../models';
import { lc } from '../../util';
import { PanelApi } from '../panel-api';
import { MockDb } from './mock-db';
import { mockRequest } from './mock-http';

/** Plays the Hitbullseye admin panel for the demo. Passwords never leave this class. */
@Injectable()
export class MockPanelApi extends PanelApi {
  private db = inject(MockDb);
  /** what the portal pushed to the panel, for the Data & API page */
  readonly outbox: { at: string; type: string; payload: unknown }[] = [];

  getClients(): Observable<PanelClient[]> {
    return mockRequest(() => this.db.panel.clients);
  }

  getBatches(clientId?: string): Observable<PanelBatch[]> {
    return mockRequest(() => this.db.panel.batches.filter(b => !clientId || b.clientId === clientId));
  }

  getStudents(clientId: string, batchId?: string): Observable<PanelStudent[]> {
    return mockRequest(() => this.db.panel.students
      .filter(s => s.clientId === clientId && (!batchId || s.batchId === batchId))
      .map(({ password, ...rest }) => rest));
  }

  getAdmins(clientId?: string): Observable<PanelAdmin[]> {
    return mockRequest(() => this.db.panel.admins
      .filter(a => !clientId || a.clientId === clientId)
      .map(({ password, ...rest }) => rest));
  }

  verifyCredentials(username: string, password: string): Observable<PanelAuthResult> {
    return mockRequest<PanelAuthResult>(() => {
      const u = lc(username);
      const admin = this.db.panel.admins.find(a => lc(a.username) === u || lc(a.email) === u);
      if (admin) {
        if (admin.password !== password) return { ok: false, error: 'Incorrect username or password.' };
        if (admin.status !== 'active') return { ok: false, error: 'This account is switched off in the Hitbullseye admin panel.' };
        return { ok: true, role: 'college_admin', clientId: admin.clientId, email: admin.email, name: admin.name, ref: admin.adminRef };
      }
      const st = this.db.panel.students.find(s => lc(s.username) === u || lc(s.email) === u);
      if (!st || st.password !== password) return { ok: false, error: 'Incorrect username or password.' };
      if (st.status !== 'active') return { ok: false, error: 'This login is switched off in the Hitbullseye admin panel.' };
      return {
        ok: true, role: 'student', clientId: st.clientId, batchId: st.batchId, uid: st.uid,
        email: st.email, name: st.name, ref: st.studentRef
      };
    });
  }

  notifyRegistration(event: { clientId: string; batchId: string; uid: string; email: string; regNo: string; registeredAt: string }): Observable<void> {
    return mockRequest(() => { this.outbox.unshift({ at: new Date().toISOString(), type: 'registration', payload: event }); });
  }

  notifyStatusChange(event: { clientId: string; entity: string; ref: string; status: Status; reason: string; at: string; by: string }): Observable<void> {
    return mockRequest(() => { this.outbox.unshift({ at: new Date().toISOString(), type: 'status', payload: event }); });
  }
}
