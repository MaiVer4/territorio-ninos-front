import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ResultadoPagoSimulado {
  metodo: string;
  codigoReferencia: string;
}

@Component({
  selector: 'app-pasarela-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop oscuro -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overscroll-contain motion-safe:transition-opacity duration-150"
      (click)="cancelar.emit()">

      <!-- Modal Card con Radio Concéntrico -->
      <div
        class="relative w-full max-w-md bg-white rounded-[32px] sm:rounded-[40px] p-6 shadow-2xl border border-transparent overscroll-contain flex flex-col max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-label="Pasarela de pago segura">

        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-extrabold text-slate-900 leading-tight">Pasarela de Pagos</h3>
              <p class="text-[11px] text-slate-500">Transacción Segura 256-bit SSL</p>
            </div>
          </div>

          <button
            type="button"
            (click)="cancelar.emit()"
            [disabled]="procesando()"
            class="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-[background-color,color] duration-150 disabled:opacity-40">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Monto a debitar -->
        <div class="my-4 p-4 rounded-2xl bg-slate-900 text-white text-center">
          <span class="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">Total a pagar</span>
          <span class="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-400">
            \${{ totalPagar | number }} COP
          </span>
        </div>

        <!-- Selector de Métodos de Pago -->
        <div class="space-y-4 text-sm">
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              (click)="metodoSeleccionado.set('NEQUI')"
              [class]="metodoSeleccionado() === 'NEQUI'
                ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold ring-2 ring-purple-500/20'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'"
              class="p-2.5 rounded-2xl border text-center transition-[border-color,background-color,box-shadow] duration-150 enabled:active:scale-[0.96]">
              <span class="block text-xs font-black uppercase">Nequi</span>
              <span class="text-[10px] text-slate-500 font-normal">Push móvil</span>
            </button>

            <button
              type="button"
              (click)="metodoSeleccionado.set('PSE')"
              [class]="metodoSeleccionado() === 'PSE'
                ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'"
              class="p-2.5 rounded-2xl border text-center transition-[border-color,background-color,box-shadow] duration-150 enabled:active:scale-[0.96]">
              <span class="block text-xs font-black uppercase">PSE</span>
              <span class="text-[10px] text-slate-500 font-normal">Cta. Ahorros</span>
            </button>

            <button
              type="button"
              (click)="metodoSeleccionado.set('TARJETA')"
              [class]="metodoSeleccionado() === 'TARJETA'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'"
              class="p-2.5 rounded-2xl border text-center transition-[border-color,background-color,box-shadow] duration-150 enabled:active:scale-[0.96]">
              <span class="block text-xs font-black uppercase">Tarjeta</span>
              <span class="text-[10px] text-slate-500 font-normal">Crédito/Débito</span>
            </button>
          </div>

          <!-- Formulario específico según método -->
          @if (metodoSeleccionado() === 'NEQUI') {
            <div class="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-2">
              <label for="nequi-cel-input" class="block text-xs font-semibold text-purple-950">Número de celular Nequi</label>
              <input
                id="nequi-cel-input"
                type="tel"
                [(ngModel)]="telefonoNequi"
                placeholder="3001234567"
                maxlength="10"
                class="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              <p class="text-[11px] text-purple-800">
                Al continuar se simulará la solicitud de aprobación push en tu dispositivo móvil.
              </p>
            </div>
          } @else if (metodoSeleccionado() === 'PSE') {
            <div class="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2">
              <label for="pse-banco-select" class="block text-xs font-semibold text-blue-950">Entidad bancaria</label>
              <select
                id="pse-banco-select"
                [(ngModel)]="bancoPse"
                class="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="BANCOLOMBIA">Bancolombia</option>
                <option value="DAVIVIENDA">Davivienda</option>
                <option value="NEQUI">Nequi / Daviplata</option>
                <option value="BOGOTA">Banco de Bogotá</option>
                <option value="BBVA">BBVA Colombia</option>
              </select>
              <p class="text-[11px] text-blue-800">
                Se simulará la confirmación directa del débito en cuenta bancaria.
              </p>
            </div>
          } @else {
            <div class="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2.5">
              <div>
                <label for="tarjeta-num-input" class="block text-xs font-semibold text-emerald-950 mb-1">Número de tarjeta</label>
                <input
                  id="tarjeta-num-input"
                  type="text"
                  [(ngModel)]="numeroTarjeta"
                  placeholder="•••• •••• •••• 4242"
                  maxlength="19"
                  class="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label for="tarjeta-exp-input" class="block text-[11px] font-semibold text-emerald-950 mb-0.5">Vencimiento</label>
                  <input
                    id="tarjeta-exp-input"
                    type="text"
                    [(ngModel)]="expTarjeta"
                    placeholder="MM/AA"
                    maxlength="5"
                    class="w-full px-3 py-1.5 rounded-xl border border-emerald-200 bg-white text-slate-900 text-xs font-mono" />
                </div>
                <div>
                  <label for="tarjeta-cvv-input" class="block text-[11px] font-semibold text-emerald-950 mb-0.5">CVV</label>
                  <input
                    id="tarjeta-cvv-input"
                    type="password"
                    [(ngModel)]="cvvTarjeta"
                    placeholder="•••"
                    maxlength="4"
                    class="w-full px-3 py-1.5 rounded-xl border border-emerald-200 bg-white text-slate-900 text-xs font-mono" />
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Footer / Botón de Acción -->
        <div class="mt-6 pt-3 border-t border-slate-100">
          <button
            type="button"
            (click)="simularPago()"
            [disabled]="procesando()"
            class="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-600/30 disabled:opacity-50 transition-[transform,background-color,box-shadow] duration-150 enabled:active:scale-[0.96] flex items-center justify-center gap-2">
            @if (procesando()) {
              <svg class="w-5 h-5 motion-safe:animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Verificando transacción...</span>
            } @else {
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Pagar \${{ totalPagar | number }} COP</span>
            }
          </button>
          <p class="text-[10px] text-center text-slate-400 mt-2">
            Modo Simulador de Pruebas: no se debitará dinero real.
          </p>
        </div>

      </div>
    </div>
  `
})
export class PasarelaModalComponent {
  @Input() totalPagar: number = 0;
  @Output() pagoCompletado = new EventEmitter<ResultadoPagoSimulado>();
  @Output() cancelar = new EventEmitter<void>();

  readonly metodoSeleccionado = signal<'NEQUI' | 'PSE' | 'TARJETA'>('NEQUI');
  readonly procesando = signal<boolean>(false);

  telefonoNequi = '3001234567';
  bancoPse = 'BANCOLOMBIA';
  numeroTarjeta = '4532 8901 2345 4242';
  expTarjeta = '12/28';
  cvvTarjeta = '888';

  simularPago(): void {
    this.procesando.set(true);

    // Simulación de latencia bancaria (1.2s)
    setTimeout(() => {
      this.procesando.set(false);
      const ref = `TX-${this.metodoSeleccionado()}-${Date.now().toString().slice(-6)}`;
      this.pagoCompletado.emit({
        metodo: this.metodoSeleccionado(),
        codigoReferencia: ref
      });
    }, 1200);
  }
}
