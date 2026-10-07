import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { asApiError } from '../../core/api/api-types';
import { PortalApi } from '../../core/api/portal-api';
import { CampusConfig, Invoice, InvoiceStatus, Registration } from '../../core/models';
import { invoicePdf } from '../../core/invoice-pdf';
import { CampusService } from '../../core/services/campus.service';
import { ConsoleContext } from '../../core/services/console-context.service';
import { StatusService } from '../../core/services/status.service';
import { ToastService } from '../../core/services/toast.service';
import { SessionStore } from '../../core/session.store';
import { clone, downloadBlob, downloadCsv, isActive, money, prettyDay, toIsoDay } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';

interface Totals { licences: number; value: number; paid: number; due: number; overdue: number; tests: number; nextDue: string | null; items: Invoice[]; cancelled: number; }

function totals(c: CampusConfig): Totals {
  const all = c.commercial?.items || [];
  const items = all.filter(i => i.status !== 'Cancelled');
  const t: Totals = { licences: 0, value: 0, paid: 0, due: 0, overdue: 0, tests: 0, nextDue: null, items: all, cancelled: all.length - items.length };
  items.forEach(i => {
    t.licences += +i.licences || 0; t.value += +i.amount || 0; t.tests += +i.tests || 0;
    if (i.status === 'Paid') t.paid += +i.amount || 0;
    else { t.due += +i.amount || 0; if (i.status === 'Overdue') t.overdue += +i.amount || 0; if (!t.nextDue) t.nextDue = i.due; }
  });
  return t;
}

/** What each client bought, used and owes. HQ raises invoices; a wrong invoice is cancelled with a reason, never deleted. */
@Component({
  selector: 'hb-commercial',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './commercial.component.html'
})
export class CommercialComponent {
  readonly ctx = inject(ConsoleContext);
  readonly sessions = inject(SessionStore);
  private campuses = inject(CampusService);
  private api = inject(PortalApi);
  private statuses = inject(StatusService);
  private toast = inject(ToastService);

  readonly isHQ = this.sessions.isSuper;
  readonly regs = signal<Registration[]>([]);
  readonly money = money;
  readonly edit = signal<{ ix: number; inv: Invoice; invoiced: string; due: string; paid: string; err: string } | null>(null);
  readonly view = signal<Invoice | null>(null);

  readonly c = this.ctx.campus;
  readonly t = computed(() => (this.c() ? totals(this.c()!) : null));
  readonly used = computed(() => this.regs().filter(r => r.campusId === this.ctx.campusId() && isActive(r)).length);
  readonly usage = computed(() => {
    const t = this.t();
    if (!t) return null;
    const pct = t.licences ? Math.min(100, Math.round((this.used() * 100) / t.licences)) : 0;
    return { pct, left: Math.max(0, t.licences - this.used()) };
  });
  readonly spoc = computed(() => { const s = this.c()?.profile.spocs || []; return s.find(x => x.primary && isActive(x)) || s.find(x => isActive(x)) || null; });
  readonly hq = computed(() => this.campuses.campuses().map(c => ({
    c, t: totals(c), used: this.regs().filter(r => r.campusId === c.id && isActive(r)).length
  })));
  readonly hqKpi = computed(() => {
    const r = this.hq();
    const s = (k: (x: { t: Totals; used: number }) => number) => r.reduce((a, x) => a + k(x), 0);
    return { value: s(x => x.t.value), paid: s(x => x.t.paid), due: s(x => x.t.due), overdue: s(x => x.t.overdue), lic: s(x => x.t.licences), used: s(x => x.used), n: r.length };
  });

  constructor() {
    effect(() => { const id = this.ctx.campusId(); untracked(() => this.load(id)); });
  }

  async load(_id: string | null): Promise<void> {
    this.regs.set(await firstValueFrom(this.api.getRegistrations(this.isHQ() ? {} : { campusId: this.ctx.campusId() || undefined })));
  }

  cls(s: InvoiceStatus): string { return s === 'Paid' ? 'ok' : s === 'Overdue' ? 'err' : s === 'Cancelled' ? 'inactive' : 'warn'; }

