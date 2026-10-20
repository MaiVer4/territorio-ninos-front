import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CajaService } from '../../../../core/services/caja.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-taquilla-apertura',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 font-sans flex flex-col justify-center items-center p-4">
      <div class="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 class="text-xl font-extrabold text-slate-800">Apertura de Caja</h1>
          <p class="text-xs text-slate-400 mt-1">Ingresa el saldo base en efectivo para iniciar tu turno de ventas</p>
        </div>

        <form (ngSubmit)="abrirCaja()" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Base en Efectivo (COP)</label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
              <input
                type="number"
                min="0"
                step="1000"
                [(ngModel)]="montoInicial"
                name="montoInicial"
                required
                placeholder="50000"
                class="w-full pl-8 pr-4 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Observaciones (Opcional)</label>
            <textarea
              [(ngModel)]="observaciones"
              name="observaciones"
              rows="2"
              placeholder="Detalles sobre billetes o monedas de inicio..."
              class="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none"></textarea>
          </div>

          <button
            type="submit"
            [disabled]="cargando() || montoInicial < 0"
            class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {{ cargando() ? 'Iniciando turno...' : 'Confirmar Apertura e Ingresar al POS' }}
          </button>
        </form>

        <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Usuario: <strong>{{ authService.currentUser()?.nombre || authService.currentUser()?.correo }}</strong></span>
          <button (click)="logout()" class="text-red-500 hover:underline cursor-pointer">Cerrar sesión</button>
        </div>
      </div>
    </div>
  `
})
export class AperturaComponent {
  private readonly cajaService = inject(CajaService);
  private readonly router = inject(Router);
  public readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService, { optional: true });

  montoInicial = 50000;
  observaciones = '';
  cargando = signal(false);

  abrirCaja(): void {
    if (this.montoInicial < 0) {
      this.notificationService?.warn('El monto inicial no puede ser negativo.');
      return;
    }

    this.cargando.set(true);
    this.cajaService.abrirTurno({
      montoInicial: this.montoInicial,
      observaciones: this.observaciones?.trim() || undefined
    }).subscribe({
      next: () => {
        this.cargando.set(false);
        this.notificationService?.success('Turno de caja abierto correctamente. ¡Buenas ventas!');
        this.router.navigate(['/taquilla/pos']);
      },
      error: (err) => {
        this.cargando.set(false);
        const mensaje = err.error?.mensaje || 'Error al realizar la apertura de caja. Inténtalo nuevamente.';
        this.notificationService?.error(mensaje);
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
