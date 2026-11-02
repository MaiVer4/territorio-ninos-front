import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { EstadoVisualTicket, Ticket, TiempoRestanteInfo } from '../../../../core/models/ticket.model';
import { TicketConsultaService } from '../../../../core/services/ticket-consulta.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { QrViewerComponent } from '../../../../shared/components/qr-viewer/qr-viewer.component';

@Component({
  selector: 'app-consulta-tickets',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, QrViewerComponent],
  template: `
    <div
      data-testid="consulta-tickets-root"
      class="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden flex flex-col max-w-7xl mx-auto w-full transition-all">

      <!-- Encabezado del Módulo / Diálogo -->
      <header class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center shadow-sm text-base">
            🎟️
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-800">
              Consulta de Boletas y Estado de Tickets
            </h2>
            <p class="text-xs text-slate-400">
              Búsqueda rápida por cédula del cliente o UUID v4 con trazabilidad en tiempo real
            </p>
          </div>
        </div>

        @if (modoModal) {
          <button
            type="button"
            data-testid="btn-cerrar-consulta-modal"
            (click)="cerrar.emit()"
            class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
            aria-label="Cerrar consulta">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        }
      </header>

      <!-- Barra de Búsqueda Rápida y Filtros (HU-23.04 / SCRUM-386) -->
      <section class="p-4 sm:p-5 border-b border-slate-100 space-y-3 bg-white">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <!-- Input de Búsqueda -->
          <div class="relative flex-1">
            <input
              type="text"
              data-testid="input-busqueda-tickets"
              [ngModel]="terminoBusqueda()"
              (ngModelChange)="terminoBusqueda.set($event)"
              (keyup.enter)="ejecutarBusqueda()"
              placeholder="Buscar por Cédula, UUID, Boleta o Nombre..."
              class="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 placeholder-slate-400 transition" />
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            @if (terminoBusqueda()) {
              <button
                type="button"
                data-testid="btn-limpiar-busqueda-tickets"
                (click)="limpiarBusqueda()"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer">
                ✕
              </button>
            }
          </div>

          <!-- Botón Buscar -->
          <button
            type="button"
            data-testid="btn-buscar-tickets"
            [disabled]="buscando()"
            (click)="ejecutarBusqueda()"
            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
            @if (buscando()) {
              <svg class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Buscando...</span>
            } @else {
              <span>Buscar</span>
            }
          </button>
        </div>

        <!-- Pills de Filtro Rápido por Estado -->
        <div class="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span class="text-slate-400 font-bold text-[11px] uppercase mr-1">Filtrar por:</span>

          <button
            type="button"
            data-testid="btn-filtro-TODOS"
            (click)="cambiarFiltroEstado('TODOS')"
            [class.bg-blue-600]="filtroEstado() === 'TODOS'"
            [class.text-white]="filtroEstado() === 'TODOS'"
            [class.bg-slate-100]="filtroEstado() !== 'TODOS'"
            [class.text-slate-600]="filtroEstado() !== 'TODOS'"
            class="px-3 py-1 rounded-full font-bold text-xs transition cursor-pointer hover:opacity-90">
            Todos ({{ conteoPorEstado().total }})
          </button>

          <button
            type="button"
            data-testid="btn-filtro-PAGADO"
            (click)="cambiarFiltroEstado('PAGADO')"
            [class.bg-emerald-600]="filtroEstado() === 'PAGADO'"
            [class.text-white]="filtroEstado() === 'PAGADO'"
            [class.bg-emerald-50]="filtroEstado() !== 'PAGADO'"
            [class.text-emerald-800]="filtroEstado() !== 'PAGADO'"
            [class.border-emerald-200]="filtroEstado() !== 'PAGADO'"
            class="px-3 py-1 rounded-full font-bold text-xs border transition cursor-pointer hover:opacity-90 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>PAGADO ({{ conteoPorEstado().pagado }})</span>
          </button>

          <button
            type="button"
            data-testid="btn-filtro-EN_USO"
            (click)="cambiarFiltroEstado('EN_USO')"
            [class.bg-amber-500]="filtroEstado() === 'EN_USO'"
            [class.text-white]="filtroEstado() === 'EN_USO'"
            [class.bg-amber-50]="filtroEstado() !== 'EN_USO'"
            [class.text-amber-800]="filtroEstado() !== 'EN_USO'"
            [class.border-amber-200]="filtroEstado() !== 'EN_USO'"
            class="px-3 py-1 rounded-full font-bold text-xs border transition cursor-pointer hover:opacity-90 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
            <span>EN_USO ({{ conteoPorEstado().enUso }})</span>
          </button>

          <button
            type="button"
            data-testid="btn-filtro-CONSUMIDO"
            (click)="cambiarFiltroEstado('CONSUMIDO')"
            [class.bg-slate-700]="filtroEstado() === 'CONSUMIDO'"
            [class.text-white]="filtroEstado() === 'CONSUMIDO'"
            [class.bg-slate-100]="filtroEstado() !== 'CONSUMIDO'"
            [class.text-slate-600]="filtroEstado() !== 'CONSUMIDO'"
            [class.border-slate-200]="filtroEstado() !== 'CONSUMIDO'"
            class="px-3 py-1 rounded-full font-bold text-xs border transition cursor-pointer hover:opacity-90 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span>CONSUMIDO ({{ conteoPorEstado().consumido }})</span>
          </button>
        </div>
      </section>

      <!-- Contenido Principal: Tabla y Tarjeta de Detalle (Grid Responsive) -->
      <div class="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start bg-slate-50/50">

        <!-- Columna Izquierda: Tabla de Resultados -->
        <div class="lg:col-span-8 space-y-4">
          <div class="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>Boletas encontradas: <strong class="text-slate-800">{{ ticketsFiltrados().length }}</strong></span>
            <span class="text-[11px] text-slate-400">Haz clic en una fila para ver el detalle y QR</span>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div class="overflow-x-auto max-h-[520px]">
              <table data-testid="tabla-consulta-tickets" class="w-full text-left border-collapse text-xs">
                <thead class="bg-slate-50 text-[11px] text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th scope="col" class="py-3 px-3.5">Boleta / UUID</th>
                    <th scope="col" class="py-3 px-3.5">Cliente (Doc) / Menor</th>
                    <th scope="col" class="py-3 px-3.5">Atracción</th>
                    <th scope="col" class="py-3 px-3.5">Hora Compra</th>
                    <th scope="col" class="py-3 px-3.5 text-center">Estado</th>
                    <th scope="col" class="py-3 px-3.5">Tiempo Restante</th>
                    <th scope="col" class="py-3 px-3.5 text-center">Acción</th>
                  </tr>
                </thead>

                <tbody class="divide-y divide-slate-100">
                  @for (t of ticketsFiltrados(); track (t.uuid || t.idTicket || t.codigoBoleta); let i = $index) {
                    @let estadoVis = obtenerEstadoVisual(t);
                    @let tiempoInfo = calcularTiempoRestanteInfo(t);
                    @let seleccionado = ticketSeleccionado()?.codigoBoleta === t.codigoBoleta;

                    <tr
                      [attr.data-testid]="'fila-ticket-' + (t.uuid || t.codigoBoleta)"
                      (click)="seleccionarTicket(t)"
                      [class.bg-blue-50]="seleccionado"
                      [class.hover:bg-slate-50]="!seleccionado"
                      class="transition cursor-pointer group">

                      <!-- Boleta / UUID -->
                      <td class="py-3 px-3.5">
                        <div class="font-bold text-slate-800 font-mono flex items-center gap-1.5">
                          <span>#{{ t.codigoBoleta }}</span>
                          @if (t.esReimpresion) {
                            <span class="text-[9px] px-1 py-0.2 bg-amber-100 text-amber-800 rounded font-sans font-bold">REIMP</span>
                          }
                        </div>
                        <div class="text-[10px] font-mono text-slate-400 truncate max-w-[110px]" [title]="t.uuid || ''">
                          {{ t.uuid || 'N/A' }}
                        </div>
                      </td>

                      <!-- Cliente / Menor -->
                      <td class="py-3 px-3.5">
                        <div class="font-semibold text-slate-800 truncate max-w-[140px]">
                          {{ t.clienteNombre || 'Cliente de Mostrador' }}
                        </div>
                        <div class="text-[10px] text-slate-400 flex items-center gap-1">
                          @if (t.clienteDocumento) {
                            <span>CC: {{ t.clienteDocumento }}</span>
                            <span>•</span>
                          }
                          <span class="text-slate-600 font-medium">👦 {{ t.menorNombre }}</span>
                        </div>
                      </td>

                      <!-- Atracción y Modalidad -->
                      <td class="py-3 px-3.5">
                        <div class="font-bold text-slate-700 truncate max-w-[130px]">{{ t.atraccionNombre }}</div>
                        <div class="text-[10px] text-blue-600 font-semibold">{{ t.modalidadEtiqueta }}</div>
                      </td>

                      <!-- Hora de Compra -->
                      <td class="py-3 px-3.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {{ formatearHora(t.horaCompra || t.fechaEmision) }}
                      </td>

                      <!-- Pill de Estado Visual (HU-23.05) -->
                      <td class="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          [attr.data-testid]="'pill-estado-' + (t.uuid || t.codigoBoleta)"
                          [ngClass]="obtenerClasePill(estadoVis)"
                          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border shadow-2xs">
                          @if (estadoVis === 'EN_USO') {
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          }
                          <span>{{ estadoVis }}</span>
                        </span>
                      </td>

                      <!-- Tiempo Restante -->
                      <td class="py-3 px-3.5">
                        <div class="font-bold text-slate-700 text-[11px] whitespace-nowrap">
                          {{ tiempoInfo.etiqueta }}
                        </div>
                        <div class="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            [style.width.%]="tiempoInfo.porcentaje"
                            [ngClass]="obtenerClaseBarra(estadoVis)"
                            class="h-1.5 rounded-full transition-all duration-300">
                          </div>
                        </div>
                      </td>

                      <!-- Acción: Reimpresión Directa (HU-23.06 / SCRUM-388) -->
                      <td class="py-3 px-3.5 text-center whitespace-nowrap" (click)="$event.stopPropagation()">
                        <button
                          type="button"
                          [attr.data-testid]="'btn-reimprimir-tabla-' + (t.uuid || t.codigoBoleta)"
                          [disabled]="estadoVis === 'CONSUMIDO'"
                          (click)="onSolicitarReimpresion(t)"
                          [title]="estadoVis === 'CONSUMIDO' ? 'No se puede reimprimir: boleta consumida' : 'Reimprimir boleta'"
                          class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-800 border border-amber-300 rounded-lg text-[11px] font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none shadow-2xs flex items-center gap-1 mx-auto">
                          <span>🖨️</span>
                          <span>Reimprimir</span>
                        </button>
                      </td>
                    </tr>
                  }

                  @if (ticketsFiltrados().length === 0) {
                    <tr>
                      <td colspan="7" class="py-12 text-center text-slate-400" data-testid="estado-sin-tickets">
                        <div class="flex flex-col items-center justify-center space-y-2">
                          <span class="text-3xl">🔍</span>
                          <p class="font-bold text-slate-600 text-sm">No se encontraron boletas</p>
                          <p class="text-xs text-slate-400 max-w-sm">
                            Intenta con otro número de documento, UUID o cambia el filtro de estado.
                          </p>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Columna Derecha: Tarjeta de Detalle del Ticket (HU-23.05 / SCRUM-387) -->
        <div class="lg:col-span-4 space-y-4">
          @if (ticketSeleccionado(); as t) {
            @let estadoDetalle = obtenerEstadoVisual(t);
            @let tiempoDetalle = calcularTiempoRestanteInfo(t);

            <div
              data-testid="tarjeta-detalle-ticket"
              class="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">

              <!-- Cabecera de la Tarjeta con Pill de Estado -->
              <div class="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Detalle del Ticket</span>
                  <h3 class="text-base font-extrabold text-slate-800 font-mono mt-0.5">
                    #{{ t.codigoBoleta }}
                  </h3>
                </div>

                <!-- Pill de Estado Visual Normalizado (HU-23.05) -->
                <span
                  data-testid="detalle-pill-estado"
                  [ngClass]="obtenerClasePill(estadoDetalle)"
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs">
                  @if (estadoDetalle === 'EN_USO') {
                    <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  }
                  <span>{{ estadoDetalle }}</span>
                </span>
              </div>

              <!-- Previsualización Óptica del Código QR -->
              <div class="flex flex-col items-center justify-center p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                <app-qr-viewer
                  [value]="t.codigoQr || t.uuid || t.codigoBoleta"
                  [uuid]="t.uuid || ''"
                  [codigoVisible]="t.codigoBoleta"
                  [size]="140"
                  [margin]="4"
                  errorCorrectionLevel="M"
                  [mostrarInsigniaOptica]="true">
                </app-qr-viewer>
                @if (t.uuid) {
                  <p class="text-[9px] font-mono text-slate-400 mt-2 truncate max-w-full" [title]="t.uuid">
                    UUID: {{ t.uuid }}
                  </p>
                }
              </div>

              <!-- Metadatos de Compra y Tiempo Restante -->
              <div class="space-y-2.5 text-xs text-slate-600">
                <div class="flex justify-between border-b border-slate-100 pb-1.5">
                  <span class="text-slate-400 font-medium">Atracción:</span>
                  <span class="font-extrabold text-slate-800 uppercase">{{ t.atraccionNombre }}</span>
                </div>

                <div class="flex justify-between border-b border-slate-100 pb-1.5">
                  <span class="text-slate-400 font-medium">Modalidad:</span>
                  <span class="font-bold text-blue-600">{{ t.modalidadEtiqueta }}</span>
                </div>

                <div class="flex justify-between border-b border-slate-100 pb-1.5">
                  <span class="text-slate-400 font-medium">Menor Asignado:</span>
                  <span class="font-bold text-slate-800">{{ t.menorNombre }}</span>
                </div>

                <div class="flex justify-between border-b border-slate-100 pb-1.5">
                  <span class="text-slate-400 font-medium">Cliente / Doc:</span>
                  <span class="font-semibold text-slate-700">{{ t.clienteNombre }} ({{ t.clienteDocumento || 'S/D' }})</span>
                </div>

                <!-- Hora de Compra (HU-23.05) -->
                <div class="flex justify-between border-b border-slate-100 pb-1.5">
                  <span class="text-slate-400 font-medium">Hora de Compra:</span>
                  <span data-testid="detalle-hora-compra" class="font-mono font-bold text-slate-800">
                    {{ formatearFechaHora(t.horaCompra || t.fechaEmision) }}
                  </span>
                </div>

                <!-- Tiempo Restante con Barra de Progreso (HU-23.05) -->
                <div class="pt-1 space-y-1">
                  <div class="flex justify-between text-xs font-bold">
                    <span class="text-slate-600">Tiempo / Cupo Restante:</span>
                    <span data-testid="detalle-tiempo-restante" [class.text-rose-600]="tiempoDetalle.agotado" [class.text-emerald-700]="!tiempoDetalle.agotado">
                      {{ tiempoDetalle.etiqueta }}
                    </span>
                  </div>

                  <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                    <div
                      data-testid="detalle-barra-tiempo"
                      [style.width.%]="tiempoDetalle.porcentaje"
                      [ngClass]="obtenerClaseBarra(estadoDetalle)"
                      class="h-2 rounded-full transition-all duration-300">
                    </div>
                  </div>
                </div>
              </div>

              <!-- Botones de Acción en Tarjeta -->
              <div class="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  data-testid="btn-reimprimir-detalle"
                  [disabled]="estadoDetalle === 'CONSUMIDO'"
                  (click)="onSolicitarReimpresion(t)"
                  [title]="estadoDetalle === 'CONSUMIDO' ? 'No se puede reimprimir: boleta consumida' : 'Reimprimir boleta'"
                  class="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none">
                  <span>🖨️</span>
                  <span>Reimprimir Tirilla</span>
                </button>

                <button
                  type="button"
                  data-testid="btn-cerrar-detalle"
                  (click)="ticketSeleccionado.set(null)"
                  class="px-3 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer">
                  Cerrar
                </button>
              </div>

            </div>
          } @else {
            <div class="bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center text-slate-400 space-y-2">
              <span class="text-4xl block">📋</span>
              <p class="font-bold text-slate-600 text-sm">Selecciona una boleta</p>
              <p class="text-xs text-slate-400">
                Haz clic en cualquier fila de la tabla para visualizar su estado, hora de compra, tiempo restante y código QR.
              </p>
            </div>
          }
        </div>

      </div>

    </div>
  `
})
export class ConsultaTicketsComponent implements OnInit {
  @Input() modoModal = false;
  @Output() reimprimirTicket = new EventEmitter<Ticket>();
  @Output() cerrar = new EventEmitter<void>();

