import { Injectable, signal } from '@angular/core';

export interface DialogState {
  kind: 'confirm' | 'reason';
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  /** suggestions shown as one-click chips for the reason box */
  presets?: string[];
  resolve: (v: string | boolean | null) => void;
}

/**
 * Promise-based dialogs rendered by <hb-dialog-host>.
 * `reason()` is how every "make inactive" asks why: nothing is switched
 * off without a reason, and the reason goes to the audit log.
 */
@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly state = signal<DialogState | null>(null);

  confirm(title: string, message: string, confirmLabel = 'Confirm', danger = false): Promise<boolean> {
    return new Promise(resolve => {
      this.state.set({ kind: 'confirm', title, message, confirmLabel, danger, resolve: v => resolve(!!v) });
    });
  }

  reason(title: string, message: string, confirmLabel = 'Make inactive', presets?: string[]): Promise<string | null> {
    return new Promise(resolve => {
      this.state.set({
        kind: 'reason', title, message, confirmLabel, danger: true, presets,
        resolve: v => resolve(typeof v === 'string' ? v : null)
      });
    });
  }

  close(v: string | boolean | null): void {
    const s = this.state();
    this.state.set(null);
    s?.resolve(v);
  }
}
