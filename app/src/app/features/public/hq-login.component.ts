import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { DEMO_SUPER } from '../../core/api/mock/seed';
import { AuthService } from '../../core/services/auth.service';
import { CampusService } from '../../core/services/campus.service';

/** Hitbullseye HQ: its own page and its own account — not the campus login. */
@Component({
  selector: 'hb-hq-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth hq">
      <aside class="auth-art">
        <span class="logo-plate" style="background:#fff;align-self:flex-start;margin-bottom:auto">
          <img src="assets/hitbullseye-real.png" alt="Hitbullseye" style="max-height:34px"></span>
        <span class="eyebrow" style="align-self:flex-start">Internal · Hitbullseye HQ</span>
        <h2 style="margin-top:16px">Every campus,<br><em>one console</em>.</h2>
        <p>Sign in with your Hitbullseye account to manage all client campuses.</p>
        <ul class="ticks" style="margin-top:26px">
          <li><span>&#9679;</span><span>Clients and batches from the admin panel, synced</span></li>
          <li><span>&#9679;</span><span>Form builder — fields, assessments, access codes, nomenclature</span></li>
          <li><span>&#9679;</span><span>Analytics and student reports for any campus</span></li>
          <li><span>&#9679;</span><span>Activity log — every change, who made it and why</span></li>
        </ul>
        <p class="xs" style="margin-top:auto;color:rgba(255,255,255,.6)">Campus staff and students sign in at the campus link, not here.</p>
      </aside>
      <section class="auth-form">
        <div class="auth-box">
          <div class="auth-lock">
            <span class="plate"><img src="assets/hitbullseye-real.png" alt="Hitbullseye"></span>
            <span class="txt"><b>Hitbullseye HQ</b>Internal console</span>
          </div>
          <span class="badge brand">Staff access</span>
          <h2 style="margin:14px 0 6px">HQ sign in</h2>
          <p class="sm mut" style="margin-bottom:24px">This console is for Hitbullseye staff only.</p>
          <form (ngSubmit)="go()" novalidate>
            <div class="mb-3">
              <label class="form-label" for="he">Work email</label>
              <input id="he" name="e" type="email" class="form-control" [(ngModel)]="email" placeholder="you@demo.com" autocomplete="username">
            </div>
            <div class="mb-3">
              <label class="form-label" for="hp">Password</label>
              <input id="hp" name="p" type="password" class="form-control" [(ngModel)]="password" placeholder="Enter password" autocomplete="current-password">
            </div>
            @if (error()) { <div class="err-msg mb-3">{{ error() }}</div> }
            <p class="sm mut" style="margin-bottom:22px">No campus to pick — this is the master login. The campus switcher sits in the app bar once you are inside.</p>
            <button class="btn btn-primary btn-lg w-100" type="submit" [disabled]="busy()">Sign in to HQ</button>
          </form>
          @if (demo) {
            <button type="button" class="demo-id" style="margin-top:18px" (click)="fill()"><b>{{ demoEmail }} / {{ demoPass }}</b><span>Demo credentials — click to fill</span></button>
          }
          <p class="xs mut center" style="margin-top:24px">Campus staff? <a routerLink="/login" [queryParams]="{ as: 'admin' }">Sign in here</a> · <a routerLink="/">Student portal</a></p>
        </div>
      </section>
    </div>
  `
})
export class HqLoginComponent implements OnInit {
  readonly next = input<string>('');
  private auth = inject(AuthService);
  private campuses = inject(CampusService);
  private router = inject(Router);

  readonly demo = environment.demoMode;
  readonly demoEmail = DEMO_SUPER.email;
  readonly demoPass = DEMO_SUPER.password;
  readonly busy = signal(false);
  readonly error = signal('');
  email = '';
  password = '';

  ngOnInit(): void {
    this.campuses.applyHqTheme('HQ sign in · Hitbullseye');
    if (this.demo) this.fill();
  }

  fill(): void { this.email = this.demoEmail; this.password = this.demoPass; this.error.set(''); }

  async go(): Promise<void> {
    this.busy.set(true);
    const r = await this.auth.superLogin(this.email, this.password);
    this.busy.set(false);
    if (!r.ok) { this.error.set(r.error); return; }
    this.router.navigateByUrl(this.next() && this.next().startsWith('/console') ? this.next() : r.url);
  }
}