  /* ---------------- invoices (HQ) ---------------- */
  nextId(): string {
    const c = this.c()!, n = (c.commercial.items || []).length + 1;
    const stem = c.commercial.contract?.id ? String(c.commercial.contract.id).replace(/-\d+$/, '') : 'HB-' + c.id.toUpperCase() + '-2026';
    return stem + '-' + ('0' + n).slice(-2);
  }
  openInv(ix: number): void {
    if (!this.isHQ()) return;
    const it = ix > -1 ? this.c()!.commercial.items[ix] : null;
    const inv: Invoice = it ? clone(it) : { id: this.nextId(), item: '', tests: 1, licences: 0, amount: 0, status: 'Due', invoiced: '', due: '', paid: '' };
    this.edit.set({ ix, inv, invoiced: toIsoDay(it ? it.invoiced : new Date()), due: toIsoDay(it?.due), paid: toIsoDay(it?.paid), err: '' });
    setTimeout(() => document.getElementById('invForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }
  closeInv(): void { this.edit.set(null); }

  async saveInv(): Promise<void> {
    const e = this.edit();
    if (!e || !this.isHQ()) return;
    const inv = e.inv;
    const err = (m: string) => this.edit.set({ ...e, err: m });
    inv.id = inv.id.trim(); inv.item = inv.item.trim();
    if (!inv.id) return err('Give the invoice a number.');
    if (!inv.item) return err('Say what is being invoiced.');
    if (!(+inv.amount > 0)) return err('The amount must be more than zero.');
    if (!(+inv.licences > 0)) return err('How many licences does this cover?');
    const items = this.c()!.commercial.items || [];
    if (items.some((x, i) => i !== e.ix && x.id.toLowerCase() === inv.id.toLowerCase())) return err('That invoice number is already used for this client.');
    inv.amount = +inv.amount; inv.licences = +inv.licences; inv.tests = +inv.tests || 1;
    inv.invoiced = prettyDay(e.invoiced); inv.due = prettyDay(e.due);
    inv.paid = inv.status === 'Paid' ? (prettyDay(e.paid) || prettyDay(toIsoDay(new Date()))) : '';
    const next = clone(this.c()!);
    if (e.ix > -1) next.commercial.items[e.ix] = inv; else next.commercial.items.push(inv);
    try {
      await this.campuses.save(next, (e.ix > -1 ? 'Invoice updated: ' : 'Invoice raised: ') + inv.id);
      this.toast.ok(e.ix > -1 ? 'Invoice updated.' : 'Invoice ' + inv.id + ' raised.');
      this.edit.set(null);
    } catch (x) { err(asApiError(x).message); }
  }

  async cancelInv(inv: Invoice): Promise<void> {
    const ok = await this.statuses.change('invoice', this.c()!.id, inv.id, inv.id, inv.status === 'Cancelled' ? 'active' : 'inactive', {
      what: 'invoice', note: 'It stays on record, marked Cancelled, and leaves every total.'
    });
    if (ok) this.edit.set(null);
  }

  pdf(inv: Invoice): void {
    downloadBlob(invoicePdf(this.campuses.brand()?.supportEmail || '', this.c()!, inv), inv.id.replace(/[^\w.-]+/g, '-') + '.pdf');
    this.toast.show('Downloading ' + inv.id + '.pdf', 'down', 3000);
  }

  gst(n: number): number { return Math.round((n || 0) * 0.18); }
  open(id: string): void { this.ctx.setCampus(id); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  csv(): void {
    const list = this.isHQ() ? this.campuses.campuses() : (this.c() ? [this.c()!] : []);
    const rows: unknown[][] = [];
    list.forEach(c => (c.commercial?.items || []).forEach(i => rows.push([c.commercial.clientName || c.name, i.id, i.item, i.licences, i.amount, i.invoiced, i.due, i.status, i.paid, i.cancelReason || ''])));
    downloadCsv((this.isHQ() ? 'all-clients' : this.c()?.id) + '-commercial.csv', ['Client', 'Invoice', 'Item', 'Licences', 'Amount', 'Invoiced', 'Due', 'Status', 'Paid on', 'Cancel reason'], rows);
    this.toast.ok('Exported ' + rows.length + ' lines.');
  }
  print(): void { window.print(); }
}
