import { ChangeDetectionStrategy, Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeleccionCatalogoPOS } from '../../../../core/models/atraccion.model';
import { Menor } from '../../../../core/models/cliente.model';

@Component({
  selector: 'app-pos-cart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col font-sans">
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
          <div class="mt-2.5 px-2.5 py-1.5 bg-blue-50/80 border border-blue-200/60 rounded-xl flex items-center gap-2 text-[11px] text-blue-700">
            <svg class="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="leading-tight">Añade niños arriba para asignar boletas a cada menor.</span>
          </div>
        } @else if (itemsSinMenor() > 0) {
          <div class="mt-2.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center gap-2 text-[11px] text-amber-800">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
            <span class="leading-tight font-medium">
              {{ itemsSinMenor() }} boleta{{ itemsSinMenor() === 1 ? '' : 's' }} sin menor asignado.
            </span>
          </div>
        }
      }

      <!-- Lista de Ítems del Carrito -->
      <div class="py-3 flex-1 space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5">
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

      <!-- Resumen y Subtotal de la Orden -->
      <div class="pt-3 border-t border-slate-100 space-y-2">
        <div class="flex items-center justify-between text-xs text-slate-500">
          <span>Total boletas:</span>
          <span class="font-bold text-slate-700 font-mono">{{ totalBoletas() }}</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Subtotal</span>
          <span data-testid="total-orden" class="text-base font-extrabold font-mono text-slate-800">
            {{ formatearCOP(subtotal()) }} COP
          </span>
        </div>
      </div>
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

  @Output() readonly itemsChange = new EventEmitter<SeleccionCatalogoPOS[]>();

  readonly totalBoletas = computed(() => {
    return this._items().reduce((acc, it) => acc + (it.cantidad ?? 1), 0);
  });

  readonly subtotal = computed(() => {
    return this._items().reduce((acc, it) => acc + ((it.cantidad ?? 1) * it.modalidad.precio), 0);
  });

  readonly itemsSinMenor = computed(() => {
    return this._items().filter(it => !it.menorAsignado).length;
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

  estaEnCapacidadMaxima(item: SeleccionCatalogoPOS): boolean {
    const capacidad = item.atraccion.capacidadMaxima || item.atraccion.maxCapacity || 10;
    const ocupados = item.atraccion.ninosActivos || 0;
    const cupos = Math.max(0, capacidad - ocupados);
    return cupos > 0 && (item.cantidad ?? 1) >= cupos;
  }

  getIdentificadorMenor(menor: Menor | null | undefined): string {
    if (!menor) return '';
    return menor.idMenor !== undefined ? String(menor.idMenor) : menor.nombreCompleto;
  }

  formatearCOP(valor: number): string {
    return '$' + (valor || 0).toLocaleString('es-CO');
  }
}
