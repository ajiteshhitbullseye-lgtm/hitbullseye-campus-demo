import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CampusConfig } from '../core/models';

/** The campus-branded top bar of every student-facing page. Links go in as content. */
@Component({
  selector: 'hb-site-nav',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="site-nav no-print">
      <div class="site-nav-in">
        @if (campus(); as c) {
          <a class="logo-plate" [routerLink]="['/c', c.id]" [title]="c.name">
            <img [src]="c.logo" [alt]="c.name" [style.max-height.px]="logoH()">
          </a>
          <div class="co">{{ c.shortName || c.name }}<small>Assessment Portal</small></div>
          <div class="sep"></div>
        }
        <div class="logo-plate bare"><img src="assets/hitbullseye-real.png" alt="Hitbullseye"></div>
        <div class="site-links"><ng-content /></div>
      </div>
    </nav>
  `
})
export class SiteNavComponent {
  readonly campus = input<CampusConfig | null>(null);
  readonly logoH = computed(() => Math.min(+(this.campus()?.logoHeight || 34), 34));
}
