import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { exportToCsv } from '../../../../core/utils/csv-exporter';

interface TurnoItem {
  id: number;
  cajero: string;
  rol: string;
  apertura: string;
  base: number;
  ventas: number;
  tiquetes: number;
  activo: boolean;
}

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full space-y-5 font-sans">
      <!-- Encabezado con filtros y exportación -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="font-bold text-slate-800 text-lg">Historial de Turnos</h2>
          <p class="text-xs text-slate-400 mt-0.5">Control de aperturas, cierres y arqueo de cajas</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <input type="date" [(ngModel)]="fechaSeleccionada"
            class="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 text-slate-600 bg-white shadow-xs" />
          <button (click)="exportarCsv()"
            [disabled]="turnos().length === 0"
            class="flex items-center gap-1.5 text-sm font-semibold text-slate-600 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition shadow-xs bg-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Exportar CSV
          </button>
          <button (click)="exportarPdf()"
            [disabled]="turnos().length === 0"
            class="flex items-center gap-1.5 text-sm font-semibold text-slate-600 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition shadow-xs bg-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Exportar PDF
          </button>
        </div>
      </div>

      <!-- Tabla de turnos -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          @if (turnos().length > 0) {
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-100">
                  <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Cajero</th>
                  <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Rol</th>
                  <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Apertura</th>
                  <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Base inicial</th>
                  <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Ventas totales</th>
                  <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Tiquetes</th>
                  <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                @for (s of turnos(); track s.id) {
                  <tr class="hover:bg-slate-50/50 transition">
                    <td class="px-5 py-3.5 whitespace-nowrap">
                      <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                          {{ getInitials(s.cajero) }}
                        </div>
                        <span class="font-semibold text-slate-800">{{ s.cajero }}</span>
                      </div>
                    </td>
                    <td class="px-5 py-3.5 whitespace-nowrap">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {{ s.rol }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5 text-slate-600 font-mono text-xs whitespace-nowrap">{{ s.apertura }}</td>
                    <td class="px-5 py-3.5 text-slate-600 font-medium whitespace-nowrap">\${{ s.base.toLocaleString('es-CO') }}</td>
                    <td class="px-5 py-3.5 font-bold text-slate-800 whitespace-nowrap">\${{ s.ventas.toLocaleString('es-CO') }}</td>
                    <td class="px-5 py-3.5 whitespace-nowrap">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {{ s.tiquetes }} tiquetes
                      </span>
                    </td>
                    <td class="px-5 py-3.5 whitespace-nowrap">
                      @if (s.activo) {
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                          Activo
                        </span>
                      } @else {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Cerrado
                        </span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
              <svg class="w-10 h-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-sm font-semibold text-slate-700">Sin registros de turnos en la fecha seleccionada</p>
              <p class="text-xs text-slate-400 mt-0.5">Los turnos se archivarán aquí conforme los cajeros abran y cierren caja.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class TurnosComponent {
  fechaSeleccionada = new Date().toISOString().slice(0, 10);

  // Inicia vacío hasta que se registren turnos en el backend
  turnos = signal<TurnoItem[]>([]);

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  }

  exportarCsv() {
    if (this.turnos().length === 0) return;
    const headers = ['Cajero', 'Rol', 'Apertura', 'Base Inicial', 'Ventas', 'Tiquetes', 'Estado'];
    const rows = this.turnos().map(t => [
      t.cajero, t.rol, t.apertura, t.base, t.ventas, t.tiquetes, t.activo ? 'Activo' : 'Cerrado'
    ]);
    exportToCsv(`historial_turnos_${this.fechaSeleccionada}`, headers, rows);
  }

  exportarPdf() {
    if (this.turnos().length === 0) return;
    window.print();
  }
}
