import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, filter, finalize, switchMap } from 'rxjs/operators';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { CajaService } from '../../../../core/services/caja.service';
import { ClienteService } from '../../../../core/services/cliente.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ResultadoArqueoDTO, TurnoResponseDTO } from '../../../../core/models/caja.model';
import { Cliente, Menor } from '../../../../core/models/cliente.model';
import {
  Atraccion,
  AtraccionCatalogoVenta,
  OrdenEmisionFisica,
  ResumenLiquidacionPOS,
  SeleccionCatalogoPOS
} from '../../../../core/models/atraccion.model';
import { CodigoMotivoReimpresion, Ticket } from '../../../../core/models/ticket.model';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { PosAudioService } from '../../../../core/services/pos-audio.service';
import { ColaEmisionService } from '../../../../core/services/cola-emision.service';
import { VentaCalculoService } from '../../../../core/services/venta-calculo.service';
import { AperturaCajaModalComponent } from '../../components/apertura-caja-modal/apertura-caja-modal.component';
import { ArqueoCajaModalComponent } from '../../components/arqueo-caja-modal/arqueo-caja-modal.component';
import { MenoresChipsComponent } from '../../components/menores-chips/menores-chips.component';
import { CatalogoAtraccionesComponent } from '../../components/catalogo-atracciones/catalogo-atracciones.component';
import { PosCartComponent } from '../../components/pos-cart/pos-cart.component';
import { ReimpresionModalComponent } from '../../components/reimpresion-modal/reimpresion-modal.component';
import { ConsultaTicketsComponent } from '../../components/consulta-tickets/consulta-tickets.component';
import { QrViewerComponent } from '../../../../shared/components/qr-viewer/qr-viewer.component';
import { TicketPrintTemplateComponent } from '../../../../shared/components/ticket-print-template/ticket-print-template.component';
import { PrintService } from '../../../../core/services/print.service';
import { TicketReimpresionService } from '../../../../core/services/ticket-reimpresion.service';
import { ConfiguracionService } from '../../../../core/services/configuracion.service';
import { WebSocketService } from '../../../../core/services/websocket.service';

