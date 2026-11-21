import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CatalogoAtraccionOnline } from '../../../../core/models/tienda.model';

@Component({
  selector: 'app-normas-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <!-- Backdrop oscuro -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overscroll-contain motion-safe:transition-opacity duration-150"
      (click)="cerrar.emit()">

      <!-- Card del Modal con Radios Concéntricos (p-6 24px + inner 16px = 40px) -->
      <div
        class="relative w-full max-w-lg bg-white rounded-[32px] sm:rounded-[40px] p-6 shadow-2xl border border-transparent overscroll-contain flex flex-col max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'Normas y detalles de ' + atraccion?.nombre">

        <!-- Cabecera -->
        <div class="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 mb-1.5">
              <span>🛡️ Seguridad & Protocolos</span>
            </span>
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {{ atraccion?.nombre }}
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Todo lo que necesitas saber antes de que tu pequeño ingrese a jugar
            </p>
          </div>

          <button
            type="button"
            (click)="cerrar.emit()"
            class="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-[background-color,color] duration-150 enabled:active:scale-[0.96]"
            aria-label="Cerrar modal">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Contenido de Normas -->
        <div class="py-5 space-y-4 text-xs text-slate-600">

          <!-- Rango de Edad y Capacidad -->
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Edad autorizada</span>
              <span class="text-base font-extrabold text-slate-900">
                {{ atraccion?.edadMinima }} a {{ atraccion?.edadMaxima }} años
              </span>
              <p class="text-[11px] text-slate-500 mt-0.5">Los operarios verificarán la edad antes de iniciar la sesión.</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Aforo máximo</span>
              <span class="text-base font-extrabold text-slate-900">
                {{ atraccion?.capacidadMaxima }} niños simultáneos
              </span>
              <p class="text-[11px] text-slate-500 mt-0.5">Control de capacidad en vivo para evitar sobrepoblación.</p>
            </div>
          </div>

          <!-- Normas Clave de Uso -->
          <div class="space-y-2.5 pt-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">
              Reglas de Convivencia y Seguridad
            </h3>

            <div class="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60">
              <span class="text-base shrink-0">🧦</span>
              <div>
                <strong class="font-bold text-amber-950 block">Uso obligatorio de medias o calcetines</strong>
                <p class="text-[11px] text-amber-900 mt-0.5">
                  Por higiene de todos los niños, no está permitido el ingreso descalzo ni con zapatos.
                </p>
              </div>
            </div>

            <div class="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-50/60 border border-blue-200/60">
              <span class="text-base shrink-0">👀</span>
              <div>
                <strong class="font-bold text-blue-950 block">Supervisión de un adulto responsable</strong>
                <p class="text-[11px] text-blue-900 mt-0.5">
                  El acudiente debe permanecer en las zonas perimetrales del parque mientras el menor esté en la atracción.
                </p>
              </div>
            </div>

            <div class="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/60">
              <span class="text-base shrink-0">🚫</span>
              <div>
                <strong class="font-bold text-emerald-950 block">Prohibido alimentos, bebidas o juguetes externos</strong>
                <p class="text-[11px] text-emerald-900 mt-0.5">
                  Para prevenir atragantamientos o pérdidas, los niños deben ingresar sin comida ni objetos en los bolsillos.
                </p>
              </div>
            </div>
          </div>

          <!-- Tarifas Disponibles -->
          <div class="pt-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Tarifas vigentes
            </h3>
            <div class="space-y-1.5">
              @if (atraccion?.tipoAtraccion === 'TEMPORIZADA') {
                @for (tt of atraccion?.tarifasTiempo; track tt.id) {
                  <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span class="font-semibold text-slate-800">⏱️ {{ tt.duracionMinutos }} minutos</span>
                    <span class="font-extrabold text-emerald-700 font-mono">\${{ tt.precio | number }} COP</span>
                  </div>
                }
              } @else {
                @for (te of atraccion?.tarifasEvento; track te.id) {
                  <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span class="font-semibold text-slate-800">🎯 {{ te.intentos }} caídas / intentos</span>
                    <span class="font-extrabold text-emerald-700 font-mono">\${{ te.precio | number }} COP</span>
                  </div>
                }
              }
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            (click)="cerrar.emit()"
            class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors">
            Cerrar
          </button>

          <button
            type="button"
            (click)="comprar.emit()"
            class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-[transform,background-color] duration-150 enabled:active:scale-[0.96] flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Comprar Boleta Ahora</span>
          </button>
        </div>

      </div>
    </div>
  `
})
export class NormasModalComponent {
  @Input() atraccion: CatalogoAtraccionOnline | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() comprar = new EventEmitter<void>();
}
