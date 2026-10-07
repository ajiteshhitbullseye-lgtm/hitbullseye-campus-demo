import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PortalApi } from '../../core/api/portal-api';
import { Registration } from '../../core/models';
import { CampusService } from '../../core/services/campus.service';
import { SessionStore } from '../../core/session.store';
import { testsFor } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';
import { SiteNavComponent } from '../../shared/site-nav.component';
import { StepperComponent } from '../../shared/stepper.component';

@Component({
  selector: 'hb-thankyou',
  standalone: true,
  imports: [RouterLink, IconComponent, SiteNavComponent, StepperComponent],
  template: `
    @if (c(); as c) {
    <hb-site-nav [campus]="c"><span class="badge ok"><hb-icon name="check" /> Registered</span></hb-site-nav>
    <main class="wrap-narrow page" style="padding-top:8px;padding-bottom:60px">
      <hb-stepper [active]="3" />
      <div class="card card-body rise center">
        <div class="tick"><hb-icon name="check" /></div>
        <h1 style="font-size:30px">{{ c.thankyou.title || "You're all set!" }}</h1>
        <p class="mut" style="max-width:560px;margin:10px auto 0">{{ message() }}</p>
        <div style="margin:26px 0 8px">
          <div class="caps" style="margin-bottom:8px">Your registration number</div>
          <div class="code-box">{{ st()?.regNo || '—' }}</div>
        </div>
        <p class="xs mut">Keep this number handy — you will need it for your test and reports.</p>
        <div class="divider"></div>
        <div style="text-align:left">
          <div class="group-title first">Submitted details</div>
          @if (st(); as s) {
            @for (d of rows(); track d.label) { <div class="kv"><span>{{ d.label }}</span><b>{{ d.value }}</b></div> }
            <div class="kv"><span>Batch</span><b>{{ batchName() }}</b></div>
            <div class="kv"><span>Email verification</span><b><span class="badge ok">Verified ({{ s.verifiedVia === 'otp' ? 'email code' : 'college login' }})</span></b></div>
            @if (s.declaration) { <div class="kv"><span>Declaration</span><b><span class="badge ok">{{ s.declaration.rows }} details self-verified</span></b></div> }
            <div class="kv"><span>Assessments unlocked</span><b>@for (t of unlocked(); track t.id) { {{ t.name }}<br> } @empty { — }</b></div>
          } @else {
            <p class="sm mut">No registration found. Please sign in.</p>
          }
        </div>
        <div class="d-flex justify-content-center gap-2 flex-wrap" style="margin-top:28px">
          <a class="btn btn-primary btn-lg" routerLink="/me">{{ c.thankyou.dashboardLabel || 'Go to my dashboard' }} <hb-icon name="arrow" /></a>
          <button class="btn btn-ghost btn-lg" (click)="print()">Print this page</button>
        </div>
        <p class="xs mut" style="margin-top:14px">
          @if (left() > 0) { Redirecting to your dashboard in <b>{{ left() }}</b> seconds · <a href="#" (click)="$event.preventDefault(); stop()">stay on this page</a> }
          @else if (stopped()) { Automatic redirect cancelled. }
        </p>
      </div>
    </main>
    }
  `
})
export class ThankyouComponent implements OnInit, OnDestroy {
  readonly campusParam = input<string>('', { alias: 'campus' });
  private campuses = inject(CampusService);
  private sessions = inject(SessionStore);
  private api = inject(PortalApi);
  private router = inject(Router);

  readonly c = computed(() => this.campuses.resolve(this.campusParam()));
  readonly st = signal<Registration | null>(null);
  readonly left = signal(0);
  readonly stopped = signal(false);
  readonly rows = computed(() => Object.values(this.st()?.data || {}).filter(d => !!d.value));
  readonly unlocked = computed(() => (this.st() && this.c() ? testsFor(this.c()!, this.st()!) : []));
  readonly batchName = computed(() => this.campuses.batchName(this.st()?.batchId));
  readonly message = computed(() => {
    const m = this.c()?.thankyou.message || 'Your registration is confirmed.';
    const first = this.st()?.name.split(' ')[0];
    return first ? first + ', ' + m.charAt(0).toLowerCase() + m.slice(1) : m;
  });
  private t: ReturnType<typeof setInterval> | null = null;

  async ngOnInit(): Promise<void> {
    this.campuses.applyTheme(this.c());
    const s = this.sessions.session();
    if (s?.studentId) this.st.set(await firstValueFrom(this.api.getRegistration(s.studentId)));
    if (!this.st()) return;
    this.left.set(this.c()?.thankyou.redirectSeconds || 8);
    this.t = setInterval(() => {
      this.left.update(v => v - 1);
      if (this.left() <= 0) { this.clear(); this.router.navigateByUrl('/me'); }
    }, 1000);
  }

  stop(): void { this.clear(); this.left.set(0); this.stopped.set(true); }
  print(): void { this.stop(); window.print(); }
  private clear(): void { if (this.t) { clearInterval(this.t); this.t = null; } }
  ngOnDestroy(): void { this.clear(); }
}
