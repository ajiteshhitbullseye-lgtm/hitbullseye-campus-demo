import { Component, input } from '@angular/core';

/** Welcome → Verify → Registration → Confirmation → Dashboard */
@Component({
  selector: 'hb-stepper',
  standalone: true,
  template: `
    <div class="stepper no-print">
      @for (n of names; track n; let i = $index; let last = $last) {
        <div class="stp" [class.ok]="i < active()" [class.on]="i === active()">
          <i>{{ i < active() ? '✓' : i + 1 }}</i> <span>{{ n }}</span>
        </div>
        @if (!last) { <div class="stp-line"></div> }
      }
    </div>
  `
})
export class StepperComponent {
  readonly active = input(0);
  readonly names = ['Welcome', 'Verify ID', 'Registration', 'Confirmation', 'Dashboard'];
}
