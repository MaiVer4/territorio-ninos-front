import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OperacionService } from '../../../../core/services/operacion.service';
import { SoundNotificationService } from '../../../../core/services/sound-notification.service';
import { CronometroComponent, InfoCronometroTick } from '../cronometro/cronometro.component';
import {
  OPCIONES_MOTIVO_PAUSA,
  SesionJuegoMenor
} from '../../../../core/models/operador.model';

@Component({
  selector: 'app-cola-usuarios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CronometroComponent],
  template: `
    <div class="w-full max-w-4xl mx-auto space-y-3">
      <!-- Encabezado y Filtros Rápidos de la Cola Activa (HU-28.07) -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Cola Activa
          </h2>
          <span class="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold font-mono tabular-nums">
            {{ operacionService.ocupacionActual() }} activos
          </span>
        </div>

        @if (sesionesBase().length > 0) {
          <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Filtrar cola por estado">
            <button
              type="button"
              data-testid="filtro-cola-todos"
              (click)="filtroActivo.set('TODOS')"
              class="min-h-[34px] px-3 rounded-full text-xs font-bold whitespace-nowrap transition-[transform,background-color,color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer"
              [ngClass]="filtroActivo() === 'TODOS' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'">
              Todos ({{ sesionesBase().length }})
            </button>
            <button
              type="button"
              data-testid="filtro-cola-urgentes"
              (click)="filtroActivo.set('URGENTES')"
              class="min-h-[34px] px-3 rounded-full text-xs font-bold whitespace-nowrap transition-[transform,background-color,color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer"
              [ngClass]="filtroActivo() === 'URGENTES' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'">
              Urgentes ({{ totalUrgentes() }})
            </button>
            <button
              type="button"
              data-testid="filtro-cola-pausados"
              (click)="filtroActivo.set('PAUSADOS')"
              class="min-h-[34px] px-3 rounded-full text-xs font-bold whitespace-nowrap transition-[transform,background-color,color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer"
              [ngClass]="filtroActivo() === 'PAUSADOS' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'">
              Pausados ({{ totalPausados() }})
            </button>
          </div>
        }
      </div>

      <!-- Cuadrícula Responsiva Mobile-First (HU-28.04, HU-28.06 / Notion: RNF1) -->
      @if (sesionesBase().length === 0) {
        <div class="bg-white surface-card rounded-[20px] p-8 text-center text-slate-500">
          <svg class="w-11 h-11 op-icon mx-auto mb-2.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm font-bold text-slate-700">No hay menores en juego</p>
          <p class="text-xs text-slate-500 mt-1">Escanea una boleta QR para registrar el ingreso.</p>
        </div>
      } @else if (colaFiltrada().length === 0) {
        <div class="bg-white surface-card rounded-[20px] p-6 text-center space-y-2.5">
          <p class="text-sm font-bold text-slate-700">Sin menores en este filtro</p>
          <button
            type="button"
            (click)="filtroActivo.set('TODOS')"
            class="min-h-[40px] px-4 rounded-xl bg-slate-900 text-white text-xs font-bold transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
            Ver todos los activos
          </button>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          @for (sesion of colaFiltrada(); track sesion.idSesion) {
            <!-- Tarjeta Táctil Legible a Distancia (HU-28.04) -->
            <div
              [attr.data-testid]="'tarjeta-menor-' + sesion.idSesion"
              class="relative overflow-hidden surface-card rounded-[20px] p-3 pl-4 transition-[opacity,transform,filter,box-shadow,background-color] duration-150 ease-out flex flex-col gap-3"
              [class.opacity-0]="sesion.saliendo"
              [class.motion-safe:-translate-y-3]="sesion.saliendo"
              [class.motion-safe:blur-[4px]]="sesion.saliendo"
              [ngClass]="obtenerClasesTarjeta(sesion)">

              <!-- Barra Lateral Semáforo 4px -->
              <span
                class="absolute inset-y-0 left-0 w-1"
                aria-hidden="true"
                [ngClass]="obtenerBarraSemaforo(sesion)"></span>

              <!-- Fila Superior: Identidad + Cronómetro Protagonista -->
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1 space-y-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span
                      class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0"
                      [ngClass]="obtenerBadgeSemaforo(sesion)">
                      {{ obtenerEtiquetaBadge(sesion) }}
                    </span>
                    @if (sesion.menorEdad) {
                      <span class="text-xs text-slate-500 font-bold tabular-nums">{{ sesion.menorEdad }} años</span>
                    }
                  </div>

                  <h3 class="text-base font-black text-slate-900 truncate leading-tight">
                    {{ sesion.menorNombre }}
                  </h3>

                  <p class="text-xs text-slate-600 truncate">
                    Acudiente: <strong class="text-slate-800 font-semibold">{{ sesion.acudienteNombre }}</strong>
                  </p>
                  <p class="text-[11px] text-slate-400 font-mono truncate">
                    Boleta {{ sesion.codigoBoleta }}
                  </p>
                </div>

                <div class="shrink-0 pt-0.5">
                  <app-cronometro
                    [horaFin]="sesion.horaFin"
                    [enPausa]="sesion.enPausa"
                    [segundosCongelados]="sesion.segundosCongelados"
                    (tiempoActualizado)="alActualizarTiempo(sesion, $event)"
                    (preExpiracion)="alPreExpirar(sesion)"
                    (tiempoAgotado)="alAgotarTiempo(sesion)">
                  </app-cronometro>
                </div>
              </div>

              <!-- Motivo de Pausa si aplica (HU-29.09) -->
              @if (sesion.enPausa && sesion.motivoPausa) {
                <div class="px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 font-medium truncate">
                  Pausa: {{ sesion.motivoPausa }}
                </div>
              }

              <!-- Botonera Táctil (min 44px; Salida siempre visible incluso con alarma activa) -->
              <div class="pt-2 border-t border-slate-100 flex items-center gap-2 mt-auto">
                @if (sesion.enPausa) {
                  <button
                    type="button"
                    [attr.data-testid]="'btn-reanudar-menor-' + sesion.idSesion"
                    (click)="reanudarSesion(sesion)"
                    class="flex-1 min-h-[44px] ps-3 pe-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] flex items-center justify-center gap-1.5 cursor-pointer">
                    <svg class="w-4 h-4 op-icon translate-x-[1.5px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Reanudar</span>
                  </button>
                } @else {
                  <button
                    type="button"
                    [attr.data-testid]="'btn-pausa-menor-' + sesion.idSesion"
                    (click)="abrirModalPausa(sesion)"
                    class="flex-1 min-h-[44px] ps-3 pe-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] flex items-center justify-center gap-1.5 cursor-pointer">
                    <svg class="w-4 h-4 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Pausar</span>
                  </button>
                }

                @if (sesion.segundosRestantes <= 0 && !sesion.alarmaSilenciada) {
                  <button
                    type="button"
                    [attr.data-testid]="'btn-silenciar-alarma-' + sesion.idSesion"
                    (click)="silenciarAlarma(sesion)"
                    class="min-h-[44px] ps-3 pe-3.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-lg transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                    <svg class="w-4 h-4 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                    <span>Silenciar</span>
                  </button>
                }

                <button
                  type="button"
                  [attr.data-testid]="'btn-confirmar-salida-' + sesion.idSesion"
                  (click)="confirmarSalida(sesion)"
                  class="flex-1 min-h-[44px] ps-3 pe-3.5 text-white font-bold text-xs rounded-lg transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] flex items-center justify-center gap-1.5 cursor-pointer"
                  [ngClass]="sesion.segundosRestantes <= 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-red-700'">
                  <svg class="w-4 h-4 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Salida</span>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Bottom Sheet de Pausa con Selector de Incidente (HU-29.07 / Notion: CA-01) -->
      @if (sesionParaPausar()) {
        <div
          data-testid="modal-pausa-sesion"
          (click)="onBackdropClick($event)"
          class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 op-backdrop-enter cursor-pointer">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-pausa-sesion"
            (click)="$event.stopPropagation()"
            class="bg-white rounded-t-[28px] sm:rounded-[28px] max-w-md w-full p-4 pb-sheet-safe max-h-[90dvh] overflow-y-auto overscroll-contain shadow-2xl border border-slate-200 op-sheet-enter cursor-default space-y-4">
            <div class="w-10 h-1 rounded-full bg-slate-300 mx-auto sm:hidden" aria-hidden="true"></div>

            <div>
              <h3 id="titulo-pausa-sesion" class="text-base font-extrabold text-slate-900">Pausar Tiempo de Juego</h3>
              <p class="text-xs text-slate-500 mt-0.5">
                Selecciona el motivo de incidente para <strong class="text-slate-700">{{ sesionParaPausar()?.menorNombre }}</strong>:
              </p>
            </div>

            <div class="space-y-2">
              @for (opcion of opcionesPausa; track opcion.codigo) {
                <button
                  type="button"
                  (click)="motivoPausaSeleccionado.set(opcion.etiqueta)"
                  [class.ring-2]="motivoPausaSeleccionado() === opcion.etiqueta"
                  [class.ring-blue-600]="motivoPausaSeleccionado() === opcion.etiqueta"
                  [class.bg-blue-50]="motivoPausaSeleccionado() === opcion.etiqueta"
                  [class.border-blue-600]="motivoPausaSeleccionado() === opcion.etiqueta"
                  class="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 transition-[transform,background-color,border-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
                  <p class="text-xs font-bold text-slate-900">{{ opcion.etiqueta }}</p>
                  <p class="text-[11px] text-slate-500 mt-0.5">{{ opcion.descripcion }}</p>
                </button>
              }
            </div>

            <div class="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                (click)="cerrarModalPausa()"
                class="w-full min-h-[48px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirmarPausa()"
                class="w-full min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] shadow-xs cursor-pointer">
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
  readonly filtroActivo = signal<'TODOS' | 'URGENTES' | 'PAUSADOS'>('TODOS');

  readonly sesionesBase = computed<SesionJuegoMenor[]>(() =>
    this.operacionService.colaOrdenadaPorUrgencia()
  );

  readonly totalUrgentes = computed<number>(
    () =>
      this.sesionesBase().filter(s => !s.saliendo && !s.enPausa && s.segundosRestantes <= 120).length
  );

  readonly totalPausados = computed<number>(
    () => this.sesionesBase().filter(s => !s.saliendo && s.enPausa).length
  );

  readonly colaFiltrada = computed<SesionJuegoMenor[]>(() => {
    const lista = this.sesionesBase();
    const filtro = this.filtroActivo();
    if (filtro === 'URGENTES') {
      return lista.filter(s => !s.saliendo && !s.enPausa && s.segundosRestantes <= 120);
    }
    if (filtro === 'PAUSADOS') {
      return lista.filter(s => !s.saliendo && s.enPausa);
    }
    return lista;
  });

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.sesionParaPausar()) {
      this.cerrarModalPausa();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cerrarModalPausa();
    }
  }

  obtenerClasesTarjeta(sesion: SesionJuegoMenor): string {
    if (sesion.enPausa) {
      return 'bg-blue-50/40 border-blue-300';
    }
    if (sesion.segundosRestantes <= 0) {
      return 'bg-red-50/50 border-red-400';
    }
    if (sesion.segundosRestantes <= 120) {
      return 'bg-amber-50/40 border-amber-300';
    }
    return 'bg-white';
  }

  obtenerBarraSemaforo(sesion: SesionJuegoMenor): string {
    if (sesion.enPausa) return 'bg-blue-600';
    if (sesion.segundosRestantes <= 0) return 'bg-red-600';
    if (sesion.segundosRestantes <= 120) return 'bg-amber-500';
    return 'bg-emerald-500';
  }

  obtenerBadgeSemaforo(sesion: SesionJuegoMenor): string {
    if (sesion.enPausa) {
      return 'bg-blue-100 text-blue-800 border border-blue-300';
    }
    if (sesion.segundosRestantes <= 0) {
      return 'bg-red-600 text-white';
    }
    if (sesion.segundosRestantes <= 120) {
      return 'bg-amber-100 text-amber-900 border border-amber-300';
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
