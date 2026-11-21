import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResumenLiquidacionPOS, SeleccionCatalogoPOS } from '../../../../core/models/atraccion.model';
import { Menor } from '../../../../core/models/cliente.model';
import { MetodoPagoPOS } from '../../../../core/models/enums';
import { VentaCalculoService } from '../../../../core/services/venta-calculo.service';

@Component({
  selector: 'app-pos-cart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-white font-sans min-h-0">
      <!-- Cabecera Compacta del Carrito -->
      <div class="shrink-0 px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 bg-white">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Orden en Curso</h3>
              <span class="text-[10px] font-bold font-mono tabular-nums px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {{ totalBoletas() }}
              </span>
            </div>
            @if (_items().length > 0 && _menores().length > 0 && itemsSinMenor() > 0) {
              <p class="text-[10px] font-semibold text-amber-700 leading-tight">
                {{ itemsSinMenor() }} línea{{ itemsSinMenor() === 1 ? '' : 's' }} sin niño asignado
              </p>
            } @else {
              <p class="text-[10px] text-slate-400 leading-tight">
                {{ _items().length }} línea{{ _items().length === 1 ? '' : 's' }} · {{ totalBoletas() }} boleta{{ totalBoletas() === 1 ? '' : 's' }}
              </p>
            }
          </div>
        </div>

        @if (_items().length > 0) {
          <button
            type="button"
            data-testid="btn-limpiar-orden"
            (click)="limpiarCarrito()"
            class="text-[11px] text-rose-600 hover:text-rose-700 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors duration-150 ease-out cursor-pointer shrink-0">
            Vaciar
          </button>
        }
      </div>

      <!-- Lista de Ítems con Scroll Independiente -->
      <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 space-y-2">
        @if (_items().length === 0) {
          <div class="py-10 text-center text-slate-400 text-xs" data-testid="orden-vacia">
            <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-300 mx-auto flex items-center justify-center mb-2">
              <svg class="w-5 h-5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p class="font-semibold text-slate-600">No hay boletas en la orden.</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Haz 1 clic sobre cualquier tarifa del catálogo.</p>
          </div>
        } @else {
          @for (item of _items(); track $index) {
            @let itemIdx = $index;
            @let cantidad = item.cantidad ?? 1;
            @let precioLinea = cantidad * item.modalidad.precio;
            @let menorAsignado = item.menorAsignado;
            @let limiteAlcanzado = estaEnCapacidadMaxima(item);

            <div
              [attr.data-testid]="'item-orden-' + itemIdx"
              class="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-2 transition-colors duration-150 ease-out">

              <!-- Fila 1: Atracción + Stepper + Subtotal + Quitar -->
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="font-extrabold text-slate-900 truncate leading-tight" [title]="item.atraccion.nombre">
                    {{ item.atraccion.nombre }}
                  </p>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="inline-flex px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {{ item.modalidad.etiqueta }}
                    </span>
                    <span class="text-[10px] text-slate-400 font-mono tabular-nums">
                      {{ formatearCOP(item.modalidad.precio) }} c/u
                    </span>
                  </div>
                </div>

                <!-- Stepper Compacto -->
                <div class="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs shrink-0">
                  <button
                    type="button"
                    [attr.data-testid]="'btn-decrementar-' + itemIdx"
                    (click)="decrementarCantidad(itemIdx)"
                    title="Disminuir cantidad"
                    class="w-6 h-6 rounded text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-[transform,background-color] duration-150 ease-out cursor-pointer font-bold text-xs motion-safe:enabled:active:scale-[0.96]">
                    −
                  </button>
                  <span
                    [attr.data-testid]="'cantidad-item-' + itemIdx"
                    class="w-6 text-center font-extrabold text-xs text-slate-900 font-mono tabular-nums">
                    {{ cantidad }}
                  </span>
                  <button
                    type="button"
                    [attr.data-testid]="'btn-incrementar-' + itemIdx"
                    [disabled]="limiteAlcanzado"
                    (click)="incrementarCantidad(itemIdx)"
                    title="Aumentar cantidad"
                    class="w-6 h-6 rounded text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-[transform,background-color] duration-150 ease-out cursor-pointer font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed motion-safe:enabled:active:scale-[0.96]">
                    +
                  </button>
                </div>

                <!-- Subtotal + Eliminar -->
                <div class="flex items-center gap-1.5 shrink-0">
                  <span
                    [attr.data-testid]="'subtotal-item-' + itemIdx"
                    class="font-extrabold font-mono tabular-nums text-slate-900 text-xs">
                    {{ formatearCOP(precioLinea) }}
                  </span>
                  <button
                    type="button"
                    [attr.data-testid]="'btn-quitar-item-' + itemIdx"
                    (click)="removerItem(itemIdx)"
                    title="Eliminar boleta de la orden"
                    class="w-6 h-6 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors duration-150 ease-out cursor-pointer">
                    <svg class="w-3.5 h-3.5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Fila 2: Asignación Rápida de Menor (1 clic en chips o select si >4) -->
              @if (_menores().length > 0) {
                <div class="pt-1.5 border-t border-slate-200/60">
                  @if (_menores().length <= 4) {
                    <div class="flex items-center gap-1 flex-wrap">
                      @for (menor of _menores(); track getIdentificadorMenor(menor)) {
                        @let asignado = getIdentificadorMenor(menorAsignado) === getIdentificadorMenor(menor);
                        <button
                          type="button"
                          [attr.data-testid]="'chip-menor-item-' + itemIdx + '-' + getIdentificadorMenor(menor)"
                          (click)="toggleMenorEnItem(itemIdx, menor)"
                          [attr.aria-pressed]="asignado"
                          class="px-2 py-0.5 rounded-full text-[11px] font-bold border transition-[transform,background-color,border-color,color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer truncate max-w-[140px]"
                          [ngClass]="asignado
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'">
                          {{ asignado ? '✓ ' : '' }}{{ menor.nombreCompleto }}
                        </button>
                      }
                    </div>
                  } @else {
                    <select
                      [attr.data-testid]="'select-menor-' + itemIdx"
                      [ngModel]="getIdentificadorMenor(menorAsignado)"
                      (ngModelChange)="asignarMenor(itemIdx, $event)"
                      class="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                      <option value="">-- Sin menor asignado --</option>
                      @for (menor of _menores(); track getIdentificadorMenor(menor)) {
                        <option [value]="getIdentificadorMenor(menor)">
                          {{ menor.nombreCompleto }}{{ menor.edad !== undefined ? ' (' + menor.edad + ' años)' : '' }}
                        </option>
                      }
                    </select>
                  }
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- Dock de Liquidación y Cobro Siempre Visible Abajo -->
      <div class="shrink-0 border-t border-slate-200 bg-slate-50/95 p-3 space-y-2.5">
        <!-- Totales Compactos -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-[11px] text-slate-500">
            <span>Subtotal <strong data-testid="subtotal-orden" class="text-slate-700 font-mono tabular-nums">{{ formatearCOP(subtotal()) }}</strong></span>
            <span>IVA ({{ _porcentajeIva() }}%) <strong data-testid="impuestos-orden" class="text-slate-700 font-mono tabular-nums">{{ formatearCOP(impuestos()) }}</strong></span>
          </div>

          <div class="flex items-center justify-between bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
            <div>
              <span class="block text-[10px] font-black uppercase tracking-wider text-emerald-800">Gran Total</span>
              <span class="text-[10px] text-emerald-700 font-medium">{{ totalBoletas() }} boleta{{ totalBoletas() === 1 ? '' : 's' }}</span>
            </div>
            <span
              data-testid="gran-total-orden"
              data-test="gran-total"
              class="text-lg font-black font-mono tabular-nums text-emerald-800 tracking-tight">
              {{ formatearCOP(granTotal()) }} COP
            </span>
            <span data-testid="total-orden" class="hidden">
              {{ formatearCOP(granTotal()) }} COP
            </span>
          </div>
        </div>

        @if (_items().length > 0) {
          <!-- Selector de 4 Métodos de Pago en 1 Fila -->
          <div class="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              data-testid="btn-metodo-efectivo"
              (click)="seleccionarMetodo('EFECTIVO')"
              [class]="metodoPago() === 'EFECTIVO'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'"
              class="px-1.5 py-1.5 rounded-xl border text-[11px] font-bold transition-[transform,background-color,color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
              title="Efectivo (Alt+1)">
              <span>Efectivo</span>
              <span class="text-[9px] opacity-75 font-mono">Alt+1</span>
            </button>

            <button
              type="button"
              data-testid="btn-metodo-tarjeta-debito"
              (click)="seleccionarMetodo('TARJETA_DEBITO')"
              [class]="metodoPago() === 'TARJETA_DEBITO'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'"
              class="px-1.5 py-1.5 rounded-xl border text-[11px] font-bold transition-[transform,background-color,color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
              title="Tarjeta Débito (Alt+2)">
              <span>Débito</span>
              <span class="text-[9px] opacity-75 font-mono">Alt+2</span>
            </button>

            <button
              type="button"
              data-testid="btn-metodo-tarjeta-credito"
              (click)="seleccionarMetodo('TARJETA_CREDITO')"
              [class]="metodoPago() === 'TARJETA_CREDITO'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'"
              class="px-1.5 py-1.5 rounded-xl border text-[11px] font-bold transition-[transform,background-color,color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
              title="Tarjeta Crédito (Alt+3)">
              <span>Crédito</span>
              <span class="text-[9px] opacity-75 font-mono">Alt+3</span>
            </button>

            <button
              type="button"
              data-testid="btn-metodo-transferencia"
              (click)="seleccionarMetodo('TRANSFERENCIA')"
              [class]="metodoPago() === 'TRANSFERENCIA'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'"
              class="px-1.5 py-1.5 rounded-xl border text-[11px] font-bold transition-[transform,background-color,color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
              title="Transferencia (Alt+4)">
              <span>Transf.</span>
              <span class="text-[9px] opacity-75 font-mono">Alt+4</span>
            </button>
          </div>

          <!-- Efectivo con Billetes Dinámicos + Enter Cobra -->
          @if (metodoPago() === 'EFECTIVO') {
            <div class="p-2.5 bg-white border border-slate-200 rounded-xl space-y-2">
              <div class="flex items-center gap-2">
                <label for="inputMontoRecibido" class="text-[10px] font-bold uppercase tracking-wider text-slate-600 shrink-0">
                  Recibido
                </label>
                <input
                  #montoRecibidoInput
                  id="inputMontoRecibido"
                  data-testid="input-monto-recibido"
                  type="text"
                  inputmode="numeric"
                  [value]="montoRecibidoFormateado()"
                  (input)="onInputMontoRecibido($event)"
                  (keydown.enter)="confirmarLiquidacion()"
                  placeholder="$ 0 (Enter cobra)"
                  class="flex-1 text-sm font-extrabold font-mono tabular-nums text-slate-900 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
              </div>

              <!-- Fila 4 atajos: Exacto + 3 denominaciones dinámicas -->
              <div class="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  data-testid="btn-atajo-exacto"
                  (click)="seleccionarEfectivoExacto()"
                  class="py-1.5 px-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg text-[10px] font-extrabold text-blue-800 transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer text-center">
                  Exacto
                </button>
                @for (atajo of atajosEfectivoDinamicos(); track atajo) {
                  <button
                    type="button"
                    [attr.data-testid]="'btn-atajo-' + atajo"
                    (click)="seleccionarAtajoEfectivo(atajo)"
                    class="py-1.5 px-1 bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-300 rounded-lg text-[10px] font-bold font-mono tabular-nums text-slate-800 transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer text-center">
                    {{ formatearCOP(atajo) }}
                  </button>
                }
              </div>

              @if (montoRecibido() > 0) {
                @if (montoRecibido() >= granTotal()) {
                  <div class="px-2.5 py-1.5 bg-emerald-100/80 border border-emerald-200 rounded-lg flex items-center justify-between">
                    <span class="text-xs font-bold text-emerald-900">Cambio / Vuelto:</span>
                    <span data-testid="valor-cambio" class="font-extrabold font-mono tabular-nums text-sm text-emerald-900">
                      {{ formatearCOP(cambio()) }}
                    </span>
                  </div>
                } @else {
                  <div class="px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between">
                    <span class="text-xs font-bold text-rose-700">Faltante:</span>
                    <span data-testid="valor-faltante" class="font-extrabold font-mono tabular-nums text-sm text-rose-700">
                      {{ formatearCOP(faltanteEfectivo()) }}
                    </span>
                  </div>
                }
              }
            </div>
          }

          <!-- Auto-imprimir + Botón Principal Cobrar -->
          <div class="space-y-1.5">
            <label class="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-600 px-1 cursor-pointer select-none">
              <span>Auto-imprimir tirilla al cobrar</span>
              <input
                type="checkbox"
                data-testid="toggle-auto-imprimir"
                [checked]="autoImprimir"
                (change)="onToggleAutoImprimir($event)"
                class="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
            </label>

            <button
              type="button"
              data-testid="btn-liquidar-orden"
              [disabled]="!pagoValido()"
              (click)="confirmarLiquidacion()"
              class="w-full min-h-[44px] ps-3.5 pe-4 bg-emerald-600 hover:bg-emerald-700 transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              <svg class="w-4 h-4 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <span>{{ autoImprimir ? 'Cobrar e Imprimir' : 'Cobrar y Liquidar Orden' }}</span>
              <kbd class="px-1.5 py-0.5 bg-emerald-700/80 border border-emerald-400/40 rounded text-[10px] font-mono">F9</kbd>
            </button>
          </div>
        }
      </div>
    </div>
  `
})
export class PosCartComponent {
  readonly ventaCalculoService = inject(VentaCalculoService);

  @Input() set items(val: SeleccionCatalogoPOS[] | null | undefined) {
    const list = val ? [...val] : [];
    this._items.set(list);
    if (list.length === 0) {
      this.resetearEstadoCobro();
    }
  }
  get items(): SeleccionCatalogoPOS[] {
    return this._items();
  }
  readonly _items = signal<SeleccionCatalogoPOS[]>([]);

  @Input() set menores(val: Menor[] | null | undefined) {
    this._menores.set(val ? [...val] : []);
  }
  get menores(): Menor[] {
    return this._menores();
  }
  readonly _menores = signal<Menor[]>([]);

  @Input() set porcentajeIva(val: number | null | undefined) {
    this._porcentajeIva.set(val ?? 19);
  }
  get porcentajeIva(): number {
    return this._porcentajeIva();
  }
  readonly _porcentajeIva = signal<number>(19);

  @Input() autoImprimir = false;

  @Output() readonly itemsChange = new EventEmitter<SeleccionCatalogoPOS[]>();
  @Output() readonly liquidarOrden = new EventEmitter<ResumenLiquidacionPOS>();
  @Output() readonly autoImprimirChange = new EventEmitter<boolean>();

  @ViewChild('montoRecibidoInput') montoRecibidoInputRef?: ElementRef<HTMLInputElement>;

  readonly metodoPago = signal<MetodoPagoPOS>('EFECTIVO');
  readonly montoRecibido = signal<number>(0);
  readonly montoRecibidoFormateado = signal<string>('');

  readonly totalBoletas = computed(() => {
    return this.ventaCalculoService.calcularTotalBoletas(this._items());
  });

  readonly granTotal = computed(() => {
    return this.ventaCalculoService.calcularGranTotal(this._items());
  });

  readonly subtotal = computed(() => {
    return this.ventaCalculoService.calcularSubtotalBase(this.granTotal(), this._porcentajeIva());
  });

  readonly impuestos = computed(() => {
    return this.ventaCalculoService.calcularImpuestos(this.granTotal(), this._porcentajeIva());
  });

  readonly itemsSinMenor = computed(() => {
    return this._items().filter(it => !it.menorAsignado).length;
  });

  readonly atajosEfectivoDinamicos = computed<number[]>(() => {
    const total = this.granTotal();
    if (total <= 0) {
      return [20000, 50000, 100000];
    }
    const paso = total < 10000 ? 5000 : 10000;
    const primerMultiplo = (Math.floor(total / paso) + 1) * paso;
    const candidatos = [primerMultiplo, 10000, 20000, 50000, 100000, 150000, 200000, 500000];
    const resultado: number[] = [];
    for (const val of candidatos) {
      if (val > total && !resultado.includes(val)) {
        resultado.push(val);
        if (resultado.length === 3) break;
      }
    }
    return resultado;
  });

  readonly cambio = computed(() => {
    return this.ventaCalculoService.calcularCambio(this.granTotal(), this.montoRecibido(), this.metodoPago());
  });

  readonly faltanteEfectivo = computed(() => {
    return this.ventaCalculoService.calcularFaltanteEfectivo(this.granTotal(), this.montoRecibido(), this.metodoPago());
  });

  readonly pagoValido = computed(() => {
    return this.ventaCalculoService.esPagoValido(
      this._items(),
      this.granTotal(),
      this.montoRecibido(),
      this.metodoPago()
    );
  });

  enfocarMontoRecibido(): void {
    const el = this.montoRecibidoInputRef?.nativeElement;
    if (el) {
      el.focus();
      el.select();
    }
  }

  intentarCobrarConAtajo(): void {
    if (this._items().length === 0) return;
    if (this.pagoValido()) {
      this.confirmarLiquidacion();
    } else if (this.metodoPago() === 'EFECTIVO') {
      this.enfocarMontoRecibido();
    }
  }

  onToggleAutoImprimir(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.autoImprimir = checked;
    this.autoImprimirChange.emit(checked);
  }

  incrementarCantidad(index: number): void {
    const list = [...this._items()];
    const item = list[index];
    if (!item) return;

    if (this.estaEnCapacidadMaxima(item)) {
      return;
    }

    const currentQty = item.cantidad ?? 1;
    list[index] = {
      ...item,
      cantidad: currentQty + 1
    };

    this._items.set(list);
    this.itemsChange.emit(list);
  }

  decrementarCantidad(index: number): void {
    const list = [...this._items()];
    const item = list[index];
    if (!item) return;

    const currentQty = item.cantidad ?? 1;
    if (currentQty <= 1) {
      this.removerItem(index);
      return;
    }

    list[index] = {
      ...item,
      cantidad: currentQty - 1
    };

    this._items.set(list);
    this.itemsChange.emit(list);
  }

  removerItem(index: number): void {
    const list = this._items().filter((_, i) => i !== index);
    this._items.set(list);
    if (list.length === 0) {
      this.resetearEstadoCobro();
    }
    this.itemsChange.emit(list);
  }

  limpiarCarrito(): void {
    this._items.set([]);
    this.resetearEstadoCobro();
    this.itemsChange.emit([]);
  }

  resetearEstadoCobro(): void {
    this.montoRecibido.set(0);
    this.montoRecibidoFormateado.set('');
    this.metodoPago.set('EFECTIVO');
  }

  toggleMenorEnItem(index: number, menor: Menor): void {
    const list = [...this._items()];
    const item = list[index];
    if (!item) return;

    const idMenor = this.getIdentificadorMenor(menor);
    const actualId = this.getIdentificadorMenor(item.menorAsignado);
    list[index] = {
      ...item,
      menorAsignado: actualId === idMenor ? null : menor
    };

    this._items.set(list);
    this.itemsChange.emit(list);
  }

  asignarMenor(index: number, identificador: string): void {
    const list = [...this._items()];
    const item = list[index];
    if (!item) return;

    if (!identificador) {
      list[index] = {
        ...item,
        menorAsignado: null
      };
    } else {
      const menor = this._menores().find(m => this.getIdentificadorMenor(m) === identificador);
      list[index] = {
        ...item,
        menorAsignado: menor || null
      };
    }

    this._items.set(list);
    this.itemsChange.emit(list);
  }

  seleccionarMetodo(metodo: MetodoPagoPOS): void {
    this.metodoPago.set(metodo);
  }

  onInputMontoRecibido(event: Event): void {
    const rawValue = (event.target as HTMLInputElement).value || '';
    const cleanDigits = rawValue.replace(/\D/g, '');
    const cleanNumber = cleanDigits ? parseInt(cleanDigits, 10) : 0;
    this.montoRecibido.set(cleanNumber);
    this.montoRecibidoFormateado.set(cleanNumber > 0 ? this.formatearCOP(cleanNumber) : '');
  }

  seleccionarAtajoEfectivo(valor: number): void {
    this.montoRecibido.set(valor);
    this.montoRecibidoFormateado.set(this.formatearCOP(valor));
  }

  seleccionarEfectivoExacto(): void {
    const total = this.granTotal();
    this.montoRecibido.set(total);
    this.montoRecibidoFormateado.set(this.formatearCOP(total));
  }

  confirmarLiquidacion(): void {
    if (!this.pagoValido()) return;

    const resumen = this.ventaCalculoService.construirResumenLiquidacion({
      items: this._items(),
      porcentajeIva: this._porcentajeIva(),
      metodoPago: this.metodoPago(),
      montoRecibido: this.montoRecibido(),
      fecha: new Date()
    });

    this.liquidarOrden.emit(resumen);
  }

  estaEnCapacidadMaxima(item: SeleccionCatalogoPOS): boolean {
    return !!item.atraccion.estado && item.atraccion.estado !== 'ACTIVO';
  }

  getIdentificadorMenor(menor: Menor | null | undefined): string {
    if (!menor) return '';
    return menor.idMenor !== undefined ? String(menor.idMenor) : menor.nombreCompleto;
  }

  formatearCOP(valor: number): string {
    return this.ventaCalculoService.formatearCOP(valor);
  }
}
