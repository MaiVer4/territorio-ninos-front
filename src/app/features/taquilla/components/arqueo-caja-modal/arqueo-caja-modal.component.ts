import { Component, computed, Input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DenominacionConteo,
  EstadoBalanceArqueo,
  ResultadoArqueoDTO
} from '../../../../core/models/caja.model';

interface DenominacionDef {
  valor: number;
  tipo: 'BILLETE' | 'MONEDA';
  label: string;
}

@Component({
  selector: 'app-arqueo-caja-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop bloqueante -->
    <div
      class="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arqueo-title">
      
      <!-- Contenedor del Modal -->
      <div
        class="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 flex flex-col space-y-5 animate-in fade-in zoom-in-95 duration-150 my-auto"
        (click)="$event.stopPropagation()">
        
        <!-- Encabezado -->
        <div class="flex items-start justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 id="arqueo-title" class="text-lg sm:text-xl font-extrabold text-slate-800">
                Arqueo Físico de Caja
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">
                Turno #{{ _idTurno() }} • Conteo asistido por denominación de efectivo
              </p>
            </div>
          </div>
          <button
            type="button"
            (click)="onCancelar()"
            class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="Cerrar modal">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Barra de Balance en Vivo (KPIs) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <!-- Saldo Esperado -->
          <div class="bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5 flex flex-col justify-between">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Saldo Esperado</span>
            <span class="text-lg font-extrabold font-mono text-slate-800 mt-1">
              {{ formatearCOP(_montoEsperado()) }}
            </span>
            <span class="text-[10px] text-slate-400">Base + Ventas en efectivo</span>
          </div>

          <!-- Total Contado Físico -->
          <div class="bg-blue-50/50 border border-blue-200/70 rounded-2xl p-3.5 flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-blue-700">Total Contado</span>
              <button
                type="button"
                (click)="limpiarConteo()"
                class="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer">
                Reiniciar
              </button>
            </div>
            <span class="text-lg font-extrabold font-mono text-blue-900 mt-1">
              {{ formatearCOP(totalFisico()) }}
            </span>
            <span class="text-[10px] text-blue-600/70">
              Billetes: {{ formatearCOP(totalBilletes()) }} • Monedas: {{ formatearCOP(totalMonedas()) }}
            </span>
          </div>

          <!-- Diferencia / Estado de Balance -->
          <div
            class="rounded-2xl p-3.5 border flex flex-col justify-between transition-colors"
            [ngClass]="{
              'bg-emerald-50 border-emerald-200 text-emerald-900': estadoBalance() === 'CUADRADO',
              'bg-blue-50 border-blue-200 text-blue-900': estadoBalance() === 'SOBRANTE',
              'bg-rose-50 border-rose-200 text-rose-900': estadoBalance() === 'FALTANTE'
            }">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider">Diferencia</span>
              <span
                class="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase"
                [ngClass]="{
                  'bg-emerald-200/60 text-emerald-800': estadoBalance() === 'CUADRADO',
                  'bg-blue-200/60 text-blue-800': estadoBalance() === 'SOBRANTE',
                  'bg-rose-200/60 text-rose-800': estadoBalance() === 'FALTANTE'
                }">
                {{ estadoBalance() }}
              </span>
            </div>
            <span class="text-lg font-extrabold font-mono mt-1">
              {{ diferencia() > 0 ? '+' : '' }}{{ formatearCOP(diferencia()) }}
            </span>
            <span class="text-[10px] opacity-80">
              @if (estadoBalance() === 'CUADRADO') {
                Caja perfectamente cuadrada
              } @else if (estadoBalance() === 'SOBRANTE') {
                Excedente de efectivo en caja
              } @else {
                Faltante de efectivo en caja
              }
            </span>
          </div>
        </div>

        <!-- Tablas de Conteo Asistido (Billetes y Monedas) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1">
          <!-- Columna: Billetes -->
          <div class="border border-slate-200 rounded-2xl p-3.5 space-y-2.5 bg-slate-50/30">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
              <div class="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Billetes</span>
              </div>
              <span class="text-xs font-mono font-bold text-slate-600">{{ formatearCOP(totalBilletes()) }}</span>
            </div>

            <div class="space-y-2">
              @for (b of billetes; track b.valor) {
                <div class="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-between shadow-2xs gap-2">
                  <span class="text-xs font-extrabold text-slate-800 w-20">{{ b.label }}</span>
                  
                  <!-- Controles de Cantidad -->
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      (click)="decrementar(b.valor)"
                      [disabled]="getCantidad(b.valor) <= 0"
                      class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      [value]="getCantidad(b.valor)"
                      (input)="setCantidad(b.valor, $event)"
                      class="w-14 text-center font-bold text-xs py-1 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100" />
                    <button
                      type="button"
                      (click)="incrementar(b.valor)"
                      class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer">
                      +
                    </button>
                  </div>

                  <span class="text-xs font-mono font-semibold text-slate-600 text-right w-24">
                    {{ formatearCOP(getSubtotal(b.valor)) }}
                  </span>
                </div>
              }
            </div>
          </div>

          <!-- Columna: Monedas -->
          <div class="border border-slate-200 rounded-2xl p-3.5 space-y-2.5 bg-slate-50/30">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
              <div class="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <svg class="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Monedas</span>
              </div>
              <span class="text-xs font-mono font-bold text-slate-600">{{ formatearCOP(totalMonedas()) }}</span>
            </div>

            <div class="space-y-2">
              @for (m of monedas; track m.valor) {
                <div class="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-between shadow-2xs gap-2">
                  <span class="text-xs font-extrabold text-slate-800 w-20">{{ m.label }}</span>
                  
                  <!-- Controles de Cantidad -->
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      (click)="decrementar(m.valor)"
                      [disabled]="getCantidad(m.valor) <= 0"
                      class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      [value]="getCantidad(m.valor)"
                      (input)="setCantidad(m.valor, $event)"
                      class="w-14 text-center font-bold text-xs py-1 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100" />
                    <button
                      type="button"
                      (click)="incrementar(m.valor)"
                      class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer">
                      +
                    </button>
                  </div>

                  <span class="text-xs font-mono font-semibold text-slate-600 text-right w-24">
                    {{ formatearCOP(getSubtotal(m.valor)) }}
                  </span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Sección de Justificación (Condicionalmente Obligatoria si diferencia !== 0) -->
        <div class="space-y-2 border-t border-slate-100 pt-3">
          @if (requiereJustificacion()) {
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <svg class="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p class="font-bold">Inconsistencia en caja detectada</p>
                <p class="text-[11px] text-amber-700 mt-0.5">
                  Existe una diferencia de <strong>{{ formatearCOP(diferencia()) }}</strong> entre el conteo físico y el saldo esperado. Debes ingresar una justificación detallada para poder confirmar el arqueo.
                </p>
              </div>
            </div>
          }

          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="justificacionInput" class="text-xs font-bold text-slate-700">
                {{ requiereJustificacion() ? 'Justificación de Inconsistencia (Requerida *)' : 'Observaciones de Cierre (Opcional)' }}
              </label>
              @if (requiereJustificacion()) {
                <span
                  class="text-[10px] font-semibold"
                  [class.text-rose-600]="justificacion().trim().length < 5"
                  [class.text-emerald-600]="justificacion().trim().length >= 5">
                  Mínimo 5 caracteres ({{ justificacion().trim().length }}/5)
                </span>
              }
            </div>
            <textarea
              id="justificacionInput"
              [ngModel]="justificacion()"
              (ngModelChange)="justificacion.set($event)"
              name="justificacion"
              rows="2"
              [placeholder]="requiereJustificacion() ? 'Explica el motivo del faltante o sobrante (ej. billete roto retenido, error en vuelto devuelto, etc.)...' : 'Comentarios adicionales sobre el turno o arqueo...'"
              class="w-full px-3.5 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 transition resize-none text-slate-700"
              [ngClass]="{
                'border-amber-300 focus:border-amber-500 focus:ring-amber-100 bg-amber-50/20': requiereJustificacion() && justificacion().trim().length < 5,
                'border-slate-200 focus:border-blue-500 focus:ring-blue-100 bg-white': !requiereJustificacion() || justificacion().trim().length >= 5
              }"></textarea>
          </div>
        </div>

        <!-- Acciones del Modal -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            (click)="onCancelar()"
            class="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer">
            Cancelar
          </button>

          <button
            type="button"
            (click)="onConfirmar()"
            [disabled]="!puedeConfirmar()"
            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
            @if (cargando()) {
              <svg class="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Procesando...</span>
            } @else {
              <span>Confirmar Arqueo y Cerrar Caja</span>
            }
          </button>
        </div>
      </div>
    </div>
  `
})
export class ArqueoCajaModalComponent {
  @Input() set montoEsperado(val: number) { this._montoEsperado.set(val ?? 0); }
  get montoEsperado(): number { return this._montoEsperado(); }
  readonly _montoEsperado = signal<number>(0);

  @Input() set idTurno(val: number) { this._idTurno.set(val ?? 0); }
  get idTurno(): number { return this._idTurno(); }
  readonly _idTurno = signal<number>(0);

  readonly confirmarArqueo = output<ResultadoArqueoDTO>();
  readonly cancelar = output<void>();

  // Denominaciones oficiales de Colombia
  readonly billetes: DenominacionDef[] = [
    { valor: 100000, tipo: 'BILLETE', label: '$ 100.000' },
    { valor: 50000, tipo: 'BILLETE', label: '$ 50.000' },
    { valor: 20000, tipo: 'BILLETE', label: '$ 20.000' },
    { valor: 10000, tipo: 'BILLETE', label: '$ 10.000' },
    { valor: 5000, tipo: 'BILLETE', label: '$ 5.000' },
    { valor: 2000, tipo: 'BILLETE', label: '$ 2.000' }
  ];

  readonly monedas: DenominacionDef[] = [
    { valor: 1000, tipo: 'MONEDA', label: '$ 1.000' },
    { valor: 500, tipo: 'MONEDA', label: '$ 500' },
    { valor: 200, tipo: 'MONEDA', label: '$ 200' },
    { valor: 100, tipo: 'MONEDA', label: '$ 100' },
    { valor: 50, tipo: 'MONEDA', label: '$ 50' }
  ];

  // Estado reactivo de cantidades ingresadas
  readonly cantidades = signal<{ [valor: number]: number }>({
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0
  });

  readonly justificacion = signal<string>('');
  readonly cargando = signal<boolean>(false);

  // Computados
  readonly totalBilletes = computed(() => {
    const c = this.cantidades();
    return this.billetes.reduce((acc, b) => acc + (c[b.valor] || 0) * b.valor, 0);
  });

  readonly totalMonedas = computed(() => {
    const c = this.cantidades();
    return this.monedas.reduce((acc, m) => acc + (c[m.valor] || 0) * m.valor, 0);
  });

  readonly totalFisico = computed(() => this.totalBilletes() + this.totalMonedas());

  readonly diferencia = computed(() => this.totalFisico() - this._montoEsperado());

  readonly estadoBalance = computed<EstadoBalanceArqueo>(() => {
    const dif = this.diferencia();
    if (dif === 0) return 'CUADRADO';
    return dif > 0 ? 'SOBRANTE' : 'FALTANTE';
  });

  readonly requiereJustificacion = computed(() => this.diferencia() !== 0);

  readonly puedeConfirmar = computed(() => {
    if (this.cargando()) return false;
    if (this.requiereJustificacion()) {
      return this.justificacion().trim().length >= 5;
    }
    return true;
  });

  // Métodos de conteo
  getCantidad(valor: number): number {
    return this.cantidades()[valor] || 0;
  }

  getSubtotal(valor: number): number {
    return this.getCantidad(valor) * valor;
  }

  incrementar(valor: number): void {
    const current = this.getCantidad(valor);
    this.cantidades.update(c => ({ ...c, [valor]: current + 1 }));
  }

  decrementar(valor: number): void {
    const current = this.getCantidad(valor);
    if (current > 0) {
      this.cantidades.update(c => ({ ...c, [valor]: current - 1 }));
    }
  }

  setCantidad(valor: number, event: Event): void {
    const inputVal = (event.target as HTMLInputElement).value;
    const num = Math.max(0, parseInt(inputVal, 10) || 0);
    this.cantidades.update(c => ({ ...c, [valor]: num }));
  }

  limpiarConteo(): void {
    this.cantidades.set({
      100000: 0,
      50000: 0,
      20000: 0,
      10000: 0,
      5000: 0,
      2000: 0,
      1000: 0,
      500: 0,
      200: 0,
      100: 0,
      50: 0
    });
    this.justificacion.set('');
  }

  formatearCOP(valor: number): string {
    return '$ ' + Number(valor || 0).toLocaleString('es-CO');
  }

  onCancelar(): void {
    this.cancelar.emit();
  }

  onConfirmar(): void {
    if (!this.puedeConfirmar()) return;

    const desglose: DenominacionConteo[] = [
      ...this.billetes.map(b => ({
        valor: b.valor,
        tipo: b.tipo,
        cantidad: this.getCantidad(b.valor),
        subtotal: this.getSubtotal(b.valor)
      })),
      ...this.monedas.map(m => ({
        valor: m.valor,
        tipo: m.tipo,
        cantidad: this.getCantidad(m.valor),
        subtotal: this.getSubtotal(m.valor)
      }))
    ];

    const resultado: ResultadoArqueoDTO = {
      idTurno: this._idTurno(),
      montoEsperado: this._montoEsperado(),
      totalFisico: this.totalFisico(),
      diferencia: this.diferencia(),
      estadoBalance: this.estadoBalance(),
      justificacion: this.justificacion().trim() || undefined,
      desglose
    };

    this.confirmarArqueo.emit(resultado);
  }
}
