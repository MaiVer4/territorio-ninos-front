import { Component, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { exportToCsv } from '../../../../core/utils/csv-exporter';

export type AuditSeverity = 'critical' | 'warning' | 'info';
export type AuditType = 'time_exceeded' | 'ticket_rejected' | 'manual_access' | 'cash_discrepancy' | 'unauthorized_pause';

interface AuditLog {
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
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full space-y-5 font-sans">
      <!-- Encabezado y exportación -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="font-bold text-slate-800 text-lg">Auditoría e Incidentes</h2>
          <p class="text-xs text-slate-400 mt-0.5">{{ logs().length }} eventos registrados · Actualizado en tiempo real</p>
        </div>
        <div class="flex items-center gap-2">
          <button (click)="exportarCsv()"
            [disabled]="logs().length === 0"
            class="flex items-center gap-1.5 text-sm font-semibold text-slate-600 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition shadow-xs bg-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Exportar CSV
          </button>
          <button (click)="exportarPdf()"
            [disabled]="logs().length === 0"
            class="flex items-center gap-1.5 text-sm font-semibold text-slate-600 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition shadow-xs bg-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Exportar PDF
          </button>
        </div>
      </div>

      <!-- Tarjetas de resumen interactivo por severidad (Responsivo: 1 col móvil, 3 col desktop) -->
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

      <!-- Barra de filtros -->
      <div class="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div class="relative flex-1 min-w-[200px] max-w-sm">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input [(ngModel)]="searchQuery" placeholder="Buscar en los logs..."
            class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 transition" />
        </div>
        <button (click)="activeSeverity.set('all')"
          class="px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
          [ngClass]="activeSeverity() === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 border border-slate-200 hover:bg-slate-50'">
          Todos
        </button>
        <input type="date" [(ngModel)]="filterDate"
          class="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 text-slate-600 bg-white" />
      </div>

      <!-- Tabla de eventos de auditoría -->
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
  `
})
export class AuditoriaComponent {
  searchQuery = signal('');
  filterDate = signal('');
  activeSeverity = signal<AuditSeverity | 'all'>('all');

  // Inicia vacío o según registros del backend
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
    return result;
  });

  setFilter(sev: AuditSeverity) {
    if (this.activeSeverity() === sev) {
      this.activeSeverity.set('all');
    } else {
      this.activeSeverity.set(sev);
    }
  }

  getTypeLabel(t: AuditType): string {
    const map: Record<AuditType, string> = {
      time_exceeded: "Tiempo excedido",
      ticket_rejected: "Tiquete rechazado",
      manual_access: "Acceso manual",
      cash_discrepancy: "Descuadre de caja",
      unauthorized_pause: "Pausa no autorizada"
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
