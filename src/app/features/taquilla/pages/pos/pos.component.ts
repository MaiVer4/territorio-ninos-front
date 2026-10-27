import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, HostListener, inject, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, filter, switchMap, finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { CajaService } from '../../../../core/services/caja.service';
import { ClienteService } from '../../../../core/services/cliente.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ResultadoArqueoDTO, TurnoResponseDTO } from '../../../../core/models/caja.model';
import { Cliente, Menor } from '../../../../core/models/cliente.model';
import { Atraccion, SeleccionCatalogoPOS } from '../../../../core/models/atraccion.model';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { AperturaCajaModalComponent } from '../../components/apertura-caja-modal/apertura-caja-modal.component';
import { ArqueoCajaModalComponent } from '../../components/arqueo-caja-modal/arqueo-caja-modal.component';
import { MenoresChipsComponent } from '../../components/menores-chips/menores-chips.component';
import { CatalogoAtraccionesComponent } from '../../components/catalogo-atracciones/catalogo-atracciones.component';

@Component({
  selector: 'app-taquilla-pos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AperturaCajaModalComponent,
    ArqueoCajaModalComponent,
    MenoresChipsComponent,
    CatalogoAtraccionesComponent
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
          (confirmarArqueo)="onArqueoConfirmado($event)"
          (cancelar)="mostrarModalArqueo.set(false)">
        </app-arqueo-caja-modal>
      }

      <!-- Cabecera del POS -->
      <header class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs z-10">
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
        </div>
      </header>

      <!-- Barra Superior de Identificación del Cliente -->
      <section class="bg-white border-b border-slate-200 px-6 py-3.5 shadow-2xs">
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
              (menoresChange)="menoresOrden.set($event)">
            </app-menores-chips>
          </div>
        </div>
      </section>

      <!-- Contenido Principal: Catálogo y Orden -->
      <main class="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">
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
            <!-- Panel de Pre-Orden / Boletas Seleccionadas -->
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Orden en Curso</h3>
                    <p class="text-[10px] text-slate-400">{{ itemsSeleccionados().length }} item{{ itemsSeleccionados().length === 1 ? '' : 's' }}</p>
                  </div>
                </div>

                @if (itemsSeleccionados().length > 0) {
                  <button
                    type="button"
                    data-testid="btn-limpiar-orden"
                    (click)="limpiarOrden()"
                    class="text-[11px] text-rose-600 hover:text-rose-700 font-semibold px-2 py-0.5 rounded-lg hover:bg-rose-50 transition cursor-pointer">
                    Vaciar
                  </button>
                }
              </div>

              <!-- Lista de Items en Orden -->
              <div class="py-3 flex-1 space-y-2 max-h-72 overflow-y-auto">
                @if (itemsSeleccionados().length === 0) {
                  <div class="py-6 text-center text-slate-400 text-xs" data-testid="orden-vacia">
                    <p class="font-medium">No hay atracciones seleccionadas.</p>
                    <p class="text-[11px] text-slate-400 mt-1">Elige una modalidad en el catálogo y haz clic en "Añadir".</p>
                  </div>
                } @else {
                  @for (item of itemsSeleccionados(); track $index) {
                    <div
                      [attr.data-testid]="'item-orden-' + $index"
                      class="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs">
                      <div class="min-w-0 pr-2">
                        <p class="font-bold text-slate-800 truncate">{{ item.atraccion.nombre }}</p>
                        <p class="text-[10px] text-slate-400">{{ item.modalidad.etiqueta }}</p>
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        <span class="font-bold font-mono text-slate-700">
                          \${{ item.modalidad.precio.toLocaleString('es-CO') }}
                        </span>
                        <button
                          type="button"
                          [attr.data-testid]="'btn-quitar-item-' + $index"
                          (click)="removerItemOrden($index)"
                          class="w-5 h-5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer">
                          ✕
                        </button>
                      </div>
                    </div>
                  }
                }
              </div>

              <!-- Subtotal de Orden -->
              <div class="pt-3 border-t border-slate-100 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Subtotal</span>
                  <span data-testid="total-orden" class="text-base font-extrabold font-mono text-slate-800">
                    \${{ totalOrden().toLocaleString('es-CO') }} COP
                  </span>
                </div>
              </div>
            </div>

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
      <footer class="fixed bottom-0 inset-x-0 h-12 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-20 px-6 flex items-center justify-between shadow-xs">
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
              Taquillero
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
    </div>
  `
})
export class TaquillaPosComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly cajaService = inject(CajaService);
  readonly clienteService = inject(ClienteService);
  readonly atraccionService = inject(AtraccionService, { optional: true });
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService, { optional: true });

  readonly mostrarModalApertura = signal<boolean>(false);
  readonly mostrarModalArqueo = signal<boolean>(false);
  readonly turnoActual = signal<TurnoResponseDTO | null>(null);

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
    return this.itemsSeleccionados().reduce((acc, item) => acc + item.modalidad.precio, 0);
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
    this.itemsSeleccionados.update(prev => [...prev, sel]);
    this.notificationService?.success(`"${sel.atraccion.nombre}" (${sel.modalidad.etiqueta}) añadida a la orden.`);
  }

  removerItemOrden(index: number): void {
    this.itemsSeleccionados.update(prev => prev.filter((_, i) => i !== index));
  }

  limpiarOrden(): void {
    this.itemsSeleccionados.set([]);
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
    if (this.mostrarModalApertura() || this.mostrarModalArqueo()) {
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
    this.cajaService.cerrarTurno({
      idTurno: resultado.idTurno,
      montoFinal: resultado.totalFisico,
      totalEfectivoReal: resultado.totalFisico,
      observaciones: resultado.justificacion,
      diferencia: resultado.diferencia,
      justificacion: resultado.justificacion
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.mostrarModalArqueo.set(false);
        this.turnoActual.set(null);
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
    this.authService.logout();
  }
}
