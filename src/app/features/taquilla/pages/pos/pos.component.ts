import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-taquilla-pos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
            TDN
          </div>
          <div>
            <h1 class="text-sm font-bold text-slate-800">Taquilla POS • Ventas y Boletas</h1>
            <p class="text-[11px] text-slate-400">Territorio de Niños</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-right hidden sm:block">
            <p class="text-xs font-bold text-slate-800">{{ authService.currentUser()?.correo }}</p>
            <span class="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Taquillero
            </span>
          </div>
          <button (click)="logout()"
            class="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 text-xs font-semibold rounded-xl transition cursor-pointer">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main class="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col justify-center items-center text-center">
        <div class="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 shadow-inner">
          <span class="material-symbols-outlined text-4xl">point_of_sale</span>
        </div>
        <h2 class="text-2xl font-extrabold text-slate-800 mb-2">Punto de Venta (POS) en Desarrollo</h2>
        <p class="text-sm text-slate-500 max-w-md leading-relaxed mb-6">
          Has iniciado sesión con el rol <strong>TAQUILLERO</strong>. La interfaz de apertura de caja y venta de boletas térmicas está en proceso de integración.
        </p>
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-xs text-slate-600 max-w-sm w-full text-left space-y-1.5">
          <p class="font-bold text-slate-700">Estado de la cuenta:</p>
          <p>• Correo: <span class="font-mono text-slate-800">{{ authService.currentUser()?.correo }}</span></p>
          <p>• Rol activo: <span class="font-semibold text-blue-600">TAQUILLERO</span></p>
          <p>• Sesión segura y autenticada.</p>
        </div>
      </main>
    </div>
  `
})
export class TaquillaPosComponent {
  authService = inject(AuthService);

  logout() {
    this.authService.logout();
  }
}
