import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { exportToCsv } from '../../../../core/utils/csv-exporter';
import { ReporteService } from '../../../../core/services/reporte.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  CriterioOrdenRotacion,
  PeriodoReporte,
  RotacionAtraccion,
  DatosGraficosReporte
} from '../../../../core/models/reporte.model';

Chart.register(...registerables);

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full space-y-6 font-sans">
      <!-- Encabezado y acciones de exportación (HU-39.06..08) -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="font-bold text-slate-800 text-lg">Reportes de Ventas y Rotación Operativa</h2>
            <span class="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              Consolidado Comercial
            </span>
          </div>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Métricas consolidadas, afluencia y rendimiento comercial de atracciones</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Botón Descargar CSV (HU-39.06..08) -->
          <button
            type="button"
            data-testid="btn-descargar-csv"
            (click)="descargarCsvBlob()"
            [disabled]="reporteService.descargandoArchivo()"
            class="flex items-center gap-1.5 text-xs font-semibold text-slate-700 border border-slate-200 ps-3 pe-3.5 py-2 rounded-xl hover:bg-slate-50 transition active:scale-[0.97] shadow-xs bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            @if (reporteService.descargandoArchivo() && reporteService.formatoDescargaActivo() === 'csv') {
              <svg class="motion-safe:animate-spin w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Generando...</span>
            } @else {
              <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              <span>Descargar CSV</span>
            }
          </button>

          <!-- Botón Descargar PDF (HU-39.06..08) -->
          <button
            type="button"
            data-testid="btn-descargar-pdf"
            (click)="descargarPdfBlob()"
            [disabled]="reporteService.descargandoArchivo()"
            class="flex items-center gap-1.5 text-xs font-semibold text-slate-700 border border-slate-200 ps-3 pe-3.5 py-2 rounded-xl hover:bg-slate-50 transition active:scale-[0.97] shadow-xs bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            @if (reporteService.descargandoArchivo() && reporteService.formatoDescargaActivo() === 'pdf') {
              <svg class="motion-safe:animate-spin w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Generando...</span>
            } @else {
              <svg class="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span>Descargar PDF</span>
            }
          </button>
        </div>
      </div>

      <!-- Selector Reactivo de Rango Temporal (HU-40.08 / Notion: CA-04) -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs font-bold text-slate-500 mr-1">Período:</span>
          <button
            type="button"
            data-testid="filtro-periodo-hoy"
            (click)="cambiarPeriodo('HOY')"
            [ngClass]="periodoSeleccionado() === 'HOY' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100 border border-slate-200'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-[0.97] cursor-pointer">
            Hoy
          </button>
          <button
            type="button"
            data-testid="filtro-periodo-semana"
            (click)="cambiarPeriodo('ULTIMOS_7_DIAS')"
            [ngClass]="periodoSeleccionado() === 'ULTIMOS_7_DIAS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100 border border-slate-200'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-[0.97] cursor-pointer">
            Últimos 7 días
          </button>
          <button
            type="button"
            data-testid="filtro-periodo-mes"
            (click)="cambiarPeriodo('ESTE_MES')"
            [ngClass]="periodoSeleccionado() === 'ESTE_MES' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100 border border-slate-200'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-[0.97] cursor-pointer">
            Este Mes
          </button>
          <button
            type="button"
            data-testid="filtro-periodo-personalizado"
            (click)="cambiarPeriodo('PERSONALIZADO')"
            [ngClass]="periodoSeleccionado() === 'PERSONALIZADO' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100 border border-slate-200'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-[0.97] cursor-pointer">
            Personalizado
          </button>
        </div>

        @if (periodoSeleccionado() === 'PERSONALIZADO') {
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <div class="flex items-center gap-1.5">
              <label for="fechaInicioReporte" class="text-slate-500 font-bold">Desde:</label>
              <input
                id="fechaInicioReporte"
                type="date"
                [(ngModel)]="fechaInicio"
                [max]="fechaMaxHoy"
                aria-label="Fecha inicial"
                (change)="aplicarFiltroPersonalizado()"
                class="border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" />
            </div>
            <div class="flex items-center gap-1.5">
              <label for="fechaFinReporte" class="text-slate-500 font-bold">Hasta:</label>
              <input
                id="fechaFinReporte"
                type="date"
                [(ngModel)]="fechaFin"
                [max]="fechaMaxHoy"
                aria-label="Fecha final"
                (change)="aplicarFiltroPersonalizado()"
                class="border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" />
            </div>
            <button
              type="button"
              (click)="aplicarFiltroPersonalizado()"
              class="px-3 py-1 bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Aplicar</span>
            </button>
            @if (errorRangoFechas()) {
              <span class="w-full text-red-500 text-[11px] font-bold">{{ errorRangoFechas() }}</span>
            }
          </div>
        }
      </div>

      <!-- Tarjetas KPI Top 3 Demanda y Alertas de Baja Rotación (HU-37.08 / Notion: CA-01, CA-03) -->
      <div data-testid="ranking-top3-atracciones" class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            Ranking de Mayor Demanda — Top 3
          </h3>
          <span class="text-xs text-slate-500 font-medium">Basado en volumen de visitas</span>
        </div>

        @if (top3Atracciones().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            @for (top of top3Atracciones(); track top.atraccionId; let idx = $index) {
              <div
                [attr.data-testid]="'card-top-' + (idx + 1)"
                class="bg-white rounded-2xl border p-4.5 shadow-xs relative overflow-hidden transition hover:shadow-md"
                [ngClass]="idx === 0 ? 'border-amber-200 ring-1 ring-amber-300/40 bg-gradient-to-br from-amber-50/30 to-white' : 'border-slate-100'">
                
                <div class="flex items-start justify-between">
                  <span
                    class="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shadow-xs"
                    [ngClass]="idx === 0 ? 'bg-amber-400 text-amber-950' : idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-amber-700/20 text-amber-900'">
                    #{{ idx + 1 }}
                  </span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {{ top.tipo }}
                  </span>
                </div>

                <div class="mt-3">
                  <h4 class="font-bold text-slate-800 text-sm truncate">{{ top.nombre }}</h4>
                  <div class="flex items-baseline gap-2 mt-1">
                    <span class="text-2xl font-black text-slate-900 font-mono">{{ top.volumenVisitas.toLocaleString('es-CO') }}</span>
                    <span class="text-xs text-slate-500 font-medium">visitas</span>
                  </div>
                </div>

                <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span class="text-[10px] text-slate-500 block font-medium">Ocupación</span>
                    <span class="font-bold font-mono text-emerald-600">{{ top.ocupacionPromedioPorcentaje }}%</span>
                  </div>
                  <div class="text-right">
                    <span class="text-[10px] text-slate-500 block font-medium">Facturación</span>
                    <span class="font-extrabold font-mono text-slate-800">{{ formatearFacturacion(top.ingresosBrutos) }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-2xs">
            <svg class="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p class="text-xs font-bold text-slate-700">Sin datos de demanda en el período</p>
            <p class="text-[11px] text-slate-400 mt-0.5">No se registraron visitas ni ventas para calcular el ranking.</p>
          </div>
        }

        <!-- Banner de Alerta para Juegos con Baja Utilización (< 60%) (HU-37.08 / Notion: CA-03) -->
        @if (atraccionesBajaUtilizacion().length > 0) {
          <div data-testid="alerta-baja-utilizacion" class="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex items-start gap-3.5 shadow-2xs">
            <div class="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div class="text-xs flex-1">
              <p class="font-bold text-amber-900">Alerta de Ocupación Reducida (&lt; 60%)</p>
              <p class="text-amber-800/90 mt-1">
                Se detectó baja afluencia en:
                @for (baja of atraccionesBajaUtilizacion(); track baja.atraccionId; let last = $last) {
                  <strong>{{ baja.nombre }} ({{ baja.ocupacionPromedioPorcentaje }}%)</strong>{{ last ? '.' : ', ' }}
                }
                Considera promociones dinámicas o reasignación de personal.
              </p>
            </div>
          </div>
        }
      </div>

      <!-- Sección de Gráficos Interactivos Chart.js (HU-40.06..08) -->
      <div #graficosContainer class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Gráfico 1: Ventas por hora / Afluencia (HU-40.06 / Notion: CA-01) -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 lg:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="font-bold text-slate-800 text-sm">Ventas por hora — Afluencia en Tiempo Real</p>
              <p class="text-xs text-slate-500 mt-0.5">Distribución horaria en pesos colombianos (COP)</p>
            </div>
            @if (periodoSeleccionado() === 'HOY') {
              <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-2xs">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>En vivo</span>
              </span>
            } @else {
              <span class="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1">
                Consolidado
              </span>
            }
          </div>
          <div class="w-full h-64 relative">
            <canvas #salesCanvas></canvas>
          </div>
        </div>

        <!-- Gráfico 3: Medios de Pago Doughnut (HU-40.07 / Notion: CA-03) -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
          <div class="mb-4">
            <p class="font-bold text-slate-800 text-sm">Distribución por Medio de Pago</p>
            <p class="text-xs text-slate-500 mt-0.5">Efectivo vs. Métodos Electrónicos</p>
          </div>
          <div class="w-full h-64 relative flex items-center justify-center">
            <canvas #paymentMethodsCanvas></canvas>
          </div>
        </div>

        <!-- Gráfico 2: Tendencia de Ingresos 7 Días (HU-40.06 / Notion: CA-02) -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 lg:col-span-3">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="font-bold text-slate-800 text-sm">Tendencia de Facturación — Últimos 7 Días</p>
              <p class="text-xs text-slate-500 mt-0.5">Evolución de ingresos brutos diarios consolidada</p>
            </div>
            <span class="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1">
              Semanal
            </span>
          </div>
          <div class="w-full h-56 relative">
            <canvas #weeklyIncomeCanvas></canvas>
          </div>
        </div>
      </div>

      <!-- Tabla Clasificatoria Interactiva de Rotación y Rentabilidad (HU-37.06, HU-37.07) -->
      <div data-testid="tabla-rotacion-atracciones" class="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="font-bold text-slate-800 text-sm">Métricas de Rotación y Rentabilidad por Juego</h3>
            <p class="text-xs text-slate-500 mt-0.5">Clasificación interactiva con ordenamiento dinámico</p>
          </div>

          <!-- Botones de ordenamiento (HU-37.07 / Notion: CA-02) -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="font-bold text-slate-500 mr-1">Ordenar por:</span>
            <button
              type="button"
              data-testid="btn-ordenar-visitas"
              (click)="cambiarCriterioOrden('visitas')"
              [ngClass]="criterioOrden() === 'visitas' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              class="px-3 py-1 rounded-lg font-bold transition active:scale-[0.97] cursor-pointer flex items-center gap-1">
              <span>Visitas</span>
              @if (criterioOrden() === 'visitas') {
                <span class="text-[10px]">↓</span>
              }
            </button>
            <button
              type="button"
              data-testid="btn-ordenar-ocupacion"
              (click)="cambiarCriterioOrden('ocupacionPromedio')"
              [ngClass]="criterioOrden() === 'ocupacionPromedio' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              class="px-3 py-1 rounded-lg font-bold transition active:scale-[0.97] cursor-pointer flex items-center gap-1">
              <span>Ocupación</span>
              @if (criterioOrden() === 'ocupacionPromedio') {
                <span class="text-[10px]">↓</span>
              }
            </button>
            <button
              type="button"
              data-testid="btn-ordenar-ingresos"
              (click)="cambiarCriterioOrden('ingresosBrutos')"
              [ngClass]="criterioOrden() === 'ingresosBrutos' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              class="px-3 py-1 rounded-lg font-bold transition active:scale-[0.97] cursor-pointer flex items-center gap-1">
              <span>Facturación</span>
              @if (criterioOrden() === 'ingresosBrutos') {
                <span class="text-[10px]">↓</span>
              }
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-slate-50 border-b border-slate-100">
              <tr>
                <th class="px-5 py-3 text-left font-bold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_0_#e2e8f0]">Atracción</th>
                <th class="px-5 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">Tipo Operativo</th>
                <th class="px-5 py-3 text-right font-bold text-slate-600 uppercase tracking-wider">Visitas Totales</th>
                <th class="px-5 py-3 text-center font-bold text-slate-600 uppercase tracking-wider">Ocupación Promedio</th>
                <th class="px-5 py-3 text-right font-bold text-slate-600 uppercase tracking-wider">Facturación Bruta</th>
                <th class="px-5 py-3 text-right font-bold text-slate-600 uppercase tracking-wider">Sesión Promedio</th>
                <th class="px-5 py-3 text-center font-bold text-slate-600 uppercase tracking-wider">Tendencia</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (atraccion of atraccionesOrdenadas(); track atraccion.atraccionId) {
                <tr
                  [attr.data-testid]="'fila-rotacion-' + atraccion.atraccionId"
                  class="hover:bg-slate-50/50 transition">
                  
                  <td class="px-5 py-3.5 font-bold text-slate-800 whitespace-nowrap sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#e2e8f0]">
                    {{ atraccion.nombre }}
                  </td>

                  <td class="px-5 py-3.5 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {{ atraccion.tipo }}
                    </span>
                  </td>

                  <td class="px-5 py-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                    {{ atraccion.volumenVisitas.toLocaleString('es-CO') }}
                  </td>

                  <td class="px-5 py-3.5 text-center whitespace-nowrap">
                    <div class="inline-flex items-center gap-2.5">
                      <div class="w-20 h-2.5 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                        <div
                          class="h-full rounded-full transition-all duration-300"
                          [ngClass]="atraccion.ocupacionPromedioPorcentaje >= 80 ? 'bg-emerald-500' : atraccion.ocupacionPromedioPorcentaje >= 60 ? 'bg-amber-500' : 'bg-red-500'"
                          [style.width.%]="atraccion.ocupacionPromedioPorcentaje"></div>
                      </div>
                      <span class="font-bold font-mono text-slate-700 min-w-[42px] text-left">{{ atraccion.ocupacionPromedioPorcentaje }}%</span>
                    </div>
                  </td>

                  <td class="px-5 py-3.5 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                    \${{ atraccion.ingresosBrutos.toLocaleString('es-CO') }}
                  </td>

                  <td class="px-5 py-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                    {{ atraccion.tiempoPromedioMinutos }} min
                  </td>

                  <td class="px-5 py-3.5 text-center whitespace-nowrap">
                    @if ((atraccion.tendenciaPorcentaje ?? 0) > 0) {
                      <span class="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                        </svg>
                        +{{ atraccion.tendenciaPorcentaje }}%
                      </span>
                    } @else if ((atraccion.tendenciaPorcentaje ?? 0) < 0) {
                      <span class="inline-flex items-center gap-0.5 text-red-500 font-bold">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                        </svg>
                        {{ atraccion.tendenciaPorcentaje }}%
                      </span>
                    } @else {
                      <span class="inline-flex items-center text-slate-500 font-bold">
                        — 0%
                      </span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="px-5 py-10 text-center text-slate-500">
                    <div class="flex flex-col items-center justify-center gap-2">
                      <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      <span class="text-xs font-semibold text-slate-600">No hay atracciones registradas con ventas en este período</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class ReportesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('salesCanvas', { static: true }) salesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('weeklyIncomeCanvas') weeklyIncomeCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('paymentMethodsCanvas') paymentMethodsCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('graficosContainer') graficosContainer?: ElementRef<HTMLDivElement>;

  readonly reporteService = inject(ReporteService);
  readonly notificationService = inject(NotificationService, { optional: true });

  private chartInstance: Chart | null = null;
  private weeklyChartInstance: Chart | null = null;
  private paymentChartInstance: Chart | null = null;
  private resizeObserver: ResizeObserver | null = null;

  readonly periodoSeleccionado = signal<PeriodoReporte>('HOY');
  readonly fechaMaxHoy = new Date().toISOString().slice(0, 10);
  readonly errorRangoFechas = signal<string | null>(null);
  readonly cargandoReporte = signal(false);

  fechaInicio = '';
  fechaFin = '';

  readonly atraccionesRotacion = signal<RotacionAtraccion[]>([]);
  readonly criterioOrden = signal<CriterioOrdenRotacion>('visitas');

  readonly top3Atracciones = computed<RotacionAtraccion[]>(() => {
    return [...this.atraccionesRotacion()]
      .sort((a, b) => b.volumenVisitas - a.volumenVisitas)
      .slice(0, 3);
  });

  readonly atraccionesBajaUtilizacion = computed<RotacionAtraccion[]>(() => {
    return this.atraccionesRotacion().filter(a => a.ocupacionPromedioPorcentaje < 60);
  });

  readonly atraccionesOrdenadas = computed<RotacionAtraccion[]>(() => {
    const crit = this.criterioOrden();
    return [...this.atraccionesRotacion()].sort((a, b) => {
      if (crit === 'visitas') return b.volumenVisitas - a.volumenVisitas;
      if (crit === 'ocupacionPromedio') return b.ocupacionPromedioPorcentaje - a.ocupacionPromedioPorcentaje;
      if (crit === 'ingresosBrutos') return b.ingresosBrutos - a.ingresosBrutos;
      return 0;
    });
  });

  ngOnInit(): void {
    this.cargarDatosRotacion();
    this.renderChart();
  }

  ngAfterViewInit(): void {
    this.renderWeeklyChart();
    this.renderPaymentMethodsChart();
    this.actualizarGraficosPorPeriodo();

    if (typeof ResizeObserver !== 'undefined' && this.graficosContainer?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.chartInstance?.resize();
        this.weeklyChartInstance?.resize();
        this.paymentChartInstance?.resize();
      });
      this.resizeObserver.observe(this.graficosContainer.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
    if (this.weeklyChartInstance) {
      this.weeklyChartInstance.destroy();
      this.weeklyChartInstance = null;
    }
    if (this.paymentChartInstance) {
      this.paymentChartInstance.destroy();
      this.paymentChartInstance = null;
    }
  }

  cargarDatosRotacion(): void {
    this.cargandoReporte.set(true);
    this.reporteService.obtenerRotacionAtracciones({
      periodo: this.periodoSeleccionado(),
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin
    }).subscribe({
      next: data => {
        this.atraccionesRotacion.set(data || []);
        this.cargandoReporte.set(false);
      },
      error: () => {
        this.cargandoReporte.set(false);
      }
    });
  }

  cambiarPeriodo(periodo: PeriodoReporte): void {
    this.periodoSeleccionado.set(periodo);
    this.errorRangoFechas.set(null);
    this.cargarDatosRotacion();
    this.actualizarGraficosPorPeriodo();
  }

  aplicarFiltroPersonalizado(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      return;
    }
    if (this.fechaInicio > this.fechaFin) {
      this.errorRangoFechas.set('La fecha inicial no puede ser posterior a la fecha final.');
      this.notificationService?.warn('La fecha inicial no puede ser posterior a la fecha final.', 'Rango Inválido');
      return;
    }
    this.errorRangoFechas.set(null);
    this.cargarDatosRotacion();
    this.actualizarGraficosPorPeriodo();
  }

  cambiarCriterioOrden(criterio: CriterioOrdenRotacion): void {
    this.criterioOrden.set(criterio);
  }

  formatearFacturacion(valor: number): string {
    if (!valor) return '$0';
    if (valor >= 1_000_000) {
      return `$${(valor / 1_000_000).toFixed(1)}M`;
    }
    return `$${valor.toLocaleString('es-CO')}`;
  }

  private actualizarGraficosPorPeriodo(): void {
    this.reporteService.obtenerDatosGraficos({
      periodo: this.periodoSeleccionado(),
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin
    }).subscribe(datos => {
      if (!datos) return;
      if (this.chartInstance) {
        this.chartInstance.data.labels = datos.ventasPorHora.map(v => v.hora);
        this.chartInstance.data.datasets[0].data = datos.ventasPorHora.map(v => v.ventasCop);
        this.chartInstance.update();
      }
      if (this.weeklyChartInstance) {
        this.weeklyChartInstance.data.labels = datos.evolucionSemanal.map(e => e.etiquetaDia);
        this.weeklyChartInstance.data.datasets[0].data = datos.evolucionSemanal.map(e => e.ingresosCop);
        this.weeklyChartInstance.update();
      }
      if (this.paymentChartInstance) {
        this.paymentChartInstance.data.labels = datos.distribucionMetodosPago.map(p => p.etiqueta);
        this.paymentChartInstance.data.datasets[0].data = datos.distribucionMetodosPago.map(p => p.montoCop);
        this.paymentChartInstance.update();
      }
    });
  }

  private renderChart(): void {
    if (!this.salesCanvas?.nativeElement) return;
    const ctx = this.salesCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(249, 115, 22, 0.25)');
    gradient.addColorStop(1, 'rgba(249, 115, 22, 0.0)');

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm'],
        datasets: [{
          label: 'Ventas',
          data: [120000, 385000, 520000, 780000, 650000, 895000, 720000, 940000, 560000],
          borderColor: '#F97316',
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#F97316',
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#CBD5E1',
            bodyColor: '#FED7AA',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const val = Number(context.raw);
                return `Ventas: $${val.toLocaleString('es-CO')}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94A3B8', font: { size: 11 } }
          },
          y: {
            grid: { color: '#F1F5F9' },
            ticks: {
              color: '#94A3B8',
              font: { size: 11 },
              callback: (value) => `$${(Number(value) / 1000).toFixed(0)}k`
            }
          }
        }
      }
    });
  }

  private renderWeeklyChart(): void {
    if (!this.weeklyIncomeCanvas?.nativeElement) return;
    const ctx = this.weeklyIncomeCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.weeklyChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        datasets: [{
          label: 'Ingresos Diarios',
          data: [2850000, 3120000, 2980000, 3450000, 4890000, 6850000, 7420000],
          borderColor: '#2563EB',
          borderWidth: 2.5,
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#2563EB'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 10,
            callbacks: {
              label: (context) => `Ingreso: $${Number(context.raw).toLocaleString('es-CO')}`
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: '#F1F5F9' },
            ticks: {
              callback: (val) => `$${(Number(val) / 1000000).toFixed(1)}M`
            }
          }
        }
      }
    });
  }

  private renderPaymentMethodsChart(): void {
    if (!this.paymentMethodsCanvas?.nativeElement) return;
    const ctx = this.paymentMethodsCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.paymentChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Efectivo', 'Tarjeta Débito', 'Tarjeta Crédito', 'Transferencia'],
        datasets: [{
          data: [18450000, 12240000, 6520000, 3590000],
          backgroundColor: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'],
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 10,
            callbacks: {
              label: (context) => {
                const val = Number(context.raw);
                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                return ` ${context.label}: $${val.toLocaleString('es-CO')} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  descargarCsvBlob(): void {
    this.reporteService.descargarReporteFinancieroBlob('csv').subscribe();
  }

  descargarPdfBlob(): void {
    this.reporteService.descargarReporteFinancieroBlob('pdf').subscribe();
  }

  exportarCsv(): void {
    const headers = ['Hora', 'Ventas (COP)'];
    const rows = [
      ['08:00 AM', 120000],
      ['09:00 AM', 385000],
      ['10:00 AM', 520000],
      ['11:00 AM', 780000],
      ['12:00 PM', 650000],
      ['01:00 PM', 895000],
      ['02:00 PM', 720000],
      ['03:00 PM', 940000],
      ['04:00 PM', 560000]
    ];
    exportToCsv(`reporte_ventas_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  }

  exportarPdf(): void {
    window.print();
  }
}
