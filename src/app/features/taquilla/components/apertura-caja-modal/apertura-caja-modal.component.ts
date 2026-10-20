import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CajaService } from '../../../../core/services/caja.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TurnoResponseDTO } from '../../../../core/models/caja.model';

@Component({
  selector: 'app-apertura-caja-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop bloqueante impenetrable -->
    <div
      class="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-all"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title">
      
      <!-- Contenedor del Modal -->
      <div
        class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-150"
        (click)="$event.stopPropagation()">
        
        <!-- Encabezado -->
        <div class="text-center">
          <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 id="modal-title" class="text-xl font-extrabold text-slate-800 tracking-tight">Apertura de Caja</h2>
          <p class="text-xs text-slate-400 mt-1">Ingresa el saldo base en efectivo para iniciar tu turno en el POS</p>
        </div>

        <!-- Formulario de Apertura -->
        <form (ngSubmit)="confirmarApertura()" class="space-y-5">
          <!-- Input con Máscara Monetaria COP -->
          <div>
            <label for="montoInicialInput" class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Base Inicial de Efectivo (COP)
            </label>
            <div class="relative">
              <input
                id="montoInicialInput"
                type="text"
                inputmode="numeric"
                [value]="montoFormateado()"
                (input)="onInputMonto($event)"
                required
                class="w-full text-xl font-extrabold font-mono text-slate-800 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition shadow-xs text-center"
                placeholder="$ 0" />
            </div>
            <p class="text-[11px] text-slate-400 mt-1 text-center font-medium">
              Efectivo físico disponible al momento de iniciar la atención
            </p>
          </div>

          <!-- Botones de Atajo Rápido ($50.000, $100.000, $200.000) -->
          <div>
            <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2 text-center">
              Atajos Rápidos de Base
            </label>
            <div class="grid grid-cols-3 gap-2">
              @for (atajo of atajos; track atajo) {
                <button
                  type="button"
                  (click)="seleccionarAtajo(atajo)"
                  [class.border-blue-500]="montoNumerico() === atajo"
                  [class.bg-blue-50]="montoNumerico() === atajo"
                  [class.text-blue-700]="montoNumerico() === atajo"
                  [class.shadow-xs]="montoNumerico() === atajo"
                  class="py-2.5 px-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-blue-300 hover:bg-slate-50 transition cursor-pointer text-center">
                  {{ formatearCOP(atajo) }}
                </button>
              }
            </div>
          </div>

          <!-- Observaciones opcionales -->
          <div>
            <label for="observacionesInput" class="block text-xs font-semibold text-slate-600 mb-1">
              Observaciones de Apertura (Opcional)
            </label>
            <textarea
              id="observacionesInput"
              [ngModel]="observaciones()"
              (ngModelChange)="observaciones.set($event)"
              name="observaciones"
              rows="2"
              placeholder="Detalles sobre desglose de billetes o monedas..."
              class="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none text-slate-700"></textarea>
          </div>

          <!-- Botón de Confirmación -->
          <button
            type="submit"
            [disabled]="cargando() || montoNumerico() < 0"
            class="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-2xl shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            @if (cargando()) {
              <svg class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Abriendo caja...</span>
            } @else {
              <span>Confirmar Apertura e Iniciar Ventas</span>
            }
          </button>
        </form>

        <!-- Pie informativo y opción de cerrar sesión -->
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div class="truncate max-w-[200px]">
            <span class="text-slate-400">Cajero:</span>
            <strong class="ml-1 text-slate-700">{{ authService.currentUser()?.nombre || authService.currentUser()?.correo }}</strong>
          </div>
          <button
            type="button"
            (click)="logout()"
            class="text-red-500 hover:text-red-700 font-semibold text-xs cursor-pointer hover:underline transition">
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  `
})
export class AperturaCajaModalComponent {
  private readonly cajaService = inject(CajaService);
  public readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService, { optional: true });

  readonly turnoIniciado = output<TurnoResponseDTO>();

  readonly atajos = [50000, 100000, 200000];
  readonly montoNumerico = signal<number>(50000);
  readonly montoFormateado = signal<string>(this.formatearCOP(50000));
  readonly observaciones = signal<string>('');
  readonly cargando = signal<boolean>(false);

  formatearCOP(valor: number): string {
    return '$ ' + Number(valor || 0).toLocaleString('es-CO');
  }

  seleccionarAtajo(valor: number): void {
    this.montoNumerico.set(valor);
    this.montoFormateado.set(this.formatearCOP(valor));
  }

  onInputMonto(event: Event): void {
    const rawValue = (event.target as HTMLInputElement).value || '';
    const cleanDigits = rawValue.replace(/\D/g, '');
    const cleanNumber = cleanDigits ? parseInt(cleanDigits, 10) : 0;
    
    this.montoNumerico.set(cleanNumber);
    this.montoFormateado.set(cleanNumber > 0 ? this.formatearCOP(cleanNumber) : '$ 0');
  }

  confirmarApertura(): void {
    if (this.montoNumerico() < 0) {
      this.notificationService?.warn('El monto inicial no puede ser negativo.');
      return;
    }

    this.cargando.set(true);
    this.cajaService.abrirTurno({
      montoInicial: this.montoNumerico(),
      observaciones: this.observaciones()?.trim() || undefined
    }).subscribe({
      next: (turno) => {
        this.cargando.set(false);
        this.notificationService?.success('Caja abierta correctamente. ¡Buen turno de ventas!');
        this.turnoIniciado.emit(turno);
      },
      error: (err) => {
        this.cargando.set(false);
        const mensaje = err?.error?.mensaje || 'Error al realizar la apertura de caja. Inténtalo nuevamente.';
        this.notificationService?.error(mensaje);
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
