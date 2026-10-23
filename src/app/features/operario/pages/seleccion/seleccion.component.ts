import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-operario-seleccion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-slate-50 font-sans flex flex-col pb-16 relative">
      <header class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs z-10">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
            TDN
          </div>
          <div>
            <h1 class="text-sm font-bold text-slate-800">Control de Atracciones • Operario</h1>
            <p class="text-[11px] text-slate-400">Territorio de Niños</p>
          </div>
        </div>
      </header>

      <main class="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col justify-center items-center text-center">
        <div class="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 shadow-inner">
          <span class="material-symbols-outlined text-4xl">confirmation_number</span>
        </div>
        <h2 class="text-2xl font-extrabold text-slate-800 mb-2">Panel Operativo en Campo en Desarrollo</h2>
        <p class="text-sm text-slate-500 max-w-md leading-relaxed mb-6">
          Has iniciado sesión con el rol <strong>OPERARIO</strong>. El escáner de códigos QR para validación de acceso y control de tiempo/caídas se integrará en esta vista.
        </p>
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-xs text-slate-600 max-w-sm w-full text-left space-y-1.5">
          <p class="font-bold text-slate-700">Estado de la cuenta:</p>
          <p>• Operario: <span class="font-mono text-slate-800">{{ authService.currentUserName() }}</span></p>
          <p>• Rol activo: <span class="font-semibold text-emerald-600">OPERARIO</span></p>
          <p>• Sesión segura y autenticada.</p>
        </div>
      </main>

      <!-- Barra de Estado / Dock Fijo Inferior -->
      <footer class="fixed bottom-0 inset-x-0 h-12 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-20 px-6 flex items-center justify-between shadow-xs">
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="font-medium">Estación Operativa • Territorio de Niños</span>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center ring-1 ring-emerald-300">
              {{ authService.currentUserInitials() }}
            </div>
            <span class="text-xs font-bold text-slate-800">{{ authService.currentUserName() }}</span>
            <span class="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Operario
            </span>
          </div>

          <div class="h-4 w-px bg-slate-200"></div>

          <button
            type="button"
            (click)="logout()"
            class="hover:bg-red-50 hover:text-red-600 text-xs text-slate-500 font-medium px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </footer>
    </div>
  `
})
export class OperarioSeleccionComponent {
  authService = inject(AuthService);

  logout() {
    this.authService.logout();
  }
}
