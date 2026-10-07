import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/auth/pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    data: { roles: ['ADMINISTRADOR'] },
    loadComponent: () => import('./features/admin/layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/pages/dashboard/dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'atracciones',
        loadComponent: () => import('./features/admin/pages/atracciones/atracciones.component').then(m => m.AtraccionesComponent)
      },
      {
        path: 'asignaciones',
        loadComponent: () => import('./features/admin/pages/asignaciones/asignaciones.component').then(m => m.AsignacionesComponent)
      },
      {
        path: 'colaboradores',
        loadComponent: () => import('./features/admin/pages/colaboradores/colaboradores.component').then(m => m.ColaboradoresComponent)
      },
      {
        path: 'usuarios',
        redirectTo: 'colaboradores',
        pathMatch: 'full'
      },
      {
        path: 'reportes',
        loadComponent: () => import('./features/admin/pages/reportes/reportes.component').then(m => m.ReportesComponent)
      },
      {
        path: 'turnos',
        loadComponent: () => import('./features/admin/pages/turnos/turnos.component').then(m => m.TurnosComponent)
      },
      {
        path: 'auditoria',
        loadComponent: () => import('./features/admin/pages/auditoria/auditoria.component').then(m => m.AuditoriaComponent)
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./features/admin/pages/configuracion/configuracion.component').then(m => m.ConfiguracionComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
