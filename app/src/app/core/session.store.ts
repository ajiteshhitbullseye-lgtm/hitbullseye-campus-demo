import { Injectable, computed, inject, signal } from '@angular/core';
import { Session } from './models';
import { StorageService } from './storage.service';

/** Who is signed in. In production the session is a token issued by the portal backend. */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private store = inject(StorageService);
  private readonly _session = signal<Session | null>(this.store.json<Session | null>('session', null));

  readonly session = this._session.asReadonly();
  readonly isSuper = computed(() => this._session()?.role === 'super_admin');
  readonly isCollegeAdmin = computed(() => this._session()?.role === 'college_admin');
  readonly isAdmin = computed(() => this.isSuper() || this.isCollegeAdmin());
  readonly isStudent = computed(() => this._session()?.role === 'student');

  set(s: Session): void {
    this._session.set(s);
    this.store.setJson('session', s);
  }

  clear(): void {
    this._session.set(null);
    this.store.remove('session');
  }

  actor(): { role: Session['role'] | 'system'; name: string; email: string } {
    const s = this._session();
    return s ? { role: s.role, name: s.name, email: s.email } : { role: 'system', name: 'System', email: '' };
  }
}
