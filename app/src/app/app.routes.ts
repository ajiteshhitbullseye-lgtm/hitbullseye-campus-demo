import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { adminGuard, studentGuard, superGuard } from './core/guards';
import { CampusService } from './core/services/campus.service';

export const routes: Routes = [
  /* ---------------- students: registration ---------------- */
  {
    path: '', pathMatch: 'full',
    redirectTo: () => {
      const c = inject(CampusService).resolve(null);
      return c ? '/c/' + c.id : '/login';
    }
  },
  { path: 'c/:campus', title: 'Welcome', loadComponent: () => import('./features/public/welcome.component').then(m => m.WelcomeComponent) },
  { path: 'c/:campus/verify', title: 'Verify your ID', loadComponent: () => import('./features/public/verify.component').then(m => m.VerifyComponent) },
  { path: 'c/:campus/register', title: 'Registration', loadComponent: () => import('./features/public/register.component').then(m => m.RegisterComponent) },
  { path: 'c/:campus/thank-you', title: 'Registered', loadComponent: () => import('./features/public/thankyou.component').then(m => m.ThankyouComponent) },

  /* ---------------- sign in ---------------- */
  { path: 'login', loadComponent: () => import('./features/public/login.component').then(m => m.LoginComponent) },
  { path: 'hq/login', loadComponent: () => import('./features/public/hq-login.component').then(m => m.HqLoginComponent) },

  /* ---------------- students: dashboard, tests, reports ---------------- */
  {
    path: 'me', canActivate: [studentGuard],
    children: [
      { path: '', loadComponent: () => import('./features/student/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'test/:testId', loadComponent: () => import('./features/student/test.component').then(m => m.TestComponent) },
      { path: 'practice/:practiceId', loadComponent: () => import('./features/student/test.component').then(m => m.TestComponent) },
      { path: 'report', loadComponent: () => import('./features/student/report.component').then(m => m.ReportComponent) }
    ]
  },

  /* ---------------- console: placement cell + HQ ---------------- */
  {
    path: 'console', canActivate: [adminGuard],
    loadComponent: () => import('./features/console/console-shell.component').then(m => m.ConsoleShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', title: 'Console', loadComponent: () => import('./features/console/hub.component').then(m => m.HubComponent) },
      { path: 'clients', canActivate: [superGuard], loadComponent: () => import('./features/console/clients.component').then(m => m.ClientsComponent) },
      { path: 'analytics', loadComponent: () => import('./features/console/analytics.component').then(m => m.AnalyticsComponent) },
      { path: 'insights', loadComponent: () => import('./features/console/insights.component').then(m => m.InsightsComponent) },
      { path: 'students', loadComponent: () => import('./features/console/students.component').then(m => m.StudentsComponent) },
      { path: 'roster', loadComponent: () => import('./features/console/roster.component').then(m => m.RosterComponent) },
      { path: 'commercial', loadComponent: () => import('./features/console/commercial.component').then(m => m.CommercialComponent) },
      { path: 'profile', loadComponent: () => import('./features/console/profile.component').then(m => m.ProfileComponent) },
      { path: 'form', loadComponent: () => import('./features/console/form-builder.component').then(m => m.FormBuilderComponent) },
      { path: 'access', canActivate: [superGuard], loadComponent: () => import('./features/console/access.component').then(m => m.AccessComponent) },
      { path: 'audit', loadComponent: () => import('./features/console/audit.component').then(m => m.AuditComponent) },
      { path: 'data', canActivate: [superGuard], loadComponent: () => import('./features/console/data.component').then(m => m.DataComponent) },
      { path: 'engine', canActivate: [superGuard], loadComponent: () => import('./features/console/engine.component').then(m => m.EngineComponent) },
      { path: 'report/:studentId', loadComponent: () => import('./features/student/report.component').then(m => m.ReportComponent) }
    ]
  },

  { path: '**', redirectTo: '' }
];
