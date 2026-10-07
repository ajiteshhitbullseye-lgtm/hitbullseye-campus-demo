import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StatusChange, StatusEntity, asApiError } from '../api/api-types';
import { PanelApi } from '../api/panel-api';
import { PortalApi } from '../api/portal-api';
import { Status } from '../models';
import { SessionStore } from '../session.store';
import { nowIso } from '../util';
import { CampusService } from './campus.service';
import { DialogService } from './dialog.service';
import { ToastService } from './toast.service';

const PRESETS: Partial<Record<StatusEntity, string[]>> = {
  student: ['Left the programme', 'Duplicate account', 'Requested by the student', 'Not eligible this cycle'],
  roster: ['Not in this batch', 'Duplicate row', 'Left the programme', 'Wrong email on record'],
  admin: ['Left the institution', 'Role changed', 'Security review'],
  batch: ['Batch closed', 'Registration window over', 'Created by mistake'],
  client: ['Contract ended', 'Paused by the client', 'Payment pending'],
  assessment: ['Window over', 'Replaced by a new paper', 'Not needed this cycle'],
  field: ['Not needed any more', 'Replaced by another field', 'Asked by the campus'],
  department: ['Merged with another department', 'Closed', 'Not part of placements'],
  spoc: ['Left the institution', 'Changed role'],
  invoice: ['Raised by mistake', 'Replaced by a new invoice', 'Waived']
};

/**
 * The only way anything "goes away": switch it off with a reason, or back on.
 * Asks for the reason, calls the API (which writes the audit log), tells the
 * admin panel, and reports back.
 */
@Injectable({ providedIn: 'root' })
export class StatusService {
  private portal = inject(PortalApi);
  private panel = inject(PanelApi);
  private dialogs = inject(DialogService);
  private toast = inject(ToastService);
  private session = inject(SessionStore);
  private campuses = inject(CampusService);

  /** Returns true when the change went through. */
  async change(entity: StatusEntity, campusId: string, id: string, label: string, to: Status, opts: { what?: string; note?: string } = {}): Promise<boolean> {
    const what = opts.what || entity;
    let reason = '';
    if (to === 'inactive') {
      const verb = entity === 'invoice' ? 'Cancel' : 'Make inactive';
      const r = await this.dialogs.reason(
        verb + ': ' + label,
        (opts.note ? opts.note + ' ' : '') +
        'Nothing is deleted — the ' + what + ' is kept with its history and can be made active again. Say why, for the audit log.',
        entity === 'invoice' ? 'Cancel invoice' : 'Make inactive',
        PRESETS[entity]
      );
      if (r === null) return false;
      reason = r;
    } else {
      const ok = await this.dialogs.confirm('Make active again: ' + label, 'This ' + what + ' will be visible and usable again.', 'Make active');
      if (!ok) return false;
    }
    const change: StatusChange = { entity, campusId, id, status: to, reason };
    try {
      await firstValueFrom(this.portal.changeStatus(change));
      const c = this.campuses.byId(campusId);
      this.panel.notifyStatusChange({
        clientId: c?.externalClientId || campusId, entity, ref: id, status: to, reason, at: nowIso(), by: this.session.actor().name
      }).subscribe({ error: () => { /* the panel copy is best effort; the audit log has it */ } });
      if (['client', 'batch', 'assessment', 'field', 'department', 'spoc', 'invoice'].includes(entity)) await this.campuses.refresh();
      this.toast.ok(to === 'inactive'
        ? (entity === 'invoice' ? 'Invoice cancelled.' : '<b>' + escapeHtml(label) + '</b> is now inactive.')
        : '<b>' + escapeHtml(label) + '</b> is active again.');
      return true;
    } catch (e) {
      this.toast.warn(escapeHtml(asApiError(e).message));
      return false;
    }
  }
}

export function escapeHtml(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
