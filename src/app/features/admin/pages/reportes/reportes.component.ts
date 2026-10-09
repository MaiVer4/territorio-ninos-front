import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { exportToCsv } from '../../../../core/utils/csv-exporter';

Chart.register(...registerables);

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full space-y-5">
      <!-- Encabezado y acciones de exportación -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="font-bold text-slate-800 text-lg">Reportes de Ventas</h2>
          <p class="text-xs text-slate-400 mt-0.5">Métricas consolidadas y rendimiento comercial</p>
        </div>
        <div class="flex items-center gap-2">
          <button (click)="exportarCsv()"
            class="flex items-center gap-1.5 text-sm font-semibold text-slate-600 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition shadow-sm bg-white cursor-pointer">
            <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Exportar CSV
          </button>
          <button (click)="exportarPdf()"
            class="flex items-center gap-1.5 text-sm font-semibold text-slate-600 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition shadow-sm bg-white cursor-pointer">
            <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Exportar PDF
          </button>
        </div>
      </div>

      <!-- KPIs del mes -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Card 1 -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
          <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-xs text-slate-400 font-medium">Total del mes</p>
            <p class="text-2xl font-bold text-slate-800 mt-0.5">$48.2M</p>
            <p class="text-xs text-emerald-600 font-medium mt-1">vs. $41.3M mes anterior</p>
          </div>
        </div>

        <!-- Card 2 -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
          <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
            </svg>
          </div>
          <div>
            <p class="text-xs text-slate-400 font-medium">Tiquetes del mes</p>
            <p class="text-2xl font-bold text-slate-800 mt-0.5">2,341</p>
            <p class="text-xs text-emerald-600 font-medium mt-1">+18% vs. mes anterior</p>
          </div>
        </div>

        <!-- Card 3 -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
          <div class="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
          <div>
            <p class="text-xs text-slate-400 font-medium">Ingreso prom./día</p>
            <p class="text-2xl font-bold text-slate-800 mt-0.5">$1.6M</p>
            <p class="text-xs text-slate-400 font-medium mt-1">Basado en 30 días</p>
          </div>
        </div>
      </div>

      <!-- Gráfico de ventas horarias (Color naranja como el prototipo) -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="font-bold text-slate-800">Ventas por hora — Hoy</p>
            <p class="text-xs text-slate-400 mt-0.5">Distribución horaria en pesos colombianos</p>
          </div>
          <span class="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2.5 py-1 flex items-center gap-1">
            En vivo
          </span>
        </div>
        <div class="w-full h-64 relative">
          <canvas #salesCanvas></canvas>
        </div>
      </div>
    </div>
  `
})
export class ReportesComponent implements OnInit, OnDestroy {
  @ViewChild('salesCanvas', { static: true }) salesCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | null = null;

  ngOnInit() {
    this.renderChart();
  }

  ngOnDestroy() {
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
  }

  private renderChart() {
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

  exportarCsv() {
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

  exportarPdf() {
    window.print();
  }
}
