import { Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CampusService } from '../../core/services/campus.service';
import { ConsoleContext } from '../../core/services/console-context.service';
import { SessionStore } from '../../core/session.store';
import { initials, isActive } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';

interface Tab { path: string; label: string; icon: string; hq?: boolean; group: string; }

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
        <div class="cnav-in cnav-bar">
          <a class="crumb-home" routerLink="/console/home" title="All sections">
            <hb-icon name="grid" /><span>Home</span>
          </a>
          @if (current(); as t) {
            <hb-icon name="chev" class="crumb-sep" />
            <span class="crumb-now"><hb-icon [name]="t.icon" />{{ t.label }}</span>
          }

          <div class="sections" [class.open]="menu()">
            <button type="button" class="btn btn-ghost btn-sm" (click)="menu.set(!menu())">
              <hb-icon name="layers" /> Sections <hb-icon name="chevDown" class="caret" />
            </button>
            @if (menu()) {
              <div class="sections-back" (click)="menu.set(false)"></div>
              <div class="sections-pop">
                @for (g of grouped(); track g.name) {
                  <div class="sec-group">
                    <span class="sec-group-title">{{ g.name }}</span>
                    @for (t of g.tabs; track t.path) {
                      <a class="sec-item" [routerLink]="'/console/' + t.path" routerLinkActive="on" (click)="menu.set(false)">
                        <hb-icon [name]="t.icon" /><span>{{ t.label }}</span>
                        @if (t.hq) { <i class="hq-dot" title="Hitbullseye only"></i> }
                      </a>
                    }
                  </div>
                }
              </div>
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
  private router = inject(Router);
  private sessions = inject(SessionStore);

  readonly session = this.sessions.session;
  readonly isSuper = this.sessions.isSuper;
  readonly initials = initials;
  readonly hbLogo = 'assets/hitbullseye-real.png';
  readonly active = (x: { status?: 'active' | 'inactive' } | null) => isActive(x);
  readonly logoH = computed(() => Math.min(+(this.ctx.campus()?.logoHeight || 32), 32));

  readonly menu = signal(false);

  readonly tabs = computed<Tab[]>(() => {
    const su = this.isSuper();
    const t: Tab[] = [];
    if (su) t.push({ path: 'clients', label: 'Clients', icon: 'grid', hq: true, group: 'Across every campus' });
    t.push(
      { path: 'analytics', label: 'Analytics', icon: 'chart', group: 'Reports & analytics' },
      { path: 'insights', label: 'Insights', icon: 'target', group: 'Reports & analytics' },
      { path: 'students', label: 'Students', icon: 'users', group: 'Reports & analytics' },
      { path: 'roster', label: 'Master list', icon: 'list', group: 'Students & setup' },
      { path: 'commercial', label: 'Commercial', icon: 'rupee', group: 'Account' },
      { path: 'profile', label: 'Campus profile', icon: 'building', group: 'Students & setup' },
      { path: 'form', label: su ? 'Form builder' : 'Registration form', icon: 'settings', group: 'Students & setup' },
      { path: 'audit', label: 'Activity log', icon: 'history', group: 'Account' }
    );
    if (su) {
      /* access codes and campus logins are a Hitbullseye job, not a campus one */
      t.push({ path: 'access', label: 'Access & logins', icon: 'key', hq: true, group: 'Across every campus' });
      t.push({ path: 'data', label: 'Data & sync', icon: 'code', hq: true, group: 'Across every campus' });
      t.push({ path: 'engine', label: 'Engine', icon: 'rocket', hq: true, group: 'Across every campus' });
    }
    return t;
  });

  /** the same grouping the hub uses, so the menu and the boxes agree */
  readonly grouped = computed(() => {
    const order = ['Reports & analytics', 'Students & setup', 'Account', 'Across every campus'];
    const by = new Map<string, Tab[]>();
    this.tabs().forEach(t => {
      if (!by.has(t.group)) by.set(t.group, []);
      by.get(t.group)!.push(t);
    });
    return order.filter(g => by.has(g)).map(g => ({ name: g, tabs: by.get(g)! }));
  });

  /** which section is open, for the breadcrumb */
  private readonly url = signal(this.router.url);
  readonly current = computed(() => {
    const seg = this.url().split('?')[0].split('/')[2] || '';
    if (!seg || seg === 'home') return null;
    return this.tabs().find(t => t.path === seg) || null;
  });

  constructor() {
    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) { this.url.set(e.urlAfterRedirects); this.menu.set(false); }
    });
    effect(() => {
      const c = this.ctx.campus();
      this.campuses.applyTheme(c, (c?.shortName || 'Console') + ' · ' + (this.isSuper() ? 'Hitbullseye HQ' : 'Placement cell'));
    });
  }
}
