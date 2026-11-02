import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, HostListener, inject, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, filter, switchMap, finalize, catchError } from 'rxjs/operators';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { CajaService } from '../../../../core/services/caja.service';
import { ClienteService } from '../../../../core/services/cliente.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ResultadoArqueoDTO, TurnoResponseDTO } from '../../../../core/models/caja.model';
import { Cliente, Menor } from '../../../../core/models/cliente.model';
import { Atraccion, OrdenEmisionFisica, ResumenLiquidacionPOS, SeleccionCatalogoPOS } from '../../../../core/models/atraccion.model';
import { Ticket } from '../../../../core/models/ticket.model';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { PosAudioService } from '../../../../core/services/pos-audio.service';
import { ColaEmisionService } from '../../../../core/services/cola-emision.service';
import { VentaCalculoService } from '../../../../core/services/venta-calculo.service';
import { AperturaCajaModalComponent } from '../../components/apertura-caja-modal/apertura-caja-modal.component';
import { ArqueoCajaModalComponent } from '../../components/arqueo-caja-modal/arqueo-caja-modal.component';
import { ConfirmarPagoModalComponent } from '../../components/confirmar-pago-modal/confirmar-pago-modal.component';
import { MenoresChipsComponent } from '../../components/menores-chips/menores-chips.component';
import { CatalogoAtraccionesComponent } from '../../components/catalogo-atracciones/catalogo-atracciones.component';
import { PosCartComponent } from '../../components/pos-cart/pos-cart.component';
import { ReimpresionModalComponent } from '../../components/reimpresion-modal/reimpresion-modal.component';
import { ConsultaTicketsComponent } from '../../components/consulta-tickets/consulta-tickets.component';
import { QrViewerComponent } from '../../../../shared/components/qr-viewer/qr-viewer.component';
import { TicketPrintTemplateComponent } from '../../../../shared/components/ticket-print-template/ticket-print-template.component';
import { PrintService } from '../../../../core/services/print.service';
import { TicketReimpresionService } from '../../../../core/services/ticket-reimpresion.service';
import { CodigoMotivoReimpresion } from '../../../../core/models/ticket.model';

