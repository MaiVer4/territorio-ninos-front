import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CatalogoAtraccionOnline,
  ItemCarritoOnline,
  TarifaEventoItem,
  TarifaTiempoItem
} from '../../../../core/models/tienda.model';

@Component({
  selector: 'app-modalidad-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop oscuro con blur suave -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overscroll-contain motion-safe:transition-opacity duration-150"
      (click)="onBackdropClick($event)">

      <!-- Modal Card con Radio Concéntrico (padding 24px + inner radius 16px = 40px) -->
      <div
        class="relative w-full max-w-lg bg-white rounded-[32px] sm:rounded-[40px] p-6 shadow-2xl border border-transparent overscroll-contain flex flex-col max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'Comprar boleta para ' + atraccion?.nombre">

        <!-- Cabecera del Modal -->
        <div class="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 mb-1.5">
              <span>{{ atraccion?.tipoAtraccion === 'TEMPORIZADA' ? '⏱️ Por Tiempo' : '🎯 Por Intentos / Caídas' }}</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {{ atraccion?.nombre }}
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Rango de edad permitido:
              <strong class="text-slate-700 font-semibold">{{ atraccion?.edadMinima }} a {{ atraccion?.edadMaxima }} años</strong>
            </p>
          </div>

          <button
            type="button"
            (click)="close.emit()"
            class="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-[background-color,color] duration-150 enabled:active:scale-[0.96]"
            aria-label="Cerrar modal">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Cuerpo / Formulario -->
        <div class="py-4 space-y-5 text-sm">

          @if (atraccion && ((atraccion.cuposLibres ?? 1) <= 0 || !!atraccion.horaProximoIngreso)) {
            <div
              data-testid="modal-alerta-aforo-lleno"
              class="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <span class="text-base leading-none">⏰</span>
              <div>
                <p class="font-extrabold">Aforo completo en este momento</p>
                <p class="text-[11px] text-amber-800 mt-0.5">
                  Puedes adquirir tu boleta ahora. Ingreso aproximado:
                  <strong>{{ atraccion.ingresoTexto || 'PRÓXIMO TURNO' }}</strong>
                </p>
              </div>
            </div>
          }

          <!-- 1. Selección de Modalidad / Tarifa -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              1. Selecciona la modalidad o tarifa
            </label>

            @if (atraccion?.tipoAtraccion === 'TEMPORIZADA' && atraccion?.tarifasTiempo?.length) {
              <div class="grid grid-cols-2 gap-2.5">
                @for (tarifa of atraccion?.tarifasTiempo; track tarifa.id) {
                  <button
                    type="button"
                    (click)="seleccionarTarifaTiempo(tarifa)"
                    [class]="tarifaTiempoSeleccionada()?.id === tarifa.id
                      ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'"
                    class="p-3 rounded-2xl border text-left transition-[border-color,background-color,box-shadow] duration-150 enabled:active:scale-[0.96]">
                    <div class="text-base font-extrabold flex items-center justify-between">
                      <span>{{ tarifa.duracionMinutos }} min</span>
                      <span class="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-100/60 text-emerald-800">
                        \${{ tarifa.precio | number }}
                      </span>
                    </div>
                    <div class="text-[11px] text-slate-500 mt-1 font-normal">
                      {{ tarifa.descripcion || 'Acceso por tiempo' }}
                    </div>
                  </button>
                }
              </div>
            } @else if (atraccion?.tipoAtraccion === 'EVENTOS_CAIDAS' && atraccion?.tarifasEvento?.length) {
              <div class="grid grid-cols-2 gap-2.5">
                @for (tarifa of atraccion?.tarifasEvento; track tarifa.id) {
                  <button
                    type="button"
                    (click)="seleccionarTarifaEvento(tarifa)"
                    [class]="tarifaEventoSeleccionada()?.id === tarifa.id
                      ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'"
                    class="p-3 rounded-2xl border text-left transition-[border-color,background-color,box-shadow] duration-150 enabled:active:scale-[0.96]">
                    <div class="text-base font-extrabold flex items-center justify-between">
                      <span>{{ tarifa.intentos }} caídas</span>
                      <span class="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-100/60 text-emerald-800">
                        \${{ tarifa.precio | number }}
                      </span>
                    </div>
                    <div class="text-[11px] text-slate-500 mt-1 font-normal">
                      {{ tarifa.descripcion || 'Paquete de intentos' }}
                    </div>
                  </button>
                }
              </div>
            } @else {
              <!-- Tarifa Base por Minuto si no hay bloques fijos -->
              <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">
                Esta atracción se liquida a tarifa fija de
                <strong class="text-slate-800">\${{ atraccion?.tarifaMinuto || 1000 | number }} / min</strong>.
              </div>
            }
          </div>

          <!-- 2. Datos del Menor (Nombre y Edad con Validación en Vivo) -->
          <div class="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 space-y-3">
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600">
              2. ¿Quién va a jugar? (Datos del menor)
            </label>

            <div>
              <label for="nombre-menor-input" class="block text-xs font-medium text-slate-700 mb-1">Nombre completo del niño(a)</label>
              <input
                id="nombre-menor-input"
                type="text"
                [(ngModel)]="nombreMenor"
                placeholder="Ej. Sofía Martínez"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-[border-color,box-shadow] duration-150" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="edad-menor-input" class="block text-xs font-medium text-slate-700 mb-1">Edad cumplida</label>
                <input
                  id="edad-menor-input"
                  type="number"
                  min="1"
                  max="17"
                  [(ngModel)]="edadMenor"
                  placeholder="Años"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-[border-color,box-shadow] duration-150" />
              </div>

              <div>
                <label for="doc-menor-input" class="block text-xs font-medium text-slate-700 mb-1">Doc. Identidad <span class="text-slate-400 font-normal">(opcional)</span></label>
                <input
                  id="doc-menor-input"
                  type="text"
                  [(ngModel)]="documentoMenor"
                  placeholder="TI o RC"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-[border-color,box-shadow] duration-150" />
              </div>
            </div>

            <!-- Visual Feedback de la Edad -->
            @if (edadMenor() !== null) {
              @if (edadValida()) {
                <div class="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span>Edad apta para ingresar a {{ atraccion?.nombre }}</span>
                </div>
              } @else {
                <div class="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <svg class="w-4 h-4 shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                  </svg>
                  <span>La edad no cumple el rango de {{ atraccion?.edadMinima }} a {{ atraccion?.edadMaxima }} años.</span>
                </div>
              }
            }
          </div>

          <!-- 3. Cantidad de boletas para este menor -->
          <div class="flex items-center justify-between pt-1">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-600">Cantidad de boletos</span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="disminuirCantidad()"
                [disabled]="cantidad() <= 1"
                class="w-9 h-9 rounded-xl border border-slate-300 bg-white text-slate-700 flex items-center justify-center font-bold text-lg disabled:opacity-40 transition-[transform,background-color] duration-150 enabled:active:scale-[0.96]">
                -
              </button>
              <span class="w-8 text-center font-mono font-bold text-slate-900 text-base tabular-nums">
                {{ cantidad() }}
              </span>
              <button
                type="button"
                (click)="aumentarCantidad()"
                [disabled]="cantidad() >= 5"
                class="w-9 h-9 rounded-xl border border-slate-300 bg-white text-slate-700 flex items-center justify-center font-bold text-lg disabled:opacity-40 transition-[transform,background-color] duration-150 enabled:active:scale-[0.96]">
                +
              </button>
            </div>
          </div>

        </div>

        <!-- Footer / CTA -->
        <div class="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">Total a agregar</span>
            <span class="text-xl font-black text-slate-900">
              \${{ totalCalculado() | number }} COP
            </span>
          </div>

          <button
            type="button"
            (click)="agregarCesta()"
            [disabled]="!formularioValido()"
            class="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:shadow-none transition-[transform,background-color,box-shadow] duration-150 enabled:active:scale-[0.96] flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Agregar a la cesta</span>
          </button>
        </div>

      </div>
    </div>
  `
})
export class ModalidadModalComponent {
  @Input() atraccion: CatalogoAtraccionOnline | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() addToCart = new EventEmitter<ItemCarritoOnline>();

  readonly tarifaTiempoSeleccionada = signal<TarifaTiempoItem | null>(null);
  readonly tarifaEventoSeleccionada = signal<TarifaEventoItem | null>(null);

  readonly nombreMenor = signal<string>('');
  readonly edadMenor = signal<number | null>(null);
  readonly documentoMenor = signal<string>('');
  readonly cantidad = signal<number>(1);

  // Inicialización de tarifas por defecto
  ngOnInit(): void {
    if (this.atraccion) {
      if (this.atraccion.tipoAtraccion === 'TEMPORIZADA' && this.atraccion.tarifasTiempo?.length) {
        this.tarifaTiempoSeleccionada.set(this.atraccion.tarifasTiempo[0]);
      } else if (this.atraccion.tipoAtraccion === 'EVENTOS_CAIDAS' && this.atraccion.tarifasEvento?.length) {
        this.tarifaEventoSeleccionada.set(this.atraccion.tarifasEvento[0]);
      }
    }
  }

  seleccionarTarifaTiempo(tarifa: TarifaTiempoItem): void {
    this.tarifaTiempoSeleccionada.set(tarifa);
  }

  seleccionarTarifaEvento(tarifa: TarifaEventoItem): void {
    this.tarifaEventoSeleccionada.set(tarifa);
  }

  aumentarCantidad(): void {
    this.cantidad.update((c) => Math.min(5, c + 1));
  }

  disminuirCantidad(): void {
    this.cantidad.update((c) => Math.max(1, c - 1));
  }

  readonly precioUnitario = computed(() => {
    if (this.atraccion?.tipoAtraccion === 'TEMPORIZADA') {
      return this.tarifaTiempoSeleccionada()?.precio || this.atraccion.tarifaMinuto || 1000;
    }
    return this.tarifaEventoSeleccionada()?.precio || 5000;
  });

  readonly totalCalculado = computed(() => {
    return this.precioUnitario() * this.cantidad();
  });

  readonly edadValida = computed(() => {
    const edad = this.edadMenor();
    if (edad === null || isNaN(edad)) return false;
    const min = this.atraccion?.edadMinima ?? 0;
    const max = this.atraccion?.edadMaxima ?? 99;
    return edad >= min && edad <= max;
  });

  readonly formularioValido = computed(() => {
    return (
      Boolean(this.atraccion) &&
      this.nombreMenor().trim().length >= 2 &&
      this.edadValida() &&
      this.cantidad() > 0 &&
      (this.atraccion?.tipoAtraccion === 'TEMPORIZADA'
        ? Boolean(this.tarifaTiempoSeleccionada() || this.atraccion.tarifaMinuto)
        : Boolean(this.tarifaEventoSeleccionada()))
    );
  });

  agregarCesta(): void {
    if (!this.formularioValido() || !this.atraccion) return;

    const item: ItemCarritoOnline = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      atraccionId: this.atraccion.id,
      nombreAtraccion: this.atraccion.nombre,
      tipoAtraccion: this.atraccion.tipoAtraccion,
      tipoTarifa: this.atraccion.tipoAtraccion === 'TEMPORIZADA' ? 'TIEMPO' : 'EVENTO',
      tarifaTiempoId: this.tarifaTiempoSeleccionada()?.id || null,
      tarifaEventoId: this.tarifaEventoSeleccionada()?.id || null,
      duracionMinutos: this.tarifaTiempoSeleccionada()?.duracionMinutos || null,
      intentos: this.tarifaEventoSeleccionada()?.intentos || null,
      precioUnitario: this.precioUnitario(),
      cantidad: this.cantidad(),
      subtotal: this.totalCalculado(),
      nombreMenor: this.nombreMenor().trim(),
      edadMenor: Number(this.edadMenor()),
      documentoMenor: this.documentoMenor().trim() || null,
      horaIngresoEstimada: this.atraccion.horaProximoIngreso ?? null,
      ingresoTexto: this.atraccion.ingresoTexto ?? null
    };

    this.addToCart.emit(item);
  }

  onBackdropClick(event: MouseEvent): void {
    this.close.emit();
  }
}
