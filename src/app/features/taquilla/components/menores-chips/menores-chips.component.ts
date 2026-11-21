import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewChild,
  computed,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Menor } from '../../../../core/models/cliente.model';
import { extractInitials } from '../../../../core/utils/initials.util';

@Component({
  selector: 'app-menores-chips',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    @if (compacto) {
      <!-- Modo Compacto Cabina POS: 1 línea con Niño Activo y Popover flotante -->
      <div class="relative flex items-center gap-1.5 flex-wrap font-sans">
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Niños</span>
          <span
            data-testid="badge-conteo-menores"
            class="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-50 text-pink-700 border border-pink-200 font-mono tabular-nums">
            {{ _menores().length }}
          </span>
        </div>

        @if (_menores().length > 0) {
          <div data-testid="contenedor-chips-menores" class="flex items-center flex-wrap gap-1.5">
            @for (menor of _menores(); track menor.idMenor ?? menor.nombreCompleto; let i = $index) {
              @let activo = esMenorActivo(menor);
              <div
                data-testid="chip-menor"
                class="inline-flex items-center rounded-full border transition-[background-color,border-color,color] duration-150 ease-out"
                [ngClass]="activo
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-blue-300'">
                <button
                  type="button"
                  [attr.data-testid]="'btn-activar-menor-' + i"
                  (click)="seleccionarMenorActivo(menor)"
                  [attr.aria-pressed]="activo"
                  [title]="activo ? 'Niño activo para asignar boletas (clic para deseleccionar)' : 'Activar para asignar las siguientes boletas a ' + menor.nombreCompleto"
                  class="inline-flex items-center gap-1.5 ps-2 pe-1.5 py-1 text-xs font-bold cursor-pointer rounded-l-full">
                  <span
                    class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold uppercase shrink-0"
                    [ngClass]="activo ? 'bg-white text-blue-700' : 'bg-white text-slate-700 border border-slate-200'">
                    {{ activo ? '●' : getInitials(menor.nombreCompleto) }}
                  </span>
                  <span class="max-w-[120px] truncate">{{ menor.nombreCompleto }}</span>
                  <span
                    class="text-[10px] font-semibold tabular-nums"
                    [ngClass]="activo ? 'text-blue-100' : 'text-slate-500'">
                    {{ menor.edad !== undefined && menor.edad !== null ? menor.edad + (menor.edad === 1 ? ' año' : ' años') : 'N/A' }}
                  </span>
                </button>

                @if (!deshabilitado) {
                  <button
                    type="button"
                    data-testid="btn-eliminar-menor"
                    (click)="eliminarMenor(i)"
                    [attr.aria-label]="'Retirar a ' + menor.nombreCompleto"
                    class="w-5 h-5 mr-1 rounded-full flex items-center justify-center transition-colors duration-150 ease-out cursor-pointer shrink-0"
                    [ngClass]="activo ? 'text-blue-100 hover:text-white hover:bg-blue-700' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'">
                    <svg class="w-3 h-3 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                }
              </div>
            }
          </div>
        } @else {
          <span data-testid="empty-state-menores" class="text-[11px] text-slate-400">
            Sin niños asociados
          </span>
        }

        @if (!deshabilitado) {
          <button
            type="button"
            data-testid="btn-mostrar-formulario-menor"
            (click)="mostrarFormulario() ? cancelarFormulario() : abrirFormulario()"
            [disabled]="alcanzoLimite()"
            class="inline-flex items-center gap-1 ps-2 pe-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-bold rounded-full transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
            <svg class="w-3.5 h-3.5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Niño</span>
          </button>
        }

        <!-- Popover flotante de alta rápida sin mover el catálogo -->
        @if (mostrarFormulario() && !deshabilitado) {
          <div
            data-testid="form-nuevo-menor"
            class="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 z-40 w-[min(92vw,440px)] p-3 bg-white border border-pink-200 rounded-2xl shadow-xl space-y-2.5">
            <div class="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Nuevo Niño / Menor</span>
              <span class="text-[10px] font-normal text-slate-500">Enter para guardar</span>
            </div>

            <div class="grid grid-cols-12 gap-2">
              <div class="col-span-6">
                <input
                  #inputNombreMenor
                  type="text"
                  data-testid="input-nombre-menor"
                  [(ngModel)]="nuevoNombre"
                  placeholder="Nombre *"
                  (keydown.enter)="agregarMenor()"
                  (keydown.escape)="cancelarFormulario()"
                  class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 font-medium placeholder-slate-400" />
              </div>
              <div class="col-span-3">
                <input
                  type="number"
                  min="0"
                  max="17"
                  data-testid="input-edad-menor"
                  [(ngModel)]="nuevaEdad"
                  placeholder="Edad *"
                  (keydown.enter)="agregarMenor()"
                  (keydown.escape)="cancelarFormulario()"
                  class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 font-medium placeholder-slate-400" />
              </div>
              <div class="col-span-3">
                <input
                  type="text"
                  data-testid="input-doc-menor"
                  [(ngModel)]="nuevoDoc"
                  placeholder="Doc."
                  (keydown.enter)="agregarMenor()"
                  (keydown.escape)="cancelarFormulario()"
                  class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 font-medium placeholder-slate-400" />
              </div>
            </div>

            <div class="flex items-center justify-end gap-2">
              <button
                type="button"
                data-testid="btn-cancelar-menor"
                (click)="cancelarFormulario()"
                class="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-150 ease-out cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                data-testid="btn-guardar-menor"
                (click)="agregarMenor()"
                [disabled]="!formularioValido()"
                class="px-3.5 py-1 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed">
                Guardar Niño
              </button>
            </div>
          </div>
        }
      </div>
    } @else {
      <!-- Modo Estándar (usado en ClienteFormComponent) -->
      <div class="space-y-3 font-sans">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center text-xs font-bold shadow-2xs">
              <svg class="w-3.5 h-3.5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span class="text-xs font-bold text-slate-700 tracking-wide uppercase">
              Niños Asociados a la Orden
            </span>
            <span data-testid="badge-conteo-menores" class="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-pink-50 text-pink-700 border border-pink-200 tabular-nums">
              {{ _menores().length }}
            </span>
          </div>

          @if (!mostrarFormulario() && !deshabilitado) {
            <button
              type="button"
              data-testid="btn-mostrar-formulario-menor"
              (click)="abrirFormulario()"
              [disabled]="alcanzoLimite()"
              class="inline-flex items-center gap-1.5 ps-2.5 pe-3 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold rounded-xl transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              <svg class="w-3.5 h-3.5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>Añadir Niño</span>
            </button>
          }
        </div>

        @if (mostrarFormulario() && !deshabilitado) {
          <div data-testid="form-nuevo-menor" class="p-3 bg-pink-50/40 border border-pink-200 rounded-2xl space-y-2.5">
            <div class="flex items-center justify-between text-xs font-bold text-pink-900">
              <span>Datos del Niño / Menor</span>
              <span class="text-[10px] font-normal text-pink-600">Presiona Enter para agregar</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div class="sm:col-span-6">
                <input
                  #inputNombreMenor
                  type="text"
                  data-testid="input-nombre-menor"
                  [(ngModel)]="nuevoNombre"
                  placeholder="Nombre del niño/a *"
                  (keydown.enter)="agregarMenor()"
                  class="w-full px-3 py-1.5 text-xs bg-white border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 font-medium placeholder-slate-400" />
              </div>

              <div class="sm:col-span-3">
                <input
                  type="number"
                  min="0"
                  max="17"
                  data-testid="input-edad-menor"
                  [(ngModel)]="nuevaEdad"
                  placeholder="Edad (años) *"
                  (keydown.enter)="agregarMenor()"
                  class="w-full px-3 py-1.5 text-xs bg-white border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 font-medium placeholder-slate-400" />
              </div>

              <div class="sm:col-span-3">
                <input
                  type="text"
                  data-testid="input-doc-menor"
                  [(ngModel)]="nuevoDoc"
                  placeholder="Documento (opc.)"
                  (keydown.enter)="agregarMenor()"
                  class="w-full px-3 py-1.5 text-xs bg-white border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 font-medium placeholder-slate-400" />
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                data-testid="btn-cancelar-menor"
                (click)="cancelarFormulario()"
                class="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors duration-150 ease-out cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                data-testid="btn-guardar-menor"
                (click)="agregarMenor()"
                [disabled]="!formularioValido()"
                class="px-3.5 py-1 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed">
                Guardar Niño
              </button>
            </div>
          </div>
        }

        @if (_menores().length > 0) {
          <div data-testid="contenedor-chips-menores" class="flex flex-wrap gap-2">
            @for (menor of _menores(); track menor.idMenor ?? menor.nombreCompleto; let i = $index) {
              <div
                data-testid="chip-menor"
                class="inline-flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-2xl border transition-colors duration-150 ease-out shadow-2xs group"
                [ngClass]="esMenorActivo(menor) ? 'bg-blue-600 border-blue-600 text-white' : getColorClass(menor.edad ?? 0)">
                <button
                  type="button"
                  [attr.data-testid]="'btn-activar-menor-' + i"
                  (click)="seleccionarMenorActivo(menor)"
                  class="inline-flex items-center gap-2 cursor-pointer">
                  <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold uppercase bg-white/90 text-slate-800 shadow-inner">
                    {{ getInitials(menor.nombreCompleto) }}
                  </div>

                  <div class="flex items-center gap-1.5 text-xs font-bold leading-tight">
                    <span [ngClass]="esMenorActivo(menor) ? 'text-white' : 'text-slate-800'">{{ menor.nombreCompleto }}</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded-full font-extrabold bg-white/90 text-slate-700 border border-black/5 tabular-nums">
                      {{ menor.edad !== undefined && menor.edad !== null ? menor.edad + (menor.edad === 1 ? ' año' : ' años') : 'N/A' }}
                    </span>
                    @if (menor.documento) {
                      <span class="text-[10px] font-normal font-mono hidden sm:inline" [ngClass]="esMenorActivo(menor) ? 'text-blue-100' : 'text-slate-500'">
                        ({{ menor.documento }})
                      </span>
                    }
                  </div>
                </button>

                @if (!deshabilitado) {
                  <button
                    type="button"
                    data-testid="btn-eliminar-menor"
                    (click)="eliminarMenor(i)"
                    [attr.aria-label]="'Retirar a ' + menor.nombreCompleto"
                    class="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors duration-150 ease-out cursor-pointer ml-0.5">
                    <svg class="w-3.5 h-3.5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                }
              </div>
            }
          </div>
        } @else {
          <div data-testid="empty-state-menores" class="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
            <p class="text-xs text-slate-400">
              No hay niños registrados en esta orden. Haz clic en <strong>Añadir Niño</strong> para asociar menores.
            </p>
          </div>
        }
      </div>
    }
  `
})
export class MenoresChipsComponent {
  @Input() set menores(val: Menor[]) { this._menores.set(val || []); }
  get menores(): Menor[] { return this._menores(); }
  readonly _menores = signal<Menor[]>([]);

  @Input() maxMenores = 10;
  @Input() deshabilitado = false;
  @Input() compacto = false;

  @Input() set menorActivo(val: Menor | null | undefined) {
    this._menorActivo.set(val ?? null);
  }
  get menorActivo(): Menor | null {
    return this._menorActivo();
  }
  readonly _menorActivo = signal<Menor | null>(null);

  readonly menoresChange = output<Menor[]>();
  readonly menorAgregado = output<Menor>();
  readonly menorEliminado = output<Menor>();
  readonly menorActivoChange = output<Menor | null>();

  @ViewChild('inputNombreMenor') inputNombreMenorRef?: ElementRef<HTMLInputElement>;

  readonly mostrarFormulario = signal<boolean>(false);
  nuevoNombre = '';
  nuevaEdad: number | null = null;
  nuevoDoc = '';

  readonly alcanzoLimite = computed(() => this._menores().length >= this.maxMenores);

  getClaveMenor(m: Menor | null | undefined): string {
    if (!m) return '';
    return m.idMenor !== undefined ? String(m.idMenor) : m.nombreCompleto;
  }

  esMenorActivo(m: Menor): boolean {
    const activo = this._menorActivo();
    if (!activo) return false;
    return this.getClaveMenor(activo) === this.getClaveMenor(m);
  }

  seleccionarMenorActivo(m: Menor): void {
    if (this.deshabilitado) return;
    const siguiente = this.esMenorActivo(m) ? null : m;
    this._menorActivo.set(siguiente);
    this.menorActivoChange.emit(siguiente);
  }

  abrirFormulario(): void {
    if (this.alcanzoLimite()) return;
    this.nuevoNombre = '';
    this.nuevaEdad = null;
    this.nuevoDoc = '';
    this.mostrarFormulario.set(true);
    setTimeout(() => {
      this.inputNombreMenorRef?.nativeElement?.focus();
    }, 0);
  }

  cancelarFormulario(): void {
    this.mostrarFormulario.set(false);
  }

  formularioValido(): boolean {
    const nombre = this.nuevoNombre.trim();
    return nombre.length >= 2 && this.nuevaEdad !== null && this.nuevaEdad >= 0 && this.nuevaEdad <= 17;
  }

  agregarMenor(): void {
    if (!this.formularioValido()) return;

    const nuevo: Menor = {
      nombreCompleto: this.nuevoNombre.trim(),
      edad: Number(this.nuevaEdad),
      documento: this.nuevoDoc.trim() || undefined
    };

    this._menores.update(actuales => [...actuales, nuevo]);
    this.menoresChange.emit(this._menores());
    this.menorAgregado.emit(nuevo);
    this._menorActivo.set(nuevo);
    this.menorActivoChange.emit(nuevo);
    this.mostrarFormulario.set(false);
    this.nuevoNombre = '';
    this.nuevaEdad = null;
    this.nuevoDoc = '';
  }

  eliminarMenor(index: number): void {
    const lista = this._menores();
    const eliminado = lista[index];
    if (!eliminado) return;

    const eraActivo = this.esMenorActivo(eliminado);
    this._menores.update(actuales => actuales.filter((_, i) => i !== index));
    this.menoresChange.emit(this._menores());
    this.menorEliminado.emit(eliminado);

    if (eraActivo) {
      this._menorActivo.set(null);
      this.menorActivoChange.emit(null);
    }
  }

  getInitials(nombre: string): string {
    return extractInitials(nombre, 'NI');
  }

  getColorClass(edad: number): string {
    if (edad <= 3) {
      return 'bg-amber-50/70 border-amber-200 text-amber-900';
    }
    if (edad <= 10) {
      return 'bg-pink-50/70 border-pink-200 text-pink-900';
    }
    return 'bg-indigo-50/70 border-indigo-200 text-indigo-900';
  }
}
