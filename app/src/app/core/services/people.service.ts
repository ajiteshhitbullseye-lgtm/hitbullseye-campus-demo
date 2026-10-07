import { Injectable, inject } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { PortalApi } from '../api/portal-api';
import { BatchView, Draft, FunnelStage, Registration, RosterEntry, SignupMark } from '../models';
import { isActive, lc, resultList } from '../util';

export interface CampusPeople {
  roster: RosterEntry[];
  registrations: Registration[];
  signups: SignupMark[];
  drafts: Draft[];
}

export interface FunnelRow {
  row: RosterEntry;
  stage: FunnelStage;
  student: Registration | null;
  draft: Draft | null;
  signup: SignupMark | null;
  attempted: boolean;
  at: string | null;
  inactive: boolean;
}

export interface Funnel {
  /** what the college told us to expect (sum over the batches in view); null = not filled in */
  estimated: number | null;
  estimatedMissing: string[];
  onList: number;
  signedIn: number;           // anyone who got in: signed in + draft + registered
  signedInOnly: number;
  draft: number;
  registered: number;
  invited: number;
  attempted: number;
  inactive: number;
  rows: FunnelRow[];
}

/** Everyone on a campus list and how far each one got. */
@Injectable({ providedIn: 'root' })
export class PeopleService {
  private api = inject(PortalApi);

  async load(campusId?: string, batchId?: string): Promise<CampusPeople> {
    const r = await firstValueFrom(forkJoin({
      roster: this.api.getRoster({ campusId, batchId }),
      registrations: this.api.getRegistrations({ campusId, batchId }),
      signups: this.api.getSignups(campusId),
      drafts: this.api.getDrafts(campusId)
    }));
    if (batchId) {
      r.signups = r.signups.filter(s => s.batchId === batchId);
      r.drafts = r.drafts.filter(d => d.batchId === batchId);
    }
    return r;
  }

  funnel(p: CampusPeople, batches: BatchView[]): Funnel {
    const regByUid = new Map<string, Registration>();
    const regByEmail = new Map<string, Registration>();
    p.registrations.forEach(r => { regByUid.set(r.campusId + '|' + lc(r.uid), r); regByEmail.set(lc(r.email), r); });
    const draftBy = new Map(p.drafts.filter(d => d.state === 'open').map(d => [d.key, d]));
    const signBy = new Map(p.signups.map(s => [s.key, s]));

    const rows: FunnelRow[] = p.roster.map(row => {
      const student = regByUid.get(row.campusId + '|' + lc(row.uid)) || regByEmail.get(lc(row.email)) || null;
      const draft = draftBy.get(row.key) || null;
      const signup = signBy.get(row.key) || null;
      const inactive = !isActive(row) || row.panelStatus !== 'active' || (!!student && !isActive(student));
      let stage: FunnelStage = 'invited';
      let at: string | null = null;
      if (student) { stage = 'registered'; at = student.registeredAt; }
      else if (draft && Object.values(draft.values).some(v => !!v)) { stage = 'draft'; at = draft.updatedAt; }
      else if (signup || draft) { stage = 'signed_in'; at = signup?.touchedAt || draft?.updatedAt || null; }
      return { row, stage, student, draft, signup, attempted: !!student && resultList(student).length > 0, at, inactive };
    });

    const live = rows.filter(r => !r.inactive);
    const count = (s: FunnelStage) => live.filter(r => r.stage === s).length;
    const filled = batches.filter(b => b.estimated != null && b.estimated > 0);
    return {
      estimated: filled.length ? filled.reduce((a, b) => a + (b.estimated || 0), 0) : null,
      estimatedMissing: batches.filter(b => isActive(b) && !(b.estimated && b.estimated > 0)).map(b => b.name),
      onList: live.length,
      signedIn: live.filter(r => r.stage !== 'invited').length,
      signedInOnly: count('signed_in'),
      draft: count('draft'),
      registered: count('registered'),
      invited: count('invited'),
      attempted: live.filter(r => r.attempted).length,
      inactive: rows.length - live.length,
      rows
    };
  }
}
