import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { UsuarioService } from '../../../../core/services/usuario.service';
import { AsignacionService } from '../../../../core/services/asignacion.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Atraccion } from '../../../../core/models/atraccion.model';
import { Usuario } from '../../../../core/models/usuario.model';
import { AsignacionOperario } from '../../../../core/models/asignacion.model';
import { extractInitials } from '../../../../core/utils/initials.util';

interface AttractionAssignmentRow {
  atraccion: Atraccion;
  asignacion?: AsignacionOperario;
  selectedOperarioId?: number | string;
}

@Component({
  selector: 'app-asignaciones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full space-y-5 font-sans">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="font-bold text-slate-800 text-lg">Asignación de Operarios a Atracciones</h2>
          <p class="text-xs text-slate-400 mt-0.5">Control de vinculación de personal operativo en campo</p>
        </div>

        <button (click)="refresh()"
          class="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer self-start sm:self-auto">
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Actualizar estado
        </button>
      </div>

      <!-- Métricas Resumen -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-xs">
          <p class="text-[11px] text-slate-400 font-medium">Atracciones Activas</p>
          <p class="text-xl font-bold text-slate-800 mt-0.5">{{ atracciones().length }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-xs">
          <p class="text-[11px] text-slate-400 font-medium">Con Operario</p>
          <p class="text-xl font-bold text-emerald-600 mt-0.5">{{ asignadasCount() }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-xs">
          <p class="text-[11px] text-slate-400 font-medium">Sin Operario</p>
          <p class="text-xl font-bold text-amber-500 mt-0.5">{{ sinAsignarCount() }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-xs">
          <p class="text-[11px] text-slate-400 font-medium">Operarios Libres</p>
          <p class="text-xl font-bold text-blue-600 mt-0.5">{{ operariosDisponibles().length }}</p>
        </div>
      </div>

      <!-- Cuadrícula de Atracciones y Operarios -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        @for (row of rows(); track row.atraccion.id) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition">
            <!-- Header de Tarjeta -->
            <div>
              <div class="flex items-start justify-between mb-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  [style.background-color]="row.atraccion.lightBg || '#DBEAFE'">
                  <span class="text-base font-bold" [style.color]="row.atraccion.color || '#2563EB'">★</span>
                </div>

                @if (row.asignacion) {
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                    Operativo en turno
                  </span>
                } @else {
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <span class="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block"></span>
                    Sin operario
                  </span>
                }
              </div>

              <!-- Nombre y Detalles de Atracción -->
              <h3 class="font-bold text-slate-800 text-base">{{ row.atraccion.nombre }}</h3>
              <p class="text-xs text-slate-400 mb-4">
                {{ row.atraccion.tipo === 'EVENTOS_CAIDAS' ? 'Modo Eventos (Caídas)' : 'Modo Temporizado' }} · Capacidad máx. {{ row.atraccion.capacidadMaxima || 10 }}
              </p>

              <!-- Sección del Operario Actual -->
              @if (row.asignacion) {
                <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">
                  <p class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Operario Responsable</p>
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {{ getInitials(row.asignacion.operarioNombre || 'OP') }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-bold text-slate-800 truncate">{{ row.asignacion.operarioNombre }}</p>
                      <p class="text-[10px] text-slate-400 truncate">{{ row.asignacion.operarioCorreo || 'operario@parque.com' }}</p>
                    </div>
                  </div>
                </div>
              } @else {
                <div class="bg-amber-50/60 rounded-xl p-3 border border-amber-100 mb-4 text-center">
                  <p class="text-xs font-semibold text-amber-800">Esta estación no tiene personal asignado</p>
                  <p class="text-[10px] text-amber-600 mt-0.5">Los niños no podrán ingresar hasta vincular un operario.</p>
                </div>
              }
            </div>

            <!-- Acciones de Asignación / Liberación -->
            <div class="pt-2 border-t border-slate-100 space-y-2">
              @if (row.asignacion) {
                <button (click)="liberarOperario(row)"
                  class="w-full py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  Liberar estación
                </button>
              } @else {
                <div class="flex gap-2">
                  <select [ngModel]="getSelectedOperarioId(row.atraccion.id) ?? row.selectedOperarioId"
                    (ngModelChange)="onSelectOperario(row.atraccion.id, $event)"
                    class="flex-1 text-xs px-2.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-blue-500">
                    <option [ngValue]="undefined">Seleccionar operario...</option>
                    @for (op of operariosDisponibles(); track op.id) {
                      <option [ngValue]="op.id">{{ op.nombre }} ({{ op.correo }})</option>
                    }
                  </select>

                  <button (click)="asignarOperario(row)" [disabled]="!getSelectedOperarioId(row.atraccion.id) && !row.selectedOperarioId"
                    class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1">
                    Asignar
                  </button>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Modal de Conflicto de Reasignación -->
      @if (conflicto()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>

            <div class="text-center">
              <h3 class="text-base font-bold text-slate-800">Conflicto de Asignación</h3>
              <p class="text-xs text-slate-500 mt-2">
                El operario <strong>{{ conflicto()?.operarioNombre }}</strong> ya tiene una asignación activa en otra atracción:
              </p>
              <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 my-3 text-xs font-semibold text-slate-700">
                Atracción actual: {{ conflicto()?.atraccionActualNombre }}
              </div>
              <p class="text-xs text-slate-500">
                ¿Deseas reasignarlo a la nueva atracción y liberar su estación anterior?
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <button (click)="cancelarConflicto()"
                class="py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition cursor-pointer">
                Cancelar
              </button>
              <button (click)="confirmarReasignacion()"
                class="py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer">
                Reasignar Operario
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AsignacionesComponent implements OnInit {
  private atraccionService = inject(AtraccionService);
  private usuarioService = inject(UsuarioService);
  private asignacionService = inject(AsignacionService);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  atracciones = signal<Atraccion[]>([]);
  operarios = signal<Usuario[]>([]);
  asignaciones = signal<AsignacionOperario[]>([]);
  selectedOperarios = signal<Record<number | string, number | string | undefined>>({});

  conflicto = signal<{
    operarioId: number | string;
    operarioNombre: string;
    atraccionActualNombre: string;
    targetRow: AttractionAssignmentRow;
  } | null>(null);

  rows = computed<AttractionAssignmentRow[]>(() => {
    const asigs = this.asignaciones();
    return this.atracciones().map(a => {
      const asig = asigs.find(x => x.atraccionId === a.id && x.activo);
      return {
        atraccion: a,
        asignacion: asig,
        selectedOperarioId: undefined
      };
    });
  });

  operariosDisponibles = computed<Usuario[]>(() => {
    const ocupadosIds = new Set(
      this.asignaciones()
        .filter(a => a.activo)
        .map(a => a.operarioId)
    );
    return this.operarios().filter(op => op.id != null && !ocupadosIds.has(op.id));
  });

  asignadasCount = computed(() => this.asignaciones().filter(a => a.activo).length);
  sinAsignarCount = computed(() => Math.max(0, this.atracciones().length - this.asignadasCount()));

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    // 1. Cargar atracciones
    this.atraccionService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (data && data.length > 0) {
            this.atracciones.set(data.filter(a => a.estado !== 'INACTIVO'));
          } else {
            this.atracciones.set([]);
          }
        },
        error: () => this.atracciones.set([])
      });

    // 2. Cargar operarios
    this.usuarioService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (data) {
            this.operarios.set(data.filter(u => u.rol === 'OPERARIO' && u.estado === 'ACTIVO'));
          }
        },
        error: () => this.operarios.set([])
      });

    // 3. Cargar asignaciones activas
    this.asignacionService.getActiveAssignments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.asignaciones.set(data || []),
        error: () => this.asignaciones.set([])
      });
  }

  getInitials(name: string): string {
    return extractInitials(name);
  }

  getSelectedOperarioId(atraccionId?: number | string): number | string | undefined {
    if (atraccionId == null) return undefined;
    return this.selectedOperarios()[atraccionId];
  }

  onSelectOperario(atraccionId: number | string | undefined, operarioId: number | string | undefined): void {
    if (atraccionId == null) return;
    this.selectedOperarios.update(curr => ({ ...curr, [atraccionId]: operarioId }));
  }

  asignarOperario(row: AttractionAssignmentRow) {
    const atraccionId = row.atraccion.id;
    if (!atraccionId) return;

    const opId = this.getSelectedOperarioId(atraccionId) ?? row.selectedOperarioId;
    if (!opId) return;

    const op = this.operarios().find(u => u.id === opId);
    if (!op) return;

    // Verificar si ya está asignado en otra atracción (Escenario 2 de HU-10: Conflicto 409)
    const asignacionPrevia = this.asignaciones().find(a => a.operarioId === opId && a.activo);
    if (asignacionPrevia && asignacionPrevia.atraccionId !== atraccionId) {
      this.conflicto.set({
        operarioId: opId,
        operarioNombre: op.nombre ?? 'Operario',
        atraccionActualNombre: asignacionPrevia.atraccionNombre || `Atracción #${asignacionPrevia.atraccionId}`,
        targetRow: row
      });
      return;
    }

    this.procederAsignacion(atraccionId, op, false);
  }

  procederAsignacion(atraccionId: number | string, op: Usuario, forzar: boolean) {
    this.asignacionService.assignOperator(atraccionId, op.id!, forzar)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (nueva) => {
          this.asignaciones.update(list => {
            const filtrada = forzar ? list.filter(a => a.operarioId !== op.id) : list;
            return [...filtrada, nueva];
          });
          this.selectedOperarios.update(curr => {
            const next = { ...curr };
            delete next[atraccionId];
            return next;
          });
          this.notificationService.success(`Operario ${op.nombre} asignado correctamente.`);
        },
        error: (err) => {
          const msg = err.error?.mensaje || 'No fue posible asignar el operario. Revisa la conexión con el servidor.';
          this.notificationService.error(msg);
        }
      });
  }

  confirmarReasignacion() {
    const c = this.conflicto();
    if (!c) return;

    const op = this.operarios().find(u => u.id === c.operarioId);
    if (op && c.targetRow.atraccion.id) {
      this.procederAsignacion(c.targetRow.atraccion.id, op, true);
    }
    this.conflicto.set(null);
  }

  cancelarConflicto() {
    this.conflicto.set(null);
  }

  liberarOperario(row: AttractionAssignmentRow) {
    if (!row.asignacion?.id) return;

    const asigId = row.asignacion.id;
    this.asignacionService.releaseAssignment(asigId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.asignaciones.update(list => list.filter(a => a.id !== asigId));
          this.notificationService.info(`Estación liberada.`);
        },
        error: (err) => {
          const msg = err.error?.mensaje || 'Error al liberar la estación en el servidor.';
          this.notificationService.error(msg);
        }
      });
  }
}
