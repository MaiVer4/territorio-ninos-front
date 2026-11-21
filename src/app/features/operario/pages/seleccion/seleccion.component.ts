import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { OperacionService } from '../../../../core/services/operacion.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { OfflineQueueService } from '../../../../core/services/offline-queue.service';
import { SeleccionAtraccionComponent } from '../../components/seleccion-atraccion/seleccion-atraccion.component';
import { ScannerQrComponent } from '../../components/scanner-qr/scanner-qr.component';
import { ResultadoValidacionComponent } from '../../components/resultado-validacion/resultado-validacion.component';
import { ColaUsuariosComponent } from '../../components/cola-usuarios/cola-usuarios.component';
import { ModoEventoComponent } from '../../components/modo-evento/modo-evento.component';

@Component({
  selector: 'app-operario-seleccion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    SeleccionAtraccionComponent,
    ScannerQrComponent,
    ResultadoValidacionComponent,
    ColaUsuariosComponent,
    ModoEventoComponent
  ],
  template: `
    <div class="min-h-screen bg-slate-100 font-sans flex flex-col relative selection:bg-emerald-500 selection:text-white">
      <!-- Banner Discreto de Modo Sin Conexión / Reconectando (HU-35.04 / Notion: CA-03) -->
      @if (wsService.estadoConexion() !== 'CONECTADO') {
        <div
          data-testid="banner-modo-offline"
          class="bg-amber-600 text-white text-xs font-bold px-3 py-1.5 text-center flex items-center justify-center gap-2 shadow-inner z-40">
          <span class="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            <span class="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span>
            {{ wsService.estadoConexion() === 'RECONECTANDO' ? 'Modo sin conexión - Reconectando con el servidor...' : 'Sin conexión a la red del parque. Operando en memoria local.' }}
          </span>
          @if (offlineQueue.totalPendientes() > 0) {
            <span class="bg-amber-900/80 text-[10px] px-2 py-0.5 rounded-full font-mono tabular-nums">
              {{ offlineQueue.totalPendientes() }} pendiente(s)
            </span>
          }
        </div>
      }

      <!-- Cabecera y Selección / Confirmación de Estación de Trabajo (HU-24.07, HU-24.08, HU-34.04) -->
      <app-seleccion-atraccion
        [operarioIniciales]="authService.currentUserInitials()"
        [rolEtiqueta]="authService.currentUser()?.rol === 'COORDINADOR' ? 'Coordinador' : 'Operario'"
        [esCoordinador]="authService.currentUser()?.rol === 'COORDINADOR'"
        (cerrarSesionSolicitado)="logout()">
      </app-seleccion-atraccion>

      <!-- Consola Operativa en Campo (Una vez confirmada la estación) -->
      @if (operacionService.estacionActiva()?.confirmada) {
        <main class="flex-1 w-full max-w-6xl mx-auto px-3 pt-3 pb-24 md:px-5 md:pt-5 md:pb-16 space-y-3 md:space-y-4">
          <!-- Alerta de Parada de Emergencia General Activa (HU-29.08) -->
          @if (operacionService.paradaEmergenciaActiva()) {
            <div
              data-testid="alerta-parada-emergencia"
              class="bg-red-600 text-white p-3 rounded-[20px] shadow-md flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-10 h-10 rounded-lg bg-white text-red-600 flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <h2 class="text-xs sm:text-sm font-black uppercase tracking-wider leading-tight">
                    Parada de Emergencia Activa
                  </h2>
                  <p class="text-[11px] text-red-100 leading-snug">
                    Sesiones congeladas y escáner bloqueado.
                  </p>
                </div>
              </div>
              <button
                type="button"
                (click)="operacionService.reanudarParadaEmergencia()"
                class="min-h-[40px] px-3.5 bg-white hover:bg-slate-100 text-red-700 font-black text-xs rounded-lg shadow-xs transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer shrink-0">
                Reanudar
              </button>
            </div>
          }

          <!-- Strip Sticky de Urgencias Móvil (Visible en Escáner cuando hay menores por vencer o vencidos) -->
          @if (vistaMovilActiva() === 'ESCANER' && totalUrgentes() > 0 && primeraUrgente(); as urgente) {
            <button
              type="button"
              data-testid="strip-alerta-urgente"
              (click)="vistaMovilActiva.set('COLA')"
              class="md:hidden w-full rounded-[16px] px-3.5 py-2.5 flex items-center justify-between gap-2 text-left transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer shadow-sm"
              [ngClass]="sesionesAgotadas().length > 0
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-amber-400 hover:bg-amber-500 text-slate-950'">
              <div class="flex items-center gap-2 min-w-0">
                <svg class="w-4 h-4 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-xs font-extrabold truncate">
                  @if (sesionesAgotadas().length > 0) {
                    {{ sesionesAgotadas().length }} tiempo agotado · {{ urgente.menorNombre }}
                  } @else {
                    {{ sesionesPorExpirar().length }} por finalizar · {{ urgente.menorNombre }}
                  }
                </span>
              </div>
              <span class="text-[11px] font-black uppercase tracking-wide shrink-0 whitespace-nowrap">
                Ver cola →
              </span>
            </button>
          }

          <!-- Layout Responsivo: Tabs en Móvil (<md) / Split 2 Columnas en Tablet-Desktop (md+) -->
          <div class="md:grid md:grid-cols-[minmax(320px,380px)_1fr] md:gap-6 md:items-start">
            <!-- Panel Escáner (Mantiene video vivo en el DOM al cambiar de pestaña en móvil) -->
            <section
              aria-label="Escáner QR de boletas"
              class="md:sticky md:top-20"
              [ngClass]="vistaMovilActiva() === 'ESCANER' ? 'block' : 'hidden md:block'">
              <app-scanner-qr></app-scanner-qr>
            </section>

            <!-- Panel Cola Activa / Modo Evento (Mantiene cronómetros vivos en el DOM) -->
            <section
              aria-label="Control de participantes en juego"
              [ngClass]="vistaMovilActiva() === 'COLA' ? 'block' : 'hidden md:block'">
              @if (operacionService.estacionActiva()?.tipoAtraccion === 'EVENTOS_CAIDAS') {
                <app-modo-evento></app-modo-evento>
              } @else {
                <app-cola-usuarios></app-cola-usuarios>
              }
            </section>
          </div>
        </main>

        <!-- Barra de Navegación Inferior Nativa (Solo Móvil < md, Zona del Pulgar) -->
        <nav
          data-testid="nav-inferior-operario"
          aria-label="Navegación operativa móvil"
          role="tablist"
          class="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div class="grid grid-cols-2 h-16 max-w-md mx-auto">
            <!-- Tab 1: Escanear -->
            <button
              type="button"
              role="tab"
              data-testid="tab-movil-escanear"
              [attr.aria-selected]="vistaMovilActiva() === 'ESCANER'"
              (click)="vistaMovilActiva.set('ESCANER')"
              class="flex flex-col items-center justify-center gap-1 text-xs transition-colors duration-150 ease-out cursor-pointer"
              [ngClass]="vistaMovilActiva() === 'ESCANER' ? 'text-emerald-700 font-extrabold' : 'text-slate-500 font-semibold'">
              <span
                class="px-4 py-1 rounded-full transition-colors duration-150 ease-out flex items-center justify-center"
                [ngClass]="vistaMovilActiva() === 'ESCANER' ? 'bg-emerald-100 text-emerald-700' : 'bg-transparent'">
                @if (vistaMovilActiva() === 'ESCANER') {
                  <!-- Icono Escáner Relleno (Estado Activo) -->
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M4 4h6v6H4V4zm2 2v2h2V6H6zm8-2h6v6h-6V4zm2 2v2h2V6h-2zM4 14h6v6H4v-6zm2 2v2h2v-2H6zm8-2h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm2-2h2v2h-2v-2zm2 2h2v2h-2v-2z" />
                  </svg>
                } @else {
                  <!-- Icono Escáner Outline (Estado Inactivo) -->
                  <svg class="w-5 h-5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 7h3v3H7V7zm7 0h3v3h-3V7zm-7 7h3v3H7v-3zm7 3h3m-3-3h3" />
                  </svg>
                }
              </span>
              <span class="leading-none">Escanear</span>
            </button>

            <!-- Tab 2: En Juego / En Pista -->
            <button
              type="button"
              role="tab"
              data-testid="tab-movil-cola"
              [attr.aria-selected]="vistaMovilActiva() === 'COLA'"
              (click)="vistaMovilActiva.set('COLA')"
              class="flex flex-col items-center justify-center gap-1 text-xs transition-colors duration-150 ease-out cursor-pointer"
              [ngClass]="vistaMovilActiva() === 'COLA' ? 'text-emerald-700 font-extrabold' : 'text-slate-500 font-semibold'">
              <span
                class="relative px-4 py-1 rounded-full transition-colors duration-150 ease-out flex items-center justify-center"
                [ngClass]="vistaMovilActiva() === 'COLA' ? 'bg-emerald-100 text-emerald-700' : 'bg-transparent'">
                @if (vistaMovilActiva() === 'COLA') {
                  <!-- Icono Reloj/Cola Relleno (Estado Activo) -->
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clip-rule="evenodd" />
                  </svg>
                } @else {
                  <!-- Icono Reloj/Cola Outline (Estado Inactivo) -->
                  <svg class="w-5 h-5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                <span
                  data-testid="badge-tab-cola"
                  class="absolute -top-1 -right-0.5 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black font-mono tabular-nums flex items-center justify-center border border-white"
                  [ngClass]="{
                    'bg-red-600 text-white': sesionesAgotadas().length > 0,
                    'bg-amber-500 text-slate-950': sesionesAgotadas().length === 0 && sesionesPorExpirar().length > 0,
                    'bg-emerald-600 text-white': sesionesAgotadas().length === 0 && sesionesPorExpirar().length === 0 && operacionService.ocupacionActual() > 0,
                    'bg-slate-200 text-slate-700': operacionService.ocupacionActual() === 0
                  }">
                  {{ operacionService.ocupacionActual() }}
                </span>
              </span>
              <span class="leading-none">
                {{ operacionService.estacionActiva()?.tipoAtraccion === 'EVENTOS_CAIDAS' ? 'En Pista' : 'En Juego' }}
              </span>
            </button>
          </div>
        </nav>
      }

      <!-- Modal / Bottom Sheet de Alto Contraste para Resultado de Validación QR (HU-26 / RNF3) -->
      <app-resultado-validacion></app-resultado-validacion>

      <!-- Barra de Estado Solo Escritorio/Tablet (md+) -->
      <footer class="hidden md:flex fixed bottom-0 inset-x-0 h-11 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-20 px-5 items-center justify-between shadow-xs">
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <span
            class="w-2 h-2 rounded-full"
            [ngClass]="wsService.estadoConexion() === 'CONECTADO' ? 'bg-emerald-500' : 'bg-amber-500'"></span>
          <span class="font-medium">Consola de Campo • Territorio de Niños</span>
        </div>

        <div class="flex items-center gap-3">
          @if (authService.currentUser()?.rol === 'COORDINADOR') {
            <a
              routerLink="/coordinador"
              data-testid="link-volver-coordinador"
              class="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors duration-150 ease-out">
              ← Panel Coordinador
            </a>
          }
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center border border-emerald-300">
              {{ authService.currentUserInitials() }}
            </div>
            <span class="text-xs font-bold text-slate-800">{{ authService.currentUserName() }}</span>
            <span
              class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              [ngClass]="authService.currentUser()?.rol === 'COORDINADOR' ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'">
              {{ authService.currentUser()?.rol === 'COORDINADOR' ? 'Coordinador' : 'Operario' }}
            </span>
          </div>

          <div class="h-4 w-px bg-slate-200"></div>

          <button
            type="button"
            (click)="logout()"
            class="hover:bg-red-50 hover:text-red-600 text-xs text-slate-600 font-semibold ps-2.5 pe-3 py-1 rounded-lg transition-[transform,background-color,color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </footer>
    </div>
  `
})
export class OperarioSeleccionComponent implements OnInit {
  authService = inject(AuthService);
  operacionService = inject(OperacionService);
  wsService = inject(WebSocketService);
  offlineQueue = inject(OfflineQueueService);
  private readonly destroyRef = inject(DestroyRef);

