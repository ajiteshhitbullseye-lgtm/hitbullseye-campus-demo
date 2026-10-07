import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PortalApi } from '../../core/api/portal-api';
import { AuditEntry } from '../../core/models';
import { CampusService } from '../../core/services/campus.service';
import { ConsoleContext } from '../../core/services/console-context.service';
import { SessionStore } from '../../core/session.store';
import { ago, downloadCsv, fmtDateTime, lc } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';

const ENTITY: Record<string, string> = {
  student: 'Student', roster: 'List row', client: 'Client', batch: 'Batch', admin: 'Login', assessment: 'Assessment',
  field: 'Form field', department: 'Department', spoc: 'SPOC', invoice: 'Invoice', config: 'Configuration', profile: 'Profile',
  sync: 'Sync', estimate: 'Estimate'
};
const ACTION: Record<string, string> = {
  inactivate: 'made inactive', activate: 'made active', create: 'created', update: 'updated', cancel: 'cancelled',
  sync: 'synced', import: 'imported', 'login-blocked': 'login blocked'
};

/** Every status change and every save: who, when, what and why. Nothing is ever deleted, so this is the history. */
@Component({
  selector: 'hb-audit',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <main class="console-main page">
      <div class="page-head">
        <div>
          <span class="eyebrow">{{ sessions.isSuper() ? 'Hitbullseye HQ · all clients' : 'Placement cell console' }}</span>
          <h1>Activity log</h1>
          <p class="sm mut">Every change on this portal — who made it, when, and the reason they gave. Nothing is deleted, so this is the full history.</p>
        </div>
        <button class="btn btn-ghost btn-sm" (click)="csv()"><hb-icon name="down" /> Export CSV</button>
      </div>

      <section class="card card-body mt">
        <div class="toolbar">
          <div class="search"><hb-icon name="search" /><input class="form-control" placeholder="Search names, reasons, people" [ngModel]="q()" (ngModelChange)="q.set($event)"></div>
          @if (sessions.isSuper()) {
            <select class="form-select" [ngModel]="scope()" (ngModelChange)="scope.set($event)">
              <option value="campus">{{ ctx.campus()?.shortName }} only</option><option value="all">All clients</option>
            </select>
          }
          <select class="form-select" [ngModel]="entity()" (ngModelChange)="entity.set($event)">
            <option value="">Everything</option>
            @for (k of entities; track k[0]) { <option [value]="k[0]">{{ k[1] }}</option> }
          </select>
          <select class="form-select" [ngModel]="action()" (ngModelChange)="action.set($event)">
            <option value="">Any action</option><option value="inactivate">Made inactive</option><option value="activate">Made active</option>
            <option value="update">Updated</option><option value="create">Created</option><option value="cancel">Cancelled</option>
          </select>
          <span class="badge brand">{{ filtered().length }} entries</span>
        </div>

        @if (rows() === null) { <div class="loading-page" style="min-height:140px"><span class="spinner"></span></div> }
        @else {
          @for (a of filtered(); track a.id) {
            <div class="audit-row">
              <div class="when">{{ fmtDateTime(a.at) }}<br><span class="xs">{{ ago(a.at) }}</span></div>
              <div class="dot-ic" [class]="'dot-ic ' + a.action"><hb-icon [name]="icon(a)" [size]="15" /></div>
              <div>
                <div class="sm"><b class="ink">{{ a.actor.name }}</b> <span class="mut">({{ role(a.actor.role) }})</span>
                  {{ actionText(a) }} <span class="badge">{{ entityText(a) }}</span> <b class="ink">{{ a.entityLabel }}</b>
                  @if (sessions.isSuper() && scope() === 'all' && a.campusId) { <span class="xs mut"> · {{ campusName(a.campusId) }}</span> }</div>
                @if (a.reason) { <div class="why"><b>Reason:</b> {{ a.reason }}</div> }
                @if (a.details) { <div class="xs mut mt-1">{{ a.details }}</div> }
              </div>
            </div>
          } @empty { <div class="empty"><hb-icon name="history" /><h3>Nothing yet</h3><p class="sm">Changes appear here as soon as they are made.</p></div> }
        }
      </section>
      <footer class="foot row-b"><span>© 2026 Hitbullseye · Campus Assessment Platform</span><span>Kept forever · written by the server, not the browser</span></footer>
    </main>
  `
})
export class AuditComponent {
  readonly ctx = inject(ConsoleContext);
  readonly sessions = inject(SessionStore);
  private api = inject(PortalApi);
  private campuses = inject(CampusService);

  readonly rows = signal<AuditEntry[] | null>(null);
  readonly q = signal('');
  readonly entity = signal('');
  readonly action = signal('');
  readonly scope = signal<'campus' | 'all'>('campus');
  readonly entities = Object.entries(ENTITY);
  readonly fmtDateTime = fmtDateTime;
  readonly ago = ago;

  readonly filtered = computed(() => {
    const q = lc(this.q());
    return (this.rows() || []).filter(a =>
      (!this.entity() || a.entity === this.entity()) && (!this.action() || a.action === this.action()) &&
      (!q || lc([a.entityLabel, a.reason, a.details, a.actor.name, a.actor.email].join(' ')).indexOf(q) > -1));
  });

  constructor() {
    effect(() => {
      const id = this.ctx.campusId(), scope = this.scope();
      untracked(() => this.load(scope === 'all' ? undefined : id || undefined));
    });
  }

  async load(campusId?: string): Promise<void> {
    this.rows.set(null);
    const list = await firstValueFrom(this.api.getAudit({ campusId }));
    this.rows.set(list.sort((a, b) => +new Date(b.at) - +new Date(a.at)));
  }

  role(r: string): string { return r === 'super_admin' ? 'HQ' : r === 'college_admin' ? 'placement cell' : r === 'student' ? 'student' : 'system'; }
  actionText(a: AuditEntry): string { return ACTION[a.action] || a.action; }
  entityText(a: AuditEntry): string { return ENTITY[a.entity] || a.entity; }
  icon(a: AuditEntry): string { return a.action === 'inactivate' || a.action === 'cancel' ? 'power' : a.action === 'activate' ? 'check' : a.entity === 'sync' ? 'sync' : 'edit'; }
  campusName(id: string): string { return this.campuses.byId(id)?.shortName || id; }

  csv(): void {
    downloadCsv('activity-log.csv', ['When', 'Who', 'Role', 'Campus', 'What', 'Item', 'Action', 'Reason', 'Details'],
      this.filtered().map(a => [a.at, a.actor.name, this.role(a.actor.role), a.campusId || '', this.entityText(a), a.entityLabel, this.actionText(a), a.reason || '', a.details || '']));
  }
}
