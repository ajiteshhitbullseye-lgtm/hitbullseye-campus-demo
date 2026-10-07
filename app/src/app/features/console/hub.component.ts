import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PortalApi } from '../../core/api/portal-api';
import { Registration, RosterEntry } from '../../core/models';
import { CampusService } from '../../core/services/campus.service';
import { ConsoleContext } from '../../core/services/console-context.service';
import { SessionStore } from '../../core/session.store';
import { isActive, num } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';

export interface HubCard {
  path: string;
  label: string;
  icon: string;
  blurb: string;
  group: string;
  hq?: boolean;
  /** a live number, so the box is worth looking at and not just a link */
  stat?: () => string;
  statLabel?: string;
}

/**
 * The console landing page. Instead of hunting along a long strip of tabs,
 * you get labelled boxes grouped by what you came here to do. Every box is
 * also reachable from the "Sections" menu in the app bar once you are inside.
 */
@Component({
  selector: 'hb-hub',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './hub.component.html'
})
export class HubComponent {
  readonly ctx = inject(ConsoleContext);
  readonly campuses = inject(CampusService);
  private sessions = inject(SessionStore);
  private api = inject(PortalApi);

  readonly isSuper = this.sessions.isSuper;
  readonly session = this.sessions.session;
  readonly num = num;

  readonly regs = signal<Registration[]>([]);
  readonly roster = signal<RosterEntry[]>([]);
  readonly loaded = signal(false);

  readonly campus = this.ctx.campus;

  readonly hello = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  });

  /** HQ signs in as an organisation, a placement cell as a person */
  readonly greetName = computed(() => {
    const n = (this.session()?.name || '').trim();
    if (!n) return '';
    if (this.isSuper()) return '';
    return n.split(' ')[0];
  });

  /* ---------------- the numbers the boxes show ---------------- */
  readonly counts = computed(() => {
    const batch = this.ctx.batchId();
    const inBatch = <T extends { batchId?: string }>(l: T[]) => (batch ? l.filter(x => x.batchId === batch) : l);

    const roster = inBatch(this.roster());
    const regs = inBatch(this.regs()).filter(r => isActive(r));
    const attempted = regs.filter(r => Object.keys(r.results || {}).length > 0);

    return {
      onList: roster.length,
      registered: regs.length,
      attempted: attempted.length,
      batches: this.ctx.batches().filter(b => isActive(b)).length,
      clients: this.campuses.campuses().length,
      tests: (this.campus()?.tests || []).filter(t => isActive(t)).length
    };
  });

  readonly cards = computed<HubCard[]>(() => {
    const su = this.isSuper();
    const c = this.counts();
    const list: HubCard[] = [];

    if (su) {
      list.push({
        path: 'clients', label: 'Clients', icon: 'grid', group: 'Across every campus', hq: true,
        blurb: 'Every college on the platform, what they have filled in and where each account stands.',
        stat: () => String(c.clients), statLabel: 'clients'
      });
    }

    list.push(
      {
        path: 'analytics', label: 'Analytics', icon: 'chart', group: 'Reports & analytics',
        blurb: 'How far the batch has got, score spread, section averages and department tables.',
        stat: () => String(c.attempted), statLabel: 'have attempted'
      },
      {
        path: 'insights', label: 'Insights', icon: 'target', group: 'Reports & analytics',
        blurb: 'What the numbers mean — where the cohort leaks marks and what to do about it.'
      },
      {
        path: 'students', label: 'Students', icon: 'users', group: 'Reports & analytics',
        blurb: 'Every student, every attempt, with their individual score cards.',
        stat: () => String(c.registered), statLabel: 'registered'
      },
      {
        path: 'roster', label: 'Master list', icon: 'list', group: 'Students & setup',
        blurb: 'The list your campus uploads, and exactly how far each name on it has got.',
        stat: () => String(c.onList), statLabel: 'on the list'
      },
      {
        path: 'commercial', label: 'Commercial', icon: 'rupee', group: 'Account',
        blurb: 'Licences bought and used, the contract, invoices and anything outstanding.'
      },
      {
        path: 'profile', label: 'Campus profile', icon: 'building', group: 'Students & setup',
        blurb: 'Departments, courses, strength, SPOCs and what this campus calls each field.'
      },
      {
        path: 'form', label: su ? 'Form builder' : 'Registration form', icon: 'settings', group: 'Students & setup',
        blurb: su
          ? 'Fields, assessments, access codes and the department-wise form, per campus.'
          : 'See the form your students fill in, field by field.',
        stat: () => String(c.tests), statLabel: 'assessments'
      },
      {
        path: 'audit', label: 'Activity log', icon: 'history', group: 'Account',
        blurb: 'Every change on this portal — who made it, when, and the reason they gave.'
      }
    );

    if (su) {
      list.push(
        {
          path: 'access', label: 'Access & logins', icon: 'key', group: 'Across every campus', hq: true,
          blurb: 'Batch access codes and every client’s placement-cell logins, in one place.',
          stat: () => String(c.batches), statLabel: 'active batches'
        },
        {
          path: 'data', label: 'Data & sync', icon: 'code', group: 'Across every campus', hq: true,
          blurb: 'Bulk student upload, the JSON the backend will serve, and a sync from the admin panel.'
        },
        {
          path: 'engine', label: 'Engine', icon: 'rocket', group: 'Across every campus', hq: true,
          blurb: 'The question bank, telemetry and how the assessment engine is wired.'
        }
      );
    }
    return list;
  });

  /** boxes grouped, in a fixed order so the page never reshuffles */
  readonly groups = computed(() => {
    const order = ['Reports & analytics', 'Students & setup', 'Account', 'Across every campus'];
    const by = new Map<string, HubCard[]>();
    this.cards().forEach(x => {
      if (!by.has(x.group)) by.set(x.group, []);
      by.get(x.group)!.push(x);
    });
    return order.filter(g => by.has(g)).map(g => ({ name: g, cards: by.get(g)! }));
  });

  constructor() {
    this.load();
  }

  async load(): Promise<void> {
    const campusId = this.ctx.campusId();
    if (!campusId) { this.loaded.set(true); return; }
    try {
      const [regs, roster] = await Promise.all([
        firstValueFrom(this.api.getRegistrations({ campusId })),
        firstValueFrom(this.api.getRoster({ campusId }))
      ]);
      this.regs.set(regs);
      this.roster.set(roster);
    } finally {
      this.loaded.set(true);
    }
  }
}
