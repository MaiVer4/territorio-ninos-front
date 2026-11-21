import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewChild,
  computed,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Atraccion, ModalidadSeleccionada, SeleccionCatalogoPOS } from '../../../../core/models/atraccion.model';

@Component({
  selector: 'app-catalogo-atracciones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-3 font-sans">
      <!-- Barra Compacta de Filtros y Búsqueda Rápida (F3) -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div class="relative flex-1 max-w-md">
          <svg class="w-4 h-4 op-icon text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            #buscadorCatalogo
            data-testid="input-buscar-catalogo"
            type="text"
            [ngModel]="busqueda()"
            (ngModelChange)="busqueda.set($event)"
            (keydown.enter)="agregarPrimeraCoincidencia()"
            placeholder="Buscar atracción... (Enter añade la primera)"
            class="w-full pl-9 pr-12 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-[background-color,border-color] duration-150 ease-out text-slate-800 placeholder-slate-400 font-medium" />
          <kbd class="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200 rounded absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            F3
          </kbd>
        </div>

        <!-- Pestañas de Filtro Rápido -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
          <button
            type="button"
            data-testid="filtro-todas"
            (click)="filtroTipo.set('TODAS')"
            [class]="filtroTipo() === 'TODAS' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-[transform,background-color,color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer shrink-0 tabular-nums">
            Todas ({{ _atracciones().length }})
          </button>
          <button
            type="button"
            data-testid="filtro-temporizadas"
            (click)="filtroTipo.set('TEMPORIZADA')"
            [class]="filtroTipo() === 'TEMPORIZADA' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-[transform,background-color,color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer shrink-0 tabular-nums">
            Tiempo ({{ totalTemporizadas() }})
          </button>
          <button
            type="button"
            data-testid="filtro-eventos"
            (click)="filtroTipo.set('EVENTOS_CAIDAS')"
            [class]="filtroTipo() === 'EVENTOS_CAIDAS' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-[transform,background-color,color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer shrink-0 tabular-nums">
            Caídas ({{ totalEventos() }})
          </button>
        </div>
      </div>

      <!-- Estado de Carga -->
      @if (_cargando()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5" data-testid="loading-skeleton">
          @for (item of [1, 2, 3, 4, 5, 6]; track item) {
            <div class="bg-white rounded-2xl border border-slate-200/80 p-3.5 motion-safe:animate-pulse space-y-2.5">
              <div class="h-4 bg-slate-200 rounded w-3/4"></div>
              <div class="h-2 bg-slate-200 rounded w-1/2"></div>
              <div class="grid grid-cols-3 gap-1.5 pt-1">
                <div class="h-11 bg-slate-200 rounded-xl"></div>
                <div class="h-11 bg-slate-200 rounded-xl"></div>
                <div class="h-11 bg-slate-200 rounded-xl"></div>
              </div>
            </div>
          }
        </div>
      } @else if (atraccionesFiltradas().length === 0) {
        <!-- Estado Vacío -->
        <div class="bg-white rounded-2xl border border-slate-200/80 p-8 text-center" data-testid="empty-catalog">
          <div class="w-11 h-11 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
            <svg class="w-6 h-6 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 class="text-sm font-bold text-slate-700">No se encontraron atracciones</h3>
          <p class="text-xs text-slate-400 mt-1">Intenta con otro término de búsqueda o cambia el filtro de categoría.</p>
        </div>
      } @else {
        <!-- Tarjetas Compactas de 1 Clic (Sin banner decorativo ni segundo botón) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          @for (a of atraccionesFiltradas(); track a.id ?? a.nombre) {
            @let cupos = calcularCuposDisponibles(a);
            @let capacidad = a.capacidadMaxima || a.maxCapacity || 10;
            @let ocupados = a.ocupacionActual ?? a.ocupacionActiva ?? a.ninosActivos ?? 0;
            @let bloqueada = estaBloqueada(a);
            @let cantidadEnCarrito = _conteoEnCarrito()[claveAtraccion(a)] || 0;
            @let modalidades = getModalidades(a);
            @let modalidadActual = getModalidadActual(a);

            <div
              [attr.data-testid]="'card-atraccion-' + a.id"
              class="rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between p-3 gap-2.5 transition-[box-shadow,border-color,background-color] duration-150 ease-out hover:border-slate-300 relative"
              [class.opacity-60]="bloqueada"
              [class.bg-slate-50]="bloqueada"
              [class.bg-white]="!bloqueada"
              [class.border-blue-300]="!bloqueada && cantidadEnCarrito > 0">

              <!-- Franja superior sutil de categoría -->
              <span
                class="absolute inset-x-0 top-0 h-1"
                aria-hidden="true"
                [ngClass]="a.tipo === 'EVENTOS_CAIDAS' ? 'bg-amber-500' : 'bg-blue-600'"></span>

              <!-- Cabecera: Nombre + En Carrito + Estado Único -->
              <div class="pt-0.5 space-y-1.5">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1 flex items-center gap-1.5">
                    <h4 class="text-sm font-extrabold text-slate-900 leading-tight truncate" [title]="a.nombre">
                      {{ a.nombre }}
                    </h4>
                    @if (cantidadEnCarrito > 0) {
                      <span
                        [attr.data-testid]="'badge-en-carrito-' + a.id"
                        class="px-1.5 py-0.5 rounded-full text-[10px] font-black font-mono tabular-nums bg-blue-600 text-white shrink-0">
                        ×{{ cantidadEnCarrito }}
                      </span>
                    }
                  </div>

                  @if (a.estado && a.estado !== 'ACTIVO') {
                    <span
                      [attr.data-testid]="a.estado === 'FUERA_DE_SERVICIO' ? 'badge-fuera-de-servicio' : 'badge-inactivo'"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                      [ngClass]="a.estado === 'FUERA_DE_SERVICIO' ? 'bg-rose-700 text-white' : 'bg-slate-800 text-slate-100'">
                      <span class="w-1.5 h-1.5 rounded-full" [ngClass]="a.estado === 'FUERA_DE_SERVICIO' ? 'bg-rose-200' : 'bg-slate-400'"></span>
                      <span>{{ a.estado === 'FUERA_DE_SERVICIO' ? 'Fuera de servicio' : (a.estado === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Inactiva') }}</span>
                    </span>
                  } @else if (estaLlena(a)) {
                    <span
                      data-testid="badge-aforo-completo"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shrink-0">
                      <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
                      <span>Lleno</span>
                    </span>
                  } @else {
                    <span
                      data-testid="badge-cupos"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 tabular-nums">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{{ cupos }} cupo{{ cupos === 1 ? '' : 's' }}</span>
                    </span>
                  }
                </div>

                <!-- Telemetría compacta: Hora de ingreso + ocupación -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between gap-2 text-[11px]">
                    <span
                      [attr.data-testid]="'ingreso-texto-' + a.id"
                      class="font-bold truncate"
                      [class.text-rose-700]="estaLlena(a)"
                      [class.text-emerald-700]="!estaLlena(a)">
                      {{ textoIngreso(a) }}
                    </span>
                    <span class="font-mono tabular-nums text-[10px] font-bold text-slate-600 shrink-0">
                      {{ ocupados }}/{{ capacidad }}
                    </span>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-1 overflow-hidden" aria-hidden="true">
                    <div
                      class="h-full rounded-full transition-[width,background-color] duration-200 ease-out"
                      [ngClass]="cupos <= 0 ? 'bg-rose-500' : cupos <= 3 ? 'bg-amber-500' : 'bg-emerald-500'"
                      [style.width.%]="calcularPorcentajeOcupacion(ocupados, capacidad)">
                    </div>
                  </div>
                </div>

                @if (a.tieneOperarioAsignado === false) {
                  <div
                    data-testid="badge-sin-operario"
                    class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-800 text-[10px] font-semibold">
                    <svg class="w-3.5 h-3.5 op-icon text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span class="truncate">Sin operario activo en estación</span>
                  </div>
                }
              </div>

              <!-- Tarifas de 1 Solo Clic -->
              <div>
                @if (modalidades.length === 0) {
                  <div data-testid="msg-sin-tarifa" class="py-2 px-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-center">
                    <p class="text-[11px] font-bold text-amber-800">Sin tarifa configurada</p>
                  </div>
                } @else {
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    @for (mod of modalidades; track mod.etiqueta) {
                      <button
                        type="button"
                        [attr.data-testid]="'btn-modalidad-' + a.id + '-' + mod.valor"
                        [disabled]="bloqueada"
                        (click)="seleccionarYAgregarModalidad(a, mod)"
                        [class]="modalidadActual?.etiqueta === mod.etiqueta
                          ? 'bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-900 border-blue-400 hover:border-blue-600'
                          : 'bg-slate-50 hover:bg-emerald-600 hover:text-white text-slate-800 border-slate-200 hover:border-emerald-600'"
                        class="group min-h-[44px] px-1.5 py-1 rounded-xl border transition-[transform,background-color,border-color,color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] text-center flex flex-col items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                        <span class="text-[11px] font-extrabold leading-tight">+ {{ mod.etiqueta }}</span>
                        <span class="text-[10px] font-mono tabular-nums opacity-85 group-hover:opacity-100 leading-tight mt-0.5">
                          {{ formatearCOP(mod.precio) }}
                        </span>
                      </button>
                    }
                  </div>
                }
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

  @Input() set conteoEnCarrito(val: Record<string, number> | null | undefined) {
    this._conteoEnCarrito.set(val || {});
  }
  readonly _conteoEnCarrito = signal<Record<string, number>>({});

  readonly atraccionSeleccionada = output<SeleccionCatalogoPOS>();
  @ViewChild('buscadorCatalogo') buscadorRef?: ElementRef<HTMLInputElement>;

  readonly busqueda = signal<string>('');
  readonly filtroTipo = signal<'TODAS' | 'TEMPORIZADA' | 'EVENTOS_CAIDAS'>('TODAS');

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
      const matchQuery =
        !query ||
        a.nombre.toLowerCase().includes(query) ||
        (a.descripcion && a.descripcion.toLowerCase().includes(query));
      return matchTipo && matchQuery;
    });
  });

  enfocarBuscador(): void {
    const el = this.buscadorRef?.nativeElement;
    if (el) {
      el.focus();
      el.select();
    }
  }

  agregarPrimeraCoincidencia(): void {
    const primera = this.atraccionesFiltradas().find(a => !this.estaBloqueada(a));
    if (!primera) return;
    const mod = this.getModalidadActual(primera);
    if (!mod) return;
    this.seleccionarYAgregarModalidad(primera, mod);
    this.buscadorRef?.nativeElement?.select();
  }

  claveAtraccion(a: Atraccion): string {
    return String(a.id ?? a.nombre);
  }

  calcularCuposDisponibles(a: Atraccion): number {
    if (a.aforoDisponible !== undefined && a.aforoDisponible !== null) {
      return Math.max(0, a.aforoDisponible);
    }
    const capacidad = a.capacidadMaxima || a.maxCapacity || 0;
    const ocupados = a.ocupacionActual ?? a.ocupacionActiva ?? a.ninosActivos ?? 0;
    return Math.max(0, capacidad - ocupados);
  }

  estaBloqueada(a: Atraccion): boolean {
    const estadoInactivo = !!a.estado && a.estado !== 'ACTIVO';
    const sinTarifas = this.getModalidades(a).length === 0;
    return estadoInactivo || sinTarifas;
  }

  estaLlena(a: Atraccion): boolean {
    return a.tieneCupo === false || this.calcularCuposDisponibles(a) <= 0 || !!a.horaProximoIngreso;
  }

  /** Texto de ingreso: "Ingreso: AHORA" o "Lleno · ingreso ~HH:mm" / "Lleno · próximo turno". */
  textoIngreso(a: Atraccion): string {
    if (!this.estaLlena(a)) return 'Ingreso: AHORA';
    const texto = (a.ingresoTexto || '').trim();
    if (texto.toUpperCase() === 'PRÓXIMO TURNO' || (!texto && a.tipo === 'EVENTOS_CAIDAS' && !a.horaProximoIngreso)) {
      return 'Lleno · próximo turno';
    }
    const hhmm = texto.match(/\d{1,2}:\d{2}/)?.[0] ?? this.extraerHora(a.horaProximoIngreso);
    return hhmm ? `Lleno · ingreso ~${hhmm}` : 'Lleno · próximo turno';
  }

  private extraerHora(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const m = String(iso).match(/T(\d{2}:\d{2})/);
    return m ? m[1] : null;
  }

  calcularPorcentajeOcupacion(ocupados: number, capacidad: number): number {
    if (capacidad <= 0) return 0;
    return Math.min(100, Math.round((ocupados / capacidad) * 100));
  }

  calcularPrecioBase(a: Atraccion): number | null {
    const mods = this.getModalidades(a);
    if (mods.length > 0) {
      return Math.min(...mods.map(m => m.precio));
    }
    return null;
  }

  getModalidades(a: Atraccion): ModalidadSeleccionada[] {
    if (a.tipo === 'EVENTOS_CAIDAS') {
      if (Array.isArray(a.tarifasEvento) && a.tarifasEvento.length > 0) {
        return a.tarifasEvento
          .filter(e => e.activo !== false && e.vigente !== false)
          .map(e => ({
            id: e.id,
            tarifaId: e.id,
            tipo: 'EVENTOS_CAIDAS' as const,
            etiqueta: `${e.intentos} caídas`,
            valor: e.intentos,
            precio: Number(e.precio)
          }));
      }
      return [];
    }

    if (Array.isArray(a.tarifasTiempo) && a.tarifasTiempo.length > 0) {
      return a.tarifasTiempo
        .filter(t => t.activo !== false && t.vigente !== false)
        .map(t => ({
          id: t.id,
          tarifaId: t.id,
          tipo: 'TEMPORIZADA' as const,
          etiqueta: `${t.duracionMinutos} min`,
          valor: t.duracionMinutos,
          precio: Number(t.precio)
        }));
    }

    const ext = a as unknown as {
      tarifasBloque?: Array<{ id?: number; minutos: number; precio: number; vigente?: boolean; activo?: boolean }>;
    };
    if (Array.isArray(ext.tarifasBloque) && ext.tarifasBloque.length > 0) {
      return ext.tarifasBloque
        .filter(b => b.vigente !== false && b.activo !== false)
        .map(b => ({
          id: b.id,
          tarifaId: b.id,
          tipo: 'TEMPORIZADA' as const,
          etiqueta: `${b.minutos} min`,
          valor: b.minutos,
          precio: Number(b.precio)
        }));
    }

    return [];
  }

  getModalidadActual(a: Atraccion): ModalidadSeleccionada | null {
    const key = a.id ?? a.nombre;
    const mapa = this.modalidadesSeleccionadas();
    const opciones = this.getModalidades(a);
    if (opciones.length === 0) {
      return null;
    }
    if (mapa[key] && opciones.some(o => o.etiqueta === mapa[key].etiqueta)) {
      return mapa[key];
    }
    return opciones[0];
  }

  seleccionarYAgregarModalidad(a: Atraccion, mod: ModalidadSeleccionada): void {
    if (this.estaBloqueada(a)) return;
    const key = a.id ?? a.nombre;
    this.modalidadesSeleccionadas.update(mapa => ({
      ...mapa,
      [key]: mod
    }));
    this.atraccionSeleccionada.emit({
      atraccion: a,
      modalidad: mod
    });
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
    if (!modalidad) return;
    this.atraccionSeleccionada.emit({
      atraccion: a,
      modalidad
    });
  }

  formatearCOP(valor: number): string {
    return '$' + (valor || 0).toLocaleString('es-CO');
  }
}
