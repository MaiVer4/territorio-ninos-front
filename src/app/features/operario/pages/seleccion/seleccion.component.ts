import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    SeleccionAtraccionComponent,
    ScannerQrComponent,
    ResultadoValidacionComponent,
    ColaUsuariosComponent,
    ModoEventoComponent
  ],
  template: `
    <div class="min-h-screen bg-slate-100 font-sans flex flex-col pb-20 relative selection:bg-emerald-500 selection:text-white">
      <!-- Banner Discreto de Modo Sin Conexión / Reconectando (HU-35.04 / Notion: CA-03) -->
      @if (wsService.estadoConexion() !== 'CONECTADO') {
        <div
          data-testid="banner-modo-offline"
          class="bg-amber-600 text-white text-xs font-bold px-4 py-1.5 text-center flex items-center justify-center gap-2 shadow-inner z-50">
          <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
          <span>
            {{ wsService.estadoConexion() === 'RECONECTANDO' ? 'Modo sin conexión - Reconectando con el servidor...' : 'Sin conexión a la red del parque. Operando en memoria local.' }}
          </span>
          @if (offlineQueue.totalPendientes() > 0) {
            <span class="bg-amber-800 text-[10px] px-2 py-0.5 rounded-full ml-1 font-mono">
              {{ offlineQueue.totalPendientes() }} pendiente(s)
            </span>
          }
        </div>
      }

      <!-- Cabecera y Selección / Confirmación de Estación de Trabajo (HU-24.07, HU-24.08, HU-34.04) -->
      <app-seleccion-atraccion></app-seleccion-atraccion>

      <!-- Panel de Control Operativo en Campo (Una vez confirmada la estación) -->
      @if (operacionService.estacionActiva()?.confirmada) {
        <main class="flex-1 p-3 sm:p-5 max-w-4xl mx-auto w-full space-y-6">
          <!-- Alerta de Parada de Emergencia General Activa (HU-29.08) -->
          @if (operacionService.paradaEmergenciaActiva()) {
            <div
              data-testid="alerta-parada-emergencia"
              class="bg-red-600 text-white p-4 rounded-3xl shadow-lg flex items-center justify-between gap-3 animate-pulse">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-white text-red-600 flex items-center justify-center font-black text-xl">
                  ⚠️
                </div>
                <div>
                  <h3 class="text-sm font-black uppercase tracking-wider">Parada de Emergencia Activa</h3>
                  <p class="text-xs text-red-100">Todas las sesiones están congeladas y el escáner se encuentra bloqueado.</p>
                </div>
              </div>
              <button
                type="button"
                (click)="operacionService.reanudarParadaEmergencia()"
                class="px-4 py-2 bg-white hover:bg-slate-100 text-red-600 font-black text-xs rounded-xl shadow-xs cursor-pointer shrink-0">
                Reanudar
              </button>
            </div>
          }

          <!-- Sección 1: Lector QR Óptico y Contingencia Manual (HU-25, HU-34) -->
          <section class="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Escáner de Boletas</span>
                </h2>
                <p class="text-[11px] text-slate-500">
                  Lectura óptica de boletos térmicos o digitación de UUID en contingencia.
                </p>
              </div>
            </div>

            <app-scanner-qr></app-scanner-qr>
          </section>

          <!-- Sección 2: Cola Activa o Modo Evento según tipo de atracción (HU-28..33) -->
          <section>
            @if (operacionService.estacionActiva()?.tipoAtraccion === 'EVENTOS_CAIDAS') {
              <!-- Modo Evento / Toro Mecánico (HU-33) -->
              <app-modo-evento></app-modo-evento>
            } @else {
              <!-- Cola de Menores en Atracción Temporizada (HU-28..32) -->
              <app-cola-usuarios></app-cola-usuarios>
            }
          </section>
        </main>
      }

      <!-- Modal de Alto Contraste para Resultado de Validación QR (HU-26 / RNF3) -->
      <app-resultado-validacion></app-resultado-validacion>

      <!-- Barra de Estado / Dock Fijo Inferior -->
      <footer class="fixed bottom-0 inset-x-0 h-12 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-20 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <span
            class="w-2 h-2 rounded-full"
            [ngClass]="wsService.estadoConexion() === 'CONECTADO' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'"></span>
          <span class="font-medium hidden sm:inline">Consola de Campo • Territorio de Niños</span>
          <span class="font-medium sm:hidden">Operador en Campo</span>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center ring-1 ring-emerald-300">
              {{ authService.currentUserInitials() }}
            </div>
            <span class="text-xs font-bold text-slate-800 hidden xs:inline">{{ authService.currentUserName() }}</span>
            <span class="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Operario
            </span>
          </div>

          <div class="h-4 w-px bg-slate-200"></div>

          <button
            type="button"
            (click)="logout()"
            class="hover:bg-red-50 hover:text-red-600 text-xs text-slate-500 font-medium px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

  ngOnInit(): void {
    if (!this.operacionService.estacionActiva()) {
      this.operacionService.consultarEstacionAsignada().subscribe();
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
