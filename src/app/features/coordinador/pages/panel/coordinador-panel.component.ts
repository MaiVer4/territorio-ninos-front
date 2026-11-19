import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Atraccion } from '../../../../core/models/atraccion.model';
import { EstadoAtraccion } from '../../../../core/models/enums';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { ReportesAtraccionPanelComponent } from '../../components/reportes-atraccion-panel/reportes-atraccion-panel.component';

@Component({
  selector: 'app-coordinador-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, ReportesAtraccionPanelComponent],
  template: `
    <div class="min-h-screen bg-slate-100 font-sans flex flex-col">
      <!-- Barra Superior -->
      <header class="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-sm">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-xs">
              CO
            </div>
            <div>
              <h1 class="text-sm sm:text-base font-extrabold leading-tight">Panel de Coordinación</h1>
              <p class="text-[11px] text-slate-400">Gestión de estado de atracciones, reportes y apoyo operativo</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <a
              routerLink="/operario/seleccion"
              data-testid="btn-modo-operario"
              class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-xs">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>Operar / Escáner QR</span>
            </a>

            <div class="hidden sm:flex items-center gap-2 border-l border-slate-700 pl-3">
              <div class="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-400/40">
                {{ authService.currentUserInitials() }}
              </div>
              <span class="text-xs font-semibold text-slate-200">{{ authService.currentUserName() }}</span>
            </div>

            <button
              type="button"
              (click)="authService.logout()"
              class="px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer">
              Salir
            </button>
          </div>
        </div>
      </header>

      <!-- Pestañas -->
      <div class="bg-white border-b border-slate-200">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-2 pt-3">
          <button
            type="button"
            data-testid="tab-atracciones"
            (click)="tabActiva.set('ATRACCIONES')"
            class="px-4 py-2.5 text-xs font-extrabold border-b-2 transition cursor-pointer"
            [ngClass]="tabActiva() === 'ATRACCIONES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'">
            Atracciones ({{ atracciones().length }})
          </button>
          <button
            type="button"
            data-testid="tab-reportes"
            (click)="tabActiva.set('REPORTES')"
            class="px-4 py-2.5 text-xs font-extrabold border-b-2 transition cursor-pointer"
            [ngClass]="tabActiva() === 'REPORTES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'">
            Reportes de Daños y Suplementos
          </button>
        </div>
      </div>

      <!-- Contenido Principal -->
      <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        @if (tabActiva() === 'ATRACCIONES') {
          <!-- KPIs rápidos -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div class="bg-white rounded-2xl border border-slate-200/80 p-4">
              <p class="text-[11px] font-bold text-slate-400 uppercase">Activas</p>
              <p class="text-2xl font-black text-emerald-600 mt-1">{{ totalActivas() }}</p>
            </div>
            <div class="bg-white rounded-2xl border border-slate-200/80 p-4">
              <p class="text-[11px] font-bold text-slate-400 uppercase">Fuera de servicio</p>
              <p class="text-2xl font-black text-rose-600 mt-1">{{ totalFueraDeServicio() }}</p>
            </div>
            <div class="bg-white rounded-2xl border border-slate-200/80 p-4 col-span-2 sm:col-span-1">
              <p class="text-[11px] font-bold text-slate-400 uppercase">Niños jugando ahora</p>
              <p class="text-2xl font-black text-blue-600 mt-1">{{ totalOcupacion() }}</p>
            </div>
          </div>

          @if (cargando()) {
            <div class="text-center py-12 text-xs text-slate-400">Cargando atracciones...</div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (a of atracciones(); track a.id) {
                @let activa = a.estado === 'ACTIVO';
                @let ocupados = a.ocupacionActiva ?? a.ocupacionActual ?? a.ninosActivos ?? 0;
                @let cap = a.capacidadMaxima || 1;

                <div
                  [attr.data-testid]="'coord-atraccion-' + a.id"
                  class="bg-white rounded-2xl border p-4 shadow-2xs flex flex-col justify-between gap-4 transition"
                  [ngClass]="activa ? 'border-slate-200/80' : 'border-rose-200 bg-rose-50/30'">
                  <div class="space-y-2">
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <h3 class="text-sm font-extrabold text-slate-800">{{ a.nombre }}</h3>
                        <p class="text-[11px] text-slate-500">{{ a.tipo === 'EVENTOS_CAIDAS' ? 'Por Caídas' : 'Por Tiempo' }}</p>
                      </div>
                      <span
                        class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0"
                        [ngClass]="activa
                          ? 'bg-emerald-100 text-emerald-800'
                          : (a.estado === 'FUERA_DE_SERVICIO' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700')">
                        {{ activa ? 'Activa' : (a.estado === 'FUERA_DE_SERVICIO' ? 'Fuera de servicio' : a.estado) }}
                      </span>
                    </div>

                    <div class="flex items-center justify-between text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
                      <span>Ocupación actual</span>
                      <strong class="font-mono text-slate-800">{{ ocupados }} / {{ cap }}</strong>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      [attr.data-testid]="'btn-toggle-estado-' + a.id"
                      [disabled]="cambiandoId() === a.id"
                      (click)="toggleEstadoAtraccion(a)"
                      class="flex-1 px-3 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer disabled:opacity-50"
                      [ngClass]="activa
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'">
                      {{ activa ? 'Poner Fuera de Servicio' : 'Activar Atracción' }}
                    </button>

                    <button
                      type="button"
                      [attr.data-testid]="'btn-reportar-' + a.id"
                      (click)="abrirReportePara(a)"
                      title="Reportar daño o falta de suplementos"
                      class="px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition cursor-pointer">
                      Reportar
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        } @else {
          <app-reportes-atraccion-panel
            [atracciones]="atracciones()"
            [atraccionPreseleccionadaId]="atraccionParaReporte()"
            (atraccionEstadoModificado)="cargarAtracciones()">
          </app-reportes-atraccion-panel>
        }
      </main>
    </div>
  `
})
export class CoordinadorPanelComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly atraccionService = inject(AtraccionService);
  private readonly notificationService = inject(NotificationService);
  private readonly wsService = inject(WebSocketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tabActiva = signal<'ATRACCIONES' | 'REPORTES'>('ATRACCIONES');
  readonly atracciones = signal<Atraccion[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly cambiandoId = signal<number | string | null>(null);
  readonly atraccionParaReporte = signal<number | null>(null);

  readonly totalActivas = computed(() => this.atracciones().filter(a => a.estado === 'ACTIVO').length);
  readonly totalFueraDeServicio = computed(() => this.atracciones().filter(a => a.estado === 'FUERA_DE_SERVICIO').length);
  readonly totalOcupacion = computed(() =>
    this.atracciones().reduce((acc, a) => acc + (a.ocupacionActiva ?? a.ocupacionActual ?? a.ninosActivos ?? 0), 0)
  );

  ngOnInit(): void {
    this.cargarAtracciones();
    this.iniciarTelemetria();
  }

  cargarAtracciones(): void {
    this.cargando.set(true);
    this.atraccionService.getAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false))
      )
      .subscribe({
        next: lista => this.atracciones.set(lista || []),
        error: () => this.notificationService.error('Error al cargar el listado de atracciones.')
      });
  }

  toggleEstadoAtraccion(atraccion: Atraccion): void {
    if (!atraccion.id) return;
    const nuevoEstado: EstadoAtraccion = atraccion.estado === 'ACTIVO' ? 'FUERA_DE_SERVICIO' : 'ACTIVO';
    this.cambiandoId.set(atraccion.id);

    this.atraccionService.cambiarEstado(atraccion.id, nuevoEstado)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cambiandoId.set(null))
      )
      .subscribe({
        next: actualizada => {
          this.atracciones.update(lista =>
            lista.map(a => a.id === atraccion.id ? { ...a, estado: actualizada.estado } : a)
          );
          if (nuevoEstado === 'FUERA_DE_SERVICIO') {
            this.notificationService.warn(`"${atraccion.nombre}" marcada Fuera de servicio. Ventas bloqueadas en taquilla.`);
          } else {
            this.notificationService.success(`"${atraccion.nombre}" reactivada y disponible en taquilla.`);
          }
        },
        error: () => this.notificationService.error(`No se pudo cambiar el estado de "${atraccion.nombre}".`)
      });
  }

  abrirReportePara(atraccion: Atraccion): void {
    this.atraccionParaReporte.set(atraccion.id ? Number(atraccion.id) : null);
    this.tabActiva.set('REPORTES');
  }

  private iniciarTelemetria(): void {
    const stream$ = this.wsService?.conectarDashboardAdmin?.();
    if (!stream$) return;
    stream$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      this.atracciones.update(lista =>
        lista.map(a => {
          if (String(a.id) !== String(event.atraccionId)) return a;
          if (event.tipo === 'ESTADO_ATRACCION_CAMBIADO' && event.estadoAtraccion) {
            return { ...a, estado: event.estadoAtraccion as EstadoAtraccion };
          }
          return {
            ...a,
            ocupacionActiva: event.ninosActivos ?? a.ocupacionActiva,
            ocupacionActual: event.ninosActivos ?? a.ocupacionActual,
            ninosActivos: event.ninosActivos ?? a.ninosActivos
          };
        })
      );
    });
  }
}
