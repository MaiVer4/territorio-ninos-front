import { Component, signal, ChangeDetectionStrategy, OnInit, inject, DestroyRef, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CajaService } from '../../../../core/services/caja.service';
import { ReporteService } from '../../../../core/services/reporte.service';
import { exportToCsv } from '../../../../core/utils/csv-exporter';
import { DetalleConciliacionTurno } from '../../../../core/models/reporte.model';

export interface TurnoItem {
  id: number;
  idUsuario?: number;
  cajero: string;
  rol: string;
  apertura: string;
  cierre?: string;
  base: number;
  efectivo?: number;
  electronico?: number;
  ventas: number;
  esperado?: number;
  fisico?: number;
  diferencia?: number;
  tieneDescuadre?: boolean;
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
      <!-- Encabezado con filtros de rango, cajero y exportación (HU-36.09, HU-39.06..08) -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 class="font-extrabold text-slate-800 text-lg sm:text-xl">Historial y Conciliación de Turnos</h2>
          <p class="text-xs text-slate-400 mt-0.5">Control contable de aperturas, cierres, arqueo y boletas por caja</p>
        </div>

        <!-- Botones de Acción Rápida y Descarga Blob (HU-39.06..08) -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            (click)="cargarTurnos()"
            [disabled]="cargando()"
            title="Recargar turnos"
            class="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-50 transition shadow-xs bg-white cursor-pointer disabled:opacity-40">
            <svg class="w-4 h-4 text-slate-500" [class.animate-spin]="cargando()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>Refrescar</span>
          </button>

