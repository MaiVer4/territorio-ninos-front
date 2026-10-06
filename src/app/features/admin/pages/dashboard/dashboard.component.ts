import { Component, OnInit, OnDestroy, ElementRef, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { Atraccion } from '../../../../core/models/atraccion.model';

Chart.register(...registerables);

type DateFilter = 'day' | 'week' | 'month';

interface ShiftSummary {
  id: number;
  cajero: string;
  apertura: string;
  base: number;
  ventas: number;
  tiquetes: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-5 sm:space-y-6 w-full font-sans">
      <!-- Filtro de período y Título -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="font-bold text-slate-800 text-lg">Resumen general</h2>
          <p class="text-xs text-slate-400 mt-0.5">Métricas de operación y ventas en tiempo real</p>
        </div>
        
        <div class="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-xs self-start sm:self-auto">
          <button (click)="setDateFilter('day')"
            [class]="dateFilter() === 'day' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer">
            Hoy
          </button>
          <button (click)="setDateFilter('week')"
            [class]="dateFilter() === 'week' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer">
            Semana
          </button>
          <button (click)="setDateFilter('month')"
            [class]="dateFilter() === 'month' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer">
            Mes
          </button>
        </div>
      </div>

      <!-- 4 Tarjetas KPI (Iniciadas en 0 / según datos existentes en BD) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <!-- KPI 1: Ventas -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
          <div class="w-10 sm:w-11 h-10 sm:h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-xs text-slate-400 font-medium truncate">Ventas del día</p>
            <p class="text-xl sm:text-2xl font-bold text-slate-800 mt-0.5">$0</p>
            <p class="text-[11px] text-slate-400 font-medium mt-1 truncate">Sin ventas registradas</p>
          </div>
        </div>

        <!-- KPI 2: Tiquetes -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
          <div class="w-10 sm:w-11 h-10 sm:h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-xs text-slate-400 font-medium truncate">Tiquetes emitidos</p>
            <p class="text-xl sm:text-2xl font-bold text-slate-800 mt-0.5">0</p>
            <p class="text-[11px] text-slate-400 font-medium mt-1 truncate">Todos los turnos activos</p>
          </div>
        </div>

        <!-- KPI 3: Atracción estrella -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
          <div class="w-10 sm:w-11 h-10 sm:h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-xs text-slate-400 font-medium truncate">Atracción estrella</p>
            <p class="text-lg sm:text-xl font-bold text-slate-800 mt-0.5 truncate">Sin registros</p>
            <p class="text-[11px] text-slate-400 font-medium mt-1 truncate">0 visitas registradas</p>
          </div>
        </div>

        <!-- KPI 4: Cajeros activos -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
          <div class="w-10 sm:w-11 h-10 sm:h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-xs text-slate-400 font-medium truncate">Cajeros activos</p>
            <p class="text-xl sm:text-2xl font-bold text-slate-800 mt-0.5">0</p>
            <p class="text-[11px] text-slate-400 font-medium mt-1 truncate">0 turnos abiertos</p>
          </div>
        </div>
      </div>

      <!-- Panel de Ocupación en tiempo real (Conectado a Atracciones reales de BD) -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="font-bold text-slate-800">Ocupación en tiempo real</p>
            <p class="text-xs text-slate-400 mt-0.5">
              {{ atraccionesDb().length > 0 ? 'Estado actual de aforo en cada atracción' : 'Sin atracciones configuradas' }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full inline-block"
              [ngClass]="atraccionesDb().length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'"></span>
            <span class="text-xs font-semibold"
              [ngClass]="atraccionesDb().length > 0 ? 'text-emerald-600' : 'text-slate-400'">
              {{ atraccionesDb().length > 0 ? 'En vivo' : 'Inactivo' }}
            </span>
          </div>
        </div>

        @if (atraccionesDb().length > 0) {
          <!-- Grid responsivo con atracciones de la BD -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            @for (a of atraccionesDb(); track a.id) {
              <div class="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    [style.background-color]="a.lightBg || '#DBEAFE'">
                    <span class="text-xs font-bold" [style.color]="a.color || '#2563EB'">★</span>
                  </div>
                  <p class="text-xs font-semibold text-slate-700 truncate">{{ a.nombre }}</p>
                </div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-[10px] text-slate-400">Aforo</span>
                  <span class="text-xs font-bold text-emerald-600">
                    0/{{ a.maxCapacity || a.capacidadMaxima || 15 }}
                  </span>
                </div>
                <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div class="h-full rounded-full bg-emerald-500" style="width: 0%"></div>
                </div>
              </div>
            }
          </div>
        } @else {
          <!-- Empty State si no hay atracciones en BD -->
          <div class="flex flex-col items-center justify-center py-8 px-4 text-center border-2 border-dashed border-slate-100 rounded-xl">
            <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <p class="text-sm font-bold text-slate-700">No hay atracciones registradas en el sistema</p>
            <p class="text-xs text-slate-400 max-w-sm mt-1 mb-4">
              Crea las atracciones del parque para monitorear el aforo, tarifas y turnos en tiempo real.
            </p>
            <a routerLink="/admin/atracciones"
              class="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Ir a Atracciones
            </a>
          </div>
        }
      </div>

      <!-- Sección de Gráficos (Ventas y Ranking de Visitas) -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
        <!-- Gráfico de Ventas -->
        <div class="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="font-bold text-slate-800">{{ chartTitle() }}</p>
              <p class="text-xs text-slate-400 mt-0.5">Ingresos acumulados en el período</p>
            </div>
            <span class="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">
              $0 COP
            </span>
          </div>
          <div class="w-full h-48 sm:h-56 relative overflow-hidden">
            <canvas #salesChartCanvas></canvas>
          </div>
        </div>

        <!-- Ranking de Visitas por Atracción -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <p class="font-bold text-slate-800 mb-0.5">Visitas por atracción</p>
            <p class="text-xs text-slate-400 mb-4">Ranking de concurrencia hoy</p>
          </div>
          
          <div class="flex-1 flex flex-col items-center justify-center py-6 text-center">
            <svg class="w-8 h-8 text-slate-200 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p class="text-xs font-semibold text-slate-500">Sin visitas registradas hoy</p>
            <p class="text-[10px] text-slate-400 mt-0.5">El conteo comenzará cuando se canjeen tiquetes en caja.</p>
          </div>
        </div>
      </div>

      <!-- Tabla de Turnos de Caja Activos (Empty state si no hay turnos) -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-100">
          <div>
            <p class="font-bold text-slate-800">Turnos de Caja Activos</p>
            <p class="text-xs text-slate-400 mt-0.5">{{ activeShifts().length }} turnos en curso</p>
          </div>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            0 Activos
          </span>
        </div>

        <div class="overflow-x-auto">
          @if (activeShifts().length > 0) {
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-100">
                  <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Cajero</th>
                  <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Apertura</th>
                  <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Base inicial</th>
                  <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Ventas actuales</th>
                  <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Tiquetes</th>
                  <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                @for (s of activeShifts(); track s.id) {
                  <tr class="hover:bg-slate-50/50 transition">
                    <td class="px-5 py-3.5">
                      <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                          {{ s.cajero.slice(0, 2) }}
                        </div>
                        <span class="font-semibold text-slate-800">{{ s.cajero }}</span>
                      </div>
                    </td>
                    <td class="px-5 py-3.5 text-slate-600 font-mono text-xs">{{ s.apertura }}</td>
                    <td class="px-5 py-3.5 text-slate-600 font-medium">\${{ s.base.toLocaleString('es-CO') }}</td>
                    <td class="px-5 py-3.5 font-bold text-slate-800">\${{ s.ventas.toLocaleString('es-CO') }}</td>
                    <td class="px-5 py-3.5">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {{ s.tiquetes }} tiquetes
                      </span>
                    </td>
                    <td class="px-5 py-3.5">
                      <button class="text-xs font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer">
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <div class="flex flex-col items-center justify-center py-10 px-4 text-center">
              <svg class="w-8 h-8 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-sm font-semibold text-slate-600">No hay turnos activos en este momento</p>
              <p class="text-xs text-slate-400 mt-0.5">Los cajeros aparecerán aquí cuando abran su caja desde el módulo de Taquilla.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private atraccionService = inject(AtraccionService);

  @ViewChild('salesChartCanvas', { static: true }) salesChartCanvas!: ElementRef<HTMLCanvasElement>;

  private salesChart: Chart | null = null;

  dateFilter = signal<DateFilter>('day');
  chartTitle = signal('Ventas por hora');

  // Atracciones reales obtenidas de la Base de Datos
  atraccionesDb = signal<Atraccion[]>([]);

  // Turnos activos reales (inician en vacío si no hay en BD)
  activeShifts = signal<ShiftSummary[]>([]);

  ngOnInit() {
    this.loadAtracciones();
    this.initSalesChart();
  }

  ngOnDestroy() {
    this.salesChart?.destroy();
  }

  loadAtracciones() {
    this.atraccionService.getAll().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          const colors = ["#0EA5E9", "#F59E0B", "#8B5CF6", "#10B981", "#EF4444", "#F97316", "#2563EB"];
          const lightBgs = ["#E0F2FE", "#FEF3C7", "#EDE9FE", "#D1FAE5", "#FEE2E2", "#FFF7ED", "#DBEAFE"];

          const mapped = data.map((a, i) => ({
            ...a,
            color: a.color || colors[i % colors.length],
            lightBg: a.lightBg || lightBgs[i % lightBgs.length]
          }));
          this.atraccionesDb.set(mapped);
        } else {
          this.atraccionesDb.set([]);
        }
      },
      error: () => {
        this.atraccionesDb.set([]);
      }
    });
  }

  setDateFilter(f: DateFilter) {
    this.dateFilter.set(f);
    this.chartTitle.set(f === 'day' ? 'Ventas por hora' : f === 'week' ? 'Ventas por día' : 'Ventas por semana');
    this.updateSalesChart(f);
  }

  private initSalesChart() {
    const ctx = this.salesChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm'],
        datasets: [{
          label: 'Ventas',
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          borderColor: '#94A3B8',
          borderWidth: 2,
          backgroundColor: 'rgba(241, 245, 249, 0.4)',
          fill: true,
          tension: 0.1,
          pointRadius: 2,
          pointBackgroundColor: '#94A3B8'
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
            bodyColor: '#93C5FD',
            padding: 8,
            cornerRadius: 6,
            callbacks: {
              label: (context) => `Ventas: $${Number(context.raw).toLocaleString('es-CO')}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94A3B8', font: { size: 10 } }
          },
          y: {
            min: 0,
            max: 100000,
            grid: { color: '#F1F5F9' },
            ticks: {
              color: '#94A3B8',
              font: { size: 10 },
              callback: (v) => `$${(Number(v) / 1000).toFixed(0)}k`
            }
          }
        }
      }
    });
  }

  private updateSalesChart(f: DateFilter) {
    if (!this.salesChart) return;
    if (f === 'day') {
      this.salesChart.data.labels = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm'];
    } else if (f === 'week') {
      this.salesChart.data.labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    } else {
      this.salesChart.data.labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
    }
    this.salesChart.data.datasets[0].data = Array(this.salesChart.data.labels.length).fill(0);
    this.salesChart.update();
  }
}
