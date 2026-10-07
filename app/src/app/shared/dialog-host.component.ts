import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../core/services/dialog.service';
import { IconComponent } from './icon.component';

/** Renders confirm / reason dialogs requested through DialogService. */
@Component({
  selector: 'hb-dialog-host',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    @if (dialogs.state(); as d) {
      <div class="modal hb-modal" tabindex="-1" role="dialog" aria-modal="true" (click)="cancel()" (keydown.escape)="cancel()">
        <div class="modal-dialog modal-dialog-centered" (click)="$event.stopPropagation()">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title d-flex align-items-center gap-2">
                <hb-icon [name]="d.kind === 'reason' ? 'power' : 'info'" [size]="18" />
                {{ d.title }}
              </h3>
              <button type="button" class="btn-close" aria-label="Close" (click)="cancel()"></button>
            </div>
            <div class="modal-body">
              <p class="sm mut">{{ d.message }}</p>
              @if (d.kind === 'reason') {
                <label class="form-label mt-3" for="dlgReason">Reason <span class="req">*</span></label>
                @if (d.presets?.length) {
                  <div class="d-flex flex-wrap gap-2 mb-2">
                    @for (p of d.presets; track p) {
                      <button type="button" class="fchip" [class.on]="reason() === p" (click)="reason.set(p)">{{ p }}</button>
                    }
                  </div>
                }
                <textarea id="dlgReason" class="form-control" rows="2" [ngModel]="reason()" (ngModelChange)="reason.set($event)"
                  placeholder="e.g. Left the programme in September" [class.is-invalid]="tried() && reason().trim().length < 3"></textarea>
                <div class="invalid-feedback">Write a short reason (at least 3 characters).</div>
                <p class="xs mut mt-2">Saved to the audit log with your name and the time.</p>
              }
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" (click)="cancel()">Cancel</button>
              <button type="button" class="btn" [class.btn-primary]="!d.danger" [class.btn-danger-soft]="d.danger" (click)="ok()">
                {{ d.confirmLabel }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class DialogHostComponent {
  readonly dialogs = inject(DialogService);
  readonly reason = signal('');
  readonly tried = signal(false);

  constructor() {
    effect(() => {
      if (this.dialogs.state()) { this.reason.set(''); this.tried.set(false); }
    });
  }

  ok(): void {
    const d = this.dialogs.state();
    if (!d) return;
    if (d.kind === 'reason') {
      this.tried.set(true);
      if (this.reason().trim().length < 3) return;
      this.dialogs.close(this.reason().trim());
    } else {
      this.dialogs.close(true);
    }
  }

  cancel(): void {
    const d = this.dialogs.state();
    if (!d) return;
    this.dialogs.close(d.kind === 'reason' ? null : false);
  }
}
