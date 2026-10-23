import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  template: `
<div class="h-full w-full flex bg-slate-50 font-sans overflow-hidden">
  
  <!-- BACKDROP MÓVIL (para cerrar el drawer en pantallas pequeñas) -->
  @if (sidebarOpenMobile()) {
    <div (click)="closeMobileSidebar()"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity">
    </div>
  }

  <!-- SIDEBAR: Altura fija a pantalla (h-full), footer siempre anclado abajo sin scroll -->
  <aside
    class="bg-slate-900 flex flex-col shrink-0 transition-all duration-200 overflow-hidden h-full border-r border-slate-800
           fixed md:static inset-y-0 left-0 z-50 md:z-auto"
    [ngClass]="{
      'translate-x-0': sidebarOpenMobile(),
      '-translate-x-full md:translate-x-0': !sidebarOpenMobile(),
      'w-64 md:w-60': sidebarOpenDesktop(),
      'w-64 md:w-16': !sidebarOpenDesktop()
    }">
    
    <!-- Header del Sidebar con Branding -->
    <div class="h-14 flex items-center justify-between md:justify-start px-4 border-b border-slate-700/50 gap-3 shrink-0">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <svg class="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        <!-- En móvil siempre se ve el texto; en escritorio depende de sidebarOpenDesktop -->
        <div class="min-w-0" [ngClass]="{ 'md:hidden': !sidebarOpenDesktop() }">
          <p class="text-white text-xs font-bold leading-tight truncate">Territorio de Niños</p>
          <p class="text-slate-400 text-[10px] truncate">Administrador</p>
        </div>
      </div>

      <!-- Botón cerrar solo visible en móviles dentro del drawer -->
      <button (click)="closeMobileSidebar()" class="md:hidden text-slate-400 hover:text-white p-1 cursor-pointer">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Navegación Principal (Scroll interno si la pantalla es muy baja) -->
    <nav class="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
      @for (item of navItems; track item.path) {
        <a [routerLink]="item.path"
           (click)="closeMobileSidebar()"
           routerLinkActive="bg-blue-600 !text-white shadow-sm"
           [routerLinkActiveOptions]="{ exact: item.path === '/admin/dashboard' }"
           class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition cursor-pointer text-slate-400 hover:bg-slate-800 hover:text-slate-200">
          
          <!-- Iconos -->
          @if (item.icon === 'dashboard') {
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
            </svg>
          } @else if (item.icon === 'users') {
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          } @else if (item.icon === 'attractions') {
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          } @else if (item.icon === 'assignments') {
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
            </svg>
          } @else if (item.icon === 'reports') {
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          } @else if (item.icon === 'shifts') {
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          } @else if (item.icon === 'audit') {
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
          }

          <span class="text-sm font-medium truncate" [ngClass]="{ 'md:hidden': !sidebarOpenDesktop() }">
            {{ item.label }}
          </span>

          @if (item.badge) {
            <span class="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0"
                  [ngClass]="{ 'md:hidden': !sidebarOpenDesktop() }">
              {{ item.badge }}
            </span>
          }
        </a>
      }
    </nav>

    <!-- Footer del Sidebar: SIEMPRE visible en la parte inferior de la pantalla -->
    <div class="p-2 border-t border-slate-700/50 space-y-0.5 shrink-0 bg-slate-900">
      <a routerLink="/admin/configuracion"
         (click)="closeMobileSidebar()"
         routerLinkActive="bg-blue-600 !text-white"
         class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition cursor-pointer">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <span class="text-sm font-medium" [ngClass]="{ 'md:hidden': !sidebarOpenDesktop() }">
          Configuración
        </span>
      </a>

      <button (click)="logout()"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-950/40 hover:text-red-400 transition cursor-pointer">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>
        <span class="text-sm font-medium" [ngClass]="{ 'md:hidden': !sidebarOpenDesktop() }">
          Cerrar sesión
        </span>
      </button>
    </div>
  </aside>

  <!-- CONTENIDO PRINCIPAL: Altura 100% con scroll independiente en main -->
  <div class="flex-1 flex flex-col h-full min-w-0 overflow-hidden w-full">
    <!-- Header Superior Adaptable -->
    <header class="h-14 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 md:px-8 gap-3 shrink-0 shadow-xs z-10">
      <!-- Botón menú hamburguesa -->
      <button (click)="toggleSidebar()" class="text-slate-500 hover:text-slate-700 transition p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      
      <h1 class="text-sm sm:text-base font-bold text-slate-800 flex-1 truncate">{{ currentTitle() }}</h1>
      
      <!-- Campana de Notificaciones -->
      <button class="relative text-slate-400 hover:text-slate-600 transition p-1.5 cursor-pointer">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
      </button>

      <!-- Badge de Perfil Admin -->
      <div class="flex items-center gap-2 pl-2 border-l border-slate-100">
        <div class="w-8 h-8 bg-violet-100 text-violet-700 font-bold text-xs rounded-full flex items-center justify-center shrink-0">
          {{ authService.currentUserInitials() }}
        </div>
        <span class="text-sm font-semibold text-slate-700 hidden sm:inline">{{ authService.currentUserName() }}</span>
      </div>
    </header>

    <!-- Contenedor con Scroll Independiente y Ancho Fluido Completo -->
    <main class="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50 w-full">
      <router-outlet></router-outlet>
    </main>
  </div>
</div>
  `,
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
  readonly authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // En escritorio controla colapso (w-60 vs w-16). En móvil el drawer flotante
  sidebarOpenDesktop = signal(true);
  sidebarOpenMobile = signal(false);

  currentUrl = signal(this.router.url);

  navItems: NavItem[] = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/colaboradores', label: 'Usuarios', icon: 'users' },
    { path: '/admin/atracciones', label: 'Atracciones', icon: 'attractions' },
    { path: '/admin/asignaciones', label: 'Asignaciones', icon: 'assignments' },
    { path: '/admin/reportes', label: 'Reportes de Ventas', icon: 'reports' },
    { path: '/admin/turnos', label: 'Historial de Turnos', icon: 'shifts' },
    { path: '/admin/auditoria', label: 'Auditoría', icon: 'audit' }
  ];

  currentTitle = computed(() => {
    const url = this.currentUrl();
    if (url.includes('/admin/colaboradores') || url.includes('/admin/usuarios')) return 'Usuarios';
    if (url.includes('/admin/atracciones')) return 'Atracciones';
    if (url.includes('/admin/asignaciones')) return 'Asignaciones de Operarios';
    if (url.includes('/admin/reportes')) return 'Reportes de Ventas';
    if (url.includes('/admin/turnos')) return 'Historial de Turnos';
    if (url.includes('/admin/auditoria')) return 'Auditoría';
    if (url.includes('/admin/configuracion')) return 'Configuración';
    return 'Dashboard';
  });

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((event: NavigationEnd) => {
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
