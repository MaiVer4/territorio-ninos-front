import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OperacionService } from '../../../../core/services/operacion.service';
import { SoundNotificationService } from '../../../../core/services/sound-notification.service';
import { CronometroComponent, InfoCronometroTick } from '../cronometro/cronometro.component';
import {
  MotivoPausaIncidente,
  OPCIONES_MOTIVO_PAUSA,
  SesionJuegoMenor
} from '../../../../core/models/operador.model';

@Component({
  selector: 'app-cola-usuarios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CronometroComponent],
  template: `
    <div class="w-full max-w-4xl mx-auto space-y-4">
      <!-- Encabezado de la Cola Activa (HU-28.07) -->
      <div class="flex items-center justify-between px-2">
        <div>
          <h2 class="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span>Cola Activa en Juego</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
              {{ operacionService.ocupacionActual() }} activos
            </span>
          </h2>
          <p class="text-[11px] text-slate-400">Ordenados por prioridad de tiempo restante</p>
        </div>
      </div>

      <!-- Cuadrícula Responsiva Mobile-First (HU-28.04, HU-28.06 / Notion: RNF1) -->
      @if (operacionService.colaOrdenadaPorUrgencia().length === 0) {
        <div class="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400 my-4">
          <svg class="w-12 h-12 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-xs font-bold text-slate-600">No hay menores en juego en este momento</p>
          <p class="text-[11px] text-slate-400 mt-1">Escanea un código QR o digita el UUID para permitir el ingreso.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          @for (sesion of operacionService.colaOrdenadaPorUrgencia(); track sesion.idSesion) {
            <!-- Tarjeta Independiente de Menor en Juego (HU-28.04) -->
            <div
              [attr.data-testid]="'tarjeta-menor-' + sesion.idSesion"
              class="relative bg-white border-2 rounded-2xl p-4 shadow-sm transition-[border-color,box-shadow,opacity,transform] duration-200 ease-out flex flex-col justify-between"
              [class.opacity-0]="sesion.saliendo"
              [class.scale-95]="sesion.saliendo"
              [ngClass]="obtenerClasesTarjeta(sesion)">
              
              <!-- Badge de Estado Semáforo y Título -->
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <h3 class="text-sm font-black text-slate-900 truncate">
                      {{ sesion.menorNombre }}
                    </h3>
                    @if (sesion.menorEdad) {
                      <span class="text-[10px] text-slate-500 font-bold">({{ sesion.menorEdad }}a)</span>
                    }
                  </div>
                  <p class="text-[11px] text-slate-500 truncate mt-0.5">
                    Acudiente: <strong class="text-slate-700 font-semibold">{{ sesion.acudienteNombre }}</strong>
                  </p>
                </div>

                <!-- Badge Semáforo (HU-28.05, HU-29.09, HU-31.05) -->
                <span
                  class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0"
                  [ngClass]="obtenerBadgeSemaforo(sesion)">
                  {{ obtenerEtiquetaBadge(sesion) }}
                </span>
              </div>

              <!-- Cronómetro Regresivo de Alta Precisión (HU-27.08, HU-27.09) -->
              <div class="my-2 bg-slate-50/80 rounded-xl p-2.5 flex items-center justify-between border border-slate-200/60">
                <div class="flex flex-col">
                  <span class="text-[10px] uppercase font-bold text-slate-400 leading-none">Tiempo</span>
                  <span class="text-[9px] text-slate-500 font-mono mt-0.5">Boleta: {{ sesion.codigoBoleta }}</span>
                </div>

                <app-cronometro
                  [horaFin]="sesion.horaFin"
                  [enPausa]="sesion.enPausa"
                  [segundosCongelados]="sesion.segundosCongelados"
                  (tiempoActualizado)="alActualizarTiempo(sesion, $event)"
                  (preExpiracion)="alPreExpirar(sesion)"
                  (tiempoAgotado)="alAgotarTiempo(sesion)">
                </app-cronometro>
              </div>

              <!-- Motivo de Pausa si aplica (HU-29.09) -->
              @if (sesion.enPausa && sesion.motivoPausa) {
                <div class="mb-2 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-[10px] text-blue-800 font-medium truncate">
                  Pausa: {{ sesion.motivoPausa }}
                </div>
              }

              <!-- Botonera de Acción Táctil (HU-29.07, HU-31.06, HU-32.06) -->
              <div class="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 mt-auto">
                <!-- Botón de Pausa / Reanudar (HU-29.07) -->
                @if (sesion.enPausa) {
                  <button
                    type="button"
                    [attr.data-testid]="'btn-reanudar-menor-' + sesion.idSesion"
                    (click)="reanudarSesion(sesion)"
                    class="py-2 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Reanudar</span>
                  </button>
                } @else {
                  <button
                    type="button"
                    [attr.data-testid]="'btn-pausa-menor-' + sesion.idSesion"
                    (click)="abrirModalPausa(sesion)"
                    class="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition-transform duration-150 ease-out enabled:active:scale-[0.96] flex items-center justify-center gap-1 cursor-pointer">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Pausar</span>
                  </button>
                }

                <!-- Botón de Silenciar Alarma si está sonando (HU-31.06) O Confirmar Salida (HU-32.06) -->
                @if (sesion.segundosRestantes <= 0 && !sesion.alarmaSilenciada) {
                  <button
                    type="button"
                    [attr.data-testid]="'btn-silenciar-alarma-' + sesion.idSesion"
                    (click)="silenciarAlarma(sesion)"
                    class="py-2 px-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] rounded-xl transition-transform duration-150 ease-out enabled:active:scale-[0.96] flex items-center justify-center gap-1 motion-safe:animate-pulse shadow-xs cursor-pointer">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                    <span>Silenciar</span>
                  </button>
                } @else {
                  <button
                    type="button"
                    [attr.data-testid]="'btn-confirmar-salida-' + sesion.idSesion"
                    (click)="confirmarSalida(sesion)"
                    class="py-2 px-2.5 bg-slate-900 hover:bg-red-700 text-white font-bold text-[11px] rounded-xl transition-transform duration-150 ease-out enabled:active:scale-[0.96] flex items-center justify-center gap-1 cursor-pointer">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Salida</span>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Modal de Pausa con Selector de Incidente (HU-29.07 / Notion: CA-01) -->
      @if (sesionParaPausar()) {
        <div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain">
          <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95">
            <h3 class="text-base font-extrabold text-slate-800 mb-1">Pausar Tiempo de Juego</h3>
            <p class="text-xs text-slate-500 mb-4">
              Selecciona el motivo de incidente para {{ sesionParaPausar()?.menorNombre }}:
            </p>

            <div class="space-y-2 mb-4">
              @for (opcion of opcionesPausa; track opcion.codigo) {
                <button
                  type="button"
                  (click)="motivoPausaSeleccionado.set(opcion.etiqueta)"
                  [class.ring-2]="motivoPausaSeleccionado() === opcion.etiqueta"
                  [class.ring-blue-600]="motivoPausaSeleccionado() === opcion.etiqueta"
                  [class.bg-blue-50]="motivoPausaSeleccionado() === opcion.etiqueta"
                  class="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 transition-colors duration-150 ease-out cursor-pointer">
                  <p class="text-xs font-bold text-slate-800">{{ opcion.etiqueta }}</p>
                  <p class="text-[10px] text-slate-400 mt-0.5">{{ opcion.descripcion }}</p>
                </button>
              }
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                (click)="cerrarModalPausa()"
                class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-transform duration-150 ease-out enabled:active:scale-[0.96] cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirmarPausa()"
                class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-transform duration-150 ease-out enabled:active:scale-[0.96] shadow-xs cursor-pointer">
                Confirmar Pausa
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ColaUsuariosComponent {
  operacionService = inject(OperacionService);
  soundService = inject(SoundNotificationService);

  readonly opcionesPausa = OPCIONES_MOTIVO_PAUSA;
  readonly sesionParaPausar = signal<SesionJuegoMenor | null>(null);
  readonly motivoPausaSeleccionado = signal<string>(OPCIONES_MOTIVO_PAUSA[0].etiqueta);

  obtenerClasesTarjeta(sesion: SesionJuegoMenor): string {
    if (sesion.enPausa) {
      return 'border-blue-400 bg-blue-50/20';
    }
    if (sesion.segundosRestantes <= 0) {
      return 'border-red-500 bg-red-50/30 ring-2 ring-red-400 motion-safe:animate-pulse';
    }
    if (sesion.segundosRestantes <= 120) {
      return 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300';
    }
    return 'border-slate-200 hover:border-emerald-300';
  }

  obtenerBadgeSemaforo(sesion: SesionJuegoMenor): string {
    if (sesion.enPausa) {
      return 'bg-blue-100 text-blue-800 border border-blue-300';
    }
    if (sesion.segundosRestantes <= 0) {
      return 'bg-red-600 text-white motion-safe:animate-pulse';
    }
    if (sesion.segundosRestantes <= 120) {
      return 'bg-amber-100 text-amber-800 border border-amber-300 motion-safe:animate-pulse';
    }
    return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
  }

  obtenerEtiquetaBadge(sesion: SesionJuegoMenor): string {
    if (sesion.enPausa) return 'PAUSADO';
    if (sesion.segundosRestantes <= 0) return 'TIEMPO AGOTADO';
    if (sesion.segundosRestantes <= 120) return 'POR FINALIZAR';
    return 'EN JUEGO';
  }

  alActualizarTiempo(sesion: SesionJuegoMenor, info: InfoCronometroTick): void {
    if (
      sesion.segundosRestantes === info.segundosRestantes &&
      sesion.segundosExcedidos === info.segundosExcedidos
    ) {
      return;
    }

    const nuevoSemaforo = sesion.enPausa
      ? sesion.estadoSemaforo
      : info.agotado
        ? 'ROJO'
        : info.preExpiracion
          ? 'AMARILLO'
          : 'VERDE';

    this.operacionService.colaActiva.update(cola =>
      cola.map(s => {
        if (s.idSesion === sesion.idSesion) {
          return {
            ...s,
            segundosRestantes: info.segundosRestantes,
            segundosExcedidos: info.segundosExcedidos,
            estadoSemaforo: nuevoSemaforo
          };
        }
        return s;
      })
    );
  }

  alPreExpirar(sesion: SesionJuegoMenor): void {
    if (!sesion.preExpiracionNotificada) {
      this.operacionService.colaActiva.update(cola =>
        cola.map(s => (s.idSesion === sesion.idSesion ? { ...s, preExpiracionNotificada: true } : s))
      );
      this.soundService.vibrarPreExpiracion();
    }
  }

  alAgotarTiempo(sesion: SesionJuegoMenor): void {
    this.soundService.reproducirAlarmaTiempoAgotado(sesion.idSesion);
  }

  silenciarAlarma(sesion: SesionJuegoMenor): void {
    this.operacionService.colaActiva.update(cola =>
      cola.map(s => (s.idSesion === sesion.idSesion ? { ...s, alarmaSilenciada: true } : s))
    );
    this.soundService.silenciarAlarma(sesion.idSesion);
  }

  abrirModalPausa(sesion: SesionJuegoMenor): void {
    this.sesionParaPausar.set(sesion);
    this.motivoPausaSeleccionado.set(this.opcionesPausa[0].etiqueta);
  }

  cerrarModalPausa(): void {
    this.sesionParaPausar.set(null);
  }

  confirmarPausa(): void {
    const sesion = this.sesionParaPausar();
    if (sesion) {
      this.operacionService.pausarSesion(sesion.idSesion, this.motivoPausaSeleccionado());
      this.cerrarModalPausa();
    }
  }

  reanudarSesion(sesion: SesionJuegoMenor): void {
    this.operacionService.reanudarSesion(sesion.idSesion);
  }

  confirmarSalida(sesion: SesionJuegoMenor): void {
    this.operacionService.confirmarSalidaMenor(sesion.idSesion);
  }
}
