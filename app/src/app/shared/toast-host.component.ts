import { Component, inject } from '@angular/core';
import { ToastService } from '../core/services/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'hb-toast-host',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="hb-toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="hb-toast" (click)="toast.dismiss(t.id)">
          <hb-icon [name]="t.icon" />
          <div [innerHTML]="t.html"></div>
        </div>
      }
    </div>
  `
})
export class ToastHostComponent {
  readonly toast = inject(ToastService);
}
