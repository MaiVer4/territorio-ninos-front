import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: number;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.component.html',
  styles: [`
    :host {
      display: block;
      height: 100%;
      width: 100%;
      overflow: hidden;
    }
  `]
})
export class AdminLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // En escritorio controla colapso (w-60 vs w-16). En móvil el drawer flotante
  sidebarOpenDesktop = signal(true);
  sidebarOpenMobile = signal(false);

  currentUrl = signal(this.router.url);

  navItems: NavItem[] = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/colaboradores', label: 'Usuarios', icon: 'users' },
    { path: '/admin/atracciones', label: 'Atracciones', icon: 'attractions' },
    { path: '/admin/reportes', label: 'Reportes de Ventas', icon: 'reports' },
    { path: '/admin/turnos', label: 'Historial de Turnos', icon: 'shifts' },
    { path: '/admin/auditoria', label: 'Auditoría', icon: 'audit' }
  ];

  currentTitle = computed(() => {
    const url = this.currentUrl();
    if (url.includes('/admin/colaboradores') || url.includes('/admin/usuarios')) return 'Usuarios';
    if (url.includes('/admin/atracciones')) return 'Atracciones';
    if (url.includes('/admin/reportes')) return 'Reportes de Ventas';
    if (url.includes('/admin/turnos')) return 'Historial de Turnos';
    if (url.includes('/admin/auditoria')) return 'Auditoría';
    return 'Dashboard';
  });

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl.set(event.urlAfterRedirects || event.url);
      // Cerrar drawer móvil al navegar
      this.sidebarOpenMobile.set(false);
    });
  }

  toggleSidebar() {
    if (window.innerWidth < 768) {
      this.sidebarOpenMobile.update(v => !v);
    } else {
      this.sidebarOpenDesktop.update(v => !v);
    }
  }

  closeMobileSidebar() {
    this.sidebarOpenMobile.set(false);
  }

  logout() {
    this.authService.logout();
  }
}
