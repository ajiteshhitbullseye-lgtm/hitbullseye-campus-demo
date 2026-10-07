import { Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CampusConfig } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/icon.component';
import { SiteNavComponent } from '../../shared/site-nav.component';

/** Top bar for signed-in students. */
@Component({
  selector: 'hb-student-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, SiteNavComponent],
  template: `
    <hb-site-nav [campus]="campus()">
      <a class="site-link" routerLink="/me" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">My dashboard</a>
      @if (hasReports()) { <a class="site-link" routerLink="/me/report" routerLinkActive="on">My reports</a> }
      <button type="button" class="btn btn-ghost btn-sm" (click)="auth.logout()"><hb-icon name="logout" /> Sign out</button>
    </hb-site-nav>
  `
})
export class StudentNavComponent {
  readonly campus = input<CampusConfig | null>(null);
  readonly hasReports = input(true);
  readonly auth = inject(AuthService);
}
