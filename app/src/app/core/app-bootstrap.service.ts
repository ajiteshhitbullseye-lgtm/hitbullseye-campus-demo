import { Injectable, inject } from '@angular/core';
import { ico } from '../shared/icons';
import { installLegacyGlobals } from './analytics/legacy';
import { TestPlatformService } from './analytics/test-platform.service';
import { CampusService } from './services/campus.service';
import { ToastService } from './services/toast.service';

/** Runs once before the first page: loads config, prepares analytics, wires the legacy renderer. */
@Injectable({ providedIn: 'root' })
export class AppBootstrap {
  private campuses = inject(CampusService);
  private platform = inject(TestPlatformService);
  private toast = inject(ToastService);

  async init(): Promise<void> {
    installLegacyGlobals({
      ico,
      toast: (html, icon, ms) => this.toast.show(html, icon || 'info', ms || 5000),
      hbx: {
        clearJourney: id => this.platform.clearJourney(id),
        hasSimulatedJourney: id => this.platform.hasSimulatedJourney(id)
      }
    });
    await this.campuses.init();
    await this.platform.init();
  }
}
