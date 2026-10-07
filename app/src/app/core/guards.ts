import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';
import { SessionStore } from './session.store';

/** Signed-in student whose campus and registration are still active. */
export const studentGuard: CanActivateFn = async (_route, state) => {
  const sessions = inject(SessionStore);
  const router = inject(Router);
  const auth = inject(AuthService);
  const s = sessions.session();
  if (!s) return router.createUrlTree(['/login'], { queryParams: { next: state.url } });
  if (s.role !== 'student') return router.createUrlTree(['/console/students']);
  const why = await auth.stillAllowed();
  if (why) { auth.logout(why); return false; }
  return true;
};

/** College admin (own campus) or HQ. */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const sessions = inject(SessionStore);
  const router = inject(Router);
  const auth = inject(AuthService);
  const s = sessions.session();
  if (!s || (s.role !== 'college_admin' && s.role !== 'super_admin')) {
    return router.createUrlTree(['/login'], { queryParams: { as: 'admin', next: state.url } });
  }
  const why = await auth.stillAllowed();
  if (why) { auth.logout(why); return false; }
  return true;
};

/** Hitbullseye HQ only. A college admin is sent back to their own console with a note. */
export const superGuard: CanActivateFn = (_route, state) => {
  const sessions = inject(SessionStore);
  const router = inject(Router);
  const toast = inject(ToastService);
  const s = sessions.session();
  if (s?.role === 'super_admin') return true;
  if (s?.role === 'college_admin') {
    toast.show('That page is for Hitbullseye HQ only.', 'lock', 4000);
    return router.createUrlTree(['/console/analytics']);
  }
  return router.createUrlTree(['/hq/login'], { queryParams: { next: state.url } });
};
