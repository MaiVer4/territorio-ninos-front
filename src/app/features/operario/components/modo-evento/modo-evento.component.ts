import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperacionService } from '../../../../core/services/operacion.service';
import { SesionJuegoMenor } from '../../../../core/models/operador.model';
import { formatearMmSs } from '../../../../core/utils/time.utils';

@Component({
  selector: 'app-modo-evento',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="w-full max-w-4xl mx-auto space-y-3">
      <!-- Encabezado de Modo Evento / Control de Caídas (HU-33.05) -->
      <div class="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-[20px] p-3 shadow-md flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-lg bg-purple-700/80 border border-purple-400/60 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 op-icon text-purple-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-sm sm:text-base font-extrabold leading-tight truncate">Modo Evento • Toro Mecánico</h2>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-100 border border-purple-400/40 shrink-0">
                Control de Caídas
              </span>
            </div>
            <p class="text-[11px] text-purple-200 mt-0.5 truncate">Control de rondas por intentos y tiempo récord</p>
          </div>
        </div>

        <div class="text-right shrink-0">
          <span class="text-[10px] uppercase font-bold text-purple-300 block">En Pista</span>
          <span class="text-base sm:text-lg font-black font-mono tabular-nums leading-none">
            {{ operacionService.ocupacionActual() }} activos
          </span>
        </div>
      </div>

      <!-- Listado de Participantes en Pista -->
      @if (operacionService.colaActiva().length === 0) {
        <div class="bg-white surface-card rounded-[20px] p-8 text-center text-slate-500">
          <svg class="w-11 h-11 op-icon mx-auto mb-2.5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm font-bold text-slate-700">Sin participantes en pista</p>
          <p class="text-xs text-slate-500 mt-1">Escanea el boleto QR del participante para iniciar la primera ronda.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          @for (sesion of operacionService.colaActiva(); track sesion.idSesion) {
            <div
              [attr.data-testid]="'tarjeta-toro-' + sesion.idSesion"
              class="bg-white surface-card rounded-[20px] p-3 space-y-3 relative overflow-hidden"
              [class.border-red-400]="(sesion.intentosRealizados || 0) >= (sesion.intentosMaximos || 3)"
              [class.border-purple-200]="(sesion.intentosRealizados || 0) < (sesion.intentosMaximos || 3)">

              <!-- Datos del Participante -->
              <div class="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div class="min-w-0">
                  <h3 class="text-base font-black text-slate-900 leading-tight truncate">
                    {{ sesion.menorNombre }}
                  </h3>
                  <p class="text-xs text-slate-500 mt-0.5 truncate">
                    Acudiente: <strong class="text-slate-700">{{ sesion.acudienteNombre }}</strong>
                  </p>
                </div>

                <div class="text-right shrink-0">
                  <span class="text-[10px] font-mono text-slate-400 block">{{ sesion.codigoBoleta }}</span>
                  @if ((sesion.intentosRealizados || 0) >= (sesion.intentosMaximos || 3)) {
                    <span class="inline-block mt-0.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300">
                      Rondas Agotadas
                    </span>
                  } @else {
                    <span class="inline-block mt-0.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                      En Competencia
                    </span>
                  }
                </div>
              </div>

              <!-- Contador Dinámico de Intentos / Caídas (HU-33.06) -->
              <div>
                <span class="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                  Caídas / Intentos Realizados:
                </span>
                <div
                  class="grid gap-2"
                  [ngClass]="obtenerListaIntentos(sesion).length === 4 ? 'grid-cols-4' : 'grid-cols-3'">
                  @for (intento of obtenerListaIntentos(sesion); track intento) {
                    <div
                      [attr.data-testid]="'badge-intento-' + sesion.idSesion + '-' + intento"
                      class="py-2 px-1.5 text-center rounded-lg border text-xs font-black transition-[background-color,border-color,color] duration-150 ease-out flex flex-col items-center justify-center gap-0.5"
                      [ngClass]="(sesion.intentosRealizados || 0) >= intento
                        ? 'bg-purple-900 border-purple-900 text-white shadow-xs'
                        : ((sesion.intentosRealizados || 0) + 1 === intento
                          ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-400/50'
                          : 'bg-slate-50 border-slate-200 text-slate-400')">
                      <span class="text-[9px] uppercase tracking-tighter">Caída</span>
                      <span class="text-sm font-mono tabular-nums leading-none">
                        {{ intento }} de {{ sesion.intentosMaximos || 3 }}
                      </span>
                    </div>
                  }
                </div>
              </div>

              <!-- Cronómetro Secundario Progresivo (Stopwatch) y Tiempo Récord (HU-33.08) -->
              <div class="bg-slate-900 text-white rounded-lg p-3 flex items-center justify-between">
                <div>
                  <span class="text-[10px] uppercase font-bold text-purple-300 block">Tiempo Ronda Actual</span>
                  <div
                    [attr.data-testid]="'stopwatch-ronda-' + sesion.idSesion"
                    class="text-2xl font-black font-mono tabular-nums tracking-tight text-white mt-0.5">
                    {{ formatearMmSs(obtenerSegundosRonda(sesion)) }}
                  </div>
                </div>

                <div class="text-right border-l border-slate-800 pl-4">
                  <span class="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1 justify-end">
                    <svg class="w-3.5 h-3.5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 21h8m-4-4v4m-5-9a5 5 0 0010 0V5H7v7zm-3-5h3v4a3 3 0 01-3-3V7zm16 0h-3v4a3 3 0 003-3V7z" />
                    </svg>
                    <span>Récord</span>
                  </span>
                  <span class="text-sm font-black font-mono tabular-nums text-amber-300">
                    {{ formatearMmSs(sesion.recordSegundosRonda || 0) }}
                  </span>
                </div>
              </div>

              <!-- Acciones Táctiles: Registrar Caída y Confirmar Salida (HU-33.07 / HU-32.06) -->
              <div class="grid grid-cols-2 gap-2">
                @if ((sesion.intentosRealizados || 0) < (sesion.intentosMaximos || 3)) {
                  <button
                    type="button"
                    [attr.data-testid]="'btn-registrar-caida-' + sesion.idSesion"
                    (click)="registrarCaida(sesion)"
                    class="min-h-[48px] ps-3.5 pe-4 bg-purple-600 hover:bg-purple-700 transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] text-white font-extrabold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer">
                    <svg class="w-4 h-4 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <span>Registrar Caída</span>
                  </button>
                }

                <button
                  type="button"
                  [attr.data-testid]="'btn-salida-toro-' + sesion.idSesion"
                  (click)="confirmarSalida(sesion)"
                  class="min-h-[48px] ps-3.5 pe-4 bg-slate-900 hover:bg-red-700 transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  [class.col-span-2]="(sesion.intentosRealizados || 0) >= (sesion.intentosMaximos || 3)">
                  <svg class="w-4 h-4 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Confirmar Salida</span>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class ModoEventoComponent implements OnInit, OnDestroy {
  operacionService = inject(OperacionService);

  readonly segundosRondaPorSesion = signal<Record<string, number>>({});
  private timerStopwatch: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.iniciarStopwatch();
  }

  ngOnDestroy(): void {
    this.detenerStopwatch();
  }

  obtenerListaIntentos(sesion: SesionJuegoMenor): number[] {
    const max = Math.max(1, sesion.intentosMaximos || 3);
    return Array.from({ length: max }, (_, idx) => idx + 1);
  }

  obtenerSegundosRonda(sesion: SesionJuegoMenor): number {
    return this.segundosRondaPorSesion()[sesion.idSesion] ?? sesion.segundosRondaActual ?? 0;
  }

  private iniciarStopwatch(): void {
    this.timerStopwatch = setInterval(() => {
      const cola = this.operacionService.colaActiva();
      if (cola.length > 0 && !this.operacionService.paradaEmergenciaActiva()) {
        this.segundosRondaPorSesion.update(mapa => {
          const nuevo = { ...mapa };
          for (const s of cola) {
            if (!s.enPausa && (s.intentosRealizados || 0) < (s.intentosMaximos || 3)) {
              nuevo[s.idSesion] = (nuevo[s.idSesion] ?? s.segundosRondaActual ?? 0) + 1;
            }
          }
          return nuevo;
        });
      }
    }, 1000);
  }

  private detenerStopwatch(): void {
    if (this.timerStopwatch) {
      clearInterval(this.timerStopwatch);
      this.timerStopwatch = null;
    }
  }

  registrarCaida(sesion: SesionJuegoMenor): void {
    const tiempo = this.obtenerSegundosRonda(sesion);
    this.operacionService.registrarCaidaModoEvento(sesion.idSesion, tiempo);
    this.segundosRondaPorSesion.update(mapa => ({ ...mapa, [sesion.idSesion]: 0 }));
  }

  confirmarSalida(sesion: SesionJuegoMenor): void {
    this.operacionService.confirmarSalidaMenor(sesion.idSesion);
  }

  formatearMmSs(segundos: number): string {
    return formatearMmSs(segundos);
  }
}