  readonly vistaMovilActiva = signal<'ESCANER' | 'COLA'>('ESCANER');

  readonly sesionesAgotadas = computed(() =>
    this.operacionService
      .colaOrdenadaPorUrgencia()
      .filter(s => !s.saliendo && !s.enPausa && s.segundosRestantes <= 0)
  );

  readonly sesionesPorExpirar = computed(() =>
    this.operacionService
      .colaOrdenadaPorUrgencia()
      .filter(s => !s.saliendo && !s.enPausa && s.segundosRestantes > 0 && s.segundosRestantes <= 120)
  );

  readonly totalUrgentes = computed(() => this.sesionesAgotadas().length + this.sesionesPorExpirar().length);

  readonly primeraUrgente = computed(() => this.sesionesAgotadas()[0] ?? this.sesionesPorExpirar()[0] ?? null);

  ngOnInit(): void {
    this.operacionService
      .consultarEstacionAsignada()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  logout(): void {
    const confirmada = this.operacionService.estacionActiva()?.confirmada;
    if (confirmada && typeof this.operacionService.desvincularEstacionActiva === 'function') {
      this.operacionService
        .desvincularEstacionActiva()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.operacionService.limpiarEstacionLocal?.();
            this.authService.logout();
          },
          error: () => {
            this.operacionService.limpiarEstacionLocal?.();
            this.authService.logout();
          }
        });
      return;
    }
    this.operacionService.limpiarEstacionLocal?.();
    this.authService.logout();
  }
}
