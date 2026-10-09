import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-operario-seleccion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
            TDN
          </div>
          <div>
            <h1 class="text-sm font-bold text-slate-800">Control de Atracciones • Operario</h1>
            <p class="text-[11px] text-slate-400">Territorio de Niños</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-right hidden sm:block">
            <p class="text-xs font-bold text-slate-800">{{ authService.currentUser()?.correo }}</p>
            <span class="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Operario
            </span>
          </div>
          <button (click)="logout()"
            class="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 text-xs font-semibold rounded-xl transition cursor-pointer">
            Cerrar sesión
          </button>
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
          <p>• Correo: <span class="font-mono text-slate-800">{{ authService.currentUser()?.correo }}</span></p>
          <p>• Rol activo: <span class="font-semibold text-emerald-600">OPERARIO</span></p>
          <p>• Sesión segura y autenticada con JWT.</p>
        </div>
      </main>
    </div>
  `
})
export class OperarioSeleccionComponent {
  authService = inject(AuthService);

  logout() {
    this.authService.logout();
  }
}
