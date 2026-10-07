import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  html: string;
  icon: string;
}

/** Bottom-right notifications. Messages may carry simple markup (<b>, <br>, <a>). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  show(html: string, icon = 'info', ms = 5000): void {
    const t: Toast = { id: ++this.seq, html, icon };
    this.toasts.update(l => [...l, t]);
    setTimeout(() => this.dismiss(t.id), ms);
  }

  ok(html: string, ms = 3500): void { this.show(html, 'check', ms); }
  warn(html: string, ms = 5000): void { this.show(html, 'alert', ms); }

  dismiss(id: number): void {
    this.toasts.update(l => l.filter(x => x.id !== id));
  }
}