  private readonly ticketConsultaService = inject(TicketConsultaService);
  private readonly notificationService = inject(NotificationService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  readonly terminoBusqueda = signal<string>('');
  readonly filtroEstado = signal<'TODOS' | EstadoVisualTicket>('TODOS');
  readonly tickets = signal<Ticket[]>([]);
  readonly ticketSeleccionado = signal<Ticket | null>(null);
  readonly buscando = signal<boolean>(false);

  readonly ticketsFiltrados = computed(() => {
    const list = this.tickets();
    const filtro = this.filtroEstado();
    if (filtro === 'TODOS') return list;
    return list.filter(t => this.obtenerEstadoVisual(t) === filtro);
  });

  readonly conteoPorEstado = computed(() => {
    const list = this.tickets();
    let pagado = 0;
    let enUso = 0;
    let consumido = 0;

    for (const t of list) {
      const e = this.obtenerEstadoVisual(t);
      if (e === 'PAGADO') pagado++;
      else if (e === 'EN_USO') enUso++;
      else if (e === 'CONSUMIDO') consumido++;
    }

    return { total: list.length, pagado, enUso, consumido };
  });

  ngOnInit(): void {
    this.ejecutarBusqueda();
  }

  ejecutarBusqueda(): void {
    this.buscando.set(true);
    this.ticketConsultaService
      .buscarTickets(this.terminoBusqueda(), 'TODOS')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.buscando.set(false))
      )
      .subscribe({
        next: (res) => {
          this.tickets.set(res || []);
          if (res && res.length === 1) {
            this.ticketSeleccionado.set(res[0]);
          } else if (this.ticketSeleccionado()) {
            // Sincronizar el ticket seleccionado si sigue en los resultados
            const actual = res.find(t => t.codigoBoleta === this.ticketSeleccionado()?.codigoBoleta);
            this.ticketSeleccionado.set(actual || null);
          }
        },
        error: () => {
          this.tickets.set([]);
          this.notificationService?.error('Error al consultar boletas en el sistema.');
        }
      });
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda.set('');
    this.ejecutarBusqueda();
  }

  cambiarFiltroEstado(filtro: 'TODOS' | EstadoVisualTicket): void {
    this.filtroEstado.set(filtro);
  }

  seleccionarTicket(ticket: Ticket): void {
    this.ticketSeleccionado.set(ticket);
  }

  onSolicitarReimpresion(ticket: Ticket): void {
    if (this.obtenerEstadoVisual(ticket) === 'CONSUMIDO') {
      this.notificationService?.warn('No se puede reimprimir: la boleta ya fue consumida.');
      return;
    }
    this.reimprimirTicket.emit(ticket);
  }

  obtenerEstadoVisual(ticket: Ticket): EstadoVisualTicket {
    return this.ticketConsultaService.obtenerEstadoVisual(ticket);
  }

  calcularTiempoRestanteInfo(ticket: Ticket): TiempoRestanteInfo {
    return this.ticketConsultaService.calcularTiempoRestanteInfo(ticket);
  }

  obtenerClasePill(estado: EstadoVisualTicket): string {
    switch (estado) {
      case 'PAGADO':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'EN_USO':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'CONSUMIDO':
        return 'bg-slate-200 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  obtenerClaseBarra(estado: EstadoVisualTicket): string {
    switch (estado) {
      case 'PAGADO':
        return 'bg-emerald-500';
      case 'EN_USO':
        return 'bg-amber-500';
      case 'CONSUMIDO':
        return 'bg-slate-400';
      default:
        return 'bg-blue-500';
    }
  }

  formatearHora(fecha?: Date | string): string {
    if (!fecha) return '--:--';
    try {
      const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
      return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '--:--';
    }
  }

  formatearFechaHora(fecha?: Date | string): string {
    if (!fecha) return '--:--';
    try {
      const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
      return d.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '--:--';
    }
  }
}
