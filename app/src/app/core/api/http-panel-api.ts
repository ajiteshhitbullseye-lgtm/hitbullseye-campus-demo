import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PanelAdmin, PanelAuthResult, PanelBatch, PanelClient, PanelStudent, Status } from '../models';
import { PanelApi } from './panel-api';

/**
 * The real admin-panel client. Paths are a proposal (docs/API.md) — when the
 * panel team shares the actual APIs, only this file changes.
 */
@Injectable()
export class HttpPanelApi extends PanelApi {
  private http = inject(HttpClient);
  private base = environment.panelApiBase;

  getClients(): Observable<PanelClient[]> {
    return this.http.get<PanelClient[]>(`${this.base}/clients`);
  }

  getBatches(clientId?: string): Observable<PanelBatch[]> {
    return clientId
      ? this.http.get<PanelBatch[]>(`${this.base}/clients/${encodeURIComponent(clientId)}/batches`)
      : this.http.get<PanelBatch[]>(`${this.base}/batches`);
  }

  getStudents(clientId: string, batchId?: string): Observable<PanelStudent[]> {
    let params = new HttpParams();
    if (batchId) params = params.set('batchId', batchId);
    return this.http.get<PanelStudent[]>(`${this.base}/clients/${encodeURIComponent(clientId)}/students`, { params });
  }

  getAdmins(clientId?: string): Observable<PanelAdmin[]> {
    return clientId
      ? this.http.get<PanelAdmin[]>(`${this.base}/clients/${encodeURIComponent(clientId)}/admins`)
      : this.http.get<PanelAdmin[]>(`${this.base}/admins`);
  }

  verifyCredentials(username: string, password: string): Observable<PanelAuthResult> {
    return this.http.post<PanelAuthResult>(`${this.base}/auth/verify`, { username, password });
  }

  notifyRegistration(event: { clientId: string; batchId: string; uid: string; email: string; regNo: string; registeredAt: string }): Observable<void> {
    return this.http.post<void>(`${this.base}/portal-events/registration`, event);
  }

  notifyStatusChange(event: { clientId: string; entity: string; ref: string; status: Status; reason: string; at: string; by: string }): Observable<void> {
    return this.http.post<void>(`${this.base}/portal-events/status`, event);
  }
}