@Component({
  selector: 'app-taquilla-pos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AperturaCajaModalComponent,
    ArqueoCajaModalComponent,
    ConfirmarPagoModalComponent,
    ReimpresionModalComponent,
    ConsultaTicketsComponent,
    MenoresChipsComponent,
    CatalogoAtraccionesComponent,
    PosCartComponent,
    QrViewerComponent,
    TicketPrintTemplateComponent
  ],
  template: `
    <div class="min-h-screen bg-slate-50 font-sans flex flex-col relative pb-16">
      <!-- Modal Bloqueante de Apertura si no hay turno activo -->
      @if (mostrarModalApertura()) {
        <app-apertura-caja-modal (turnoIniciado)="onTurnoIniciado($event)"></app-apertura-caja-modal>
      }

      <!-- Modal de Arqueo y Cierre Asistido -->
      @if (mostrarModalArqueo() && turnoActual()) {
        <app-arqueo-caja-modal
          [idTurno]="turnoActual()!.idTurno"
          [montoEsperado]="montoEsperadoArqueo()"
          [procesandoExterno]="procesandoArqueo()"
          (confirmarArqueo)="onArqueoConfirmado($event)"
          (cancelar)="mostrarModalArqueo.set(false)">
        </app-arqueo-caja-modal>
      }

      <!-- Modal de Confirmación de Pago (Notion: CA-05) -->
      @if (mostrarModalConfirmarPago() && resumenPendientePago()) {
        <app-confirmar-pago-modal
          [resumen]="resumenPendientePago()"
          [clienteNombre]="nombreClienteTitular()"
          [procesandoExterno]="procesandoPago()"
          (confirmarPago)="onPagoConfirmado($event)"
          (cancelar)="onCancelarConfirmacionPago()">
        </app-confirmar-pago-modal>
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
          class="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          data-testid="modal-consulta-tickets">
          <div class="w-full max-w-6xl my-auto animate-in fade-in zoom-in-95 duration-150" (click)="$event.stopPropagation()">
            <app-consulta-tickets
              [modoModal]="true"
              (reimprimirTicket)="abrirModalReimpresionBoleta($event)"
              (cerrar)="mostrarConsultaTickets.set(false)">
            </app-consulta-tickets>
          </div>
        </div>
      }

      <!-- Cabecera del POS -->
      <header class="no-print h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs z-10">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
            TDN
          </div>
          <div>
            <h1 class="text-sm font-bold text-slate-800">Taquilla POS • Ventas y Boletas</h1>
            <p class="text-[11px] text-slate-400">Territorio de Niños</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5 sm:gap-3">
          <!-- Atajos de Teclado Operativos (HU-15.12) -->
          <div class="hidden md:flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <button
              type="button"
              data-testid="shortcut-badge-f2"
              (click)="enfocarBuscarCliente()"
              title="Atajo F2: Buscar / Identificar Cliente"
              class="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer">
              <kbd class="px-1 py-0.2 bg-white rounded border border-slate-300 font-mono text-[10px] font-bold shadow-2xs">F2</kbd>
              <span class="hidden xl:inline">Cliente</span>
            </button>

            @if (!turnoActual()) {
              <button
                type="button"
                data-testid="shortcut-badge-f4"
                (click)="abrirCajaShortcut()"
                title="Atajo F4: Apertura de Caja"
                class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition cursor-pointer">
                <kbd class="px-1 py-0.2 bg-white rounded border border-blue-200 font-mono text-[10px] font-bold shadow-2xs">F4</kbd>
                <span class="hidden xl:inline">Abrir Caja</span>
              </button>
            }

            @if (turnoActual()) {
              <button
                type="button"
                data-testid="shortcut-badge-f8"
                (click)="arqueoCajaShortcut()"
                title="Atajo F8: Arqueo / Cierre de Caja"
                class="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer">
                <kbd class="px-1 py-0.2 bg-white rounded border border-slate-300 font-mono text-[10px] font-bold shadow-2xs">F8</kbd>
                <span class="hidden xl:inline">Arqueo</span>
              </button>
            }
          </div>

          @if (turnoActual(); as turno) {
            <div class="hidden lg:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-xs text-emerald-800">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span class="font-bold">Turno #{{ turno.idTurno }}</span>
              <span class="text-emerald-400">•</span>
              <span>Base: <strong>\${{ turno.montoInicial.toLocaleString('es-CO') }}</strong></span>
            </div>

            <button
              type="button"
              (click)="iniciarArqueo()"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs">
              <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Arqueo / Cerrar Caja</span>
            </button>
          }

          <!-- Botón de Acceso Rápido: Reimprimir Última Boleta (HU-22.07 / SCRUM-383) -->
          @if (turnoActual() && colaEmisionService.ultimaBoletaEmitida()) {
            <button
              type="button"
              data-testid="btn-reimprimir-ultima-boleta"
              (click)="abrirModalReimpresionUltimaBoleta()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
              title="Reimprimir última boleta emitida en el turno">
              <span>🖨️</span>
              <span class="hidden sm:inline">Reimprimir última boleta</span>
              <span class="sm:hidden">Reimprimir</span>
            </button>
          }

          <!-- Botón de Consulta de Boletas y Estado de Tickets (HU-23.04 / SCRUM-386) -->
          <button
            type="button"
            data-testid="btn-abrir-consulta-tickets"
            (click)="mostrarConsultaTickets.set(true)"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
            title="Consultar boletas por cédula o UUID">
            <svg class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span class="hidden sm:inline">Consultar Boletas</span>
            <span class="sm:hidden">Consultar</span>
          </button>

          @if (colaEmisionService.cantidadOrdenesPendientes() > 0) {
            <button
              type="button"
              data-testid="badge-cola-emision"
              (click)="toggleColaEmision()"
              class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
              title="Cola de Emisión Física">
              <span>🎟️</span>
              <span>Emisión: {{ colaEmisionService.cantidadOrdenesPendientes() }}</span>
            </button>
          }
        </div>
      </header>

      <!-- Barra Superior de Identificación del Cliente -->
      <section class="no-print bg-white border-b border-slate-200 px-6 py-3.5 shadow-2xs">
        <div class="max-w-7xl mx-auto">
          <!-- Encabezado de la barra con estado y botón de limpiar -->
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span class="text-xs font-bold text-slate-700 tracking-wide uppercase">Identificación del Cliente</span>

              <!-- Badges de Estado -->
              @if (buscandoCliente()) {
                <span data-testid="badge-buscando" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                  <svg data-testid="spinner-buscando" class="animate-spin w-3 h-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Buscando...</span>
                </span>
              } @else if (clienteSeleccionado()) {
                <span data-testid="badge-cliente-registrado" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Cliente Registrado</span>
                  @if (clienteSeleccionado()?.menores?.length) {
                    <span class="text-emerald-600 font-normal">({{ clienteSeleccionado()!.menores!.length }} menor{{ clienteSeleccionado()!.menores!.length === 1 ? '' : 'es' }})</span>
                  }
                </span>
              } @else if (esClienteNuevo()) {
                <span data-testid="badge-nuevo-cliente" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>Nuevo Cliente</span>
                </span>
              }
            </div>

            <!-- Botón Limpiar -->
            <button
              type="button"
              data-testid="btn-limpiar"
              (click)="limpiarCliente()"
              class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer">
              <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Limpiar</span>
            </button>
          </div>

          <!-- Formulario Reactivo de Cliente -->
          <form [formGroup]="clienteForm" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <!-- Documento -->
            <div>
              <label for="numeroDocumento" class="block text-[11px] font-bold text-slate-600 mb-1">
                Documento / Cédula <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <input
                  #documentoInput
                  id="numeroDocumento"
                  data-testid="input-documento"
                  type="text"
                  formControlName="numeroDocumento"
                  placeholder="Doc. (mín. 5 dígitos)"
                  class="w-full px-3 py-1.5 pr-8 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-slate-800 font-medium placeholder-slate-400" />
                <div class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                  @if (buscandoCliente()) {
                    <svg class="animate-spin w-3.5 h-3.5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  } @else {
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                </div>
              </div>
            </div>

            <!-- Nombre Completo -->
            <div>
              <label for="nombreCompleto" class="block text-[11px] font-bold text-slate-600 mb-1">
                Nombre Completo <span class="text-rose-500">*</span>
              </label>
              <input
                id="nombreCompleto"
                data-testid="input-nombre"
                type="text"
                formControlName="nombreCompleto"
                placeholder="Nombre del cliente"
                class="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-slate-800 font-medium placeholder-slate-400" />
            </div>

            <!-- Teléfono -->
            <div>
              <label for="telefono" class="block text-[11px] font-bold text-slate-600 mb-1">
                Teléfono <span class="text-rose-500">*</span>
              </label>
              <input
                id="telefono"
                data-testid="input-telefono"
                type="tel"
                formControlName="telefono"
                placeholder="Ej: 3001234567"
                class="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-slate-800 font-medium placeholder-slate-400" />
            </div>

            <!-- Correo Electrónico -->
            <div>
              <label for="correo" class="block text-[11px] font-bold text-slate-600 mb-1">
                Correo Electrónico
              </label>
              <input
                id="correo"
                data-testid="input-correo"
                type="email"
                formControlName="correo"
                placeholder="correo@ejemplo.com"
                class="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-slate-800 font-medium placeholder-slate-400" />
            </div>
          </form>

          <!-- Menores Asociados a la Orden (HU-15.11) -->
          <div class="mt-4 pt-3 border-t border-slate-100">
            <app-menores-chips
              [menores]="menoresOrden()"
              (menoresChange)="onMenoresOrdenChange($event)">
            </app-menores-chips>
          </div>
        </div>
      </section>

      <!-- Contenido Principal: Catálogo y Orden -->
      <main class="no-print flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <!-- Columna Izquierda: Catálogo Interactivo de Atracciones -->
          <div class="lg:col-span-2 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-base font-extrabold text-slate-800">Catálogo de Atracciones</h2>
                <p class="text-xs text-slate-400">Selecciona modalidad y añade atracciones a la orden del cliente</p>
              </div>
              <span class="text-xs font-semibold px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                {{ atracciones().length }} atracciones
              </span>
            </div>

            <app-catalogo-atracciones
              [atracciones]="atracciones()"
              [cargando]="cargandoAtracciones()"
              (atraccionSeleccionada)="onAtraccionSeleccionada($event)">
            </app-catalogo-atracciones>
          </div>

          <!-- Columna Derecha: Pre-Orden y Estado de Estación -->
          <div class="space-y-4">
            <!-- Panel del Carrito Sincronizado (CA-04) -->
            <app-pos-cart
              [items]="itemsSeleccionados()"
              [menores]="menoresOrden()"
              (itemsChange)="itemsSeleccionados.set($event)"
              (liquidarOrden)="onLiquidarOrden($event)">
            </app-pos-cart>

            <!-- Panel de Cola de Emisión Física -->
            @if (mostrarColaEmision() || colaEmisionService.cantidadOrdenesPendientes() > 0) {
              <div
                data-testid="panel-cola-emision"
                class="bg-white rounded-2xl border border-amber-200 shadow-sm p-4 text-xs space-y-3 animate-in fade-in">
                <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div class="flex items-center gap-2">
                    <span class="text-base">🖨️</span>
                    <div>
                      <h3 class="font-bold text-slate-800">Cola de Emisión Física</h3>
                      <p class="text-[10px] text-slate-400">
                        {{ colaEmisionService.totalBoletasPendientes() }} boleta(s) por despachar
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <!-- Selector de Ancho de Rollo Térmico (80mm / 58mm) -->
                    <div class="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px]" data-testid="selector-ancho-papel-pos">
                      <button
                        type="button"
                        data-testid="btn-ancho-80mm"
                        (click)="cambiarAnchoPapelPos(80)"
                        [class]="printService.anchoPapelMm() === 80 ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'"
                        class="px-1.5 py-0.5 rounded cursor-pointer transition">
                        80mm
                      </button>
                      <button
                        type="button"
                        data-testid="btn-ancho-58mm"
                        (click)="cambiarAnchoPapelPos(58)"
                        [class]="printService.anchoPapelMm() === 58 ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'"
                        class="px-1.5 py-0.5 rounded cursor-pointer transition">
                        58mm
                      </button>
                    </div>

                    @if (colaEmisionService.ordenes().some(o => o.estado === 'EMITIDA')) {
                      <button
                        type="button"
                        data-testid="btn-limpiar-emitidas"
                        (click)="colaEmisionService.limpiarEmitidas()"
                        class="text-[10px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer px-1.5 py-0.5 rounded">
                        Limpiar emitidas
                      </button>
                    }
                    <button
                      type="button"
                      data-testid="btn-cerrar-cola-emision"
                      (click)="mostrarColaEmision.set(false)"
                      class="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg">
                      ✕
                    </button>
                  </div>
                </div>

                @if (colaEmisionService.ordenesPendientes().length === 0) {
                  <div class="text-center py-4 text-slate-400 text-[11px]" data-testid="cola-emision-vacia">
                    <p class="font-medium text-slate-600">No hay boletas pendientes de emisión.</p>
                    <p class="text-[10px] text-slate-400 mt-0.5">Las ventas finalizadas aparecerán aquí para entrega física.</p>
                  </div>
                } @else {
                  <div class="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    @for (orden of colaEmisionService.ordenesPendientes(); track orden.idOrden) {
                      <div
                        [attr.data-testid]="'orden-emision-' + orden.idOrden"
                        class="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2">
                        <div class="flex items-center justify-between">
                          <div>
                            <span class="font-bold text-slate-800 text-xs">{{ orden.clienteNombre }}</span>
                            <span class="text-[10px] text-slate-500 font-mono block">#{{ orden.idOrden }}</span>
                          </div>
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 text-amber-900 uppercase">
                            {{ orden.boletas.length }} boleta(s)
                          </span>
                        </div>

                        <div class="space-y-1 bg-white/80 p-2 rounded-lg border border-amber-100 text-[11px]">
                          @for (boleta of orden.boletas; track boleta.codigoBoleta; let bIndex = $index) {
                            <div
                              [attr.data-testid]="'ticket-generado-' + bIndex"
                              (click)="seleccionarBoletaCarrusel(orden.idOrden, bIndex)"
                              class="flex items-center justify-between text-slate-700 py-0.5 cursor-pointer hover:bg-amber-100/60 rounded px-1 transition"
                              title="Ver en carrusel de boletas">
                              <div class="truncate max-w-[160px]">
                                <span class="truncate font-medium block">
                                  {{ boleta.atraccionNombre }} ({{ boleta.modalidadEtiqueta }})
                                </span>
                                <span class="text-[9px] font-mono text-slate-400 block">
                                  {{ boleta.codigoBoleta }}
                                </span>
                              </div>
                              <div class="text-right shrink-0">
                                <span class="text-slate-500 text-[10px] block font-medium">
                                  {{ boleta.menorNombre }}
                                </span>
                                <span class="text-[9px] font-mono text-slate-400">
                                  \${{ boleta.precioUnitario.toLocaleString('es-CO') }}
                                </span>
                              </div>
                            </div>
                          }
                        </div>

                        <!-- Carrusel de Boletas y Códigos QR Pre-Impresión (HU-20.07) -->
                        @if (orden.boletas.length > 0) {
                          <div
                            [attr.data-testid]="'carrusel-qr-orden-' + orden.idOrden"
                            class="bg-white rounded-xl border border-amber-200/90 p-2.5 shadow-2xs space-y-2">
                            <!-- Cabecera del Carrusel con Controles Anterior/Siguiente -->
                            <div class="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-100">
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
                                  class="w-6 h-6 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition">
                                  ‹
                                </button>
                                <button
                                  type="button"
                                  data-testid="btn-carrusel-next"
                                  (click)="boletaSiguienteCarrusel(orden)"
                                  [disabled]="orden.boletas.length <= 1"
                                  title="Boleta siguiente"
                                  class="w-6 h-6 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition">
                                  ›
                                </button>
                              </div>
                            </div>

                            <!-- Tarjeta de Boleta Activa con QR Vectorial -->
                            @if (obtenerBoletaActivaCarrusel(orden); as boletaActiva) {
                              <div data-testid="carrusel-boleta-activa" class="flex flex-col items-center gap-1.5">
                                <app-qr-viewer
                                  [value]="boletaActiva.codigoQr || boletaActiva.uuid || boletaActiva.codigoBoleta"
                                  [uuid]="boletaActiva.uuid || ''"
                                  [codigoVisible]="boletaActiva.codigoBoleta"
                                  [size]="136"
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
                                  @if (boletaActiva.uuid) {
                                    <p class="text-[8px] font-mono text-slate-400 truncate max-w-full" [title]="boletaActiva.uuid">
                                      UUID: {{ boletaActiva.uuid }}
                                    </p>
                                  }

                                  <!-- Botón de Reimpresión Auditada por Boleta en Carrusel -->
                                  <button
                                    type="button"
                                    data-testid="btn-reimprimir-boleta-carrusel"
                                    (click)="abrirModalReimpresionBoleta(boletaActiva)"
                                    class="mt-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 mx-auto shadow-2xs">
                                    <span>🖨️</span>
                                    <span>Reimprimir boleta</span>
                                  </button>
                                </div>

                                <!-- Indicadores / Dots si hay más de 1 boleta -->
                                @if (orden.boletas.length > 1) {
                                  <div class="flex items-center justify-center gap-1 pt-1">
                                    @for (b of orden.boletas; track b.codigoBoleta; let dIndex = $index) {
                                      <button
                                        type="button"
                                        [attr.data-testid]="'btn-carrusel-dot-' + dIndex"
                                        (click)="seleccionarBoletaCarrusel(orden.idOrden, dIndex)"
                                        [class]="dIndex === obtenerIndiceCarrusel(orden.idOrden, orden.boletas.length) ? 'w-4 bg-amber-500' : 'w-1.5 bg-slate-300 hover:bg-slate-400'"
                                        class="h-1.5 rounded-full transition-all cursor-pointer"
                                        [attr.aria-label]="'Ir a boleta ' + (dIndex + 1)">
                                      </button>
                                    }
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        }

                        <div class="flex items-center justify-between pt-1 gap-2">
                          <span class="font-mono font-bold text-slate-700 text-xs">
                            \${{ orden.granTotal.toLocaleString('es-CO') }} COP
                          </span>
                          <div class="flex items-center gap-1.5">
                            <button
                              type="button"
                              [attr.data-testid]="'btn-imprimir-orden-' + orden.idOrden"
                              (click)="reimprimirOrdenFisica(orden)"
                              class="px-2 py-1 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold text-[11px] rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1"
                              title="Reimprimir tirilla térmica">
                              <span>🖨️</span>
                              <span>Imprimir</span>
                            </button>
                            <button
                              type="button"
                              [attr.data-testid]="'btn-emitir-orden-' + orden.idOrden"
                              (click)="emitirOrdenFisica(orden.idOrden)"
                              class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-[11px] rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1">
                              <span>✓</span>
                              <span>Emitir / Entregar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- Estado de la Estación -->
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-xs text-slate-600 space-y-2">
              <p class="font-bold text-slate-700">Estado de la estación:</p>
              <p>• Cajero: <span class="font-mono text-slate-800">{{ authService.currentUserName() }}</span></p>
              <p>• Turno de caja: 
                @if (turnoActual(); as turno) {
                  <span class="font-bold text-emerald-600">ABIERTO (Turno #{{ turno.idTurno }})</span>
                } @else {
                  <span class="font-bold text-amber-600">PENDIENTE DE APERTURA</span>
                }
              </p>
              <p>• Base inicial: 
                <span class="font-semibold text-slate-800">
                  \${{ (turnoActual()?.montoInicial ?? 0).toLocaleString('es-CO') }} COP
                </span>
              </p>
              @if (turnoActual()) {
                <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span class="text-slate-500">Saldo teórico actual:</span>
                  <span class="font-mono font-bold text-slate-800">
                    \${{ montoEsperadoArqueo().toLocaleString('es-CO') }}
                  </span>
                </div>
              }
            </div>
          </div>
        </div>
      </main>

      <!-- Barra de Estado / Dock Fijo Inferior -->
      <footer class="no-print fixed bottom-0 inset-x-0 h-12 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-20 px-6 flex items-center justify-between shadow-xs">
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <span class="w-2 h-2 rounded-full" [ngClass]="turnoActual() ? 'bg-emerald-500' : 'bg-amber-500'"></span>
          <span class="font-medium">
            @if (turnoActual(); as turno) {
              Turno #{{ turno.idTurno }} Activo • Territorio de Niños
            } @else {
              Turno de Taquilla • Territorio de Niños
            }
          </span>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center ring-1 ring-blue-300">
              {{ authService.currentUserInitials() }}
            </div>
            <span class="text-xs font-bold text-slate-800">{{ authService.currentUserName() }}</span>
            <span class="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {{ authService.currentUser()?.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Taquillero' }}
            </span>
          </div>

          <div class="h-4 w-px bg-slate-200"></div>

          <button
            type="button"
            (click)="logout()"
            class="hover:bg-red-50 hover:text-red-600 text-xs text-slate-500 font-medium px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </footer>

      <!-- Plantilla de Impresión Térmica 80mm / 58mm (Visible únicamente en @media print - HU-21.05 / HU-21.07) -->
      <div class="only-print" data-testid="contenedor-impresion-pos">
        <app-ticket-print-template
          [orden]="printService.ordenEnImpresion() || colaEmisionService.ordenReciente()"
          [boletas]="printService.boletasEnImpresion().length > 0 ? printService.boletasEnImpresion() : boletasGeneradas()"
          [paperWidthMm]="printService.anchoPapelMm()">
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
  readonly posAudioService = inject(PosAudioService);
  readonly colaEmisionService = inject(ColaEmisionService);
  readonly ventaCalculoService = inject(VentaCalculoService);
  readonly printService = inject(PrintService);
  readonly ticketReimpresionService = inject(TicketReimpresionService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService, { optional: true });

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

  /**
   * Boletas individuales generadas mapeadas en el estado de la aplicación (SCRUM-368 / HU-19.09).
   */
  readonly boletasGeneradas = this.colaEmisionService.boletasGeneradas;
  readonly historialTicketsTurno = this.colaEmisionService.historialTicketsTurno;

  readonly atracciones = signal<Atraccion[]>([]);
  readonly cargandoAtracciones = signal<boolean>(false);
  readonly itemsSeleccionados = signal<SeleccionCatalogoPOS[]>([]);

  readonly clienteSeleccionado = signal<Cliente | null>(null);
  readonly esClienteNuevo = signal<boolean>(false);
  readonly buscandoCliente = signal<boolean>(false);
  readonly menoresOrden = signal<Menor[]>([]);
  readonly documentoInputRef = viewChild<ElementRef<HTMLInputElement>>('documentoInput');

  readonly clienteForm = this.fb.group({
    numeroDocumento: ['', [Validators.required, Validators.minLength(5)]],
    nombreCompleto: ['', [Validators.required]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9+\s-]{7,15}$/)]],
    correo: ['', [Validators.email]]
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
  }

  cargarCatalogoAtracciones(): void {
    if (!this.atraccionService) return;
    this.cargandoAtracciones.set(true);
    this.atraccionService.getAll().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargandoAtracciones.set(false))
    ).subscribe({
      next: (lista) => this.atracciones.set(lista || []),
      error: () => {
        this.atracciones.set([]);
        this.notificationService?.error('Error al cargar el catálogo de atracciones.');
      }
    });
  }

  onAtraccionSeleccionada(sel: SeleccionCatalogoPOS): void {
    const capacidad = sel.atraccion.capacidadMaxima || sel.atraccion.maxCapacity || 10;
    const ocupados = sel.atraccion.ninosActivos || 0;
    const cuposDisponibles = Math.max(0, capacidad - ocupados);

    const enCarrito = this.itemsSeleccionados()
      .filter(it => it.atraccion.id === sel.atraccion.id)
      .reduce((acc, it) => acc + (it.cantidad ?? 1), 0);

    if (cuposDisponibles > 0 && enCarrito >= cuposDisponibles) {
      this.notificationService?.warn(`No quedan más cupos disponibles para "${sel.atraccion.nombre}".`);
      return;
    }

    const menores = this.menoresOrden();
    const menorPreasignado = sel.menorAsignado ?? (menores.length === 1 ? menores[0] : null);

    const itemConValores: SeleccionCatalogoPOS = {
      ...sel,
      cantidad: sel.cantidad ?? 1,
      menorAsignado: menorPreasignado
    };

    this.itemsSeleccionados.update(prev => [...prev, itemConValores]);
    this.notificationService?.success(`"${sel.atraccion.nombre}" (${sel.modalidad.etiqueta}) añadida a la orden.`);
  }

  onMenoresOrdenChange(nuevosMenores: Menor[]): void {
    this.menoresOrden.set(nuevosMenores);
    const idsValidos = new Set(
      nuevosMenores.map(m => m.idMenor !== undefined ? String(m.idMenor) : m.nombreCompleto)
    );
    this.itemsSeleccionados.update(items =>
      items.map(item => {
        if (!item.menorAsignado) return item;
        const key = item.menorAsignado.idMenor !== undefined
          ? String(item.menorAsignado.idMenor)
          : item.menorAsignado.nombreCompleto;
        if (!idsValidos.has(key)) {
          return { ...item, menorAsignado: null };
        }
        return item;
      })
    );
  }

  removerItemOrden(index: number): void {
    this.itemsSeleccionados.update(prev => prev.filter((_, i) => i !== index));
  }

  limpiarOrden(): void {
    this.itemsSeleccionados.set([]);
  }

  onLiquidarOrden(resumen: ResumenLiquidacionPOS): void {
    this.resumenPendientePago.set(resumen);
    this.mostrarModalConfirmarPago.set(true);
  }

  onCancelarConfirmacionPago(): void {
    this.mostrarModalConfirmarPago.set(false);
    this.resumenPendientePago.set(null);
  }

  onPagoConfirmado(resumen: ResumenLiquidacionPOS): void {
    this.procesandoPago.set(true);

    // 1. Emitir sonido sutil de confirmación
    this.posAudioService.reproducirConfirmacionPago();

    // 2. Pasar a la cola de emisión física y mapear boletas en el estado (HU-19.09)
    const clienteContexto = {
      clienteNombre: this.nombreClienteTitular(),
      clienteDocumento: this.clienteForm.get('numeroDocumento')?.value?.trim() || undefined,
      clienteId: this.clienteSeleccionado()?.idCliente
    };
    const ordenFisica = this.colaEmisionService.encolarVenta(resumen, clienteContexto);

    // 3. Disparar impresión automática inmediatamente tras confirmar la venta (SCRUM-377 / HU-21.06)
    this.printService.imprimirOrden(ordenFisica);

    // 4. Si el pago es en efectivo, acumular en turnoActual para balance de arqueo
    const turno = this.turnoActual();
    if (turno && resumen.metodoPago === 'EFECTIVO') {
      this.turnoActual.set({
        ...turno,
        totalRecaudado: (turno.totalRecaudado ?? 0) + resumen.granTotal
      });
    }

    // 5. Limpiar carrito de compras y restablecer cliente/menores para la siguiente venta
    this.itemsSeleccionados.set([]);
    this.limpiarCliente();

    // 6. Cerrar modal y mostrar cola de emisión física
    this.mostrarModalConfirmarPago.set(false);
    this.resumenPendientePago.set(null);
    this.mostrarColaEmision.set(true);

    this.notificationService?.success(
      `Orden liquidada exitosamente (${resumen.metodoPago}) por valor de $${resumen.granTotal.toLocaleString('es-CO')} COP. Pasada a cola de emisión física (#${ordenFisica.idOrden}).`
    );

    this.procesandoPago.set(false);
  }

  emitirOrdenFisica(idOrden: string): void {
    this.colaEmisionService.marcarOrdenEmitida(idOrden);
    this.notificationService?.success(`Boletas de la orden #${idOrden} marcadas como emitidas.`);
  }

  reimprimirOrdenFisica(orden: OrdenEmisionFisica): void {
    this.printService.imprimirOrden(orden);
    this.notificationService?.info(`Enviando orden #${orden.idOrden} a impresión.`);
  }

  /**
   * Abre el modal de reimpresión para la última boleta emitida en el turno activo (HU-22.07 / SCRUM-383).
   */
  abrirModalReimpresionUltimaBoleta(): void {
    const ultima = this.colaEmisionService.ultimaBoletaEmitida();
    if (!ultima) {
      this.notificationService?.warn('No hay boletas emitidas en el turno activo para reimprimir.');
      return;
    }
    this.ticketPendienteReimpresion.set(ultima);
    this.mostrarModalReimpresion.set(true);
  }

  /**
   * Abre el modal de reimpresión para una boleta específica seleccionada en la cola o carrusel.
   */
  abrirModalReimpresionBoleta(ticket: Ticket): void {
    if (!ticket) return;
    this.ticketPendienteReimpresion.set(ticket);
    this.mostrarModalReimpresion.set(true);
  }

  onCancelarReimpresion(): void {
    this.mostrarModalReimpresion.set(false);
    this.ticketPendienteReimpresion.set(null);
  }

  /**
   * Procesa la confirmación del modal: registra la auditoría en el backend,
   * estampa la marca visible ** REIMPRESIÓN **, dispara la impresión y notifica vía toast (HU-22.08 / SCRUM-384).
   */
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
        next: (res) => {
          // 1. Actualizar boleta con marca visible ** REIMPRESIÓN ** en estado reactivo (HU-22.05 / Notion: CA-02)
          const ticketActualizado = this.colaEmisionService.actualizarBoletaReimpresa(
            evento.ticket.uuid || String(evento.ticket.idTicket || evento.ticket.id),
            {
              esReimpresion: true,
              marcaImpresion: res.marcaImpresion || '** REIMPRESIÓN **',
              motivoUltimaReimpresion: res.motivo || evento.motivo,
              fechaUltimaReimpresion: res.fechaReimpresion
            }
          );

          // 2. Disparar impresión térmica individual de la boleta con marca
          const boletaAImprimir = ticketActualizado || {
            ...evento.ticket,
            esReimpresion: true,
            marcaImpresion: res.marcaImpresion || '** REIMPRESIÓN **',
            motivoUltimaReimpresion: res.motivo || evento.motivo
          };
          this.printService.imprimirBoletas([boletaAImprimir]);

          // 3. Notificación visual Toast con datos del evento registrado (HU-22.08 / SCRUM-384)
          this.notificationService?.success(
            `Reimpresión registrada (#${res.idLog || 'LOG'}) • Boleta ${res.codigoBoleta || evento.ticket.codigoBoleta} • Motivo: ${res.motivo || evento.motivo}`
          );

          // 4. Cerrar modal y limpiar selección
          this.mostrarModalReimpresion.set(false);
          this.ticketPendienteReimpresion.set(null);
        },
        error: (err) => {
          if (err?.status === 409) {
            this.notificationService?.error(
              err?.error?.message || `No se puede reimprimir: la boleta #${evento.ticket.codigoBoleta} ya fue consumida o anulada.`
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

  /**
   * Estado reactivo para la navegación en el carrusel de boletas de taquilla (HU-20.07).
   */
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

  iniciarBusquedaCliente(): void {
    this.clienteForm.get('numeroDocumento')!.valueChanges.pipe(
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
    ).subscribe({
      next: (cliente) => {
        if (cliente) {
          this.clienteSeleccionado.set(cliente);
          this.esClienteNuevo.set(false);
          this.menoresOrden.set(cliente.menores ? [...cliente.menores] : []);
          this.clienteForm.patchValue({
            nombreCompleto: cliente.nombreCompleto ?? '',
            telefono: cliente.telefono ?? '',
            correo: cliente.correo ?? ''
          }, { emitEvent: false });
        } else {
          this.clienteSeleccionado.set(null);
          this.esClienteNuevo.set(true);
          this.menoresOrden.set([]);
          this.clienteForm.patchValue({
            nombreCompleto: '',
            telefono: '',
            correo: ''
          }, { emitEvent: false });
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
    this.buscandoCliente.set(false);
    this.menoresOrden.set([]);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Evitar interceptar atajos si hay un modal bloqueante activo
    if (this.mostrarModalApertura() || this.mostrarModalArqueo() || this.mostrarModalConfirmarPago()) {
      return;
    }

    if (event.key === 'F2') {
      event.preventDefault();
      this.enfocarBuscarCliente();
    } else if (event.key === 'F4') {
      event.preventDefault();
      this.abrirCajaShortcut();
    } else if (event.key === 'F8') {
      event.preventDefault();
      this.arqueoCajaShortcut();
    }
  }

  enfocarBuscarCliente(): void {
    const docInput = this.documentoInputRef()?.nativeElement ?? (document.getElementById('numeroDocumento') as HTMLInputElement | null);
    if (docInput) {
      docInput.focus();
      docInput.select();
    }
    this.notificationService?.info('Atajo F2: Campo de documento de cliente enfocado.');
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
    this.cajaService.obtenerTurnoActivo().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (turno) => {
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

    const ejecutarCierre = () => this.cajaService.cerrarTurno({
      idTurno: resultado.idTurno,
      montoFinal: resultado.totalFisico,
      totalEfectivoReal: resultado.totalFisico,
      observaciones: resultado.justificacion,
      diferencia: resultado.diferencia,
      justificacion: resultado.justificacion
    });

    const pipeline$ = (typeof this.cajaService.registrarArqueo === 'function')
      ? this.cajaService.registrarArqueo(resultado.idTurno, resultado).pipe(
          switchMap(() => ejecutarCierre()),
          catchError((err) => {
            if (err?.status === 404 || err?.status === 403 || err?.status === 405) {
              return ejecutarCierre();
            }
            return throwError(() => err);
          })
        )
      : ejecutarCierre();

    pipeline$.pipe(
      finalize(() => this.procesandoArqueo.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
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
      error: (err) => {
        const msg = err?.error?.mensaje || 'Error al procesar el cierre y arqueo de caja.';
        this.notificationService?.error(msg);
      }
    });
  }

  logout(): void {
    this.colaEmisionService.limpiarTodo();
    this.authService.logout();
  }
}
