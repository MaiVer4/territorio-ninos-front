import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperacionService } from '../../../../core/services/operacion.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { EstacionTrabajo } from '../../../../core/models/operador.model';

@Component({
  selector: 'app-seleccion-atraccion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <!-- Cabecera Fija Persistente (HU-24.08, HU-34.04, HU-29.08) -->
    @if (operacionService.estacionActiva(); as estacion) {
      <header
        data-testid="banner-cabecera-operario"
        class="sticky top-0 inset-x-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md px-4 py-2.5">
        <div class="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <!-- Datos de la Atracción y Modalidad -->
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs">
              {{ estacion.atraccionNombre.slice(0, 2).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <h1 class="text-xs sm:text-sm font-extrabold truncate text-white leading-tight">
                  {{ estacion.atraccionNombre }}
                </h1>
                <span
                  class="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm tracking-wider"
                  [ngClass]="estacion.tipoAtraccion === 'EVENTOS_CAIDAS' ? 'bg-purple-950 text-purple-300 border border-purple-700' : 'bg-blue-950 text-blue-300 border border-blue-700'">
                  {{ estacion.tipoAtraccion === 'EVENTOS_CAIDAS' ? 'Toro / Caídas' : 'Temporizada' }}
                </span>
              </div>
              <div class="flex items-center gap-2 text-[10px] text-slate-400">
                <!-- Indicador de Enlace (HU-24.08) -->
                <div class="flex items-center gap-1">
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    [ngClass]="{
                      'bg-emerald-400 motion-safe:animate-pulse': wsService.estadoConexion() === 'CONECTADO',
                      'bg-amber-400 motion-safe:animate-ping': wsService.estadoConexion() === 'RECONECTANDO',
                      'bg-red-500': wsService.estadoConexion() === 'SIN_CONEXION'
                    }"></span>
                  <span class="font-medium text-[10px]">
                    {{ wsService.estadoConexion() === 'CONECTADO' ? 'En línea' : (wsService.estadoConexion() === 'RECONECTANDO' ? 'Reconectando...' : 'Sin red') }}
                  </span>
                </div>
                <span>•</span>
                <span>Op: {{ estacion.operarioNombre }}</span>
              </div>
            </div>
          </div>

          <!-- Indicador de Aforo en Tiempo Real (HU-34.04) -->
          <div class="flex items-center gap-2 shrink-0">
            <div
              data-testid="indicador-aforo-header"
              class="px-2.5 py-1 rounded-lg border text-center transition-colors duration-300 flex flex-col items-center justify-center min-w-[76px]"
              [ngClass]="{
                'bg-emerald-950/80 border-emerald-600 text-emerald-300': operacionService.nivelSaturacionAforo() === 'BAJO',
                'bg-amber-950/80 border-amber-600 text-amber-300': operacionService.nivelSaturacionAforo() === 'MEDIO',
                'bg-red-950/90 border-red-500 text-red-200 motion-safe:animate-pulse': operacionService.nivelSaturacionAforo() === 'LLENO'
              }">
              <span class="text-[9px] font-semibold uppercase tracking-wider">Aforo</span>
              <span class="text-xs font-black font-mono leading-none">
                {{ operacionService.ocupacionActual() }}/{{ operacionService.capacidadMaxima() }}
              </span>
            </div>

            <!-- Botón Parada de Emergencia / Pausa General (HU-29.08) -->
            @if (estacion.confirmada) {
              <button
                type="button"
                data-testid="btn-parada-emergencia"
                (click)="toggleParadaEmergencia()"
                class="px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 shadow-sm cursor-pointer transition-transform duration-150 ease-out enabled:active:scale-[0.96]"
                [ngClass]="operacionService.paradaEmergenciaActiva()
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 ring-2 ring-amber-300'
                  : 'bg-red-600 text-white hover:bg-red-700'">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span class="hidden sm:inline">{{ operacionService.paradaEmergenciaActiva() ? 'Reanudar Todo' : 'Parada Gral' }}</span>
              </button>
            }

            <!-- Botón Desvincular Estación (HU-24.06 / CA-04) -->
            <button
              type="button"
              data-testid="btn-desvincular-estacion"
              (click)="desvincularEstacion()"
              title="Culminar turno y desvincular atracción"
              class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>
    }

    <!-- Vista de Selección y Confirmación de Atracción (HU-24.07 / SCRUM-393) -->
    @if (!operacionService.estacionActiva()?.confirmada) {
      <div class="max-w-md mx-auto p-4 sm:p-6 w-full flex flex-col justify-center min-h-[70vh]">
        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center">
          <div class="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>

          <h2 class="text-xl font-extrabold text-slate-800 mb-1">Confirmar Estación de Trabajo</h2>
          <p class="text-xs text-slate-500 mb-6">
            Verifica la atracción física antes de iniciar la operación y habilitar el lector QR.
          </p>

          <!-- Listado de Atracciones Asignadas / Disponibles -->
          <div class="space-y-3 mb-6 text-left">
            @for (estacion of operacionService.estacionesDisponibles(); track estacion.idAsignacion) {
              <div
                (click)="seleccionarEstacion(estacion)"
                [class.ring-2]="operacionService.estacionActiva()?.idAsignacion === estacion.idAsignacion"
                [class.ring-emerald-600]="operacionService.estacionActiva()?.idAsignacion === estacion.idAsignacion"
                [class.bg-emerald-50]="operacionService.estacionActiva()?.idAsignacion === estacion.idAsignacion"
                class="border border-slate-200 rounded-2xl p-4 transition cursor-pointer hover:border-emerald-300 hover:bg-slate-50 relative">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h3 class="text-sm font-bold text-slate-800">{{ estacion.atraccionNombre }}</h3>
                    <p class="text-xs text-slate-500 mt-0.5">
                      Capacidad: <strong class="text-slate-700">{{ estacion.capacidadMaxima }} niños</strong> •
                      Edad: <strong class="text-slate-700">{{ estacion.edadMinima }}-{{ estacion.edadMaxima }} años</strong>
                    </p>
                  </div>
                  <span
                    class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                    [ngClass]="estacion.tipoAtraccion === 'EVENTOS_CAIDAS' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'">
                    {{ estacion.tipoAtraccion === 'EVENTOS_CAIDAS' ? 'Toro Mecánico' : 'Tiempo' }}
                  </span>
                </div>
              </div>
            }
          </div>

          <!-- Botón Prominente de Confirmación (Notion: CA-01, CA-02) -->
          @if (operacionService.estacionActiva(); as activa) {
            <button
              type="button"
              data-testid="btn-confirmar-estacion"
              (click)="confirmarEstacion(activa)"
              class="w-full min-h-[50px] bg-emerald-600 hover:bg-emerald-700 transition-transform duration-150 ease-out enabled:active:scale-[0.96] text-white font-extrabold text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Confirmar Estación e Iniciar Labores</span>
            </button>
          }
        </div>
      </div>
    }
  `
})
export class SeleccionAtraccionComponent {
  operacionService = inject(OperacionService);
  wsService = inject(WebSocketService);

  estacionConfirmada = output<EstacionTrabajo>();

  seleccionarEstacion(estacion: EstacionTrabajo): void {
    this.operacionService.estacionActiva.set(estacion);
  }

  confirmarEstacion(estacion: EstacionTrabajo): void {
    this.operacionService.confirmarEstacionTrabajo(estacion);
    this.estacionConfirmada.emit(estacion);
  }

  desvincularEstacion(): void {
    this.operacionService.desvincularEstacionActiva().subscribe();
  }

  toggleParadaEmergencia(): void {
    if (this.operacionService.paradaEmergenciaActiva()) {
      this.operacionService.reanudarParadaEmergencia();
    } else {
      this.operacionService.paradaEmergencia('Parada de seguridad preventiva activada por operario');
    }
  }
}
