import { Observable } from 'rxjs';
import { PanelAdmin, PanelAuthResult, PanelBatch, PanelClient, PanelStudent, Status } from '../models';

/* =====================================================================
   The existing Hitbullseye admin panel.
   Clients, batches, the student list (Excel uploads) and every login
   credential are created there. This portal only reads them, and tells
   the panel about a few things that happen here.
   Implementations: MockPanelApi (demo) and HttpPanelApi (real).
   The endpoint for each call is listed in docs/API.md.
   ===================================================================== */
export abstract class PanelApi {
  /** Clients the panel knows about (active and inactive). */
  abstract getClients(): Observable<PanelClient[]>;

  /** Batches of one client, or of every client when no id is given. */
  abstract getBatches(clientId?: string): Observable<PanelBatch[]>;

  /** The student list uploaded for a client (optionally one batch). */
  abstract getStudents(clientId: string, batchId?: string): Observable<PanelStudent[]>;

  /** Placement-cell (college admin) accounts. */
  abstract getAdmins(clientId?: string): Observable<PanelAdmin[]>;

  /** Check a username + password. The portal then matches the identity it gets back. */
  abstract verifyCredentials(username: string, password: string): Observable<PanelAuthResult>;

  /* -------- what the portal sends back to the panel -------- */

  /** A student finished registration here. */
  abstract notifyRegistration(event: {
    clientId: string; batchId: string; uid: string; email: string; regNo: string; registeredAt: string;
  }): Observable<void>;

  /** Someone was made active / inactive here. */
  abstract notifyStatusChange(event: {
    clientId: string; entity: string; ref: string; status: Status; reason: string; at: string; by: string;
  }): Observable<void>;
}
