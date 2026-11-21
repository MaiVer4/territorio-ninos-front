import { ChangeDetectionStrategy, Component, computed, Input, output, signal } from '@angular/core';
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
    <div class="space-y-3 font-sans">
      <!-- Encabezado con conteo y botón para añadir -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center text-xs font-bold shadow-2xs">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-xs font-bold text-slate-700 tracking-wide uppercase">
            Niños Asociados a la Orden
          </span>
          <span data-testid="badge-conteo-menores" class="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-pink-50 text-pink-700 border border-pink-200">
            {{ _menores().length }}
          </span>
        </div>

        @if (!mostrarFormulario() && !deshabilitado) {
          <button
            type="button"
            data-testid="btn-mostrar-formulario-menor"
            (click)="abrirFormulario()"
            [disabled]="alcanzoLimite()"
            class="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Añadir Niño</span>
          </button>
        }
      </div>

      <!-- Mini-Formulario Inline para agregar Menor -->
      @if (mostrarFormulario() && !deshabilitado) {
        <div data-testid="form-nuevo-menor" class="p-3 bg-pink-50/40 border border-pink-200 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
          <div class="flex items-center justify-between text-xs font-bold text-pink-900">
            <span>Datos del Niño / Menor</span>
            <span class="text-[10px] font-normal text-pink-600">Presiona Enter para agregar</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <!-- Nombre -->
            <div class="sm:col-span-6">
              <input
                type="text"
                data-testid="input-nombre-menor"
                [(ngModel)]="nuevoNombre"
                placeholder="Nombre del niño/a *"
                (keydown.enter)="agregarMenor()"
                class="w-full px-3 py-1.5 text-xs bg-white border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 font-medium placeholder-slate-400" />
            </div>

            <!-- Edad -->
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

            <!-- Documento (opcional) -->
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

          <!-- Botones de Acción del Formulario -->
          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              data-testid="btn-cancelar-menor"
              (click)="cancelarFormulario()"
              class="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer">
              Cancelar
            </button>
            <button
              type="button"
              data-testid="btn-guardar-menor"
              (click)="agregarMenor()"
              [disabled]="!formularioValido()"
              class="px-3.5 py-1 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed">
              Guardar Niño
            </button>
          </div>
        </div>
      }

      <!-- Lista de Chips Visuales de Menores -->
      @if (_menores().length > 0) {
        <div data-testid="contenedor-chips-menores" class="flex flex-wrap gap-2">
          @for (menor of _menores(); track menor.idMenor ?? menor.nombreCompleto; let i = $index) {
            <div
              data-testid="chip-menor"
              class="inline-flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-2xl border transition shadow-2xs group"
              [ngClass]="getColorClass(menor.edad ?? 0)">
              <!-- Avatar con Iniciales -->
              <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold uppercase bg-white/80 shadow-inner">
                {{ getInitials(menor.nombreCompleto) }}
              </div>

              <!-- Nombre y Badge de Edad -->
              <div class="flex items-center gap-1.5 text-xs font-bold leading-tight">
                <span class="text-slate-800">{{ menor.nombreCompleto }}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded-full font-extrabold bg-white/90 text-slate-700 border border-black/5">
                  {{ menor.edad !== undefined && menor.edad !== null ? menor.edad + (menor.edad === 1 ? ' año' : ' años') : 'N/A' }}
                </span>
                @if (menor.documento) {
                  <span class="text-[10px] text-slate-500 font-normal font-mono hidden sm:inline">
                    ({{ menor.documento }})
                  </span>
                }
              </div>

              <!-- Botón Eliminar / Retirar -->
              @if (!deshabilitado) {
                <button
                  type="button"
                  data-testid="btn-eliminar-menor"
                  (click)="eliminarMenor(i)"
                  [attr.aria-label]="'Retirar a ' + menor.nombreCompleto"
                  class="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer ml-0.5">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              }
            </div>
          }
        </div>
      } @else {
        <!-- Estado Vacío -->
        <div data-testid="empty-state-menores" class="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
          <p class="text-xs text-slate-400">
            No hay niños registrados en esta orden. Haz clic en <strong>Añadir Niño</strong> para asociar menores.
          </p>
        </div>
      }
    </div>
  `
})
export class MenoresChipsComponent {
  @Input() set menores(val: Menor[]) { this._menores.set(val || []); }
  get menores(): Menor[] { return this._menores(); }
  readonly _menores = signal<Menor[]>([]);

  @Input() maxMenores = 10;
  @Input() deshabilitado = false;

  readonly menoresChange = output<Menor[]>();
  readonly menorAgregado = output<Menor>();
  readonly menorEliminado = output<Menor>();

  readonly mostrarFormulario = signal<boolean>(false);
  nuevoNombre = '';
  nuevaEdad: number | null = null;
  nuevoDoc = '';

  readonly alcanzoLimite = computed(() => this._menores().length >= this.maxMenores);

  abrirFormulario(): void {
    if (this.alcanzoLimite()) return;
    this.nuevoNombre = '';
    this.nuevaEdad = null;
    this.nuevoDoc = '';
    this.mostrarFormulario.set(true);
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
    this.mostrarFormulario.set(false);
    this.nuevoNombre = '';
    this.nuevaEdad = null;
    this.nuevoDoc = '';
  }

  eliminarMenor(index: number): void {
    const lista = this._menores();
    const eliminado = lista[index];
    if (!eliminado) return;

    this._menores.update(actuales => actuales.filter((_, i) => i !== index));
    this.menoresChange.emit(this._menores());
    this.menorEliminado.emit(eliminado);
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
