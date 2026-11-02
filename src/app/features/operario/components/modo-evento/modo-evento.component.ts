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

@Component({
  selector: 'app-modo-evento',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="w-full max-w-4xl mx-auto space-y-4">
      <!-- Encabezado de Modo Evento / Toro Mecánico (HU-33.05) -->
      <div class="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-4 sm:p-5 shadow-md flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-purple-700/80 border border-purple-400 flex items-center justify-center font-black text-xl shadow-inner">
            🐂
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-extrabold leading-tight">Modo Evento • Toro Mecánico</h2>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40">
                Control de Caídas
              </span>
            </div>
            <p class="text-xs text-purple-200 mt-0.5">Control de caídas por ronda y cronometraje de tiempo récord</p>
          </div>
        </div>

        <div class="text-right">
          <span class="text-[10px] uppercase font-bold text-purple-300 block">En Pista</span>
          <span class="text-lg font-black font-mono leading-none">{{ operacionService.ocupacionActual() }} activos</span>
        </div>
      </div>

      <!-- Listado de Menores en Ronda de Toro Mecánico -->
      @if (operacionService.colaActiva().length === 0) {
        <div class="bg-white border-2 border-dashed border-purple-200 rounded-3xl p-8 text-center text-slate-400 my-4">
          <div class="text-4xl mb-2">🤠</div>
          <p class="text-xs font-bold text-slate-700">Sin participantes en la pista del Toro</p>
          <p class="text-[11px] text-slate-400 mt-1">Escanea el código QR del participante para iniciar la primera caída.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (sesion of operacionService.colaActiva(); track sesion.idSesion) {
            <div
              [attr.data-testid]="'tarjeta-toro-' + sesion.idSesion"
              class="bg-white border-2 border-purple-200 rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden"
              [class.border-red-400]="(sesion.intentosRealizados || 0) >= (sesion.intentosMaximos || 3)">
              
              <!-- Datos del Participante -->
              <div class="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 class="text-base font-black text-slate-900 leading-tight">
                    {{ sesion.menorNombre }}
                  </h3>
                  <p class="text-xs text-slate-500 mt-0.5">
                    Acudiente: <strong class="text-slate-700">{{ sesion.acudienteNombre }}</strong>
                  </p>
                </div>

                <div class="text-right">
                  <span class="text-[10px] font-mono text-slate-400 block">{{ sesion.codigoBoleta }}</span>
                  @if ((sesion.intentosRealizados || 0) >= (sesion.intentosMaximos || 3)) {
                    <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300">
                      Rondas Agotadas
                    </span>
                  } @else {
                    <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-300">
                      En Competencia
                    </span>
                  }
                </div>
              </div>

              <!-- Contador Visual de Intentos / Caídas con Badges Gráficos (HU-33.06) -->
              <div>
                <span class="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block mb-2">
                  Caídas / Intentos Realizados:
                </span>
                <div class="grid grid-cols-3 gap-2">
                  @for (intento of [1, 2, 3]; track intento) {
                    <div
                      [attr.data-testid]="'badge-intento-' + sesion.idSesion + '-' + intento"
                      class="py-2 px-1 text-center rounded-xl border text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5"
                      [ngClass]="(sesion.intentosRealizados || 0) >= intento
                        ? 'bg-purple-900 border-purple-900 text-white shadow-xs'
                        : ((sesion.intentosRealizados || 0) + 1 === intento
                          ? 'bg-purple-50 border-purple-400 text-purple-900 ring-2 ring-purple-400 animate-pulse'
                          : 'bg-slate-50 border-slate-200 text-slate-400')">
                      <span class="text-[9px] uppercase tracking-tighter">Caída</span>
                      <span class="text-sm font-mono leading-none">{{ intento }} de 3</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Cronómetro Secundario Progresivo (Stopwatch) y Tiempo Récord (HU-33.08) -->
              <div class="bg-slate-900 text-white rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span class="text-[10px] uppercase font-bold text-purple-300 block">Tiempo Ronda Actual</span>
                  <div
                    [attr.data-testid]="'stopwatch-ronda-' + sesion.idSesion"
                    class="text-2xl font-black font-mono tracking-tight text-white mt-0.5">
                    {{ formatearMmSs(obtenerSegundosRonda(sesion)) }}
                  </div>
                </div>

                <div class="text-right border-l border-slate-800 pl-4">
                  <span class="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1 justify-end">
                    <span>🏆</span>
                    <span>Récord</span>
                  </span>
                  <span class="text-sm font-black font-mono text-amber-300">
                    {{ formatearMmSs(sesion.recordSegundosRonda || 0) }}
                  </span>
                </div>
              </div>

              <!-- Acciones Táctiles: Registrar Caída y Confirmar Salida (HU-33.07 / HU-32.06) -->
              <div class="grid grid-cols-2 gap-2 pt-1">
                @if ((sesion.intentosRealizados || 0) < (sesion.intentosMaximos || 3)) {
                  <!-- Botón Prominente "Registrar Caída / Consumir Intento" (HU-33.07) -->
                  <button
                    type="button"
                    [attr.data-testid]="'btn-registrar-caida-' + sesion.idSesion"
                    (click)="registrarCaida(sesion)"
                    class="py-3 px-3 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <span>Registrar Caída</span>
                  </button>
                }

                <!-- Botón de Salida -->
                <button
                  type="button"
                  [attr.data-testid]="'btn-salida-toro-' + sesion.idSesion"
                  (click)="confirmarSalida(sesion)"
                  class="py-3 px-3 bg-slate-900 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  [class.col-span-2]="(sesion.intentosRealizados || 0) >= (sesion.intentosMaximos || 3)">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
    const m = Math.floor(Math.max(0, segundos) / 60);
    const s = Math.max(0, segundos) % 60;
    const mm = m < 10 ? `0${m}` : `${m}`;
    const ss = s < 10 ? `0${s}` : `${s}`;
    return `${mm}:${ss}`;
  }
}
