import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  Input,
  computed,
  inject,
  output,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OperacionService } from '../../../../core/services/operacion.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { EstacionTrabajo } from '../../../../core/models/operador.model';

@Component({
  selector: 'app-seleccion-atraccion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Cabecera Compacta Persistente de 1 Línea (HU-24.08, HU-34.04, HU-29.08) -->
    @if (operacionService.estacionActiva(); as estacion) {
      <header
        data-testid="banner-cabecera-operario"
        class="sticky top-0 inset-x-0 z-30 bg-slate-950 text-white border-b border-white/10 shadow-sm">
        <div class="h-14 max-w-6xl mx-auto px-3 sm:px-5 flex items-center justify-between gap-2.5">
          <!-- Estado en Vivo + Nombre de Atracción y Operario -->
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <span class="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
              @if (wsService.estadoConexion() === 'RECONECTANDO') {
                <span class="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              }
              <span
                class="relative inline-flex rounded-full h-2.5 w-2.5"
                [ngClass]="{
                  'bg-emerald-400': wsService.estadoConexion() === 'CONECTADO',
                  'bg-amber-400': wsService.estadoConexion() === 'RECONECTANDO',
                  'bg-red-500': wsService.estadoConexion() === 'SIN_CONEXION'
                }"></span>
            </span>
            <span class="sr-only">
              {{ wsService.estadoConexion() === 'CONECTADO' ? 'En línea' : (wsService.estadoConexion() === 'RECONECTANDO' ? 'Reconectando' : 'Sin red') }}
            </span>

            <div class="min-w-0 flex-1">
              <h1 class="text-sm font-extrabold text-white truncate leading-tight">
                {{ estacion.atraccionNombre }}
              </h1>
              <p class="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                {{ estacion.tipoAtraccion === 'EVENTOS_CAIDAS' ? 'Toro · Caídas' : 'Temporizada' }} · {{ estacion.operarioNombre }}
              </p>
            </div>
          </div>

          <!-- Aforo en Vivo con Mini Barra + Menú de Estación (⋮) -->
          <div class="flex items-center gap-2 shrink-0">
            <div
              data-testid="indicador-aforo-header"
              class="px-2.5 py-1 rounded-xl border min-w-[78px] transition-colors duration-150 ease-out flex flex-col justify-center"
              [ngClass]="{
                'bg-emerald-950/80 border-emerald-500/60 text-emerald-200': operacionService.nivelSaturacionAforo() === 'BAJO',
                'bg-amber-950/80 border-amber-500/70 text-amber-200': operacionService.nivelSaturacionAforo() === 'MEDIO',
                'bg-red-950/90 border-red-500 text-red-100': operacionService.nivelSaturacionAforo() === 'LLENO'
              }">
              <div class="flex items-baseline justify-between gap-1.5">
                <span class="text-[9px] font-bold uppercase tracking-wider opacity-80">Aforo</span>
                <span class="text-xs font-black font-mono tabular-nums leading-none">
                  {{ operacionService.ocupacionActual() }}/{{ operacionService.capacidadMaxima() }}
                </span>
              </div>
              <div class="h-1 w-full rounded-full bg-white/15 overflow-hidden mt-1" aria-hidden="true">
                <div
                  class="h-full rounded-full transition-[width,background-color] duration-200 ease-out"
                  [style.width.%]="porcentajeAforo()"
                  [ngClass]="{
                    'bg-emerald-400': operacionService.nivelSaturacionAforo() === 'BAJO',
                    'bg-amber-400': operacionService.nivelSaturacionAforo() === 'MEDIO',
                    'bg-red-400': operacionService.nivelSaturacionAforo() === 'LLENO'
                  }"></div>
              </div>
            </div>

            <button
              type="button"
              data-testid="btn-menu-estacion"
              (click)="abrirMenuEstacion()"
              aria-label="Opciones de estación y seguridad"
              class="relative w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="5.5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="18.5" r="1.5" />
              </svg>
              @if (operacionService.paradaEmergenciaActiva()) {
                <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-slate-950"></span>
              }
            </button>
          </div>
        </div>
      </header>

      <!-- Bottom Sheet de Estación, Seguridad y Sesión -->
      @if (menuEstacionAbierto()) {
        <div
          data-testid="sheet-menu-estacion"
          (click)="onMenuBackdropClick($event)"
          class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 op-backdrop-enter cursor-pointer">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-menu-estacion"
            (click)="$event.stopPropagation()"
            class="w-full sm:max-w-md bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-3 pb-sheet-safe max-h-[90dvh] overflow-y-auto overscroll-contain shadow-2xl border border-slate-200 op-sheet-enter cursor-default space-y-3">

            <!-- Indicador táctil superior en móvil -->
            <div class="w-10 h-1 rounded-full bg-slate-300 mx-auto sm:hidden" aria-hidden="true"></div>

            <!-- Cabecera del Sheet con Perfil y Estado -->
            <div class="flex items-center justify-between gap-3 px-1">
              <div class="min-w-0">
                <h2 id="titulo-menu-estacion" class="text-base font-extrabold text-slate-900 truncate">
                  {{ estacion.atraccionNombre }}
                </h2>
                <p class="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <span
                    class="inline-block w-2 h-2 rounded-full"
                    [ngClass]="{
                      'bg-emerald-500': wsService.estadoConexion() === 'CONECTADO',
                      'bg-amber-500': wsService.estadoConexion() === 'RECONECTANDO',
                      'bg-red-500': wsService.estadoConexion() === 'SIN_CONEXION'
                    }"></span>
                  <span>
                    {{ wsService.estadoConexion() === 'CONECTADO' ? 'Conectado al servidor' : (wsService.estadoConexion() === 'RECONECTANDO' ? 'Reconectando...' : 'Operando sin red') }}
                  </span>
                </p>
              </div>

              <button
                type="button"
                (click)="cerrarMenuEstacion()"
                aria-label="Cerrar menú"
                class="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer shrink-0">
                <svg class="w-5 h-5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Tarjeta de Operario Activo -->
            <div class="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-xs flex items-center justify-center shrink-0">
                  {{ operarioIniciales || estacion.operarioNombre.slice(0, 2).toUpperCase() }}
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-bold text-slate-900 truncate">{{ estacion.operarioNombre }}</p>
                  <p class="text-xs text-slate-500">{{ rolEtiqueta }}</p>
                </div>
              </div>
              <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-mono tabular-nums shrink-0">
                Cap. {{ estacion.capacidadMaxima }}
              </span>
            </div>

            <!-- Sección Seguridad: Parada de Emergencia en 2 pasos -->
            @if (estacion.confirmada) {
              <div class="space-y-2">
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">Seguridad de estación</p>

                @if (!confirmandoParada()) {
                  <button
                    type="button"
                    data-testid="btn-parada-emergencia"
                    (click)="iniciarConfirmacionParada()"
                    class="w-full min-h-[48px] ps-3.5 pe-4 rounded-2xl border font-bold text-sm flex items-center justify-between gap-3 transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer"
                    [ngClass]="operacionService.paradaEmergenciaActiva()
                      ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white'
                      : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700'">
                    <span class="flex items-center gap-2.5">
                      <svg class="w-5 h-5 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{{ operacionService.paradaEmergenciaActiva() ? 'Reanudar operación general' : 'Parada de emergencia' }}</span>
                    </span>
                    <span class="text-xs font-semibold opacity-80">
                      {{ operacionService.paradaEmergenciaActiva() ? 'Activa' : 'Pausar todo' }}
                    </span>
                  </button>
                } @else {
                  <div
                    data-testid="panel-confirmar-parada"
                    class="rounded-2xl bg-red-50 border border-red-300 p-2 space-y-2">
                    <div class="px-1.5 pt-1">
                      <p class="text-sm font-extrabold text-red-900">¿Detener toda la atracción?</p>
                      <p class="text-xs text-red-700 mt-0.5 leading-snug">
                        Se congelarán todos los cronómetros activos y se bloqueará el ingreso QR hasta reanudar.
                      </p>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        (click)="confirmandoParada.set(false)"
                        class="min-h-[44px] px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
                        Cancelar
                      </button>
                      <button
                        type="button"
                        data-testid="btn-confirmar-parada-emergencia"
                        (click)="confirmarParadaEmergencia()"
                        class="min-h-[44px] px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
                        Confirmar parada
                      </button>
                    </div>
                  </div>
                }
              </div>
            }

            <!-- Sección Gestión de Turno -->
            <div class="space-y-2 pt-1 border-t border-slate-100">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 pt-1">Turno y cuenta</p>

              <button
                type="button"
                data-testid="btn-desvincular-estacion"
                (click)="solicitarDesvincular()"
                class="w-full min-h-[48px] ps-3.5 pe-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-between gap-2 transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
                <span class="flex items-center gap-2.5">
                  <svg class="w-5 h-5 op-icon text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>Cambiar o desvincular estación</span>
                </span>
                <svg class="w-4 h-4 op-icon text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              @if (esCoordinador) {
                <a
                  routerLink="/coordinador"
                  data-testid="link-volver-coordinador"
                  (click)="cerrarMenuEstacion()"
                  class="w-full min-h-[48px] ps-3.5 pe-4 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-sm flex items-center justify-between gap-2 transition-[transform,background-color] duration-150 ease-out motion-safe:active:scale-[0.96]">
                  <span class="flex items-center gap-2.5">
                    <svg class="w-5 h-5 op-icon text-amber-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Volver al Panel Coordinador</span>
                  </span>
                </a>
              }

              <button
                type="button"
                data-testid="btn-cerrar-sesion-menu"
                (click)="solicitarCerrarSesion()"
                class="w-full min-h-[48px] ps-3.5 pe-4 rounded-2xl bg-white hover:bg-red-50 border border-slate-200 text-red-600 font-bold text-sm flex items-center gap-2.5 transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
                <svg class="w-5 h-5 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      }
    }

    <!-- Vista de Selección y Confirmación de Atracción Pre-Turno (HU-24.07 / SCRUM-393) -->
    @if (!operacionService.estacionActiva()?.confirmada) {
      <div class="max-w-lg mx-auto px-3 py-5 sm:p-6 w-full flex-1 flex flex-col justify-between gap-4">
        <div class="bg-white surface-card rounded-[28px] p-4 space-y-4">
          <div class="text-center pt-1">
            <div class="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 class="text-lg font-extrabold text-slate-900">Confirmar Estación de Trabajo</h2>
            <p class="text-xs text-slate-500 mt-1">
              Selecciona tu atracción física para habilitar el lector QR y el control de aforo.
            </p>
          </div>

          <!-- Listado Táctil de Atracciones Disponibles -->
          <div class="space-y-2.5">
            @for (estacion of operacionService.estacionesDisponibles(); track estacion.atraccionId) {
              <button
                type="button"
                [attr.data-testid]="'btn-seleccionar-estacion-' + estacion.atraccionId"
                [disabled]="estacion.ocupadaPorOtroOperario"
                (click)="!estacion.ocupadaPorOtroOperario && seleccionarEstacion(estacion)"
                class="w-full text-left rounded-xl p-3.5 border transition-[transform,border-color,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] flex items-start justify-between gap-3"
                [ngClass]="{
                  'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/30 cursor-pointer': operacionService.estacionActiva()?.atraccionId === estacion.atraccionId && !estacion.ocupadaPorOtroOperario,
                  'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed': estacion.ocupadaPorOtroOperario,
                  'bg-white border-slate-200 hover:border-emerald-400 cursor-pointer': operacionService.estacionActiva()?.atraccionId !== estacion.atraccionId && !estacion.ocupadaPorOtroOperario
                }">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="text-sm font-extrabold text-slate-900">{{ estacion.atraccionNombre }}</h3>
                    @if (estacion.ocupadaPorOtroOperario) {
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        Ocupada · {{ estacion.nombreOtroOperario || 'Otro operario' }}
                      </span>
                    } @else if (estacion.nombreOtroOperario) {
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Apoyo · {{ estacion.nombreOtroOperario }}
                      </span>
                    } @else if (estacion.esMiEstacion) {
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Asignada a ti
                      </span>
                    } @else {
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Disponible
                      </span>
                    }
                  </div>
                  <p class="text-xs text-slate-500 mt-1.5 font-medium">
                    Capacidad <strong class="text-slate-800 tabular-nums">{{ estacion.capacidadMaxima }}</strong> · Edad <strong class="text-slate-800 tabular-nums">{{ estacion.edadMinima }}-{{ estacion.edadMaxima }} años</strong>
                  </p>
                </div>

                <div class="flex flex-col items-end gap-2 shrink-0">
                  <span
                    class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                    [ngClass]="estacion.tipoAtraccion === 'EVENTOS_CAIDAS' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'">
                    {{ estacion.tipoAtraccion === 'EVENTOS_CAIDAS' ? 'Toro' : 'Tiempo' }}
                  </span>
                  @if (!estacion.ocupadaPorOtroOperario) {
                    <span
                      class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      [ngClass]="operacionService.estacionActiva()?.atraccionId === estacion.atraccionId ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'">
                      @if (operacionService.estacionActiva()?.atraccionId === estacion.atraccionId) {
                        <svg class="w-3 h-3 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      }
                    </span>
                  }
                </div>
              </button>
            } @empty {
              <div class="p-5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2.5 text-amber-700">
                  <svg class="w-5 h-5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h4 class="text-sm font-bold text-amber-900 mb-1">Sin estaciones disponibles</h4>
                <p class="text-xs text-amber-800 leading-relaxed">
                  No hay atracciones activas registradas en el parque en este momento.
                </p>
              </div>
            }
          </div>

          <!-- CTA Confirmación -->
          @if (operacionService.estacionActiva(); as activa) {
            <button
              type="button"
              data-testid="btn-confirmar-estacion"
              [disabled]="activa.ocupadaPorOtroOperario || confirmando()"
              (click)="confirmarEstacion(activa)"
              class="w-full min-h-[52px] ps-4 pe-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer">
              <svg class="w-5 h-5 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <span>{{ confirmando() ? 'Vinculando estación...' : 'Iniciar turno en estación' }}</span>
            </button>
          }

          <!-- Acción discreta de salida cuando aún no hay estación confirmada -->
          @if (!operacionService.estacionActiva()) {
            <button
              type="button"
              (click)="cerrarSesionSolicitado.emit()"
              class="w-full min-h-[44px] ps-3.5 pe-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
              <svg class="w-4 h-4 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Cerrar sesión</span>
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
  private readonly destroyRef = inject(DestroyRef);

  @Input() operarioIniciales = '';
  @Input() rolEtiqueta = 'Operario';
  @Input() esCoordinador = false;

  estacionConfirmada = output<EstacionTrabajo>();
  cerrarSesionSolicitado = output<void>();

  readonly confirmando = signal<boolean>(false);
  readonly menuEstacionAbierto = signal<boolean>(false);
  readonly confirmandoParada = signal<boolean>(false);

  readonly porcentajeAforo = computed<number>(() => {
    const max = Math.max(1, this.operacionService.capacidadMaxima());
    return Math.min(100, Math.round((this.operacionService.ocupacionActual() / max) * 100));
  });

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.menuEstacionAbierto()) {
      this.cerrarMenuEstacion();
    }
  }

  abrirMenuEstacion(): void {
    this.confirmandoParada.set(false);
    this.menuEstacionAbierto.set(true);
  }

  cerrarMenuEstacion(): void {
    this.menuEstacionAbierto.set(false);
    this.confirmandoParada.set(false);
  }

  onMenuBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cerrarMenuEstacion();
    }
  }

  iniciarConfirmacionParada(): void {
    if (this.operacionService.paradaEmergenciaActiva()) {
      this.operacionService.reanudarParadaEmergencia();
      this.cerrarMenuEstacion();
      return;
    }
    this.confirmandoParada.set(true);
  }

  confirmarParadaEmergencia(): void {
    this.operacionService.paradaEmergencia('Parada de seguridad preventiva activada por operario');
    this.cerrarMenuEstacion();
  }

  solicitarDesvincular(): void {
    this.cerrarMenuEstacion();
    this.desvincularEstacion();
  }

  solicitarCerrarSesion(): void {
    this.cerrarMenuEstacion();
    this.cerrarSesionSolicitado.emit();
  }

  seleccionarEstacion(estacion: EstacionTrabajo): void {
    this.operacionService.estacionActiva.set(estacion);
  }

  confirmarEstacion(estacion: EstacionTrabajo): void {
    if (this.confirmando()) return;
    this.confirmando.set(true);
    this.operacionService
      .confirmarEstacionTrabajo(estacion)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.confirmando.set(false))
      )
      .subscribe(confirmada => {
        if (confirmada) {
          this.estacionConfirmada.emit(estacion);
        }
      });
  }

  desvincularEstacion(): void {
    this.operacionService
      .desvincularEstacionActiva()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  toggleParadaEmergencia(): void {
    if (this.operacionService.paradaEmergenciaActiva()) {
      this.operacionService.reanudarParadaEmergencia();
    } else {
      this.operacionService.paradaEmergencia('Parada de seguridad preventiva activada por operario');
    }
  }
}
