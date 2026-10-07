import { Component, computed, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CampusService } from '../../core/services/campus.service';
import { ConsoleContext } from '../../core/services/console-context.service';
import { SessionStore } from '../../core/session.store';
import { initials, isActive } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';

interface Tab { path: string; label: string; icon: string; hq?: boolean; }

/**
 * The console app bar, shared by the placement cell and HQ.
 * HQ picks the client (top right, same place on every tab); everyone can
 * narrow every page to one batch. A college admin never sees other campuses.
 */
@Component({
  selector: 'hb-console-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <nav class="cnav no-print">
      <div class="cnav-top">
        <div class="cnav-in">
          @if (ctx.campus(); as c) {
            <a class="logo-plate" [routerLink]="['/c', c.id]" [title]="'Open the ' + c.shortName + ' student portal'">
              @if (c.logo && c.logo !== hbLogo) { <img [src]="c.logo" [alt]="c.name" [style.max-height.px]="logoH()"> }
              @else { <span class="logo-initials">{{ initials(c.name) }}</span> }</a>
            <div class="co">{{ c.shortName || c.name }}<small>{{ isSuper() ? 'HQ console' : 'Placement cell console' }}</small></div>
            <div class="sep"></div>
          }
          <div class="logo-plate bare"><img src="assets/hitbullseye-real.png" alt="Hitbullseye" style="max-height:30px"></div>

          <div class="cnav-acct">
            @if (isSuper()) {
              <label class="picker" title="Which client are you looking at?">
                <hb-icon name="building" />
                <select class="form-select" [value]="ctx.campusId()" (change)="ctx.setCampus($any($event.target).value)">
                  @for (c of campuses.campuses(); track c.id) {
                    <option [value]="c.id" [selected]="c.id === ctx.campusId()">{{ c.shortName || c.name }}{{ active(c) ? '' : ' (inactive)' }}</option>
                  }
                </select>
              </label>
            } @else {
              <span class="scope"><hb-icon name="users" /><span>This campus</span></span>
            }
            <label class="picker" title="Narrow every page to one batch">
              <hb-icon name="layers" />
              <select class="form-select" [value]="ctx.batchId()" (change)="ctx.setBatch($any($event.target).value)">
                <option value="" [selected]="!ctx.batchId()">All batches</option>
                @for (b of ctx.batches(); track b.batchId) {
                  <option [value]="b.batchId" [selected]="b.batchId === ctx.batchId()">{{ b.name }}{{ active(b) && b.panelStatus === 'active' ? '' : ' (inactive)' }}</option>
                }
              </select>
            </label>
            <div class="me">
              <span class="avatar">{{ initials(session()?.name) }}</span>
              <span class="txt"><b>{{ session()?.name }}</b><em>{{ session()?.email }}</em></span>
            </div>
            <button class="icon-btn danger" title="Sign out" (click)="auth.logout()"><hb-icon name="logout" /></button>
          </div>
        </div>
      </div>
      <div class="cnav-tabs">
        <div class="cnav-in">
          <div class="ctabs">
            @for (t of tabs(); track t.path) {
              <a class="ctab" [routerLink]="'/console/' + t.path" routerLinkActive="on">
                <hb-icon [name]="t.icon" /><span>{{ t.label }}</span>
                @if (t.hq) { <i class="hq-dot" title="HQ only"></i> }
              </a>
            }
          </div>
        </div>
      </div>
    </nav>
    @if (ctx.campus() && !active(ctx.campus())) {
      <div class="wrap mt-s no-print"><div class="alert alert-warning"><hb-icon name="power" />
        <div><b>{{ ctx.campus()!.name }} is inactive.</b> Students cannot register or sign in, and placement-cell logins are refused.
          @if (ctx.campus()!.statusReason) { Reason: {{ ctx.campus()!.statusReason }}. }</div></div></div>
    }
    <router-outlet />
  `
})
export class ConsoleShellComponent {
  readonly ctx = inject(ConsoleContext);
  readonly campuses = inject(CampusService);
  readonly auth = inject(AuthService);
  private sessions = inject(SessionStore);

  readonly session = this.sessions.session;
  readonly isSuper = this.sessions.isSuper;
  readonly initials = initials;
  readonly hbLogo = 'assets/hitbullseye-real.png';
  readonly active = (x: { status?: 'active' | 'inactive' } | null) => isActive(x);
  readonly logoH = computed(() => Math.min(+(this.ctx.campus()?.logoHeight || 32), 32));

  readonly tabs = computed<Tab[]>(() => {
    const su = this.isSuper();
    const t: Tab[] = [];
    if (su) t.push({ path: 'clients', label: 'Clients', icon: 'grid', hq: true });
    t.push(
      { path: 'analytics', label: 'Analytics', icon: 'chart' },
      { path: 'insights', label: 'Insights', icon: 'target' },
      { path: 'students', label: 'Students', icon: 'users' },
      { path: 'roster', label: 'Master list', icon: 'list' },
      { path: 'access', label: 'Batches & logins', icon: 'key' },
      { path: 'commercial', label: 'Commercial', icon: 'rupee' },
      { path: 'profile', label: 'Profile', icon: 'building' },
      { path: 'form', label: su ? 'Form builder' : 'Form (view)', icon: 'settings' },
      { path: 'audit', label: 'Activity', icon: 'history' }
    );
    if (su) {
      t.push({ path: 'data', label: 'Data & sync', icon: 'code', hq: true });
      t.push({ path: 'engine', label: 'Engine', icon: 'rocket', hq: true });
    }
    return t;
  });

  constructor() {
    effect(() => {
      const c = this.ctx.campus();
      this.campuses.applyTheme(c, (c?.shortName || 'Console') + ' · ' + (this.isSuper() ? 'Hitbullseye HQ' : 'Placement cell'));
    });
  }
}
