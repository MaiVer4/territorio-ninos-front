import { ChangeDetectionStrategy, Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResumenLiquidacionPOS, SeleccionCatalogoPOS } from '../../../../core/models/atraccion.model';
import { Menor } from '../../../../core/models/cliente.model';
import { MetodoPagoPOS } from '../../../../core/models/enums';

@Component({
  selector: 'app-pos-cart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col font-sans space-y-3">
      <!-- Encabezado del Carrito -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div>
            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Orden en Curso</h3>
            <p class="text-[10px] text-slate-400">
              {{ totalBoletas() }} boleta{{ totalBoletas() === 1 ? '' : 's' }} ({{ _items().length }} atracción{{ _items().length === 1 ? '' : 'es' }})
            </p>
          </div>
        </div>

        @if (_items().length > 0) {
          <button
            type="button"
            data-testid="btn-limpiar-orden"
            (click)="limpiarCarrito()"
            class="text-[11px] text-rose-600 hover:text-rose-700 font-semibold px-2 py-0.5 rounded-lg hover:bg-rose-50 transition cursor-pointer">
            Vaciar
          </button>
        }
      </div>

      <!-- Alertas Informativas sobre Asignación de Menores -->
      @if (_items().length > 0) {
        @if (_menores().length === 0) {
          <div class="px-2.5 py-1.5 bg-blue-50/80 border border-blue-200/60 rounded-xl flex items-center gap-2 text-[11px] text-blue-700">
            <svg class="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="leading-tight">Añade niños arriba para asignar boletas a cada menor.</span>
          </div>
        } @else if (itemsSinMenor() > 0) {
          <div class="px-2.5 py-1.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center gap-2 text-[11px] text-amber-800">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
            <span class="leading-tight font-medium">
              {{ itemsSinMenor() }} boleta{{ itemsSinMenor() === 1 ? '' : 's' }} sin menor asignado.
            </span>
          </div>
        }
      }

      <!-- Lista de Ítems del Carrito -->
      <div class="py-1 flex-1 space-y-2.5 max-h-[300px] overflow-y-auto pr-0.5">
        @if (_items().length === 0) {
          <div class="py-8 text-center text-slate-400 text-xs" data-testid="orden-vacia">
            <div class="w-10 h-10 rounded-2xl bg-slate-100 text-slate-300 mx-auto flex items-center justify-center mb-2">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p class="font-medium text-slate-600">No hay boletas en la orden.</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Elige una modalidad en el catálogo y haz clic en "Añadir".</p>
          </div>
        } @else {
          @for (item of _items(); track $index) {
            @let cantidad = item.cantidad ?? 1;
            @let precioLinea = cantidad * item.modalidad.precio;
            @let menorAsignado = item.menorAsignado;
            @let limiteAlcanzado = estaEnCapacidadMaxima(item);

            <div
              [attr.data-testid]="'item-orden-' + $index"
              class="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-2 transition hover:bg-slate-50/90 hover:border-slate-300">
              
              <!-- Línea 1: Nombre de Atracción y Modalidad -->
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <p class="font-bold text-slate-800 truncate" [title]="item.atraccion.nombre">
                      {{ item.atraccion.nombre }}
                    </p>
                    <span class="inline-flex px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                      {{ item.modalidad.etiqueta }}
                    </span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono">
                    Unitario: {{ formatearCOP(item.modalidad.precio) }}
                  </span>
                </div>

                <!-- Botón Eliminar Ítem Directo -->
                <button
                  type="button"
                  [attr.data-testid]="'btn-quitar-item-' + $index"
                  (click)="removerItem($index)"
                  title="Eliminar boleta de la orden"
                  class="w-5 h-5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer shrink-0">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Línea 2: Controles de Cantidad (+ / -) y Subtotal de Línea -->
              <div class="flex items-center justify-between pt-1 border-t border-slate-200/50">
                <div class="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                  <!-- Botón Decrementar -->
                  <button
                    type="button"
                    [attr.data-testid]="'btn-decrementar-' + $index"
                    (click)="decrementarCantidad($index)"
                    title="Disminuir cantidad"
                    class="w-6 h-6 rounded-md text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer font-bold text-xs active:scale-95">
                    −
                  </button>

                  <!-- Indicador de Cantidad -->
                  <span
                    [attr.data-testid]="'cantidad-item-' + $index"
                    class="w-6 text-center font-extrabold text-xs text-slate-800 font-mono">
                    {{ cantidad }}
                  </span>

                  <!-- Botón Incrementar -->
                  <button
                    type="button"
                    [attr.data-testid]="'btn-incrementar-' + $index"
                    [disabled]="limiteAlcanzado"
                    (click)="incrementarCantidad($index)"
                    title="Aumentar cantidad"
                    class="w-6 h-6 rounded-md text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed active:scale-95">
                    +
                  </button>
                </div>

                <div class="text-right">
                  <span class="block text-[9px] uppercase font-bold text-slate-400">Total Línea</span>
                  <span
                    [attr.data-testid]="'subtotal-item-' + $index"
                    class="font-extrabold font-mono text-slate-800 text-xs">
                    {{ formatearCOP(precioLinea) }}
                  </span>
                </div>
              </div>

              <!-- Línea 3: Dropdown de Asignación de Menor -->
              <div class="pt-1.5 border-t border-slate-200/50">
                <div class="flex items-center justify-between gap-1.5 mb-1">
                  <label class="block text-[10px] font-bold text-slate-600">
                    Menor beneficiario:
                  </label>
                  @if (menorAsignado) {
                    <span class="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Asignado
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Sin asignar
                    </span>
                  }
                </div>

                <div class="relative">
                  <select
                    [attr.data-testid]="'select-menor-' + $index"
                    [ngModel]="getIdentificadorMenor(menorAsignado)"
                    (ngModelChange)="asignarMenor($index, $event)"
                    class="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                    <option value="">-- Sin menor asignado --</option>
                    @for (menor of _menores(); track menor.idMenor ?? menor.nombreCompleto) {
                      <option [value]="getIdentificadorMenor(menor)">
                        {{ menor.nombreCompleto }}{{ menor.edad !== undefined ? ' (' + menor.edad + ' años)' : '' }}
                      </option>
                    }
                  </select>
                </div>
              </div>

            </div>
          }
        }
      </div>

      <!-- Panel de Liquidación Tributaria (Notion: CA-01, CA-02) -->
      <div class="pt-3 border-t border-slate-100 space-y-2">
        <div class="flex items-center justify-between text-xs text-slate-500">
          <span>Subtotal (Base Gravable)</span>
          <span data-testid="subtotal-orden" class="font-bold text-slate-700 font-mono">
            {{ formatearCOP(subtotal()) }}
          </span>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-500">
          <span>IVA desglosado ({{ _porcentajeIva() }}%)</span>
          <span data-testid="impuestos-orden" class="font-bold text-slate-700 font-mono">
            {{ formatearCOP(impuestos()) }}
          </span>
        </div>

        <!-- Gran Total Destacado -->
        <div class="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
          <div>
            <span class="block text-[10px] font-black uppercase tracking-wider text-emerald-800">Gran Total</span>
            <span class="text-[10px] text-emerald-600 font-medium">{{ totalBoletas() }} boleta{{ totalBoletas() === 1 ? '' : 's' }}</span>
          </div>
          <span
            data-testid="gran-total-orden"
            data-test="gran-total"
            class="text-lg font-black font-mono text-emerald-700 tracking-tight">
            {{ formatearCOP(granTotal()) }} COP
          </span>
          <!-- Compatible test hook for existing pos specs -->
          <span data-testid="total-orden" class="hidden">
            {{ formatearCOP(granTotal()) }} COP
          </span>
        </div>
      </div>

      <!-- Selector de Método de Pago -->
      @if (_items().length > 0) {
        <div class="pt-2 space-y-2">
          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Método de Pago
          </label>
          <div class="grid grid-cols-2 gap-1.5">
            <!-- Efectivo -->
            <button
              type="button"
              data-testid="btn-metodo-efectivo"
              (click)="seleccionarMetodo('EFECTIVO')"
              [class]="metodoPago() === 'EFECTIVO'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'"
              class="px-2 py-1.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
              <span>💵</span>
              <span>Efectivo</span>
            </button>

            <!-- Tarjeta Débito -->
            <button
              type="button"
              data-testid="btn-metodo-tarjeta-debito"
              (click)="seleccionarMetodo('TARJETA_DEBITO')"
              [class]="metodoPago() === 'TARJETA_DEBITO'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'"
              class="px-2 py-1.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
              <span>💳</span>
              <span>T. Débito</span>
            </button>

            <!-- Tarjeta Crédito -->
            <button
              type="button"
              data-testid="btn-metodo-tarjeta-credito"
              (click)="seleccionarMetodo('TARJETA_CREDITO')"
              [class]="metodoPago() === 'TARJETA_CREDITO'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'"
              class="px-2 py-1.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
              <span>💳</span>
              <span>T. Crédito</span>
            </button>

            <!-- Transferencia -->
            <button
              type="button"
              data-testid="btn-metodo-transferencia"
              (click)="seleccionarMetodo('TRANSFERENCIA')"
              [class]="metodoPago() === 'TRANSFERENCIA'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'"
              class="px-2 py-1.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
              <span>📱</span>
              <span>Transferencia</span>
            </button>
          </div>
        </div>

        <!-- Calculadora Reactiva de Cambio / Vuelto (Notion: CA-03) -->
        @if (metodoPago() === 'EFECTIVO') {
          <div class="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Efectivo Recibido (COP)
                </label>
                <button
                  type="button"
                  data-testid="btn-atajo-exacto"
                  (click)="seleccionarEfectivoExacto()"
                  class="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer">
                  Monto Exacto
                </button>
              </div>

              <div class="relative">
                <input
                  data-testid="input-monto-recibido"
                  type="text"
                  inputmode="numeric"
                  [value]="montoRecibidoFormateado()"
                  (input)="onInputMontoRecibido($event)"
                  placeholder="$ 0"
                  class="w-full text-base font-extrabold font-mono text-slate-800 px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-right shadow-2xs" />
              </div>
            </div>

            <!-- Botones de Atajo Rápido -->
            <div class="grid grid-cols-3 gap-1">
              @for (atajo of atajosEfectivo; track atajo) {
                <button
                  type="button"
                  [attr.data-testid]="'btn-atajo-' + atajo"
                  (click)="seleccionarAtajoEfectivo(atajo)"
                  class="py-1 px-1 bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-300 rounded-lg text-[10px] font-bold text-slate-700 transition cursor-pointer text-center">
                  {{ formatearCOP(atajo) }}
                </button>
              }
            </div>

            <!-- Resultado de Cambio o Faltante -->
            @if (montoRecibido() > 0) {
              @if (montoRecibido() >= granTotal()) {
                <div class="p-2 bg-emerald-100/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div class="flex items-center gap-1.5 text-emerald-800">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span class="text-xs font-bold">Cambio / Vuelto:</span>
                  </div>
                  <span data-testid="valor-cambio" class="font-extrabold font-mono text-sm text-emerald-800">
                    {{ formatearCOP(cambio()) }}
                  </span>
                </div>
              } @else {
                <div class="p-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                  <div class="flex items-center gap-1.5 text-rose-700">
                    <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span class="text-xs font-bold">Faltante:</span>
                  </div>
                  <span data-testid="valor-faltante" class="font-extrabold font-mono text-sm text-rose-700">
                    {{ formatearCOP(faltanteEfectivo()) }}
                  </span>
                </div>
              }
            }
          </div>
        }

        <!-- Botón de Confirmación y Liquidación -->
        <button
          type="button"
          data-testid="btn-liquidar-orden"
          [disabled]="!pagoValido()"
          (click)="confirmarLiquidacion()"
          class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Cobrar y Liquidar Orden</span>
        </button>
      }
    </div>
  `
})
export class PosCartComponent {
  @Input() set items(val: SeleccionCatalogoPOS[] | null | undefined) {
    this._items.set(val ? [...val] : []);
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

  @Output() readonly itemsChange = new EventEmitter<SeleccionCatalogoPOS[]>();
  @Output() readonly liquidarOrden = new EventEmitter<ResumenLiquidacionPOS>();

  readonly metodoPago = signal<MetodoPagoPOS>('EFECTIVO');
  readonly montoRecibido = signal<number>(0);
  readonly montoRecibidoFormateado = signal<string>('');
  readonly atajosEfectivo = [20000, 50000, 100000];

  readonly totalBoletas = computed(() => {
    return this._items().reduce((acc, it) => acc + (it.cantidad ?? 1), 0);
  });

  readonly granTotal = computed(() => {
    return this._items().reduce((acc, it) => acc + ((it.cantidad ?? 1) * it.modalidad.precio), 0);
  });

  readonly subtotal = computed(() => {
    const total = this.granTotal();
    const iva = this._porcentajeIva();
    if (iva <= 0) return total;
    return Math.round(total / (1 + (iva / 100)));
  });

  readonly impuestos = computed(() => {
    return this.granTotal() - this.subtotal();
  });

  readonly itemsSinMenor = computed(() => {
    return this._items().filter(it => !it.menorAsignado).length;
  });

  readonly cambio = computed(() => {
    if (this.metodoPago() !== 'EFECTIVO') return 0;
    return Math.max(0, this.montoRecibido() - this.granTotal());
  });

  readonly faltanteEfectivo = computed(() => {
    if (this.metodoPago() !== 'EFECTIVO') return 0;
    return Math.max(0, this.granTotal() - this.montoRecibido());
  });

  readonly pagoValido = computed(() => {
    if (this._items().length === 0) return false;
    if (this.metodoPago() === 'EFECTIVO') {
      return this.montoRecibido() >= this.granTotal();
    }
    return true;
  });

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
    this.itemsChange.emit(list);
  }

  limpiarCarrito(): void {
    this._items.set([]);
    this.montoRecibido.set(0);
    this.montoRecibidoFormateado.set('');
    this.itemsChange.emit([]);
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

    const resumen: ResumenLiquidacionPOS = {
      items: this._items(),
      totalBoletas: this.totalBoletas(),
      subtotal: this.subtotal(),
      porcentajeIva: this._porcentajeIva(),
      impuestos: this.impuestos(),
      granTotal: this.granTotal(),
      metodoPago: this.metodoPago(),
      montoRecibido: this.metodoPago() === 'EFECTIVO' ? this.montoRecibido() : this.granTotal(),
      cambio: this.cambio(),
      fecha: new Date()
    };

    this.liquidarOrden.emit(resumen);
  }

  estaEnCapacidadMaxima(item: SeleccionCatalogoPOS): boolean {
    const capacidad = item.atraccion.capacidadMaxima || item.atraccion.maxCapacity || 10;
    const ocupados = item.atraccion.ninosActivos || 0;
    const cupos = Math.max(0, capacidad - ocupados);
    const reservadosEnCarrito = this._items()
      .filter(it => it.atraccion.id === item.atraccion.id)
      .reduce((acc, it) => acc + (it.cantidad ?? 1), 0);
    return cupos <= 0 || reservadosEnCarrito >= cupos;
  }

  getIdentificadorMenor(menor: Menor | null | undefined): string {
    if (!menor) return '';
    return menor.idMenor !== undefined ? String(menor.idMenor) : menor.nombreCompleto;
  }

  formatearCOP(valor: number): string {
    return '$' + (valor || 0).toLocaleString('es-CO');
  }
}
