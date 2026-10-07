import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { MockDb } from '../../core/api/mock/mock-db';
import { DEMO_ADMIN_PASSWORD, DEMO_STUDENT_PASSWORD } from '../../core/api/mock/seed';
import { AuthService } from '../../core/services/auth.service';
import { CampusService } from '../../core/services/campus.service';
import { SessionStore } from '../../core/session.store';
import { lc } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';

interface DemoCred { username: string; password: string; who: string; note: string; }

/**
 * One sign-in page for students and placement cells. The username and
 * password are the ones created in the Hitbullseye admin panel; the panel
 * checks them and the portal decides where to send you.
 */
@Component({
  selector: 'hb-login',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  readonly as = input<string>('');
  readonly next = input<string>('');
  readonly college = input<string>('');
  private auth = inject(AuthService);
  private campuses = inject(CampusService);
  private sessions = inject(SessionStore);
  private router = inject(Router);
  private db = environment.useMockApi ? inject(MockDb) : null;

  readonly demo = environment.demoMode;
  readonly brand = this.campuses.brand;
  readonly c = computed(() => this.campuses.resolve(this.college() || null));
  readonly tab = signal<'student' | 'admin'>('student');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly stats = computed(() => this.c()?.welcome.stats || []);
  username = '';
  password = '';

  readonly studentCreds = computed<DemoCred[]>(() => {
    if (!this.db || !this.c()) return [];
    const c = this.c()!;
    const regs = new Set(this.db.registrations.filter(r => r.campusId === c.id).map(r => lc(r.uid)));
    const rows = this.db.panel.students.filter(s => s.clientId === c.externalClientId);
    const done = rows.filter(s => regs.has(lc(s.uid))).slice(0, 2);
    const fresh = rows.filter(s => !regs.has(lc(s.uid))).slice(0, 1);
    return [
      ...done.map(s => ({ username: s.username, password: DEMO_STUDENT_PASSWORD, who: s.name, note: 'registered — opens the dashboard' })),
      ...fresh.map(s => ({ username: s.username, password: DEMO_STUDENT_PASSWORD, who: s.name, note: 'not registered — opens the form (draft kept)' }))
    ];
  });
  readonly adminCreds = computed<DemoCred[]>(() => {
    if (!this.db) return [];
    return this.db.panel.admins.filter(a => a.clientId !== 'CL-1006').map(a => ({
      username: a.username, password: DEMO_ADMIN_PASSWORD, who: a.name,
      note: this.campuses.campuses().find(x => x.externalClientId === a.clientId)?.shortName || ''
    }));
  });

  ngOnInit(): void {
    this.campuses.applyTheme(this.c(), 'Sign in · Hitbullseye');
    if (this.as() === 'admin') this.tab.set('admin');
    const s = this.sessions.session();
    if (s && !this.next()) {
      this.router.navigateByUrl(s.role === 'student' ? '/me' : s.role === 'super_admin' ? '/console/clients' : '/console/analytics');
      return;
    }
    this.prefill();
  }

  setTab(t: 'student' | 'admin'): void {
    this.tab.set(t);
    this.error.set('');
    this.prefill();
  }

  private prefill(): void {
    if (!this.demo) return;
    const list = this.tab() === 'admin' ? this.adminCreds() : this.studentCreds();
    const pick = this.tab() === 'admin' ? (list.find(x => this.c() && x.note === this.c()!.shortName) || list[0]) : list[0];
    if (pick) this.fill(pick);
  }

  fill(d: DemoCred): void {
    this.username = d.username;
    this.password = d.password;
    this.error.set('');
  }

  async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    const r = await this.auth.login(this.username, this.password);
    this.busy.set(false);
    if (!r.ok) { this.error.set(r.error); return; }
    const s = this.sessions.session();
    const nextOk = this.next() && s && ((s.role === 'student' && this.next().startsWith('/me')) || (s.role !== 'student' && this.next().startsWith('/console')));
    this.router.navigateByUrl(nextOk ? this.next() : r.url);
  }

  logoH(h: number | undefined): number { return Math.min(+(h || 34), 34); }
}