@Component({
  selector: 'app-taquilla-pos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AperturaCajaModalComponent,
    ArqueoCajaModalComponent,
    ReimpresionModalComponent,
    ConsultaTicketsComponent,
    MenoresChipsComponent,
    CatalogoAtraccionesComponent,
    PosCartComponent,
    QrViewerComponent,
    TicketPrintTemplateComponent
  ],
  template: `
    <div class="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-100 font-sans flex flex-col relative">
      <!-- Modal Bloqueante de Apertura si no hay turno activo -->
      @if (mostrarModalApertura()) {
        <app-apertura-caja-modal (turnoIniciado)="onTurnoIniciado($event)"></app-apertura-caja-modal>
      }

      <!-- Modal de Arqueo y Cierre Asistido -->
      @if (mostrarModalArqueo() && turnoActual()) {
        <app-arqueo-caja-modal
          [idTurno]="turnoActual()!.idTurno"
          [montoEsperado]="esCierreCiego() ? null : montoEsperadoArqueo()"
          [esCierreCiego]="esCierreCiego()"
          [procesandoExterno]="procesandoArqueo()"
          (confirmarArqueo)="onArqueoConfirmado($event)"
          (cancelar)="mostrarModalArqueo.set(false)">
        </app-arqueo-caja-modal>
      }

      <!-- Modal de Reimpresión Auditada (HU-22.06 / SCRUM-382) -->
      @if (mostrarModalReimpresion() && ticketPendienteReimpresion()) {
        <app-reimpresion-modal
          [ticket]="ticketPendienteReimpresion()"
          [procesandoExterno]="procesandoReimpresion()"
          (confirmarReimpresion)="onConfirmarReimpresion($event)"
          (cancelar)="onCancelarReimpresion()">
        </app-reimpresion-modal>
      }

      <!-- Modal de Consulta de Boletas y Estado de Tickets (HU-23.04, HU-23.05, HU-23.06) -->
      @if (mostrarConsultaTickets()) {
        <div
          (click)="mostrarConsultaTickets.set(false)"
          class="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto overscroll-contain cursor-pointer no-print"
          role="dialog"
          aria-modal="true"
          data-no-print="true"
          data-testid="modal-consulta-tickets">
          <div class="w-full max-w-6xl my-auto op-sheet-enter cursor-default" (click)="$event.stopPropagation()">
            <app-consulta-tickets
              [modoModal]="true"
              (reimprimirTicket)="abrirModalReimpresionBoleta($event)"
              (cerrar)="mostrarConsultaTickets.set(false)">
            </app-consulta-tickets>
          </div>
        </div>
      }

      <!-- Cabecera Compacta de Cabina POS -->
      <header class="no-print h-12 shrink-0 bg-slate-950 text-white border-b border-white/10 px-4 flex items-center justify-between gap-3 z-20">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-[11px] shrink-0">
            TDN
          </div>
          <h1 class="text-xs sm:text-sm font-extrabold text-white truncate">
            Taquilla POS
          </h1>

          @if (turnoActual(); as turno) {
            <div class="hidden md:flex items-center gap-1.5 bg-emerald-950/90 border border-emerald-600/60 px-2.5 py-0.5 rounded-full text-[11px] text-emerald-200 shrink-0">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span class="font-bold">Turno #{{ turno.idTurno }}</span>
              <span class="opacity-50">·</span>
              <span class="font-mono tabular-nums">Base \${{ turno.montoInicial.toLocaleString('es-CO') }}</span>
            </div>
          }
        </div>

        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <!-- Atajos Operativos Rápidos -->
          <div class="hidden xl:flex items-center gap-1 text-[10px] font-bold text-slate-300">
            <button
              type="button"
              data-testid="shortcut-badge-f2"
              (click)="enfocarBuscarCliente()"
              title="F2: Cédula cliente"
              class="inline-flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/15 rounded-lg transition-colors duration-150 ease-out cursor-pointer">
              <kbd class="px-1 bg-slate-800 border border-white/15 rounded font-mono text-[10px]">F2</kbd>
              <span>Cliente</span>
            </button>

            <button
              type="button"
              data-testid="shortcut-badge-f3"
              (click)="catalogoRef?.enfocarBuscador()"
              title="F3: Buscar atracción"
              class="inline-flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/15 rounded-lg transition-colors duration-150 ease-out cursor-pointer">
              <kbd class="px-1 bg-slate-800 border border-white/15 rounded font-mono text-[10px]">F3</kbd>
              <span>Buscar</span>
            </button>

            <button
              type="button"
              data-testid="shortcut-badge-f9"
              (click)="posCartRef?.intentarCobrarConAtajo()"
              title="F9: Cobrar orden"
              class="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg transition-colors duration-150 ease-out cursor-pointer">
              <kbd class="px-1 bg-emerald-800 border border-emerald-400/40 rounded font-mono text-[10px]">F9</kbd>
              <span>Cobrar</span>
            </button>

            @if (!turnoActual()) {
              <button
                type="button"
                data-testid="shortcut-badge-f4"
                (click)="abrirCajaShortcut()"
                title="F4: Apertura de Caja"
                class="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors duration-150 ease-out cursor-pointer">
                <kbd class="px-1 bg-blue-800 border border-blue-400/40 rounded font-mono text-[10px]">F4</kbd>
                <span>Abrir</span>
              </button>
            } @else {
              <button
                type="button"
                data-testid="shortcut-badge-f8"
                (click)="arqueoCajaShortcut()"
                title="F8: Arqueo / Cierre de Caja"
                class="inline-flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/15 rounded-lg transition-colors duration-150 ease-out cursor-pointer">
                <kbd class="px-1 bg-slate-800 border border-white/15 rounded font-mono text-[10px]">F8</kbd>
                <span>Arqueo</span>
              </button>
            }
          </div>

          @if (turnoActual()) {
            <button
              type="button"
              (click)="iniciarArqueo()"
              class="flex items-center gap-1.5 ps-2.5 pe-3 py-1 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold rounded-lg transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
              <svg class="w-3.5 h-3.5 op-icon text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span class="hidden sm:inline">Arqueo / Cerrar</span>
            </button>
          }

          <!-- Botón Reimprimir Última Boleta (HU-22.07 / SCRUM-383) -->
          @if (turnoActual() && colaEmisionService.ultimaBoletaEmitida()) {
            <button
              type="button"
              data-testid="btn-reimprimir-ultima-boleta"
              (click)="abrirModalReimpresionUltimaBoleta()"
              class="inline-flex items-center gap-1.5 ps-2.5 pe-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-extrabold transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer"
              title="Reimprimir última boleta emitida en el turno">
              <svg class="w-3.5 h-3.5 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span class="hidden sm:inline">Reimprimir última</span>
            </button>
          }

          <!-- Botón Consultar Boletas (F10) -->
          <button
            type="button"
            data-testid="btn-abrir-consulta-tickets"
            (click)="mostrarConsultaTickets.set(true)"
            class="inline-flex items-center gap-1.5 ps-2.5 pe-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer"
            title="Consultar boletas por cédula o UUID (F10)">
            <svg class="w-3.5 h-3.5 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span class="hidden sm:inline">Consultar</span>
            <kbd class="hidden xl:inline px-1 bg-blue-800 border border-blue-400/40 rounded font-mono text-[10px]">F10</kbd>
          </button>

          @if (colaEmisionService.cantidadOrdenesPendientes() > 0) {
            <button
              type="button"
              data-testid="badge-cola-emision"
              (click)="toggleColaEmision()"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-lg text-xs font-extrabold transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer tabular-nums"
              title="Cola de Emisión Física">
              <svg class="w-3.5 h-3.5 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <span>Emisión: {{ colaEmisionService.cantidadOrdenesPendientes() }}</span>
            </button>
          }
        </div>
      </header>

      <!-- Barra Compacta de Cliente + Niño Activo (1 línea por defecto; colapsa campos extra si ya existe) -->
      <section class="no-print shrink-0 bg-white border-b border-slate-200 px-4 py-2 z-20 relative">
        <div class="max-w-full flex flex-col gap-2">
          <!-- Fila Principal de 1 Línea -->
          <div class="flex flex-wrap items-center justify-between gap-2.5">
            <div class="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <!-- Input Cédula (F2) -->
              <div class="relative w-44 sm:w-52 shrink-0" [formGroup]="clienteForm">
                <input
                  #documentoInput
                  id="numeroDocumento"
                  data-testid="input-documento"
                  type="text"
                  inputmode="numeric"
                  formControlName="numeroDocumento"
                  (keydown.enter)="onEnterDocumento()"
                  placeholder="Cédula cliente (F2)"
                  class="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-[background-color,border-color] duration-150 ease-out text-slate-900 font-semibold placeholder-slate-400" />
                <div class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                  @if (buscandoCliente()) {
                    <svg class="motion-safe:animate-spin w-3.5 h-3.5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  } @else {
                    <svg class="w-3.5 h-3.5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                </div>
              </div>

              <!-- Badge de Estado + Resumen Cliente -->
              @if (buscandoCliente()) {
                <span data-testid="badge-buscando" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <span>Buscando...</span>
                </span>
              } @else if (clienteSeleccionado(); as cli) {
                <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span data-testid="badge-cliente-registrado" class="inline-flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Cliente Registrado · {{ cli.nombreCompleto }}</span>
                  </span>
                  <button
                    type="button"
                    data-testid="btn-editar-cliente"
                    (click)="editarClienteExpandido.update(v => !v)"
                    class="text-[11px] underline text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer">
                    {{ editarClienteExpandido() ? 'Ocultar' : 'Editar' }}
                  </button>
                </div>
              } @else if (esClienteNuevo()) {
                <span data-testid="badge-nuevo-cliente" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>Nuevo Cliente</span>
                </span>
              } @else {
                <button
                  type="button"
                  data-testid="btn-editar-cliente"
                  (click)="editarClienteExpandido.update(v => !v)"
                  class="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors duration-150 ease-out cursor-pointer">
                  {{ editarClienteExpandido() ? 'Ocultar datos' : '+ Datos cliente' }}
                </button>
              }

              <div class="hidden sm:block h-5 w-px bg-slate-200 mx-0.5"></div>

              <!-- Chips de Niños + Selector Niño Activo en 1 Línea -->
              <app-menores-chips
                [compacto]="true"
                [menores]="menoresOrden()"
                [menorActivo]="menorActivo()"
                (menoresChange)="onMenoresOrdenChange($event)"
                (menorActivoChange)="menorActivo.set($event)">
              </app-menores-chips>
            </div>

            <!-- Botón Limpiar -->
            <button
              type="button"
              data-testid="btn-limpiar"
              (click)="limpiarCliente()"
              class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-150 ease-out cursor-pointer shrink-0">
              <svg class="w-3.5 h-3.5 op-icon text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Limpiar</span>
            </button>
          </div>

          <!-- Fila 2 Colapsable: Solo visible cuando es Cliente Nuevo o se pulsa Editar -->
          @if (mostrarFormularioClienteExtendido()) {
            <form [formGroup]="clienteForm" class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1.5 border-t border-slate-100">
              <div>
                <label for="nombreCompleto" class="block text-[10px] font-bold text-slate-600 mb-0.5">
                  Nombre Completo <span class="text-rose-500">*</span>
                </label>
                <input
                  #nombreInput
                  id="nombreCompleto"
                  data-testid="input-nombre"
                  type="text"
                  formControlName="nombreCompleto"
                  (keydown.enter)="onEnterNombre()"
                  placeholder="Nombre del cliente"
                  class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-medium placeholder-slate-400" />
              </div>

              <div>
                <label for="telefono" class="block text-[10px] font-bold text-slate-600 mb-0.5">
                  Teléfono <span class="text-rose-500">*</span>
                </label>
                <input
                  #telefonoInput
                  id="telefono"
                  data-testid="input-telefono"
                  type="tel"
                  inputmode="tel"
                  formControlName="telefono"
                  (keydown.enter)="onEnterTelefono()"
                  placeholder="Ej: 3001234567"
                  class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-medium placeholder-slate-400" />
              </div>

              <div>
                <label for="correo" class="block text-[10px] font-bold text-slate-600 mb-0.5">
                  Correo Electrónico (opc.)
                </label>
                <input
                  id="correo"
                  data-testid="input-correo"
                  type="email"
                  formControlName="correo"
                  (keydown.enter)="onEnterTelefono()"
                  placeholder="correo@ejemplo.com"
                  class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-medium placeholder-slate-400" />
              </div>
            </form>
          }
        </div>
      </section>

      <!-- Cabina Split: Catálogo Izquierda + Checkout Anclado Derecha -->
      <main class="no-print flex-1 min-h-0 flex flex-col lg:flex-row lg:overflow-hidden">
        <!-- Columna Izquierda: Catálogo de 1 Clic con Scroll Independiente -->
        <div class="flex-1 min-h-0 lg:overflow-y-auto overscroll-contain p-3 lg:p-4">
          <app-catalogo-atracciones
            [atracciones]="atracciones()"
            [cargando]="cargandoAtracciones()"
            [conteoEnCarrito]="conteoAtraccionesEnCarrito()"
            (atraccionSeleccionada)="onAtraccionSeleccionada($event)">
          </app-catalogo-atracciones>
        </div>

        <!-- Columna Derecha: Post-Venta Inmediata + Carrito Anclado -->
        <aside class="w-full lg:w-[400px] xl:w-[430px] shrink-0 bg-white lg:border-l border-t lg:border-t-0 border-slate-200 flex flex-col min-h-0 lg:h-full">
          <!-- Panel Post-Venta / Cola de Emisión Física en la parte superior -->
          @if (mostrarColaEmision() || colaEmisionService.cantidadOrdenesPendientes() > 0) {
            <div
              data-testid="panel-cola-emision"
              class="shrink-0 border-b border-amber-200 bg-amber-50/70 p-3 text-xs space-y-2.5 max-h-[45vh] overflow-y-auto overscroll-contain">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <svg class="w-4 h-4 op-icon text-amber-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <div class="min-w-0">
                    <h3 class="font-extrabold text-slate-900 truncate">Cola de Emisión Física</h3>
                    <p class="text-[10px] text-amber-800 tabular-nums">
                      {{ colaEmisionService.totalBoletasPendientes() }} boleta(s) por despachar
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <div class="flex items-center bg-white border border-amber-200 p-0.5 rounded-lg text-[10px]" data-testid="selector-ancho-papel-pos">
                    <button
                      type="button"
                      data-testid="btn-ancho-80mm"
                      (click)="cambiarAnchoPapelPos(80)"
                      [class]="printService.anchoPapelMm() === 80 ? 'bg-amber-100 font-bold text-slate-900' : 'text-slate-500 hover:text-slate-700'"
                      class="px-1.5 py-0.5 rounded cursor-pointer transition-colors duration-150 ease-out">
                      80mm
                    </button>
                    <button
                      type="button"
                      data-testid="btn-ancho-58mm"
                      (click)="cambiarAnchoPapelPos(58)"
                      [class]="printService.anchoPapelMm() === 58 ? 'bg-amber-100 font-bold text-slate-900' : 'text-slate-500 hover:text-slate-700'"
                      class="px-1.5 py-0.5 rounded cursor-pointer transition-colors duration-150 ease-out">
                      58mm
                    </button>
                  </div>

                  @if (colaEmisionService.ordenes().some(o => o.estado === 'EMITIDA')) {
                    <button
                      type="button"
                      data-testid="btn-limpiar-emitidas"
                      (click)="colaEmisionService.limpiarEmitidas()"
                      class="text-[10px] text-slate-600 hover:text-slate-900 font-semibold cursor-pointer px-1.5 py-0.5 rounded">
                      Limpiar
                    </button>
                  }
                  <button
                    type="button"
                    data-testid="btn-cerrar-cola-emision"
                    (click)="mostrarColaEmision.set(false)"
                    class="text-slate-500 hover:text-slate-800 cursor-pointer p-1 rounded-lg">
                    ✕
                  </button>
                </div>
              </div>

              @if (colaEmisionService.ordenesPendientes().length === 0) {
                <div class="text-center py-2 text-slate-500 text-[11px]" data-testid="cola-emision-vacia">
                  <p class="font-medium text-slate-700">No hay boletas pendientes de emisión.</p>
                </div>
              } @else {
                <div class="space-y-2">
                  @for (orden of colaEmisionService.ordenesPendientes(); track orden.idOrden) {
                    <div
                      [attr.data-testid]="'orden-emision-' + orden.idOrden"
                      class="p-2.5 bg-white border border-amber-200 rounded-xl space-y-2 shadow-2xs">
                      <div class="flex items-center justify-between gap-2">
                        <div class="min-w-0">
                          <span class="font-bold text-slate-900 text-xs truncate block">{{ orden.clienteNombre }}</span>
                          <span class="text-[10px] text-slate-400 font-mono">#{{ orden.idOrden }}</span>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 uppercase shrink-0 tabular-nums">
                          {{ orden.boletas.length }} boleta(s)
                        </span>
                      </div>

                      <!-- Acción Directa 1-Clic: Imprimir y Entregar -->
                      <div class="flex items-center justify-between gap-1.5 pt-0.5">
                        <span class="font-mono tabular-nums font-extrabold text-slate-800 text-xs">
                          \${{ orden.granTotal.toLocaleString('es-CO') }}
                        </span>
                        <div class="flex items-center gap-1.5">
                          <button
                            type="button"
                            [attr.data-testid]="'btn-imprimir-entregar-' + orden.idOrden"
                            (click)="imprimirYEntregarOrden(orden)"
                            class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] rounded-lg transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
                            Imprimir y Entregar
                          </button>
                          <button
                            type="button"
                            [attr.data-testid]="'btn-imprimir-orden-' + orden.idOrden"
                            (click)="reimprimirOrdenFisica(orden)"
                            class="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] rounded-lg transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer"
                            title="Solo imprimir tirilla">
                            Imprimir
                          </button>
                          <button
                            type="button"
                            [attr.data-testid]="'btn-emitir-orden-' + orden.idOrden"
                            (click)="emitirOrdenFisica(orden.idOrden)"
                            class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
                            Entregar
                          </button>
                        </div>
                      </div>

                      <!-- Listado resumido y Carrusel QR -->
                      <div class="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                        @for (boleta of orden.boletas; track boleta.codigoBoleta; let bIndex = $index) {
                          <div
                            [attr.data-testid]="'ticket-generado-' + bIndex"
                            (click)="seleccionarBoletaCarrusel(orden.idOrden, bIndex)"
                            class="flex items-center justify-between text-slate-700 py-0.5 cursor-pointer hover:bg-amber-100/60 rounded px-1 transition-colors duration-150 ease-out"
                            title="Ver en carrusel de boletas">
                            <div class="truncate max-w-[170px]">
                              <span class="truncate font-medium block">
                                {{ boleta.atraccionNombre }} ({{ boleta.modalidadEtiqueta }})
                              </span>
                              <span class="text-[9px] font-mono text-slate-400 block">
                                {{ boleta.codigoBoleta }}
                              </span>
                            </div>
                            <div class="text-right shrink-0">
                              <span class="text-slate-600 text-[10px] block font-medium">
                                {{ boleta.menorNombre }}
                              </span>
                              <span class="text-[9px] font-mono tabular-nums text-slate-400">
                                \${{ boleta.precioUnitario.toLocaleString('es-CO') }}
                              </span>
                            </div>
                          </div>
                        }
                      </div>

                      @if (orden.boletas.length > 0) {
                        <div
                          [attr.data-testid]="'carrusel-qr-orden-' + orden.idOrden"
                          class="bg-slate-50 rounded-xl border border-slate-200 p-2 space-y-1.5">
                          <div class="flex items-center justify-between text-[11px] pb-1 border-b border-slate-200">
                            <span class="font-bold text-slate-700" data-testid="carrusel-contador-boletas">
                              Boleta {{ obtenerIndiceCarrusel(orden.idOrden, orden.boletas.length) + 1 }} de {{ orden.boletas.length }}
                            </span>
                            <div class="flex items-center gap-1">
                              <button
                                type="button"
                                data-testid="btn-carrusel-prev"
                                (click)="boletaAnteriorCarrusel(orden)"
                                [disabled]="orden.boletas.length <= 1"
                                title="Boleta anterior"
                                class="w-6 h-6 rounded flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                                ‹
                              </button>
                              <button
                                type="button"
                                data-testid="btn-carrusel-next"
                                (click)="boletaSiguienteCarrusel(orden)"
                                [disabled]="orden.boletas.length <= 1"
                                title="Boleta siguiente"
                                class="w-6 h-6 rounded flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                                ›
                              </button>
                            </div>
                          </div>

                          @if (obtenerBoletaActivaCarrusel(orden); as boletaActiva) {
                            <div data-testid="carrusel-boleta-activa" class="flex flex-col items-center gap-1">
                              <app-qr-viewer
                                [value]="boletaActiva.uuidCodigo || boletaActiva.codigoQr || boletaActiva.uuid || ''"
                                [uuid]="boletaActiva.uuid || boletaActiva.uuidCodigo || ''"
                                [codigoVisible]="boletaActiva.codigoBoleta"
                                [size]="116"
                                [margin]="4"
                                errorCorrectionLevel="M"
                                [mostrarInsigniaOptica]="true">
                              </app-qr-viewer>

                              <div class="text-center w-full px-1 space-y-0.5">
                                <p class="font-bold text-slate-800 text-xs truncate">
                                  {{ boletaActiva.atraccionNombre }} ({{ boletaActiva.modalidadEtiqueta }})
                                </p>
                                <p class="text-[10px] text-slate-600">
                                  Menor: <span class="font-semibold text-slate-800">{{ boletaActiva.menorNombre }}</span>
                                </p>
                                <button
                                  type="button"
                                  data-testid="btn-reimprimir-boleta-carrusel"
                                  (click)="abrirModalReimpresionBoleta(boletaActiva)"
                                  class="mt-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold transition-colors duration-150 ease-out cursor-pointer inline-flex items-center justify-center gap-1">
                                  <span>Reimprimir boleta</span>
                                </button>
                              </div>

                              @if (orden.boletas.length > 1) {
                                <div class="flex items-center justify-center gap-1 pt-0.5">
                                  @for (b of orden.boletas; track b.codigoBoleta; let dIndex = $index) {
                                    <button
                                      type="button"
                                      [attr.data-testid]="'btn-carrusel-dot-' + dIndex"
                                      (click)="seleccionarBoletaCarrusel(orden.idOrden, dIndex)"
                                      [class]="dIndex === obtenerIndiceCarrusel(orden.idOrden, orden.boletas.length) ? 'w-4 bg-amber-500' : 'w-1.5 bg-slate-300 hover:bg-slate-400'"
                                      class="h-1.5 rounded-full transition-[width,background-color] duration-150 ease-out cursor-pointer"
                                      [attr.aria-label]="'Ir a boleta ' + (dIndex + 1)">
                                    </button>
                                  }
                                </div>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- Carrito y Checkout Fijo -->
          <app-pos-cart
            class="flex-1 min-h-0 flex flex-col"
            [items]="itemsSeleccionados()"
            [menores]="menoresOrden()"
            [autoImprimir]="autoImprimirAlCobrar()"
            (autoImprimirChange)="autoImprimirAlCobrar.set($event)"
            (itemsChange)="itemsSeleccionados.set($event)"
            (liquidarOrden)="onLiquidarOrden($event)">
          </app-pos-cart>
        </aside>
      </main>

      <!-- Barra de Estado Compacta -->
      <footer class="no-print h-9 shrink-0 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-xs z-20">
        <div class="flex items-center gap-2 text-slate-500 min-w-0">
          <span class="w-2 h-2 rounded-full shrink-0" [ngClass]="turnoActual() ? 'bg-emerald-500' : 'bg-amber-500'"></span>
          <span class="font-medium truncate">
            @if (turnoActual(); as turno) {
              Turno #{{ turno.idTurno }} Activo • Territorio de Niños
            } @else {
              Turno de Taquilla • Territorio de Niños
            }
          </span>
        </div>

        <div class="flex items-center gap-2.5 shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center border border-blue-300">
              {{ authService.currentUserInitials() }}
            </div>
            <span class="text-xs font-bold text-slate-800 hidden sm:inline">{{ authService.currentUserName() }}</span>
            <span class="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full hidden md:inline">
              {{ authService.currentUser()?.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Taquillero' }}
            </span>
          </div>

          <div class="h-3.5 w-px bg-slate-200"></div>

          <button
            type="button"
            (click)="logout()"
            class="hover:bg-red-50 hover:text-red-600 text-xs text-slate-600 font-semibold ps-2 pe-2.5 py-1 rounded-lg transition-[transform,background-color,color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer flex items-center gap-1.5"
            title="Cerrar sesión">
            <svg class="w-3.5 h-3.5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span class="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </footer>

      <!-- Plantilla de Impresión Térmica 80mm / 58mm (Visible únicamente en @media print - HU-21.05 / HU-21.07) -->
      <div class="only-print" data-testid="contenedor-impresion-pos">
        <app-ticket-print-template
          [orden]="printService.ordenEnImpresion() || colaEmisionService.ordenReciente()"
          [boletas]="printService.boletasEnImpresion().length > 0 ? printService.boletasEnImpresion() : boletasGeneradas()"
          [paperWidthMm]="printService.anchoPapelMm()"
          [config]="printService.configParque()">
        </app-ticket-print-template>
      </div>
    </div>
  `
})
export class TaquillaPosComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly cajaService = inject(CajaService);
  readonly clienteService = inject(ClienteService);
  readonly atraccionService = inject(AtraccionService, { optional: true });
  readonly configuracionService = inject(ConfiguracionService, { optional: true });
  readonly posAudioService = inject(PosAudioService);
  readonly colaEmisionService = inject(ColaEmisionService);
  readonly ventaCalculoService = inject(VentaCalculoService);
  readonly printService = inject(PrintService);
  readonly ticketReimpresionService = inject(TicketReimpresionService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService, { optional: true });
  private readonly webSocketService = inject(WebSocketService, { optional: true });

  readonly mostrarModalApertura = signal<boolean>(false);
  readonly mostrarModalArqueo = signal<boolean>(false);
  readonly mostrarModalConfirmarPago = signal<boolean>(false);
  readonly mostrarModalReimpresion = signal<boolean>(false);
  readonly mostrarConsultaTickets = signal<boolean>(false);
  readonly mostrarColaEmision = signal<boolean>(false);
  readonly resumenPendientePago = signal<ResumenLiquidacionPOS | null>(null);
  readonly ticketPendienteReimpresion = signal<Ticket | null>(null);
  readonly procesandoPago = signal<boolean>(false);
  readonly procesandoArqueo = signal<boolean>(false);
  readonly procesandoReimpresion = signal<boolean>(false);
  readonly turnoActual = signal<TurnoResponseDTO | null>(null);

  readonly boletasGeneradas = this.colaEmisionService.boletasGeneradas;
  readonly historialTicketsTurno = this.colaEmisionService.historialTicketsTurno;

  readonly atracciones = signal<AtraccionCatalogoVenta[]>([]);
  readonly cargandoAtracciones = signal<boolean>(false);
  readonly itemsSeleccionados = signal<SeleccionCatalogoPOS[]>([]);

  readonly clienteSeleccionado = signal<Cliente | null>(null);
  readonly esClienteNuevo = signal<boolean>(false);
  readonly editarClienteExpandido = signal<boolean>(false);
  readonly buscandoCliente = signal<boolean>(false);
  readonly menoresOrden = signal<Menor[]>([]);
  readonly menorActivo = signal<Menor | null>(null);
  readonly autoImprimirAlCobrar = signal<boolean>(false);

  @ViewChild('documentoInput') documentoInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('nombreInput') nombreInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('telefonoInput') telefonoInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild(CatalogoAtraccionesComponent) catalogoRef?: CatalogoAtraccionesComponent;
  @ViewChild(PosCartComponent) posCartRef?: PosCartComponent;

  readonly clienteForm = this.fb.group({
    numeroDocumento: ['', [Validators.required, Validators.minLength(5)]],
    nombreCompleto: ['', [Validators.required]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9+\s-]{7,15}$/)]],
    correo: ['', [Validators.email]]
  });

  readonly mostrarFormularioClienteExtendido = computed(
    () => this.esClienteNuevo() || this.editarClienteExpandido()
  );

  readonly conteoAtraccionesEnCarrito = computed<Record<string, number>>(() => {
    const mapa: Record<string, number> = {};
    for (const item of this.itemsSeleccionados()) {
      const key = String(item.atraccion?.id ?? item.atraccion?.nombre ?? '');
      if (!key) continue;
      mapa[key] = (mapa[key] ?? 0) + (item.cantidad ?? 1);
    }
    return mapa;
  });

  readonly esCierreCiego = computed(() => {
    const rol = this.authService.currentUser()?.rol;
    const turno = this.turnoActual();
    return rol === 'TAQUILLERO' && turno?.ventasEfectivoSistema === null;
  });

  readonly montoEsperadoArqueo = computed(() => {
    const t = this.turnoActual();
    return (t?.montoInicial ?? 0) + (t?.totalRecaudado ?? 0);
  });

  readonly totalOrden = computed(() => {
    return this.ventaCalculoService.calcularGranTotal(this.itemsSeleccionados());
  });

  readonly nombreClienteTitular = computed(() => {
    return this.clienteSeleccionado()?.nombreCompleto || this.clienteForm.get('nombreCompleto')?.value || 'Cliente de Mostrador';
  });

  ngOnInit(): void {
    this.verificarTurnoCaja();
    this.iniciarBusquedaCliente();
    this.cargarCatalogoAtracciones();
    this.cargarConfiguracionImpresion();
    this.iniciarTelemetriaAforo();
  }

  private iniciarTelemetriaAforo(): void {
    const stream$ = this.webSocketService?.conectarDashboardAdmin?.();
    if (!stream$) return;
    stream$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (event.tipo === 'ESTADO_ATRACCION_CAMBIADO' && event.estadoAtraccion) {
        const nuevoEstado = event.estadoAtraccion as Atraccion['estado'];
        let encontrada = false;
        this.atracciones.update(lista =>
          lista.map(a => {
            if (String(a.id) === String(event.atraccionId)) {
              encontrada = true;
              return { ...a, estado: nuevoEstado };
            }
            return a;
          })
        );
        if (!encontrada) {
          this.cargarCatalogoAtracciones();
        }
        if (nuevoEstado === 'FUERA_DE_SERVICIO') {
          const itemsActivos = this.itemsSeleccionados();
          const removidos = itemsActivos.filter(item => String(item.atraccion?.id) === String(event.atraccionId));
          if (removidos.length > 0) {
            this.itemsSeleccionados.update(items =>
              items.filter(item => String(item.atraccion?.id) !== String(event.atraccionId))
            );
            this.notificationService?.warn(
              `Se retiraron ${removidos.length} ítem(s) de "${removidos[0].atraccion.nombre}" de la orden porque pasó a Fuera de servicio.`
            );
          }
          this.notificationService?.warn(event.mensaje || 'Una atracción fue marcada Fuera de servicio.');
        } else if (nuevoEstado === 'ACTIVO') {
          this.notificationService?.info(event.mensaje || 'Una atracción volvió a estar activa.');
        }
        return;
      }
      this.atracciones.update(lista =>
        lista.map(a => {
          if (String(a.id) === String(event.atraccionId)) {
            const capacidad = event.capacidadMaxima ?? a.capacidadMaxima ?? a.maxCapacity ?? 1;
            const ocupados = event.ninosActivos ?? 0;
            const aforoDisponible = Math.max(0, capacidad - ocupados);
            return {
              ...a,
              ninosActivos: ocupados,
              ocupacionActual: ocupados,
              ocupacionActiva: ocupados,
              aforoDisponible,
              tieneCupo: aforoDisponible > 0,
              ...(aforoDisponible > 0 ? { horaProximoIngreso: null, ingresoTexto: 'AHORA' } : {})
            };
          }
          return a;
        })
      );
    });
  }

  private cargarConfiguracionImpresion(): void {
    const req$ = this.configuracionService?.getConfiguracion?.();
    if (!req$) return;

    req$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null))
      )
      .subscribe(config => {
        if (config) {
          this.printService.configurarDatosParque(config);
          if (config.anchoPapelMm) {
            this.printService.configurarAnchoPapel(config.anchoPapelMm === 58 ? 58 : 80);
          }
        }
      });
  }

  cargarCatalogoAtracciones(): void {
    if (!this.atraccionService) return;
    this.cargandoAtracciones.set(true);
    this.atraccionService
      .getCatalogoVenta()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoAtracciones.set(false))
      )
      .subscribe({
        next: lista => {
          const normalizada = (lista || []).map(a => {
            const ocupados = a.ocupacionActual ?? a.ocupacionActiva ?? a.ninosActivos ?? 0;
            return {
              ...a,
              ocupacionActual: ocupados,
              ocupacionActiva: ocupados,
              ninosActivos: ocupados
            };
          });
          this.atracciones.set(normalizada);
        },
        error: () => {
          this.atracciones.set([]);
          this.notificationService?.error('Error al cargar el catálogo de atracciones.');
        }
      });
  }

  onAtraccionSeleccionada(sel: SeleccionCatalogoPOS): void {
    const a = sel.atraccion;
    if (a.estado && a.estado !== 'ACTIVO') {
      this.notificationService?.warn(`La atracción "${a.nombre}" no está disponible.`);
      return;
    }

    const menores = this.menoresOrden();
    const menorPreasignado = sel.menorAsignado ?? this.menorActivo() ?? (menores.length === 1 ? menores[0] : null);
    const getMenorKey = (m: Menor | null | undefined) =>
      !m ? '' : m.idMenor !== undefined ? String(m.idMenor) : m.nombreCompleto;
    const keyNueva = getMenorKey(menorPreasignado);
    const cantAgregar = sel.cantidad ?? 1;

    this.itemsSeleccionados.update(prev => {
      const idx = prev.findIndex(
        item =>
          String(item.atraccion?.id ?? item.atraccion?.nombre) === String(a.id ?? a.nombre) &&
          item.modalidad?.etiqueta === sel.modalidad?.etiqueta &&
          getMenorKey(item.menorAsignado) === keyNueva
      );
      if (idx !== -1) {
        return prev.map((item, i) => (i === idx ? { ...item, cantidad: (item.cantidad ?? 1) + cantAgregar } : item));
      }
      return [
        ...prev,
        {
          ...sel,
          cantidad: cantAgregar,
          menorAsignado: menorPreasignado
        }
      ];
    });

    this.notificationService?.success(`"${sel.atraccion.nombre}" (${sel.modalidad.etiqueta}) añadida a la orden.`);
  }

  onMenoresOrdenChange(nuevosMenores: Menor[]): void {
    this.menoresOrden.set(nuevosMenores);
    const idsValidos = new Set(
      nuevosMenores.map(m => (m.idMenor !== undefined ? String(m.idMenor) : m.nombreCompleto))
    );
    this.itemsSeleccionados.update(items =>
      items.map(item => {
        if (!item.menorAsignado) return item;
        const key =
          item.menorAsignado.idMenor !== undefined
            ? String(item.menorAsignado.idMenor)
            : item.menorAsignado.nombreCompleto;
        if (!idsValidos.has(key)) {
          return { ...item, menorAsignado: null };
        }
        return item;
      })
    );

    const activo = this.menorActivo();
    if (activo) {
      const keyActivo = activo.idMenor !== undefined ? String(activo.idMenor) : activo.nombreCompleto;
      if (!idsValidos.has(keyActivo)) {
        this.menorActivo.set(nuevosMenores.length === 1 ? nuevosMenores[0] : null);
      }
    } else if (nuevosMenores.length === 1) {
      this.menorActivo.set(nuevosMenores[0]);
    }
  }

  removerItemOrden(index: number): void {
    this.itemsSeleccionados.update(prev => prev.filter((_, i) => i !== index));
  }

  limpiarOrden(): void {
    this.itemsSeleccionados.set([]);
  }

  onLiquidarOrden(resumen: ResumenLiquidacionPOS): void {
    this.onPagoConfirmado(resumen);
  }

  onCancelarConfirmacionPago(): void {
    this.mostrarModalConfirmarPago.set(false);
    this.resumenPendientePago.set(null);
  }

  onPagoConfirmado(resumen: ResumenLiquidacionPOS): void {
    this.procesandoPago.set(true);

    this.posAudioService.reproducirConfirmacionPago();

    const docCliente = this.clienteForm.get('numeroDocumento')?.value?.trim();
    const nomCliente = this.clienteForm.get('nombreCompleto')?.value?.trim();
    const telCliente = this.clienteForm.get('telefono')?.value?.trim();
    const clienteId = this.clienteSeleccionado()?.idCliente ?? this.clienteSeleccionado()?.id;
    const clienteContexto = {
      clienteNombre: this.nombreClienteTitular(),
      clienteDocumento: docCliente || undefined,
      clienteId
    };
    const ordenFisica = this.colaEmisionService.encolarVenta(resumen, clienteContexto);

    const registroCliente$ =
      this.esClienteNuevo() && docCliente && nomCliente
        ? this.clienteService?.registrarCliente?.({
            tipoDocumento: 'CC',
            numeroDocumento: docCliente,
            nombreCompleto: nomCliente,
            telefono: telCliente || '',
            correo: this.clienteForm.get('correo')?.value?.trim() || undefined,
            menores: this.menoresOrden()
          })
        : undefined;

    if (registroCliente$) {
      registroCliente$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          catchError(() => of(null))
        )
        .subscribe(nuevoCliente => {
          const idResuelto = nuevoCliente?.idCliente ?? nuevoCliente?.id ?? clienteContexto.clienteId;

          if (nuevoCliente?.menores && nuevoCliente.menores.length > 0) {
            ordenFisica.boletas.forEach(b => {
              if (!b.menorId) {
                const menorEncontrado =
                  nuevoCliente.menores?.find(m => m.nombreCompleto === b.menorNombre) ??
                  (nuevoCliente.menores?.length === 1 ? nuevoCliente.menores[0] : null);
                if (menorEncontrado) {
                  b.menorId = menorEncontrado.idMenor ?? menorEncontrado.id;
                }
              }
            });
          }

          this.colaEmisionService.sincronizarVentaBackend(
            ordenFisica,
            idResuelto,
            clienteContexto.clienteDocumento,
            resumen.montoRecibido
          );
        });
    } else {
      this.colaEmisionService.sincronizarVentaBackend(
        ordenFisica,
        clienteContexto.clienteId,
        clienteContexto.clienteDocumento,
        resumen.montoRecibido
      );
    }

    const turno = this.turnoActual();
    if (turno && resumen.metodoPago === 'EFECTIVO') {
      this.turnoActual.set({
        ...turno,
        totalRecaudado: (turno.totalRecaudado ?? 0) + resumen.granTotal
      });
    }

    this.itemsSeleccionados.set([]);
    this.limpiarCliente();

    this.mostrarModalConfirmarPago.set(false);
    this.resumenPendientePago.set(null);

    this.cargarCatalogoAtracciones();

    this.notificationService?.success(
      `Orden liquidada exitosamente (${resumen.metodoPago}) por valor de $${resumen.granTotal.toLocaleString('es-CO')} COP. Pasada a cola de emisión física (#${ordenFisica.idOrden}).`
    );

    this.procesandoPago.set(false);

    this.printService.ordenEnImpresion.set(ordenFisica);
    this.printService.boletasEnImpresion.set(ordenFisica.boletas ?? []);

    if (this.autoImprimirAlCobrar()) {
      this.printService.imprimirOrden(ordenFisica);
      this.colaEmisionService.marcarOrdenEmitida(ordenFisica.idOrden);
      this.mostrarColaEmision.set(false);
      this.enfocarBuscarCliente(true);
    } else {
      this.mostrarColaEmision.set(true);
    }
  }

  imprimirYEntregarOrden(orden: OrdenEmisionFisica): void {
    this.printService.imprimirOrden(orden);
    this.colaEmisionService.marcarOrdenEmitida(orden.idOrden);
    if (this.colaEmisionService.cantidadOrdenesPendientes() === 0) {
      this.mostrarColaEmision.set(false);
    }
    this.notificationService?.success(`Orden #${orden.idOrden} enviada a impresión y entregada.`);
    this.enfocarBuscarCliente(true);
  }

  emitirOrdenFisica(idOrden: string): void {
    this.colaEmisionService.marcarOrdenEmitida(idOrden);
    if (this.colaEmisionService.cantidadOrdenesPendientes() === 0) {
      this.mostrarColaEmision.set(false);
    }
    this.notificationService?.success(`Boletas de la orden #${idOrden} marcadas como emitidas.`);
    this.enfocarBuscarCliente(true);
  }

  reimprimirOrdenFisica(orden: OrdenEmisionFisica): void {
    this.printService.imprimirOrden(orden);
    this.notificationService?.info(`Enviando orden #${orden.idOrden} a impresión.`);
  }

  abrirModalReimpresionUltimaBoleta(): void {
    const ultima = this.colaEmisionService.ultimaBoletaEmitida();
    if (!ultima) {
      this.notificationService?.warn('No hay boletas emitidas en el turno activo para reimprimir.');
      return;
    }
    this.ticketPendienteReimpresion.set(ultima);
    this.mostrarModalReimpresion.set(true);
  }

  abrirModalReimpresionBoleta(ticket: Ticket): void {
    if (!ticket) return;
    this.ticketPendienteReimpresion.set(ticket);
    this.mostrarModalReimpresion.set(true);
  }

  onCancelarReimpresion(): void {
    this.mostrarModalReimpresion.set(false);
    this.ticketPendienteReimpresion.set(null);
  }

  onConfirmarReimpresion(evento: {
    ticket: Ticket;
    motivo: string;
    codigoMotivo: CodigoMotivoReimpresion;
  }): void {
    this.procesandoReimpresion.set(true);

    this.ticketReimpresionService
      .solicitarReimpresion(evento.ticket, { motivo: evento.motivo })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesandoReimpresion.set(false))
      )
      .subscribe({
        next: res => {
          const ticketActualizado = this.colaEmisionService.actualizarBoletaReimpresa(
            evento.ticket.uuid || String(evento.ticket.idTicket || evento.ticket.id),
            {
              esReimpresion: true,
              marcaImpresion: res.marcaImpresion || '** REIMPRESIÓN **',
              motivoUltimaReimpresion: res.motivo || evento.motivo,
              fechaUltimaReimpresion: res.fechaReimpresion
            }
          );

          const boletaAImprimir = ticketActualizado || {
            ...evento.ticket,
            esReimpresion: true,
            marcaImpresion: res.marcaImpresion || '** REIMPRESIÓN **',
            motivoUltimaReimpresion: res.motivo || evento.motivo
          };
          this.printService.imprimirBoletas([boletaAImprimir]);

          this.notificationService?.success(
            `Reimpresión registrada (#${res.idLog || 'LOG'}) • Boleta ${res.codigoBoleta || evento.ticket.codigoBoleta} • Motivo: ${res.motivo || evento.motivo}`
          );

          this.mostrarModalReimpresion.set(false);
          this.ticketPendienteReimpresion.set(null);
        },
        error: err => {
          if (err?.status === 409) {
            this.notificationService?.error(
              err?.error?.message ||
                `No se puede reimprimir: la boleta #${evento.ticket.codigoBoleta} ya fue consumida o anulada.`
            );
          } else {
            this.notificationService?.error(
              err?.error?.message || err?.message || 'Error al procesar la reimpresión auditada en el servidor.'
            );
          }
        }
      });
  }

  cambiarAnchoPapelPos(ancho: 58 | 80): void {
    this.printService.configurarAnchoPapel(ancho);
    this.notificationService?.info(`Formato de impresión térmica configurado a ${ancho}mm.`);
  }

  toggleColaEmision(): void {
    this.mostrarColaEmision.update(v => !v);
  }

  readonly indiceCarruselPorOrden = signal<Record<string, number>>({});

  obtenerIndiceCarrusel(idOrden: string, totalBoletas: number): number {
    const raw = this.indiceCarruselPorOrden()[idOrden] ?? 0;
    if (totalBoletas <= 0) return 0;
    return Math.max(0, Math.min(raw, totalBoletas - 1));
  }

  obtenerBoletaActivaCarrusel(orden: OrdenEmisionFisica): Ticket | null {
    if (!orden || !orden.boletas || orden.boletas.length === 0) return null;
    const idx = this.obtenerIndiceCarrusel(orden.idOrden, orden.boletas.length);
    return orden.boletas[idx] ?? null;
  }

  boletaAnteriorCarrusel(orden: OrdenEmisionFisica): void {
    if (!orden || !orden.boletas || orden.boletas.length <= 1) return;
    const actual = this.obtenerIndiceCarrusel(orden.idOrden, orden.boletas.length);
    const nuevo = actual > 0 ? actual - 1 : orden.boletas.length - 1;
    this.seleccionarBoletaCarrusel(orden.idOrden, nuevo);
  }

  boletaSiguienteCarrusel(orden: OrdenEmisionFisica): void {
    if (!orden || !orden.boletas || orden.boletas.length <= 1) return;
    const actual = this.obtenerIndiceCarrusel(orden.idOrden, orden.boletas.length);
    const nuevo = actual < orden.boletas.length - 1 ? actual + 1 : 0;
    this.seleccionarBoletaCarrusel(orden.idOrden, nuevo);
  }

  seleccionarBoletaCarrusel(idOrden: string, index: number): void {
    this.indiceCarruselPorOrden.update(m => ({ ...m, [idOrden]: index }));
  }

  onEnterDocumento(): void {
    if (this.mostrarFormularioClienteExtendido()) {
      setTimeout(() => this.nombreInputRef?.nativeElement?.focus(), 0);
    } else {
      this.catalogoRef?.enfocarBuscador();
    }
  }

  onEnterNombre(): void {
    this.telefonoInputRef?.nativeElement?.focus();
  }

  onEnterTelefono(): void {
    this.catalogoRef?.enfocarBuscador();
  }

  iniciarBusquedaCliente(): void {
    this.clienteForm
      .get('numeroDocumento')!
      .valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter(doc => !!doc && doc.trim().length >= 5),
        switchMap(doc => {
          this.buscandoCliente.set(true);
          return this.clienteService.buscarPorDocumento(doc!.trim()).pipe(
            catchError(() => of(null)),
            finalize(() => this.buscandoCliente.set(false))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: cliente => {
          if (cliente) {
            this.clienteSeleccionado.set(cliente);
            this.esClienteNuevo.set(false);
            this.editarClienteExpandido.set(false);
            const menores = cliente.menores ? [...cliente.menores] : [];
            this.menoresOrden.set(menores);
            this.menorActivo.set(menores.length === 1 ? menores[0] : null);
            this.clienteForm.patchValue(
              {
                nombreCompleto: cliente.nombreCompleto ?? '',
                telefono: cliente.telefono ?? '',
                correo: cliente.correo ?? ''
              },
              { emitEvent: false }
            );
          } else {
            this.clienteSeleccionado.set(null);
            this.esClienteNuevo.set(true);
            this.menoresOrden.set([]);
            this.menorActivo.set(null);
            this.clienteForm.patchValue(
              {
                nombreCompleto: '',
                telefono: '',
                correo: ''
              },
              { emitEvent: false }
            );
          }
        }
      });
  }

  limpiarCliente(): void {
    this.clienteForm.reset({
      numeroDocumento: '',
      nombreCompleto: '',
      telefono: '',
      correo: ''
    });
    this.clienteSeleccionado.set(null);
    this.esClienteNuevo.set(false);
    this.editarClienteExpandido.set(false);
    this.buscandoCliente.set(false);
    this.menoresOrden.set([]);
    this.menorActivo.set(null);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    if (this.mostrarModalApertura() || this.mostrarModalArqueo() || this.mostrarModalConfirmarPago()) {
      return;
    }

    if (event.key === 'Escape') {
      if (this.mostrarConsultaTickets()) {
        this.mostrarConsultaTickets.set(false);
      } else if (this.mostrarModalReimpresion()) {
        this.onCancelarReimpresion();
      } else if (this.mostrarColaEmision()) {
        this.mostrarColaEmision.set(false);
      }
      return;
    }

    if (event.key === 'F2') {
      event.preventDefault();
      this.enfocarBuscarCliente();
    } else if (event.key === 'F3') {
      event.preventDefault();
      this.catalogoRef?.enfocarBuscador();
    } else if (event.key === 'F4') {
      event.preventDefault();
      this.abrirCajaShortcut();
    } else if (event.key === 'F8') {
      event.preventDefault();
      this.arqueoCajaShortcut();
    } else if (event.key === 'F9' || ((event.ctrlKey || event.metaKey) && event.key === 'Enter')) {
      event.preventDefault();
      this.posCartRef?.intentarCobrarConAtajo();
    } else if (event.key === 'F10') {
      event.preventDefault();
      this.mostrarConsultaTickets.set(true);
    } else if (event.altKey && this.itemsSeleccionados().length > 0) {
      if (event.key === '1') {
        event.preventDefault();
        this.posCartRef?.seleccionarMetodo('EFECTIVO');
      } else if (event.key === '2') {
        event.preventDefault();
        this.posCartRef?.seleccionarMetodo('TARJETA_DEBITO');
      } else if (event.key === '3') {
        event.preventDefault();
        this.posCartRef?.seleccionarMetodo('TARJETA_CREDITO');
      } else if (event.key === '4') {
        event.preventDefault();
        this.posCartRef?.seleccionarMetodo('TRANSFERENCIA');
      }
    }
  }

  enfocarBuscarCliente(silencioso = false): void {
    const docInput =
      this.documentoInputRef?.nativeElement ??
      (document.getElementById('numeroDocumento') as HTMLInputElement | null);
    if (docInput) {
      docInput.focus();
      docInput.select();
    }
    if (!silencioso) {
      this.notificationService?.info('Atajo F2: Campo de documento de cliente enfocado.');
    }
  }

  abrirCajaShortcut(): void {
    if (this.turnoActual()) {
      this.notificationService?.info('El turno de caja actual ya se encuentra abierto.');
    } else {
      this.mostrarModalApertura.set(true);
    }
  }

  arqueoCajaShortcut(): void {
    if (!this.turnoActual()) {
      this.notificationService?.warn('Debe tener un turno de caja abierto para realizar el arqueo.');
    } else {
      this.iniciarArqueo();
    }
  }

  verificarTurnoCaja(): void {
    this.cajaService
      .obtenerTurnoActivo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: turno => {
          if (!turno || turno.estado !== 'ABIERTO') {
            this.turnoActual.set(null);
            this.mostrarModalApertura.set(true);
          } else {
            this.turnoActual.set(turno);
            this.mostrarModalApertura.set(false);
          }
        },
        error: () => {
          this.turnoActual.set(null);
          this.mostrarModalApertura.set(true);
        }
      });
  }

  onTurnoIniciado(turno: TurnoResponseDTO): void {
    this.turnoActual.set(turno);
    this.mostrarModalApertura.set(false);
  }

  iniciarArqueo(): void {
    this.mostrarModalArqueo.set(true);
  }

  onArqueoConfirmado(resultado: ResultadoArqueoDTO): void {
    if (this.procesandoArqueo()) return;
    this.procesandoArqueo.set(true);

    const ejecutarCierre = () =>
      this.cajaService.cerrarTurno({
        idTurno: resultado.idTurno,
        montoFinal: resultado.totalFisico,
        totalEfectivoReal: resultado.totalFisico,
        observaciones: resultado.justificacion,
        diferencia: resultado.diferencia,
        justificacion: resultado.justificacion
      });

    const pipeline$ =
      typeof this.cajaService.registrarArqueo === 'function'
        ? this.cajaService.registrarArqueo(resultado.idTurno, resultado).pipe(
            switchMap(() => ejecutarCierre()),
            catchError(err => {
              if (err?.status === 404 || err?.status === 403 || err?.status === 405) {
                return ejecutarCierre();
              }
              return throwError(() => err);
            })
          )
        : ejecutarCierre();

    pipeline$
      .pipe(
        finalize(() => this.procesandoArqueo.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.mostrarModalArqueo.set(false);
          this.turnoActual.set(null);
          this.itemsSeleccionados.set([]);
          this.limpiarCliente();
          this.colaEmisionService.limpiarTodo();
          this.mostrarColaEmision.set(false);
          this.indiceCarruselPorOrden.set({});
          this.notificationService?.success('Arqueo de caja registrado y turno cerrado exitosamente.');
          this.mostrarModalApertura.set(true);
        },
        error: err => {
          const msg = err?.error?.detalles || err?.error?.mensaje || 'Error al procesar el cierre y arqueo de caja.';
          this.notificationService?.error(msg);
        }
      });
  }

  logout(): void {
    this.colaEmisionService.limpiarTodo();
    this.authService.logout();
  }
}
