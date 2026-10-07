import { Component, computed, input } from '@angular/core';
import { Status } from '../core/models';

/** "Active" / "Inactive" chip; shows the reason on hover. */
@Component({
  selector: 'hb-status',
  standalone: true,
  template: `
    @if (isActive()) {
      @if (!quiet()) { <span class="badge ok">Active</span> }
    } @else {
      <span class="badge inactive" [title]="title()">Inactive</span>
    }
  `
})
export class StatusBadgeComponent {
  readonly status = input<Status | undefined>('active');
  readonly reason = input<string | undefined>('');
  readonly by = input<string | undefined>('');
  /** hide the green "Active" chip — show only when inactive */
  readonly quiet = input(false);
  readonly isActive = computed(() => (this.status() || 'active') === 'active');
  readonly title = computed(() => [this.reason(), this.by() ? 'by ' + this.by() : ''].filter(Boolean).join(' · '));
}
