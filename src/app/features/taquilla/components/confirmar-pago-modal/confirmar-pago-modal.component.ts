import { Component, computed, Input, signal, ChangeDetectionStrategy, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResumenLiquidacionPOS, SeleccionCatalogoPOS } from '../../../../core/models/atraccion.model';
import { MetodoPagoPOS } from '../../../../core/models/enums';

@Component({
  selector: 'app-confirmar-pago-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <!-- Backdrop bloqueante -->
    <div
      class="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmar-pago-title"
      data-testid="modal-confirmar-pago">

      <!-- Contenedor del Modal -->
      <div
        class="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 flex flex-col space-y-5 animate-in fade-in zoom-in-95 duration-150 my-auto"
        (click)="$event.stopPropagation()">

        <!-- Encabezado -->
        <div class="flex items-start justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 id="confirmar-pago-title" class="text-lg font-extrabold text-slate-800">
                Confirmar Pago de la Orden
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">
                Revisa el desglose y el método de pago antes de finalizar
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-cerrar-modal"
            [disabled]="estaProcesando()"
            (click)="onCancelar()"
            class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Cerrar modal">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Información de Cliente -->
        <div class="bg-slate-50 border border-slate-200/70 rounded-2xl p-3 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">
              👤
            </div>
            <span class="text-slate-500 font-medium">Cliente / Responsable:</span>
          </div>
          <span class="font-bold text-slate-800" data-testid="cliente-titular-pago">
            {{ _clienteNombre() }}
          </span>
        </div>

        <!-- Resumen de Boletas / Ítems -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Boletas de Atracciones</span>
            <span class="text-slate-400 font-mono text-[11px]">{{ _resumen()?.totalBoletas ?? totalBoletasFallback() }} boleta(s)</span>
          </div>

          <div
            data-testid="resumen-items-pago"
            class="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 text-xs">
            @for (item of _resumen()?.items || []; track $index) {
              @let cant = item.cantidad ?? 1;
              @let subtotalLinea = cant * item.modalidad.precio;

              <div class="pt-1.5 first:pt-0 flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-slate-800 truncate">{{ item.atraccion.nombre }}</span>
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {{ item.modalidad.etiqueta }}
                    </span>
                    <span class="text-[11px] font-mono text-slate-500">x{{ cant }}</span>
                  </div>
                  <div class="text-[11px] text-slate-500 mt-0.5">
                    Menor: <span class="font-medium text-slate-700">{{ item.menorAsignado?.nombreCompleto || 'Sin menor asignado' }}</span>
                  </div>
                </div>
                <span class="font-bold font-mono text-slate-700 whitespace-nowrap">
                  {{ formatearCOP(subtotalLinea) }}
                </span>
              </div>
            }
          </div>
        </div>

        <!-- Desglose Tributario y Medio de Pago -->
        <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
          <!-- Subtotal Base -->
          <div class="flex items-center justify-between text-slate-600">
            <span>Subtotal (Base Gravable):</span>
            <span class="font-mono font-medium">{{ formatearCOP(_resumen()?.subtotal || 0) }}</span>
          </div>

          <!-- IVA / Impuestos -->
          <div class="flex items-center justify-between text-slate-600">
            <span>IVA ({{ _resumen()?.porcentajeIva || 19 }}%):</span>
            <span class="font-mono font-medium">{{ formatearCOP(_resumen()?.impuestos || 0) }}</span>
          </div>

          <!-- Método de Pago -->
          <div class="pt-2 border-t border-slate-200/60 flex items-center justify-between">
            <span class="font-bold text-slate-700">Método de Pago:</span>
            <span
              data-testid="metodo-pago-seleccionado"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wide border shadow-2xs"
              [ngClass]="badgeClassMetodoPago(_resumen()?.metodoPago)">
              <span>{{ iconoMetodoPago(_resumen()?.metodoPago) }}</span>
              <span>{{ etiquetaMetodoPago(_resumen()?.metodoPago) }}</span>
            </span>
          </div>

          <!-- Desglose exclusivo si es EFECTIVO -->
          @if (_resumen()?.metodoPago === 'EFECTIVO') {
            <div
              data-testid="detalle-efectivo-modal"
              class="pt-2 border-t border-slate-200/60 space-y-1 text-slate-700 bg-white/70 p-2.5 rounded-xl border border-slate-200/50">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-slate-500">Efectivo Recibido:</span>
                <span class="font-mono font-bold text-slate-800" data-testid="monto-recibido-modal">
                  {{ formatearCOP(_resumen()?.montoRecibido || 0) }}
                </span>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="font-bold text-emerald-700">Cambio / Vuelto:</span>
                <span class="font-mono font-extrabold text-emerald-700" data-testid="cambio-modal">
                  {{ formatearCOP(_resumen()?.cambio || 0) }}
                </span>
              </div>
            </div>
          }
        </div>

        <!-- Monto Total a Cobrar Destacado -->
        <div
          data-testid="monto-total-cobrar"
          class="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span class="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
              Monto Total a Cobrar
            </span>
            <span class="text-[11px] text-emerald-700 font-medium">IVA incluido</span>
          </div>
          <div class="text-right">
            <span class="text-2xl font-black font-mono text-emerald-800 tracking-tight block">
              {{ formatearCOP(_resumen()?.granTotal || 0) }}
            </span>
            <span class="text-[10px] font-bold text-emerald-600 font-mono">COP</span>
          </div>
        </div>

        <!-- Barra de Progreso durante la confirmación -->
        @if (estaProcesando()) {
          <div data-testid="progreso-transaccion" class="space-y-1.5 p-3 bg-blue-50/80 border border-blue-200 rounded-2xl animate-in fade-in">
            <div class="flex items-center justify-between text-xs text-blue-900 font-semibold">
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                <span>Procesando transacción y confirmando venta...</span>
              </div>
              <span class="text-[11px] font-mono text-blue-600">Por favor espere</span>
            </div>
            <!-- Barra horizontal animada -->
            <div class="w-full bg-blue-100 rounded-full h-2 overflow-hidden" data-testid="barra-progreso-pago">
              <div class="bg-blue-600 h-2 rounded-full w-full animate-pulse transition-all"></div>
            </div>
          </div>
        }

        <!-- Botones de Acción -->
        <div class="grid grid-cols-2 gap-3 pt-2">
          <!-- Botón Volver / Cancelar -->
          <button
            type="button"
            data-testid="btn-cancelar-pago"
            [disabled]="estaProcesando()"
            (click)="onCancelar()"
            class="w-full py-3 px-4 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-bold text-xs rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Volver a Orden</span>
          </button>

          <!-- Botón Procesar Pago con guarda de doble clic -->
          <button
            type="button"
            data-testid="btn-procesar-pago"
            [disabled]="estaProcesando() || !_resumen()"
            (click)="onProcesarPago()"
            class="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            @if (estaProcesando()) {
              <svg
                data-testid="spinner-pago"
                class="animate-spin w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Procesando Pago...</span>
            } @else {
              <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Procesar Pago</span>
            }
          </button>
        </div>
      </div>
    </div>
  `
})
export class ConfirmarPagoModalComponent {
  @Input() set resumen(val: ResumenLiquidacionPOS | null | undefined) {
    this._resumen.set(val ?? null);
  }
  get resumen(): ResumenLiquidacionPOS | null {
    return this._resumen();
  }
  readonly _resumen = signal<ResumenLiquidacionPOS | null>(null);

  @Input() set clienteNombre(val: string | null | undefined) {
    this._clienteNombre.set(val?.trim() ? val.trim() : 'Cliente de Mostrador');
  }
  get clienteNombre(): string {
    return this._clienteNombre();
  }
  readonly _clienteNombre = signal<string>('Cliente de Mostrador');

  @Input() set procesandoExterno(val: boolean | null | undefined) {
    this._procesandoExterno.set(!!val);
  }
  get procesandoExterno(): boolean {
    return this._procesandoExterno();
  }
  readonly _procesandoExterno = signal<boolean>(false);

  @Output() readonly confirmarPago = new EventEmitter<ResumenLiquidacionPOS>();
  @Output() readonly cancelar = new EventEmitter<void>();

  readonly procesando = signal<boolean>(false);
  readonly estaProcesando = computed(() => this.procesando() || this._procesandoExterno());

  readonly totalBoletasFallback = computed(() => {
    return this._resumen()?.items?.reduce((acc, it) => acc + (it.cantidad ?? 1), 0) ?? 0;
  });

  onProcesarPago(): void {
    // Guarda de doble clic: si ya se está procesando o no hay resumen, salir inmediatamente
    if (this.estaProcesando() || !this._resumen()) {
      return;
    }

    // Activar inmediatamente bandera bloqueante antes de emitir
    this.procesando.set(true);
    this.confirmarPago.emit(this._resumen()!);
  }

  onCancelar(): void {
    if (this.estaProcesando()) {
      return;
    }
    this.cancelar.emit();
  }

  formatearCOP(valor: number): string {
    return '$' + (valor || 0).toLocaleString('es-CO');
  }

  etiquetaMetodoPago(metodo?: MetodoPagoPOS): string {
    switch (metodo) {
      case 'EFECTIVO':
        return 'Efectivo';
      case 'TARJETA_DEBITO':
        return 'Tarjeta Débito';
      case 'TARJETA_CREDITO':
        return 'Tarjeta Crédito';
      case 'TRANSFERENCIA':
        return 'Transferencia';
      default:
        return metodo || 'Desconocido';
    }
  }

  iconoMetodoPago(metodo?: MetodoPagoPOS): string {
    switch (metodo) {
      case 'EFECTIVO':
        return '💵';
      case 'TARJETA_DEBITO':
        return '💳';
      case 'TARJETA_CREDITO':
        return '💳';
      case 'TRANSFERENCIA':
        return '📱';
      default:
        return '💰';
    }
  }

  badgeClassMetodoPago(metodo?: MetodoPagoPOS): string {
    switch (metodo) {
      case 'EFECTIVO':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'TARJETA_DEBITO':
      case 'TARJETA_CREDITO':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'TRANSFERENCIA':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }
}
