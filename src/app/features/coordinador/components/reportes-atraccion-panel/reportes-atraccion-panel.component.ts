import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Atraccion } from '../../../../core/models/atraccion.model';
import {
  EstadoReporteAtraccion,
  ReporteAtraccion,
  SeveridadReporte,
  TipoReporteAtraccion
} from '../../../../core/models/reporte-atraccion.model';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { ReporteAtraccionService } from '../../../../core/services/reporte-atraccion.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { exportToCsv } from '../../../../core/utils/csv-exporter';

@Component({
  selector: 'app-reportes-atraccion-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 font-sans">
      <!-- Formulario de Nuevo Reporte -->
      <section class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 class="text-base font-extrabold text-slate-800">Reportar Novedad de Atracción</h2>
            <p class="text-xs text-slate-500">Registra daños físicos/mecánicos o falta de suplementos necesarios para operar.</p>
          </div>
        </div>

        <form (ngSubmit)="enviarReporte()" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-600 mb-1">Atracción *</label>
            <select
              name="atraccionId"
              data-testid="select-reporte-atraccion"
              [ngModel]="atraccionIdSeleccionada()"
              (ngModelChange)="atraccionIdSeleccionada.set($event ? +$event : null)"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium">
              <option [ngValue]="null">Selecciona una atracción...</option>
              @for (a of atraccionesLista(); track a.id) {
                <option [ngValue]="a.id">{{ a.nombre }} ({{ formatearEstadoAtraccion(a.estado) }})</option>
              }
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-600 mb-1">Tipo de Novedad *</label>
            <select
              name="tipoReporte"
              data-testid="select-reporte-tipo"
              [ngModel]="tipoReporte()"
              (ngModelChange)="tipoReporte.set($event)"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium">
              <option value="DANO">Daño / Falla técnica</option>
              <option value="FALTA_SUPLEMENTOS">Falta de suplementos / insumos</option>
              <option value="MANTENIMIENTO_PREVENTIVO">Mantenimiento preventivo</option>
              <option value="OTRO">Otra novedad</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-600 mb-1">Severidad</label>
            <select
              name="severidad"
              data-testid="select-reporte-severidad"
              [ngModel]="severidad()"
              (ngModelChange)="severidad.set($event)"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium">
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
              <option value="CRITICA">Crítica</option>
            </select>
          </div>

          <div class="md:col-span-3">
            <label class="block text-xs font-bold text-slate-600 mb-1">Descripción detallada *</label>
            <textarea
              name="descripcion"
              data-testid="textarea-reporte-descripcion"
              rows="2"
              [ngModel]="descripcion()"
              (ngModelChange)="descripcion.set($event)"
              placeholder="Ej: Se agotaron los balones/arneses o se detectó daño en malla de seguridad..."
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"></textarea>
          </div>

          <div class="md:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <label class="inline-flex items-center gap-2 text-xs font-semibold text-rose-700 cursor-pointer select-none">
              <input
                type="checkbox"
                name="desactivarAtraccion"
                data-testid="checkbox-desactivar-atraccion"
                [ngModel]="desactivarAtraccion()"
                (ngModelChange)="desactivarAtraccion.set($event)"
                class="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500" />
              <span>Marcar atracción como <strong>Fuera de servicio</strong> inmediatamente (bloquea ventas en taquilla)</span>
            </label>

            <button
              type="submit"
              data-testid="btn-crear-reporte"
              [disabled]="guardando() || !atraccionIdSeleccionada() || !descripcion().trim()"
              class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-extrabold transition cursor-pointer shrink-0">
              {{ guardando() ? 'Registrando...' : 'Registrar Reporte' }}
            </button>
          </div>
        </form>
      </section>

      <!-- Historial y Seguimiento de Reportes -->
      <section class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-extrabold text-slate-800">Reportes Registrados ({{ reportesFiltrados().length }})</h3>
            <p class="text-[11px] text-slate-500">Seguimiento en tiempo real de daños y falta de suplementos.</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <select
              [ngModel]="filtroEstado()"
              (ngModelChange)="filtroEstado.set($event)"
              class="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold">
              <option value="TODOS">Todos los estados</option>
              <option value="ABIERTO">Abiertos</option>
              <option value="EN_PROCESO">En proceso</option>
              <option value="RESUELTO">Resueltos</option>
            </select>

            <select
              [ngModel]="filtroTipo()"
              (ngModelChange)="filtroTipo.set($event)"
              class="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold">
              <option value="TODOS">Todos los tipos</option>
              <option value="DANO">Daños</option>
              <option value="FALTA_SUPLEMENTOS">Falta de suplementos</option>
              <option value="MANTENIMIENTO_PREVENTIVO">Mantenimiento</option>
              <option value="OTRO">Otro</option>
            </select>

            <button
              type="button"
              data-testid="btn-exportar-csv-novedades"
              (click)="exportarCsv()"
              [disabled]="reportesFiltrados().length === 0"
              class="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        @if (cargando()) {
          <div class="py-8 text-center text-xs text-slate-400">Cargando reportes...</div>
        } @else if (reportesVista().length === 0) {
          <div class="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p class="text-xs font-bold text-slate-600">No hay reportes que coincidan con el filtro</p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (item of reportesVista(); track item.rep.id) {
              @let rep = item.rep;
              <div
                [attr.data-testid]="'reporte-card-' + rep.id"
                class="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:border-slate-300 transition">
                <div class="space-y-1.5 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-extrabold text-slate-800">{{ rep.atraccionNombre }}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" [ngClass]="item.claseTipo">
                      {{ item.etiquetaTipo }}
                    </span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" [ngClass]="item.claseSeveridad">
                      {{ rep.severidad }}
                    </span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" [ngClass]="item.claseEstado">
                      {{ item.etiquetaEstado }}
                    </span>
                    @if (rep.atraccionDesactivada) {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        Marcó fuera de servicio
                      </span>
                    }
                  </div>
                  <p class="text-xs text-slate-700 leading-relaxed">{{ rep.descripcion }}</p>
                  <p class="text-[11px] text-slate-400">
                    Reportado por <strong class="text-slate-600">{{ rep.usuarioReportaNombre }}</strong> · {{ item.fechaFormateada }}
                  </p>
                  @if (rep.observacionesResolucion) {
                    <p class="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                      <strong>Resolución:</strong> {{ rep.observacionesResolucion }}
                      @if (rep.usuarioResuelveNombre) {
                        <span> ({{ rep.usuarioResuelveNombre }})</span>
                      }
                    </p>
                  }
                </div>

                @if (rep.estado !== 'RESUELTO') {
                  <div class="flex flex-wrap items-center gap-2 shrink-0">
                    @if (rep.estado === 'ABIERTO') {
                      <button
                        type="button"
                        [attr.data-testid]="'btn-en-proceso-' + rep.id"
                        [disabled]="actualizandoId() === rep.id"
                        (click)="cambiarEstadoReporte(rep, 'EN_PROCESO', false)"
                        class="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed text-amber-800 border border-amber-200 transition cursor-pointer">
                        En proceso
                      </button>
                    }
                    <button
                      type="button"
                      [attr.data-testid]="'btn-resolver-' + rep.id"
                      [disabled]="actualizandoId() === rep.id"
                      (click)="cambiarEstadoReporte(rep, 'RESUELTO', rep.atraccionEstadoActual === 'FUERA_DE_SERVICIO')"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition cursor-pointer">
                      {{ rep.atraccionEstadoActual === 'FUERA_DE_SERVICIO' ? 'Resolver y Reactivar' : 'Marcar Resuelto' }}
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        }
      </section>
    </div>
  `
})
export class ReportesAtraccionPanelComponent implements OnInit {
  private readonly reporteService = inject(ReporteAtraccionService);
  private readonly atraccionService = inject(AtraccionService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() set atracciones(val: Atraccion[] | null | undefined) {
    if (val) {
      this._atraccionesExternas.set(val);
    }
  }

  @Input() set atraccionPreseleccionadaId(id: number | null | undefined) {
    if (id) {
      this.atraccionIdSeleccionada.set(id);
    }
  }

  readonly atraccionEstadoModificado = output<void>();
  readonly conteoPendientesChange = output<number>();

  private readonly _atraccionesExternas = signal<Atraccion[] | null>(null);
  private readonly _atraccionesInternas = signal<Atraccion[]>([]);
  readonly atraccionesLista = computed(() => this._atraccionesExternas() ?? this._atraccionesInternas());

  readonly reportes = signal<ReporteAtraccion[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly actualizandoId = signal<number | null>(null);

  // Form signals
  readonly atraccionIdSeleccionada = signal<number | null>(null);
  readonly tipoReporte = signal<TipoReporteAtraccion>('DANO');
  readonly severidad = signal<SeveridadReporte>('MEDIA');
  readonly descripcion = signal<string>('');
  readonly desactivarAtraccion = signal<boolean>(false);

  // Filter signals
  readonly filtroEstado = signal<'TODOS' | EstadoReporteAtraccion>('TODOS');
  readonly filtroTipo = signal<'TODOS' | TipoReporteAtraccion>('TODOS');

  readonly reportesFiltrados = computed(() => {
    const est = this.filtroEstado();
    const tip = this.filtroTipo();
    return this.reportes().filter(r =>
      (est === 'TODOS' || r.estado === est) &&
      (tip === 'TODOS' || r.tipoReporte === tip)
    );
  });

  readonly reportesVista = computed(() =>
    this.reportesFiltrados().map(rep => ({
      rep,
      fechaFormateada: this.formatearFecha(rep.fechaReporte),
      etiquetaTipo: this.etiquetaTipo(rep.tipoReporte),
      claseTipo: this.claseTipo(rep.tipoReporte),
      claseSeveridad: this.claseSeveridad(rep.severidad),
      etiquetaEstado: this.etiquetaEstado(rep.estado),
      claseEstado: this.claseEstado(rep.estado)
    }))
  );

  ngOnInit(): void {
    this.cargarReportes();
    if (!this._atraccionesExternas()) {
      this.atraccionService.getAll()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: lista => this._atraccionesInternas.set(lista || []) });
    }
  }

  cargarReportes(): void {
    this.cargando.set(true);
    this.reporteService.listar()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false))
      )
      .subscribe({
        next: lista => {
          this.reportes.set(lista || []);
          this.actualizarConteo();
        },
        error: () => this.notificationService.error('No se pudieron cargar los reportes de atracciones.')
      });
  }

  enviarReporte(): void {
    const atraccionId = this.atraccionIdSeleccionada();
    const desc = this.descripcion().trim();
    if (!atraccionId || !desc) return;

    const desactivar = this.desactivarAtraccion();
    this.guardando.set(true);
    this.reporteService.crear({
      atraccionId,
      tipoReporte: this.tipoReporte(),
      severidad: this.severidad(),
      descripcion: desc,
      desactivarAtraccion: desactivar
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.guardando.set(false))
    ).subscribe({
      next: creado => {
        this.reportes.update(prev => [creado, ...prev]);
        this.descripcion.set('');
        this.desactivarAtraccion.set(false);
        this.actualizarConteo();
        this.notificationService.success(
          desactivar
            ? 'Reporte registrado y atracción marcada Fuera de servicio.'
            : 'Reporte de atracción registrado correctamente.'
        );
        if (desactivar) {
          this.atraccionEstadoModificado.emit();
        }
      },
      error: () => this.notificationService.error('Error al registrar el reporte de atracción.')
    });
  }

  cambiarEstadoReporte(rep: ReporteAtraccion, nuevoEstado: EstadoReporteAtraccion, reactivar: boolean): void {
    if (this.actualizandoId() === rep.id) return;
    this.actualizandoId.set(rep.id);
    this.reporteService.actualizarEstado(rep.id, {
      estado: nuevoEstado,
      observacionesResolucion: nuevoEstado === 'RESUELTO'
        ? (reactivar ? 'Novedad resuelta y atracción reactivada' : 'Novedad resuelta')
        : 'En atención por equipo técnico/operativo',
      reactivarAtraccion: reactivar
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.actualizandoId.set(null))
    ).subscribe({
      next: actualizado => {
        this.reportes.update(prev => prev.map(item => item.id === rep.id ? actualizado : item));
        this.actualizarConteo();
        this.notificationService.success(
          reactivar ? 'Reporte resuelto y atracción reactivada.' : 'Estado del reporte actualizado.'
        );
        if (reactivar) {
          this.atraccionEstadoModificado.emit();
        }
      },
      error: (err) => {
        const msg = err?.error?.detalles || err?.error?.mensaje || err?.error?.message || 'No se pudo actualizar el estado del reporte.';
        this.notificationService.error(msg);
      }
    });
  }

  private actualizarConteo(): void {
    const pendientes = this.reportes().filter(r => r.estado !== 'RESUELTO').length;
    this.conteoPendientesChange.emit(pendientes);
  }

  exportarCsv(): void {
    const lista = this.reportesFiltrados();
    if (lista.length === 0) return;

    const headers = [
      'ID',
      'Fecha Reporte',
      'Atracción',
      'Tipo Novedad',
      'Severidad',
      'Estado',
      'Fuera de Servicio',
      'Reportado Por',
      'Descripción',
      'Fecha Resolución',
      'Resuelto Por',
      'Observaciones Resolución'
    ];

    const rows = lista.map(r => [
      r.id,
      r.fechaReporte ? this.formatearFecha(r.fechaReporte) : '',
      r.atraccionNombre || '',
      this.etiquetaTipo(r.tipoReporte),
      r.severidad || '',
      this.etiquetaEstado(r.estado),
      r.atraccionDesactivada ? 'Sí' : 'No',
      r.usuarioReportaNombre || '',
      r.descripcion || '',
      r.fechaResolucion ? this.formatearFecha(r.fechaResolucion) : '—',
      r.usuarioResuelveNombre || '—',
      r.observacionesResolucion || '—'
    ]);

    const fechaHoy = new Date().toISOString().slice(0, 10);
    exportToCsv(`auditoria_novedades_${fechaHoy}`, headers, rows);
  }

  etiquetaTipo(t: TipoReporteAtraccion): string {
    switch (t) {
      case 'DANO': return 'Daño / Falla';
      case 'FALTA_SUPLEMENTOS': return 'Falta de suplementos';
      case 'MANTENIMIENTO_PREVENTIVO': return 'Mantenimiento';
      default: return 'Otro';
    }
  }

  claseTipo(t: TipoReporteAtraccion): string {
    if (t === 'DANO') return 'bg-rose-50 text-rose-700 border border-rose-200';
    if (t === 'FALTA_SUPLEMENTOS') return 'bg-amber-50 text-amber-800 border border-amber-200';
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  }

  claseSeveridad(s: SeveridadReporte): string {
    if (s === 'CRITICA') return 'bg-red-600 text-white';
    if (s === 'ALTA') return 'bg-orange-100 text-orange-800';
    if (s === 'MEDIA') return 'bg-blue-50 text-blue-700';
    return 'bg-slate-100 text-slate-600';
  }

  etiquetaEstado(e: EstadoReporteAtraccion): string {
    if (e === 'EN_PROCESO') return 'En proceso';
    if (e === 'RESUELTO') return 'Resuelto';
    return 'Abierto';
  }

  claseEstado(e: EstadoReporteAtraccion): string {
    if (e === 'RESUELTO') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (e === 'EN_PROCESO') return 'bg-amber-50 text-amber-800 border border-amber-200';
    return 'bg-blue-50 text-blue-700 border border-blue-200';
  }

  formatearEstadoAtraccion(estado?: string): string {
    if (estado === 'FUERA_DE_SERVICIO') return 'Fuera de servicio';
    if (estado === 'MANTENIMIENTO') return 'Mantenimiento';
    if (estado === 'INACTIVO') return 'Inactiva';
    return 'Activa';
  }

  formatearFecha(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  }
}
