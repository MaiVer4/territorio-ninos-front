import {
  Component,
  OnInit,
  computed,
  signal,
  inject,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { exportToCsv } from '../../../../core/utils/csv-exporter';
import { AuditoriaService } from '../../../../core/services/auditoria.service';
import {
  AuditoriaTicket,
  IncidenteOperativo,
  ResumenInactividadDTO
} from '../../../../core/models/auditoria.model';
import { TicketTimelineComponent } from '../../components/ticket-timeline/ticket-timeline.component';

export type AuditSeverity = 'critical' | 'warning' | 'info';
export type AuditType =
  | 'time_exceeded'
  | 'ticket_rejected'
  | 'manual_access'
  | 'cash_discrepancy'
  | 'unauthorized_pause';

export interface AuditLog {
  id: string;
  timestamp: string;
  type: AuditType;
  attraction: string;
  operator: string;
  description: string;
  severity: AuditSeverity;
}

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, TicketTimelineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full space-y-5 font-sans">
      <!-- Encabezado y navegación por pestañas (HU-38.07, HU-41.06) -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="font-bold text-slate-800 text-lg">Centro de Auditoría, Trazabilidad e Incidentes</h2>
            <span class="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              Fases 2 y 3
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">Expedientes de tiquetes, monitoreo de tiempos muertos y bitácora forense</p>
        </div>

        <!-- Pestañas de navegación -->
        <div class="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60">
          <button
            type="button"
            data-testid="tab-expediente"
            (click)="activeTab.set('expediente')"
            [ngClass]="activeTab() === 'expediente' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'"
            class="px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer">
            Expediente de Boleta
          </button>
          <button
            type="button"
            data-testid="tab-incidentes"
            (click)="activeTab.set('incidentes')"
            [ngClass]="activeTab() === 'incidentes' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'"
            class="px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer">
            Incidentes y Pausas
          </button>
          <button
            type="button"
            data-testid="tab-logs"
            (click)="activeTab.set('logs')"
            [ngClass]="activeTab() === 'logs' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'"
            class="px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer">
            Bitácora de Logs
          </button>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- PESTAÑA 1: EXPEDIENTE DE BOLETA (HU-38.07..10) -->
      <!-- ========================================== -->
      @if (activeTab() === 'expediente') {
        <div class="space-y-4">
          <!-- Barra de Búsqueda de Expediente con Validación de Formato (HU-38.08 / Notion: CA-01) -->
          <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-3">
            <div>
              <h3 class="text-sm font-bold text-slate-800">Localizar Expediente Técnico de Tiquete</h3>
              <p class="text-xs text-slate-400 mt-0.5">Ingresa el código UUID v4 de la boleta o el número de cédula del titular</p>
            </div>

            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div class="relative flex-1">
                <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                  type="text"
                  data-testid="input-busqueda-expediente"
                  [ngModel]="terminoBusquedaTicket()"
                  (ngModelChange)="terminoBusquedaTicket.set($event)"
                  (keyup.enter)="buscarExpediente()"
                  placeholder="Ej: 1094857291 ó c3d4e5f6-a1b2-4c3d-ae4f-345678901cde"
                  class="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition" />
              </div>

              <button
                type="button"
                data-testid="btn-buscar-expediente"
                (click)="buscarExpediente()"
                [disabled]="buscandoExpediente() || !terminoBusquedaTicket().trim()"
                class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 transition-transform duration-150 ease-out enabled:active:scale-[0.96] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                @if (buscandoExpediente()) {
                  <svg class="motion-safe:animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Buscando...</span>
                } @else {
                  <span>Consultar Expediente</span>
                }
              </button>
            </div>

            <!-- Feedback reactivo de validación de formato (HU-38.08) -->
            @if (terminoBusquedaTicket().trim().length > 0) {
              @if (!validacionBusqueda().esValido) {
                <div data-testid="error-validacion-busqueda" class="text-xs text-red-600 flex items-center gap-1.5 font-medium animate-in fade-in">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>{{ validacionBusqueda().mensajeError }}</span>
                </div>
              } @else {
                <div class="text-xs text-emerald-600 flex items-center gap-1.5 font-medium">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span>Formato reconocido: <strong>{{ validacionBusqueda().tipo === 'UUID_V4' ? 'Código UUID v4' : 'Cédula / Documento' }}</strong></span>
                </div>
              }
            }
          </div>

          <!-- Despliegue de Línea de Tiempo del Tiquete (HU-38.09, HU-38.10) -->
          @if (expedienteSeleccionado()) {
            <app-ticket-timeline [auditoria]="expedienteSeleccionado()!"></app-ticket-timeline>
          } @else {
            <div class="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-xs">
              <div class="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h4 class="text-sm font-bold text-slate-700">Sin expediente cargado</h4>
              <p class="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Ingresa un UUID o Cédula para ver la trazabilidad desde emisión en taquilla, accesos, pausas y salida.
              </p>
            </div>
          }
        </div>
      }

      <!-- ==================================================== -->
      <!-- PESTAÑA 2: INCIDENTES Y MONITOREO DE PAUSAS (HU-41.05..08) -->
      <!-- ==================================================== -->
      @if (activeTab() === 'incidentes') {
        <div class="space-y-4">
          <!-- Widgets KPI de Resumen de Inactividad (HU-41.08 / Notion: CA-04) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- KPI 1: Tiempo Total de Suspensión -->
            <div
              data-testid="kpi-tiempo-total-suspension"
              class="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs flex items-start gap-3.5">
              <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <p class="text-[11px] text-slate-400 font-medium">Suspensión Total</p>
                <p class="text-xl font-black text-slate-900 font-mono mt-0.5">
                  {{ resumenInactividad().tiempoTotalSuspensionMinutos }} min
                </p>
                <p class="text-[10px] text-slate-400 mt-0.5">En el turno actual</p>
              </div>
            </div>

            <!-- KPI 2: Pausas que Superan 5 Minutos (Umbral) -->
            <div
              data-testid="kpi-pausas-mayores-5min"
              class="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs flex items-start gap-3.5"
              [ngClass]="resumenInactividad().pausasMayoresACincoMinutos > 0 ? 'border-amber-200 ring-1 ring-amber-300/40 bg-amber-50/20' : ''">
              <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <p class="text-[11px] text-slate-400 font-medium">Pausas &gt; 5 Minutos</p>
                <p class="text-xl font-black text-amber-700 font-mono mt-0.5">
                  {{ resumenInactividad().pausasMayoresACincoMinutos }}
                </p>
                <p class="text-[10px] text-amber-600 font-medium mt-0.5">Superan umbral operativo</p>
              </div>
            </div>

            <!-- KPI 3: Promedio de Minutos por Juego -->
            <div
              data-testid="kpi-promedio-por-juego"
              class="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs flex items-start gap-3.5">
              <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <div>
                <p class="text-[11px] text-slate-400 font-medium">Promedio / Juego</p>
                <p class="text-xl font-black text-slate-900 font-mono mt-0.5">
                  {{ resumenInactividad().promedioMinutosPausadosPorJuego }} min
                </p>
                <p class="text-[10px] text-slate-400 mt-0.5">Por atracción reportada</p>
              </div>
            </div>

            <!-- KPI 4: Promedio de Minutos por Operario -->
            <div
              data-testid="kpi-promedio-por-operario"
              class="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs flex items-start gap-3.5">
              <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <div>
                <p class="text-[11px] text-slate-400 font-medium">Promedio / Operario</p>
                <p class="text-xl font-black text-slate-900 font-mono mt-0.5">
                  {{ resumenInactividad().promedioMinutosPausadosPorOperario }} min
                </p>
                <p class="text-[10px] text-slate-400 mt-0.5">Por colaborador</p>
              </div>
            </div>
          </div>

          <!-- Tabla Interactiva de Incidentes con Resaltado Ámbar > 5min (HU-41.07 / Notion: CA-02, CA-03) -->
          <div data-testid="tabla-incidentes-pausas" class="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 class="font-bold text-slate-800 text-sm">Registro de Incidentes y Pausas Operativas</h3>
                <p class="text-xs text-slate-400 mt-0.5">Las pausas que superan 5 minutos se destacan en color ámbar de forma automática</p>
              </div>
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {{ incidentes().length }} registros
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead class="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th class="px-5 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Fecha / Hora</th>
                    <th class="px-5 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Atracción / Estación</th>
                    <th class="px-5 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Operario Responsable</th>
                    <th class="px-5 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Severidad</th>
                    <th class="px-5 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Motivo Justificado</th>
                    <th class="px-5 py-3 text-right font-bold text-slate-500 uppercase tracking-wider">Duración</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (inc of incidentes(); track (inc.idIncidente || inc.id)) {
                    <tr
                      [attr.data-testid]="inc.superaUmbralCincoMinutos ? 'fila-pausa-prolongada-' + (inc.idIncidente || inc.id) : 'fila-incidente-' + (inc.idIncidente || inc.id)"
                      class="transition"
                      [ngClass]="inc.superaUmbralCincoMinutos ? 'bg-amber-50/80 hover:bg-amber-100/70 border-amber-200 text-amber-950 font-medium' : 'hover:bg-slate-50/50'">
                      
                      <td class="px-5 py-3.5 font-mono text-slate-500 whitespace-nowrap">
                        {{ inc.fechaHoraInicio || inc.timestamp }}
                      </td>

                      <td class="px-5 py-3.5 whitespace-nowrap">
                        <span class="font-bold text-slate-800 block">{{ inc.atraccionNombre || inc.atraccion }}</span>
                        <span class="text-[10px] text-slate-400">{{ inc.estacionFisica || 'Estación Principal' }}</span>
                      </td>

                      <td class="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                        {{ inc.operarioNombre || inc.operario }}
                      </td>

                      <td class="px-5 py-3.5 text-center whitespace-nowrap">
                        <span
                          class="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                          [ngClass]="inc.severidad === 'CRITICA' ? 'bg-red-100 text-red-700 border border-red-200' : inc.severidad === 'ALTA' || inc.severidad === 'GRAVE' ? 'bg-orange-100 text-orange-700 border border-orange-200' : inc.severidad === 'MEDIA' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'">
                          {{ inc.severidad }}
                        </span>
                      </td>

                      <td class="px-5 py-3.5 text-slate-600 max-w-xs truncate">
                        {{ inc.motivoJustificado || inc.motivo }}
                      </td>

                      <td class="px-5 py-3.5 text-right font-mono font-bold whitespace-nowrap">
                        @if (inc.superaUmbralCincoMinutos) {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 border border-amber-300 text-xs">
                            <svg class="w-3 h-3 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                            {{ inc.duracionMinutos }} min
                          </span>
                        } @else {
                          <span class="text-slate-700">{{ inc.duracionMinutos }} min</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================= -->
      <!-- PESTAÑA 3: BITÁCORA DE LOGS (RETENCIÓN RETROCOMPATIBLE) -->
      <!-- ======================================================= -->
      @if (activeTab() === 'logs') {
        <div class="space-y-4">
          <!-- Tarjetas de resumen interactivo por severidad -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div (click)="setFilter('critical')"
              class="bg-white border rounded-xl p-4 cursor-pointer transition shadow-xs"
              [ngClass]="activeSeverity() === 'critical' ? 'ring-2 ring-offset-1 ring-red-400 border-red-200 bg-red-50/20' : 'border-slate-100 hover:border-slate-200'">
              <div class="w-2.5 h-2.5 rounded-full mb-2 bg-red-500"></div>
              <p class="text-2xl font-bold text-slate-800">{{ countCritical() }}</p>
              <p class="text-xs text-slate-500 font-medium">Críticos</p>
            </div>

            <div (click)="setFilter('warning')"
              class="bg-white border rounded-xl p-4 cursor-pointer transition shadow-xs"
              [ngClass]="activeSeverity() === 'warning' ? 'ring-2 ring-offset-1 ring-amber-400 border-amber-200 bg-amber-50/20' : 'border-slate-100 hover:border-slate-200'">
              <div class="w-2.5 h-2.5 rounded-full mb-2 bg-amber-500"></div>
              <p class="text-2xl font-bold text-slate-800">{{ countWarning() }}</p>
              <p class="text-xs text-slate-500 font-medium">Advertencias</p>
            </div>

            <div (click)="setFilter('info')"
              class="bg-white border rounded-xl p-4 cursor-pointer transition shadow-xs"
              [ngClass]="activeSeverity() === 'info' ? 'ring-2 ring-offset-1 ring-blue-400 border-blue-200 bg-blue-50/20' : 'border-slate-100 hover:border-slate-200'">
              <div class="w-2.5 h-2.5 rounded-full mb-2 bg-blue-500"></div>
              <p class="text-2xl font-bold text-slate-800">{{ countInfo() }}</p>
              <p class="text-xs text-slate-500 font-medium">Informativos</p>
            </div>
          </div>

          <!-- Barra de filtros y exportación -->
          <div class="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <div class="flex flex-wrap items-center gap-3 flex-1">
              <div class="relative flex-1 min-w-[200px] max-w-sm">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="Buscar en los logs..."
                  class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 transition" />
              </div>
              <button (click)="activeSeverity.set('all')"
                class="px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
                [ngClass]="activeSeverity() === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 border border-slate-200 hover:bg-slate-50'">
                Todos
              </button>
              <input type="date" [ngModel]="filterDate()" (ngModelChange)="filterDate.set($event)"
                class="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 text-slate-600 bg-white" />
            </div>

            <div class="flex items-center gap-2">
              <button (click)="exportarCsv()"
                [disabled]="logs().length === 0"
                class="flex items-center gap-1.5 text-xs font-semibold text-slate-600 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition shadow-xs bg-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                CSV
              </button>
              <button (click)="exportarPdf()"
                [disabled]="logs().length === 0"
                class="flex items-center gap-1.5 text-xs font-semibold text-slate-600 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition shadow-xs bg-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                PDF
              </button>
            </div>
          </div>

          <!-- Tabla de eventos de auditoría retrocompatible -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              @if (filteredLogs().length > 0) {
                <table class="w-full text-sm">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-100">
                      <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Severidad</th>
                      <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Tipo</th>
                      <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Atracción</th>
                      <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Operario</th>
                      <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Descripción</th>
                      <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Fecha/Hora</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-50">
                    @for (log of filteredLogs(); track log.id) {
                      <tr class="hover:bg-slate-50/50 transition">
                        <td class="px-5 py-3.5 whitespace-nowrap">
                          <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full"
                              [ngClass]="log.severity === 'critical' ? 'bg-red-500' : log.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'"></span>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                              [ngClass]="log.severity === 'critical' ? 'bg-red-50 text-red-700 border border-red-200' : log.severity === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'">
                              {{ log.severity === 'critical' ? 'Crítico' : log.severity === 'warning' ? 'Advertencia' : 'Info' }}
                            </span>
                          </div>
                        </td>
                        <td class="px-5 py-3.5 whitespace-nowrap">
                          <span class="text-xs font-medium text-slate-700">{{ getTypeLabel(log.type) }}</span>
                        </td>
                        <td class="px-5 py-3.5 text-slate-600 text-xs whitespace-nowrap">{{ log.attraction }}</td>
                        <td class="px-5 py-3.5 text-slate-600 text-xs font-medium whitespace-nowrap">{{ log.operator }}</td>
                        <td class="px-5 py-3.5 text-slate-500 text-xs max-w-xs truncate">{{ log.description }}</td>
                        <td class="px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">{{ log.timestamp }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else {
                <div class="flex flex-col items-center py-12 gap-2 text-center">
                  <svg class="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                  <p class="text-slate-600 text-sm font-semibold">Sin incidentes registrados</p>
                  <p class="text-slate-400 text-xs">Los eventos de seguridad y control de accesos se registrarán automáticamente.</p>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AuditoriaComponent implements OnInit {
  readonly auditoriaService = inject(AuditoriaService);

  readonly activeTab = signal<'expediente' | 'incidentes' | 'logs'>('expediente');

  // Estado Pestaña 1: Expediente de Boleta
  terminoBusquedaTicket = signal<string>('');
  readonly buscandoExpediente = signal<boolean>(false);
  readonly expedienteSeleccionado = signal<AuditoriaTicket | null>(null);

  readonly validacionBusqueda = computed(() => {
    return this.auditoriaService.validarFormatoBusqueda(this.terminoBusquedaTicket());
  });

  // Estado Pestaña 2: Incidentes y Pausas Operativas
  readonly incidentes = signal<IncidenteOperativo[]>([]);
  readonly resumenInactividad = computed<ResumenInactividadDTO>(() => {
    return this.auditoriaService.obtenerResumenInactividad(this.incidentes());
  });

  // Estado Pestaña 3: Logs y Bitácora General
  searchQuery = signal('');
  filterDate = signal('');
  activeSeverity = signal<AuditSeverity | 'all'>('all');
  logs = signal<AuditLog[]>([]);

  countCritical = computed(() => this.logs().filter(l => l.severity === 'critical').length);
  countWarning = computed(() => this.logs().filter(l => l.severity === 'warning').length);
  countInfo = computed(() => this.logs().filter(l => l.severity === 'info').length);

  filteredLogs = computed(() => {
    let result = this.logs();
    const sev = this.activeSeverity();
    if (sev !== 'all') {
      result = result.filter(l => l.severity === sev);
    }
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      result = result.filter(l =>
        l.description.toLowerCase().includes(q) ||
        l.operator.toLowerCase().includes(q) ||
        l.attraction.toLowerCase().includes(q)
      );
    }
    const d = this.filterDate().trim();
    if (d) {
      result = result.filter(l => l.timestamp.startsWith(d));
    }
    return result;
  });

  ngOnInit(): void {
    this.cargarIncidentesYPausas();
  }

  cargarIncidentesYPausas(): void {
    this.auditoriaService.obtenerIncidentesYPausas().subscribe(data => {
      this.incidentes.set(data || []);
    });
  }

  buscarExpediente(): void {
    const valid = this.validacionBusqueda();
    if (!valid.esValido) return;

    this.buscandoExpediente.set(true);
    this.auditoriaService.buscarExpedienteTicket(valid.terminoSanitizado || this.terminoBusquedaTicket().trim()).subscribe({
      next: (exp) => {
        this.expedienteSeleccionado.set(exp);
        this.buscandoExpediente.set(false);
      },
      error: () => {
        this.expedienteSeleccionado.set(null);
        this.buscandoExpediente.set(false);
      }
    });
  }

  setFilter(sev: AuditSeverity) {
    if (this.activeSeverity() === sev) {
      this.activeSeverity.set('all');
    } else {
      this.activeSeverity.set(sev);
    }
  }

  getTypeLabel(t: AuditType): string {
    const map: Record<AuditType, string> = {
      time_exceeded: 'Tiempo excedido',
      ticket_rejected: 'Tiquete rechazado',
      manual_access: 'Acceso manual',
      cash_discrepancy: 'Descuadre de caja',
      unauthorized_pause: 'Pausa no autorizada'
    };
    return map[t] || t;
  }

  exportarCsv() {
    if (this.filteredLogs().length === 0) return;
    const headers = ['ID', 'Severidad', 'Tipo', 'Atracción', 'Operario', 'Descripción', 'Fecha/Hora'];
    const rows = this.filteredLogs().map(l => [
      l.id, l.severity, this.getTypeLabel(l.type), l.attraction, l.operator, l.description, l.timestamp
    ]);
    exportToCsv(`auditoria_incidentes_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  }

  exportarPdf() {
    if (this.filteredLogs().length === 0) return;
    window.print();
  }
}
