import { ChangeDetectionStrategy, Component, computed, Input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Atraccion, ModalidadSeleccionada, SeleccionCatalogoPOS } from '../../../../core/models/atraccion.model';

@Component({
  selector: 'app-catalogo-atracciones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4 font-sans">
      <!-- Barra de Filtros y Búsqueda -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div class="relative flex-1 max-w-sm">
          <input
            data-testid="input-buscar-catalogo"
            type="text"
            [ngModel]="busqueda()"
            (ngModelChange)="busqueda.set($event)"
            placeholder="Buscar atracción..."
            class="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-slate-800 placeholder-slate-400 font-medium" />
          <svg class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <!-- Pestañas de Filtro Rápido -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            data-testid="filtro-todas"
            (click)="filtroTipo.set('TODAS')"
            [class]="filtroTipo() === 'TODAS' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0">
            Todas ({{ _atracciones().length }})
          </button>
          <button
            type="button"
            data-testid="filtro-temporizadas"
            (click)="filtroTipo.set('TEMPORIZADA')"
            [class]="filtroTipo() === 'TEMPORIZADA' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0">
            Tiempo ({{ totalTemporizadas() }})
          </button>
          <button
            type="button"
            data-testid="filtro-eventos"
            (click)="filtroTipo.set('EVENTOS_CAIDAS')"
            [class]="filtroTipo() === 'EVENTOS_CAIDAS' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0">
            Caídas ({{ totalEventos() }})
          </button>
        </div>
      </div>

      <!-- Estado de Carga -->
      @if (_cargando()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="loading-skeleton">
          @for (item of [1, 2, 3, 4, 5, 6]; track item) {
            <div class="bg-white rounded-2xl border border-slate-200/80 p-4 animate-pulse space-y-3">
              <div class="h-32 bg-slate-200 rounded-xl w-full"></div>
              <div class="h-4 bg-slate-200 rounded w-3/4"></div>
              <div class="h-3 bg-slate-200 rounded w-1/2"></div>
              <div class="h-8 bg-slate-200 rounded-lg w-full"></div>
            </div>
          }
        </div>
      } @else if (atraccionesFiltradas().length === 0) {
        <!-- Estado Vacío -->
        <div class="bg-white rounded-2xl border border-slate-200/80 p-8 text-center" data-testid="empty-catalog">
          <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 class="text-sm font-bold text-slate-700">No se encontraron atracciones</h3>
          <p class="text-xs text-slate-400 mt-1">Intenta con otro término de búsqueda o cambia el filtro de categoría.</p>
        </div>
      } @else {
        <!-- Catálogo de Tarjetas -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (a of atraccionesFiltradas(); track a.id) {
            @let cupos = calcularCuposDisponibles(a);
            @let capacidad = a.capacidadMaxima || a.maxCapacity || 10;
            @let ocupados = a.ninosActivos || 0;
            @let bloqueada = estaBloqueada(a);
            @let modalidadActual = getModalidadActual(a);

            <div
              [attr.data-testid]="'card-atraccion-' + a.id"
              class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md relative"
              [class.opacity-60]="bloqueada"
              [class.bg-slate-50]="bloqueada">

              <!-- Cabecera Visual / Multimedia -->
              <div class="relative h-32 w-full overflow-hidden bg-slate-100 flex items-center justify-center">
                @if (a.imagenUrl) {
                  <img
                    [src]="a.imagenUrl"
                    [alt]="a.nombre"
                    class="w-full h-full object-cover" />
                } @else {
                  <!-- Ilustración Temática según Tipo de Atracción -->
                  <div
                    class="w-full h-full flex flex-col items-center justify-center p-4"
                    [style.background]="getGradientBg(a)">
                    <div class="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-xs shadow-inner flex items-center justify-center text-2xl font-bold">
                      @if (a.tipo === 'EVENTOS_CAIDAS') {
                        <span>🐂</span>
                      } @else {
                        <span>🎡</span>
                      }
                    </div>
                  </div>
                }

                <!-- Badge Flotante Superior Izquierdo: Tipo -->
                <div class="absolute top-2.5 left-2.5">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-2xs"
                    [ngClass]="a.tipo === 'EVENTOS_CAIDAS' ? 'bg-amber-500/90 text-white' : 'bg-blue-600/90 text-white'">
                    {{ a.tipo === 'EVENTOS_CAIDAS' ? 'Por Caídas' : 'Por Tiempo' }}
                  </span>
                </div>

                <!-- Badge Flotante Superior Derecho: Estado / Cupos -->
                <div class="absolute top-2.5 right-2.5">
                  @if (a.estado && a.estado !== 'ACTIVO') {
                    <span
                      data-testid="badge-inactivo"
                      class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800/90 text-slate-100 shadow-2xs">
                      <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      <span>{{ a.estado === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Inactiva' }}</span>
                    </span>
                  } @else if (cupos <= 0) {
                    <span
                      data-testid="badge-aforo-completo"
                      class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-2xs animate-pulse">
                      <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
                      <span>Aforo Completo</span>
                    </span>
                  } @else {
                    <span
                      data-testid="badge-cupos"
                      class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-emerald-800 shadow-2xs border border-emerald-200">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{{ cupos }} cupo{{ cupos === 1 ? '' : 's' }}</span>
                    </span>
                  }
                </div>

                <!-- Indicador Flotante Inferior: Precio Base -->
                <div class="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between">
                  <div class="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-bold shadow-2xs">
                    Base: {{ formatearCOP(calcularPrecioBase(a)) }}
                  </div>
                  <div class="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-slate-200 text-[10px] font-semibold">
                    Cap: {{ capacidad }}
                  </div>
                </div>
              </div>

              <!-- Cuerpo de la Tarjeta -->
              <div class="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <h4 class="text-sm font-extrabold text-slate-800 leading-snug line-clamp-1" [title]="a.nombre">
                      {{ a.nombre }}
                    </h4>
                  </div>

                  <p class="text-[11px] text-slate-500 line-clamp-1 mb-2.5">
                    {{ a.descripcion || (a.tipo === 'EVENTOS_CAIDAS' ? 'Atracción por caídas controladas' : 'Atracción temporizada por minutos') }}
                  </p>

                  <!-- Barra de Ocupación de Aforo -->
                  <div class="space-y-1 mb-3">
                    <div class="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>Ocupación actual</span>
                      <span class="font-bold text-slate-700">{{ ocupados }} / {{ capacidad }} niños</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-300"
                        [ngClass]="cupos <= 0 ? 'bg-rose-500' : cupos <= 3 ? 'bg-amber-500' : 'bg-emerald-500'"
                        [style.width.%]="calcularPorcentajeOcupacion(ocupados, capacidad)">
                      </div>
                    </div>
                  </div>

                  <!-- Selector de Modalidad Operativa -->
                  <div class="space-y-1.5">
                    <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Modalidad / Tiempo
                    </label>

                    <div class="grid grid-cols-3 gap-1.5">
                      @for (mod of getModalidades(a); track mod.etiqueta) {
                        <button
                          type="button"
                          [attr.data-testid]="'btn-modalidad-' + a.id + '-' + mod.valor"
                          [disabled]="bloqueada"
                          (click)="seleccionarModalidad(a, mod)"
                          [class]="modalidadActual.etiqueta === mod.etiqueta
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-extrabold'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 font-semibold'"
                          class="px-1.5 py-1 text-[10px] rounded-lg border transition text-center flex flex-col items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                          <span>{{ mod.etiqueta }}</span>
                          <span class="text-[9px] opacity-80 font-mono">{{ formatearCOP(mod.precio) }}</span>
                        </button>
                      }
                    </div>
                  </div>
                </div>

                <!-- Footer con Precio Calculado y Botón de Acción -->
                <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <span class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Selección</span>
                    <span
                      [attr.data-testid]="'precio-seleccion-' + a.id"
                      class="text-sm font-extrabold font-mono text-slate-800">
                      {{ formatearCOP(modalidadActual.precio) }}
                    </span>
                  </div>

                  <button
                    type="button"
                    [attr.data-testid]="'btn-agregar-' + a.id"
                    [disabled]="bloqueada"
                    (click)="agregarAtraccion(a)"
                    class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    [ngClass]="bloqueada
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{{ bloqueada ? (cupos <= 0 ? 'Sin Cupo' : 'No Disp.') : 'Añadir' }}</span>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class CatalogoAtraccionesComponent {
  @Input() set atracciones(val: Atraccion[] | null | undefined) {
    this._atracciones.set(val || []);
  }
  get atracciones(): Atraccion[] {
    return this._atracciones();
  }
  readonly _atracciones = signal<Atraccion[]>([]);

  @Input() set cargando(val: boolean | null | undefined) {
    this._cargando.set(!!val);
  }
  get cargando(): boolean {
    return this._cargando();
  }
  readonly _cargando = signal<boolean>(false);

  readonly atraccionSeleccionada = output<SeleccionCatalogoPOS>();

  readonly busqueda = signal<string>('');
  readonly filtroTipo = signal<'TODAS' | 'TEMPORIZADA' | 'EVENTOS_CAIDAS'>('TODAS');

  // Mapa de modalidades seleccionadas por cada atracción
  private readonly modalidadesSeleccionadas = signal<Record<string | number, ModalidadSeleccionada>>({});

  readonly totalTemporizadas = computed(() => {
    return this._atracciones().filter(a => a.tipo === 'TEMPORIZADA').length;
  });

  readonly totalEventos = computed(() => {
    return this._atracciones().filter(a => a.tipo === 'EVENTOS_CAIDAS').length;
  });

  readonly atraccionesFiltradas = computed(() => {
    const lista = this._atracciones();
    const query = this.busqueda().trim().toLowerCase();
    const tipo = this.filtroTipo();

    return lista.filter(a => {
      const matchTipo = tipo === 'TODAS' || a.tipo === tipo;
      const matchQuery = !query ||
        a.nombre.toLowerCase().includes(query) ||
        (a.descripcion && a.descripcion.toLowerCase().includes(query));
      return matchTipo && matchQuery;
    });
  });

  calcularCuposDisponibles(a: Atraccion): number {
    const capacidad = a.capacidadMaxima || a.maxCapacity || 10;
    const ocupados = a.ninosActivos || 0;
    return Math.max(0, capacidad - ocupados);
  }

  estaBloqueada(a: Atraccion): boolean {
    const estadoInactivo = !!a.estado && a.estado !== 'ACTIVO';
    const aforoCompleto = this.calcularCuposDisponibles(a) <= 0;
    return estadoInactivo || aforoCompleto;
  }

  calcularPorcentajeOcupacion(ocupados: number, capacidad: number): number {
    if (capacidad <= 0) return 100;
    return Math.min(100, Math.round((ocupados / capacidad) * 100));
  }

  calcularPrecioBase(a: Atraccion): number {
    return a.precio || a.tarifaMinuto || (a.tipo === 'EVENTOS_CAIDAS' ? 10000 : 500);
  }

  getModalidades(a: Atraccion): ModalidadSeleccionada[] {
    const base = this.calcularPrecioBase(a);

    if (a.tipo === 'EVENTOS_CAIDAS') {
      const caidasBase = a.caidasLimite || 3;
      return [
        {
          tipo: 'EVENTOS_CAIDAS',
          etiqueta: `${caidasBase} caídas`,
          valor: caidasBase,
          precio: base
        },
        {
          tipo: 'EVENTOS_CAIDAS',
          etiqueta: '5 caídas',
          valor: 5,
          precio: Math.round(base * 1.5)
        },
        {
          tipo: 'EVENTOS_CAIDAS',
          etiqueta: '8 caídas',
          valor: 8,
          precio: Math.round(base * 2.2)
        }
      ];
    }

    // Modalidades TEMPORIZADA (15, 30, 60 minutos)
    const tarifaMinuto = a.tarifaMinuto || Math.round(base / (a.duracionMinutosBase || 15)) || 500;
    return [
      {
        tipo: 'TEMPORIZADA',
        etiqueta: '15 min',
        valor: 15,
        precio: Math.round(tarifaMinuto * 15)
      },
      {
        tipo: 'TEMPORIZADA',
        etiqueta: '30 min',
        valor: 30,
        precio: Math.round(tarifaMinuto * 30)
      },
      {
        tipo: 'TEMPORIZADA',
        etiqueta: '60 min',
        valor: 60,
        precio: Math.round(tarifaMinuto * 55) // Descuento por 1 hora completa
      }
    ];
  }

  getModalidadActual(a: Atraccion): ModalidadSeleccionada {
    const key = a.id ?? a.nombre;
    const mapa = this.modalidadesSeleccionadas();
    if (mapa[key]) {
      return mapa[key];
    }
    const opciones = this.getModalidades(a);
    return opciones[0];
  }

  seleccionarModalidad(a: Atraccion, mod: ModalidadSeleccionada): void {
    if (this.estaBloqueada(a)) return;
    const key = a.id ?? a.nombre;
    this.modalidadesSeleccionadas.update(mapa => ({
      ...mapa,
      [key]: mod
    }));
  }

  agregarAtraccion(a: Atraccion): void {
    if (this.estaBloqueada(a)) return;
    const modalidad = this.getModalidadActual(a);
    this.atraccionSeleccionada.emit({
      atraccion: a,
      modalidad
    });
  }

  formatearCOP(valor: number): string {
    return '$' + (valor || 0).toLocaleString('es-CO');
  }

  getGradientBg(a: Atraccion): string {
    if (a.tipo === 'EVENTOS_CAIDAS') {
      return 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)';
    }
    return 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)';
  }
}
