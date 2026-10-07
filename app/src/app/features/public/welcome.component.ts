import { Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CampusService } from '../../core/services/campus.service';
import { activeTests, audienceText, initials, isActive, isRestricted } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';
import { SiteNavComponent } from '../../shared/site-nav.component';

@Component({
  selector: 'hb-welcome',
  standalone: true,
  imports: [RouterLink, IconComponent, SiteNavComponent],
  templateUrl: './welcome.component.html'
})
export class WelcomeComponent {
  readonly campusParam = input<string>('', { alias: 'campus' });
  private campuses = inject(CampusService);
  private router = inject(Router);

  readonly demo = environment.demoMode;
  readonly brand = this.campuses.brand;
  readonly c = computed(() => this.campuses.resolve(this.campusParam()));
  readonly open = computed(() => isActive(this.c()));
  readonly tests = computed(() => (this.c() ? activeTests(this.c()!) : []));
  readonly primary = computed(() => this.tests()[0] || null);
  readonly openBatches = computed(() => this.c()
    ? this.campuses.batchesOf(this.c()!.id).filter(b => isActive(b) && b.panelStatus === 'active') : []);
  readonly title = computed(() => {
    const w = this.c()?.welcome;
    if (!w) return { before: '', hl: '', after: '' };
    const i = w.highlight ? w.title.indexOf(w.highlight) : -1;
    return i < 0 ? { before: w.title, hl: '', after: '' }
      : { before: w.title.slice(0, i), hl: w.highlight, after: w.title.slice(i + w.highlight.length) };
  });
  readonly closesOn = computed(() => String(this.primary()?.window || '').split(/[–-]/).pop()?.trim() || '');
  readonly allCampuses = this.campuses.activeCampuses;

  readonly initials = initials;
  readonly audienceText = audienceText;
  readonly campusesBatchName = (id: string) => this.campuses.batchName(id);
  readonly isRestricted = isRestricted;

  constructor() {
    effect(() => {
      const c = this.c();
      if (!c) { this.router.navigateByUrl('/login'); return; }
      if (this.campusParam() !== c.id) { this.router.navigate(['/c', c.id], { replaceUrl: true }); return; }
      this.campuses.applyTheme(c);
    });
  }

  go(id: string): void {
    this.router.navigate(['/c', id]);
  }

  logoH(h: number | undefined, minus: number): number {
    return (+(h || 34)) - minus;
  }
}
