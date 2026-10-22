import { Component, OnInit, inject, signal, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Atraccion } from '../../../../core/models/atraccion.model';
import { AtraccionFormComponent } from './atraccion-form.component';
import { TarifasModalComponent } from './tarifas-modal.component';

@Component({
  selector: 'app-atracciones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="w-full space-y-5 font-sans">
      <!-- Encabezado y acciones -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="font-bold text-slate-800 text-lg">Atracciones</h2>
          <p class="text-xs text-slate-400 mt-0.5">Configuración y estado de todas las atracciones del parque</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <!-- Switch de vista: Cards / Tabla -->
          @if (atracciones().length > 0) {
            <div class="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
              <button (click)="viewMode.set('grid')"
                [class]="viewMode() === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                class="px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                </svg>
                Tarjetas
              </button>
              <button (click)="viewMode.set('table')"
                [class]="viewMode() === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                class="px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                </svg>
                Tabla
              </button>
            </div>
          }

          <button (click)="openDialog()"
            class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm cursor-pointer self-start sm:self-auto">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Nueva atracción
          </button>
        </div>
      </div>

      <!-- VISTA 1: GRID DE TARJETAS (Si existen atracciones) -->
      @if (atracciones().length > 0) {
        @if (viewMode() === 'grid') {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (a of atracciones(); track a.id) {
              <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition">
                <!-- Header de la tarjeta -->
                <div class="flex items-start justify-between mb-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    [style.background-color]="a.lightBg || '#DBEAFE'">
                    <span class="text-base font-bold" [style.color]="a.color || '#2563EB'">★</span>
                  </div>
                  
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    [ngClass]="a.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'">
                    @if (a.estado === 'ACTIVO') {
                      <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                      Activa
                    } @else {
                      Inactiva
                    }
                  </span>
                </div>

                <!-- Nombre y Resumen -->
                <p class="font-bold text-slate-800 text-base mb-0.5 truncate">{{ a.nombre }}</p>
                <p class="text-xs text-slate-400 mb-3 truncate">{{ a.tag || ((a.duracion || a.duracionMinutosBase || 20) + ' min · máx ' + (a.maxCapacity || a.capacidadMaxima || 10)) }}</p>

                <!-- Grid de Métricas -->
                <div class="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div class="bg-slate-50 rounded-lg p-2 border border-slate-100/60">
                    <p class="text-slate-400 text-[10px]">Precio</p>
                    <p class="font-bold text-slate-700">\${{ (a.precio || a.tarifaMinuto || 0).toLocaleString('es-CO') }}</p>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-2 border border-slate-100/60">
                    <p class="text-slate-400 text-[10px]">Capacidad</p>
                    <p class="font-bold text-slate-700">{{ a.maxCapacity || a.capacidadMaxima || 10 }} niños</p>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-2 border border-slate-100/60">
                    <p class="text-slate-400 text-[10px]">Tipo</p>
                    <p class="font-bold text-slate-700">
                      {{ a.tipo === 'EVENTOS_CAIDAS' ? 'Caídas' : 'Tiempo' }}
                    </p>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-2 border border-slate-100/60">
                    <p class="text-slate-400 text-[10px]">Duración</p>
                    <p class="font-bold text-slate-700">
                      {{ a.tipo === 'EVENTOS_CAIDAS' ? 'Por caídas' : ((a.duracionMinutosBase || a.duracion || 15) + ' min') }}
                    </p>
                  </div>
                </div>

                <!-- Botones de Acción -->
                <div class="flex gap-2">
                  <button (click)="openTarifasDialog(a)"
                    class="flex-1 py-1.5 text-xs font-semibold text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition flex items-center justify-center gap-1 cursor-pointer">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Tarifas
                  </button>
                  <button (click)="openDialog(a)"
                    class="flex-1 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition flex items-center justify-center gap-1 cursor-pointer">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                    </svg>
                    Editar
                  </button>
                  <button (click)="deleteAtraccion(a)"
                    class="flex-1 py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition flex items-center justify-center gap-1 cursor-pointer">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Eliminar
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- VISTA 2: TABLA DETALLADA -->
        @if (viewMode() === 'table') {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-100">
                    <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                    <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Precio</th>
                    <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Capacidad</th>
                    <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo / Duración</th>
                    <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                    <th class="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  @for (a of atracciones(); track a.id) {
                    <tr class="hover:bg-slate-50/50 transition">
                      <td class="px-5 py-3.5 whitespace-nowrap">
                        <div class="flex items-center gap-2.5">
                          <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            [style.background-color]="a.lightBg || '#DBEAFE'">
                            <span class="text-xs font-bold" [style.color]="a.color || '#2563EB'">★</span>
                          </div>
                          <span class="font-semibold text-slate-800">{{ a.nombre }}</span>
                        </div>
                      </td>
                      <td class="px-5 py-3.5 font-bold text-slate-800 whitespace-nowrap">
                        \${{ (a.precio || a.tarifaMinuto || 0).toLocaleString('es-CO') }}
                      </td>
                      <td class="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                        {{ a.maxCapacity || a.capacidadMaxima || 10 }} niños
                      </td>
                      <td class="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                        {{ a.tipo === 'EVENTOS_CAIDAS' ? 'Caídas' : ((a.duracionMinutosBase || a.duracion || 15) + ' min') }}
                      </td>
                      <td class="px-5 py-3.5 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          [ngClass]="a.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'">
                          {{ a.estado === 'ACTIVO' ? 'Activa' : 'Inactiva' }}
                        </span>
                      </td>
                      <td class="px-5 py-3.5 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-2">
                          <button (click)="openTarifasDialog(a)" class="text-xs font-semibold text-amber-600 hover:text-amber-800 hover:underline cursor-pointer">
                            Tarifas
                          </button>
                          <button (click)="openDialog(a)" class="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                            Editar
                          </button>
                          <button (click)="deleteAtraccion(a)" class="text-xs font-semibold text-red-500 hover:underline cursor-pointer">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      } @else {
        <!-- EMPTY STATE: Si no hay atracciones en la BD -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div class="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-1">No hay atracciones registradas</h3>
          <p class="text-slate-400 text-sm max-w-md mb-6">
            Aún no se han creado atracciones en la base de datos. Haz clic en el botón de abajo para registrar la primera atracción.
          </p>
          <button (click)="openDialog()"
            class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition shadow-sm cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Nueva atracción
          </button>
        </div>
      }
    </div>
  `
})
export class AtraccionesComponent implements OnInit {
  private atraccionService = inject(AtraccionService);
  private notificationService = inject(NotificationService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  viewMode = signal<'grid' | 'table'>('grid');

  // Arranca vacío y solo representa lo que existe en la base de datos
  atracciones = signal<Atraccion[]>([]);

  ngOnInit() {
    this.loadAtracciones();
  }

  loadAtracciones() {
    this.atraccionService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (data && data.length > 0) {
            const colors = ["#0EA5E9", "#F59E0B", "#8B5CF6", "#10B981", "#EF4444", "#F97316", "#2563EB"];
            const lightBgs = ["#E0F2FE", "#FEF3C7", "#EDE9FE", "#D1FAE5", "#FEE2E2", "#FFF7ED", "#DBEAFE"];

            const mapped = data.map((a, i) => {
              const tarifaMinuto = a.tarifaMinuto || a.precio || 10000;
              const duracionMinutosBase = a.duracionMinutosBase || a.duracion || 15;
              const capacidadMaxima = a.capacidadMaxima || a.maxCapacity || 10;
              return {
                ...a,
                tarifaMinuto,
                precio: tarifaMinuto,
                duracionMinutosBase,
                duracion: duracionMinutosBase,
                capacidadMaxima,
                maxCapacity: capacidadMaxima,
                color: a.color || colors[i % colors.length],
                lightBg: a.lightBg || lightBgs[i % lightBgs.length],
                tag: `${duracionMinutosBase} min · máx ${capacidadMaxima}`
              };
            });
            this.atracciones.set(mapped);
          } else {
            this.atracciones.set([]);
          }
        },
        error: () => {
          this.atracciones.set([]);
        }
      });
  }

  openDialog(atraccion?: Atraccion) {
    const dialogRef = this.dialog.open(AtraccionFormComponent, {
      width: '520px',
      panelClass: '!rounded-2xl',
      data: atraccion || null
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        if (result) {
          if (atraccion && atraccion.id) {
            this.atracciones.update(list =>
              list.map(a => a.id === atraccion.id ? { ...a, ...result } : a)
            );
          } else {
            this.atracciones.update(list => [
              ...list,
              {
                ...result,
                id: result.id || 'atr-' + Date.now(),
                color: result.color || '#2563EB',
                lightBg: result.lightBg || '#DBEAFE'
              }
            ]);
          }
        }
      });
  }

  deleteAtraccion(atraccion: Atraccion) {
    if (confirm(`¿Estás seguro de eliminar la atracción ${atraccion.nombre}?`)) {
      if (typeof atraccion.id === 'number') {
        this.atraccionService.delete(atraccion.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.atracciones.update(list => list.filter(a => a.id !== atraccion.id));
              this.notificationService.success(`Atracción ${atraccion.nombre} eliminada correctamente.`);
            },
            error: (err) => {
              const msg = err.error?.mensaje || 'Error al eliminar la atracción en el servidor.';
              this.notificationService.error(msg);
            }
          });
      } else {
        this.atracciones.update(list => list.filter(a => a.id !== atraccion.id));
      }
    }
  }

  openTarifasDialog(atraccion: Atraccion) {
    this.dialog.open(TarifasModalComponent, {
      width: '500px',
      panelClass: '!rounded-2xl',
      data: atraccion
    });
  }
}
