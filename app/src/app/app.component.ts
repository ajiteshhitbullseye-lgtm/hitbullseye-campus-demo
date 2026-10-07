import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { DialogHostComponent } from './shared/dialog-host.component';
import { ToastHostComponent } from './shared/toast-host.component';

@Component({
  selector: 'hb-root',
  standalone: true,
  imports: [RouterOutlet, ToastHostComponent, DialogHostComponent],
  template: `
    @if (demo) {
      <div class="demo-strip"><b>Demo build</b> · runs on mock data in this browser · please do not enter real personal details</div>
    }
    <router-outlet />
    <hb-toast-host />
    <hb-dialog-host />
  `
})
export class AppComponent {
  readonly demo = environment.demoMode;
}