          <button
            type="button"
            data-testid="btn-descargar-csv"
            (click)="exportarCsv()"
            [disabled]="turnos().length === 0 || reporteService.descargandoArchivo()"
            class="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 border border-slate-200 ps-3 pe-3.5 py-2 rounded-xl hover:bg-slate-50 transition shadow-xs bg-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            @if (reporteService.descargandoArchivo() && reporteService.formatoDescargaActivo() === 'csv') {
              <span class="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full motion-safe:animate-spin"></span>
            } @else {
              <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
            }
            <span>Descargar CSV</span>
          </button>

          <button
            type="button"
            data-testid="btn-descargar-pdf"
            (click)="exportarPdf()"
            [disabled]="turnos().length === 0 || reporteService.descargandoArchivo()"
            class="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 border border-slate-200 ps-3 pe-3.5 py-2 rounded-xl hover:bg-slate-50 transition shadow-xs bg-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            @if (reporteService.descargandoArchivo() && reporteService.formatoDescargaActivo() === 'pdf') {
              <span class="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full motion-safe:animate-spin"></span>
            } @else {
              <svg class="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            }
            <span>Descargar PDF</span>
          </button>
        </div>
      </div>

      <!-- Barra de Filtros: Rango de Fechas y Colaborador Cajero (HU-36.09 / Notion: CA-01) -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fecha Inicio / Fecha:</label>
          <input
            type="date"
            data-testid="filtro-fecha-inicio"
            [(ngModel)]="fechaSeleccionada"
            (ngModelChange)="onFechaChange()"
            class="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fecha Fin (Rango Opcional):</label>
          <input
            type="date"
            data-testid="filtro-fecha-fin"
            [(ngModel)]="fechaFin"
            (ngModelChange)="cargarTurnos()"
            class="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Filtrar por Cajero:</label>
          <input
            type="text"
            data-testid="filtro-cajero-turnos"
            [(ngModel)]="filtroCajero"
            placeholder="Nombre o ID del cajero..."
            class="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <!-- Tabla Interactiva de Conciliación con Resaltado en Rojo para Descuadres (HU-36.10 / CA-02, CA-03) -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          @if (cargando()) {
            <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
              <svg class="animate-spin w-8 h-8 text-blue-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p class="text-sm font-semibold text-slate-700">Cargando turnos y conciliación contable...</p>
            </div>
          } @else if (turnosFiltrados().length > 0) {
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200/80">
                  <th class="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">Cajero Responsable</th>
                  <th class="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">Apertura / Cierre</th>
                  <th class="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">Base</th>
                  <th class="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">Efectivo</th>
                  <th class="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">Electrónico</th>
                  <th class="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">Total Ventas</th>
                  <th class="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">Diferencia</th>
                  <th class="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">Estado</th>
                  <th class="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (s of turnosFiltrados(); track s.id) {
                  <!-- Fila con resaltado en rojo para turnos con descuadres (HU-36.10 / CA-03) -->
                  <tr
                    [attr.data-testid]="s.tieneDescuadre ? 'fila-turno-descuadre-' + s.id : 'fila-turno-' + s.id"
                    class="transition-colors hover:bg-slate-50/70"
                    [ngClass]="s.tieneDescuadre ? 'bg-red-50/80 border-l-4 border-l-red-600 text-red-950 font-medium' : ''">
                    
                    <td class="px-4 py-3 whitespace-nowrap">
                      <div class="flex items-center gap-2.5">
                        <div
                          class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-2xs"
                          [ngClass]="s.tieneDescuadre ? 'bg-red-200 text-red-900' : 'bg-blue-100 text-blue-700'">
                          {{ getInitials(s.cajero) }}
                        </div>
                        <div>
                          <span class="font-bold text-slate-900 block leading-tight">{{ s.cajero }}</span>
                          <span class="text-[10px] text-slate-400 font-medium">{{ s.rol }}</span>
                        </div>
                      </div>
                    </td>

                    <td class="px-4 py-3 whitespace-nowrap text-xs text-slate-600 font-mono">
                      <div>{{ s.apertura | date:'shortTime' }}</div>
                      @if (s.cierre) {
                        <div class="text-[10px] text-slate-400">Fin: {{ s.cierre | date:'shortTime' }}</div>
                      }
                    </td>

                    <td class="px-4 py-3 text-right whitespace-nowrap font-mono text-slate-600">
                      \${{ s.base.toLocaleString('es-CO') }}
                    </td>

                    <td class="px-4 py-3 text-right whitespace-nowrap font-mono text-slate-700 font-medium">
                      \${{ (s.efectivo || 0).toLocaleString('es-CO') }}
                    </td>

                    <td class="px-4 py-3 text-right whitespace-nowrap font-mono text-slate-700 font-medium">
                      \${{ (s.electronico || 0).toLocaleString('es-CO') }}
                    </td>

                    <td class="px-4 py-3 text-right whitespace-nowrap font-mono font-bold text-slate-900">
                      \${{ s.ventas.toLocaleString('es-CO') }}
                    </td>

                    <!-- Columna de Diferencia con Resaltado Rojo si Descuadre (HU-36.10 / CA-03) -->
                    <td class="px-4 py-3 text-right whitespace-nowrap font-mono font-extrabold">
                      @if (s.tieneDescuadre) {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 border border-red-300">
                          {{ (s.diferencia || 0) < 0 ? '-' : ((s.diferencia || 0) > 0 ? '+' : '') }}\${{ Math.abs(s.diferencia || 0).toLocaleString('es-CO') }}
                        </span>
                      } @else {
                        <span class="text-emerald-600 text-xs">$0 (Cuadrado)</span>
                      }
                    </td>

                    <td class="px-4 py-3 text-center whitespace-nowrap">
                      @if (s.activo) {
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
                          Activo
                        </span>
                      } @else {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Cerrado
                        </span>
                      }
                    </td>

                    <!-- Acción para Ver Detalle y Boletas del Turno (HU-36.11 / CA-04) -->
                    <td class="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        [attr.data-testid]="'btn-auditar-turno-' + s.id"
                        (click)="abrirModalDetalleTurno(s)"
                        class="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded-lg transition cursor-pointer">
                        Auditar
                      </button>
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
              <p class="text-sm font-semibold text-slate-700">Sin registros de turnos en el rango o filtro seleccionado</p>
              <p class="text-xs text-slate-400 mt-0.5">Verifica las fechas ingresadas o el nombre del cajero.</p>
            </div>
          }
        </div>
      </div>

      <!-- Modal de Auditoría Detallada de Boletas del Turno (HU-36.11 / Notion: CA-04) -->
      @if (turnoSeleccionadoParaAuditoria()) {
        <div
          data-testid="modal-detalle-conciliacion-turno"
          (click)="onBackdropClick($event)"
          class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto overscroll-contain cursor-pointer">
          <div
            (click)="$event.stopPropagation()"
            class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] animate-in fade-in motion-safe:zoom-in-95 duration-150 cursor-default">
            
            <div class="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 class="text-lg font-black text-slate-900 leading-tight">
                  Auditoría de Turno #{{ turnoSeleccionadoParaAuditoria()?.id }}
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  Cajero: <strong class="text-slate-800">{{ turnoSeleccionadoParaAuditoria()?.cajero }}</strong> •
                  Apertura: <span class="font-mono text-slate-700">{{ turnoSeleccionadoParaAuditoria()?.apertura | date:'short' }}</span>
                </p>
              </div>

              <button
                type="button"
                data-testid="btn-cerrar-modal-detalle-turno"
                (click)="cerrarModalDetalleTurno()"
                class="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Resumen Contable Rápido -->
            <div class="grid grid-cols-3 gap-2 my-4 text-xs">
              <div class="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                <span class="text-[10px] text-slate-400 uppercase font-bold block">Base</span>
                <span class="text-sm font-black font-mono text-slate-800">
                  \${{ (turnoSeleccionadoParaAuditoria()?.base || 0).toLocaleString('es-CO') }}
                </span>
              </div>
              <div class="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                <span class="text-[10px] text-slate-400 uppercase font-bold block">Ventas</span>
                <span class="text-sm font-black font-mono text-slate-800">
                  \${{ (turnoSeleccionadoParaAuditoria()?.ventas || 0).toLocaleString('es-CO') }}
                </span>
              </div>
              <div
                class="rounded-xl p-3 border"
                [ngClass]="turnoSeleccionadoParaAuditoria()?.tieneDescuadre ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'">
                <span class="text-[10px] uppercase font-bold block">Diferencia</span>
                <span class="text-sm font-black font-mono">
                  \${{ (turnoSeleccionadoParaAuditoria()?.diferencia || 0).toLocaleString('es-CO') }}
                </span>
              </div>
            </div>

            <!-- Listado de Boletas Vendidas (HU-36.11 / CA-04) -->
            <div class="flex-1 overflow-y-auto overscroll-contain pr-1">
              <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Boletas Emitidas Durante el Turno:
              </h4>

              @if (cargandoBoletasTurno()) {
                <div class="py-8 text-center text-xs text-slate-400">Cargando boletas...</div>
              } @else if (boletasTurno().length > 0) {
                <div class="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <table class="w-full">
                    <thead class="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th class="p-2.5 text-left font-bold text-slate-600">Hora</th>
                        <th class="p-2.5 text-left font-bold text-slate-600">Boleta</th>
                        <th class="p-2.5 text-left font-bold text-slate-600">Atracción / Menor</th>
                        <th class="p-2.5 text-center font-bold text-slate-600">Método</th>
                        <th class="p-2.5 text-right font-bold text-slate-600">Valor</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (boleta of boletasTurno(); track boleta.idBoleta) {
                        <tr class="hover:bg-slate-50/50">
                          <td class="p-2.5 font-mono text-slate-500 whitespace-nowrap">{{ boleta.horaVenta }}</td>
                          <td class="p-2.5 font-mono font-bold text-slate-800">{{ boleta.codigoBoleta }}</td>
                          <td class="p-2.5 text-slate-700">
                            <span class="font-semibold block">{{ boleta.atraccionNombre }}</span>
                            <span class="text-[10px] text-slate-400">{{ boleta.menorNombre }}</span>
                          </td>
                          <td class="p-2.5 text-center">
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {{ boleta.metodoPago }}
                            </span>
                          </td>
                          <td class="p-2.5 text-right font-mono font-extrabold text-slate-900">
                            \${{ boleta.valor.toLocaleString('es-CO') }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                  Sin boletas registradas para este turno
                </div>
              }
            </div>

            <div class="pt-4 border-t border-slate-100 mt-4 flex justify-end">
              <button
                type="button"
                (click)="cerrarModalDetalleTurno()"
                class="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer">
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class TurnosComponent implements OnInit {
  private readonly cajaService = inject(CajaService);
  readonly reporteService = inject(ReporteService);
  private readonly destroyRef = inject(DestroyRef);
  readonly Math = Math;

  fechaSeleccionada = new Date().toISOString().slice(0, 10);
  fechaFin = '';
  private readonly _filtroCajero = signal<string>('');
  get filtroCajero(): string {
    return this._filtroCajero();
  }
  set filtroCajero(val: string) {
    this._filtroCajero.set(val || '');
  }

  readonly cargando = signal<boolean>(false);
  readonly turnos = signal<TurnoItem[]>([]);

  readonly turnoSeleccionadoParaAuditoria = signal<TurnoItem | null>(null);
  readonly boletasTurno = signal<any[]>([]);
  readonly cargandoBoletasTurno = signal<boolean>(false);

  readonly turnosFiltrados = computed<TurnoItem[]>(() => {
    const list = this.turnos();
    const cajeroQuery = this._filtroCajero().toLowerCase().trim();
    if (!cajeroQuery) return list;
    return list.filter(t =>
      t.cajero.toLowerCase().includes(cajeroQuery) ||
      String(t.idUsuario || '').includes(cajeroQuery)
    );
  });

  ngOnInit(): void {
    this.cargarTurnos();
  }

  onFechaChange(): void {
    this.cargarTurnos();
  }

  cargarTurnos(): void {
    this.cargando.set(true);

    this.reporteService
      .consultarTurnosConciliacion({
        fecha: this.fechaSeleccionada,
        fechaInicio: this.fechaSeleccionada,
        fechaFin: this.fechaFin,
        cajero: this.filtroCajero
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          const mapeados: TurnoItem[] = (items || []).map(t => ({
            id: t.id,
            idUsuario: t.idUsuario,
            cajero: t.cajero,
            rol: t.rol || 'Taquillero',
            apertura: t.apertura,
            cierre: t.cierre,
            base: t.base,
            efectivo: t.efectivo,
            electronico: t.electronico,
            ventas: t.ventas,
            esperado: t.esperado,
            fisico: t.fisico,
            diferencia: t.diferencia,
            tieneDescuadre: t.tieneDescuadre,
            tiquetes: t.tiquetes,
            activo: t.activo
          }));
          this.turnos.set(mapeados);
          this.cargando.set(false);
        },
        error: () => {
          this.turnos.set([]);
          this.cargando.set(false);
        }
      });
  }

  abrirModalDetalleTurno(turno: TurnoItem): void {
    this.turnoSeleccionadoParaAuditoria.set(turno);
    this.cargandoBoletasTurno.set(true);
    this.reporteService.obtenerDetalleConciliacionTurno(turno.id).subscribe({
      next: (detalle) => {
        this.boletasTurno.set(detalle?.boletasVendidas || []);
        this.cargandoBoletasTurno.set(false);
      },
      error: () => {
        this.boletasTurno.set([]);
        this.cargandoBoletasTurno.set(false);
      }
    });
  }

  cerrarModalDetalleTurno(): void {
    this.turnoSeleccionadoParaAuditoria.set(null);
    this.boletasTurno.set([]);
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.turnoSeleccionadoParaAuditoria()) {
      this.cerrarModalDetalleTurno();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cerrarModalDetalleTurno();
    }
  }

  getInitials(name: string): string {
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2);
  }

  exportarCsv(): void {
    if (this.turnos().length === 0) return;
    this.reporteService.descargarReporteFinancieroBlob('csv', this.fechaSeleccionada).subscribe();
  }

  exportarPdf(): void {
    if (this.turnos().length === 0) return;
    this.reporteService.descargarReporteFinancieroBlob('pdf', this.fechaSeleccionada).subscribe();
  }
}
