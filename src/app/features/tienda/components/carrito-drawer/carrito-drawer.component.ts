import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TiendaService } from '../../../../core/services/tienda.service';
import {
  CompraOnlineRequest,
  ItemCompraOnlineDTO
} from '../../../../core/models/tienda.model';
import {
  PasarelaModalComponent,
  ResultadoPagoSimulado
} from '../pasarela-modal/pasarela-modal.component';

@Component({
  selector: 'app-carrito-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, PasarelaModalComponent],
  template: `
    <!-- Overlay Backdrop -->
    <div
      class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end overscroll-contain motion-safe:transition-opacity duration-150"
      (click)="cerrar()">

      <!-- Drawer Panel -->
      <div
        class="w-full max-w-md bg-white h-full shadow-2xl flex flex-col overscroll-contain relative border-l border-slate-200"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-label="Cesta de boletas">

        <!-- Header -->
        <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-black text-slate-900 tracking-tight">Tu Cesta de Boletas</h2>
              <span class="text-xs text-slate-500 font-medium">
                {{ tiendaService.totalItems() }} boleta(s) seleccionada(s)
              </span>
            </div>
          </div>

          <button
            type="button"
            (click)="cerrar()"
            class="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-[background-color,color] duration-150 enabled:active:scale-[0.96]"
            aria-label="Cerrar cesta">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Contenido desplazable -->
        <div class="flex-1 overflow-y-auto p-5 space-y-6 overscroll-contain">

          <!-- Carrito Vacío -->
          @if (tiendaService.carrito().length === 0) {
            <div class="py-12 text-center space-y-3">
              <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 class="text-base font-extrabold text-slate-800">Tu cesta está vacía</h3>
              <p class="text-xs text-slate-500 max-w-xs mx-auto">
                Elige atracciones en el catálogo para generar tus boletas y ahorrar tiempo en la entrada del parque.
              </p>
              <button
                type="button"
                (click)="cerrar()"
                class="mt-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold transition-[background-color,transform] duration-150 enabled:active:scale-[0.96]">
                Explorar Atracciones
              </button>
            </div>
          } @else {

            <!-- Lista de Boletas en la Cesta -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Boletas a emitir</span>
                <button
                  type="button"
                  (click)="tiendaService.limpiarCarrito()"
                  class="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors">
                  Vaciar cesta
                </button>
              </div>

              @for (item of tiendaService.carrito(); track item.id) {
                <div class="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-2">
                  <div class="flex items-start justify-between">
                    <div>
                      <h4 class="text-sm font-extrabold text-slate-900">{{ item.nombreAtraccion }}</h4>
                      <p class="text-xs text-emerald-700 font-medium">
                        👶 Para: <strong class="font-bold">{{ item.nombreMenor }}</strong> ({{ item.edadMenor }} años)
                      </p>
                      <p class="text-[11px] text-slate-500 mt-0.5">
                        {{ item.tipoTarifa === 'TIEMPO' ? (item.duracionMinutos + ' minutos de juego') : (item.intentos + ' caídas / intentos') }}
                      </p>
                    </div>

                    <button
                      type="button"
                      (click)="tiendaService.eliminarDelCarrito(item.id)"
                      class="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
                      title="Eliminar boleto">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div class="flex items-center gap-1.5">
                      <button
                        type="button"
                        (click)="tiendaService.actualizarCantidad(item.id, -1)"
                        class="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-200 enabled:active:scale-[0.96]">
                        -
                      </button>
                      <span class="w-5 text-center font-mono font-bold">{{ item.cantidad }}</span>
                      <button
                        type="button"
                        (click)="tiendaService.actualizarCantidad(item.id, 1)"
                        class="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-200 enabled:active:scale-[0.96]">
                        +
                      </button>
                    </div>

                    <span class="font-extrabold text-slate-900 text-sm">
                      \${{ item.subtotal | number }} COP
                    </span>
                  </div>
                </div>
              }
            </div>

            <!-- Formulario de Checkout Invitado (Acudiente) -->
            <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3.5">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">
                  👤
                </span>
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Datos del adulto responsable
                </h3>
              </div>

              <div>
                <label for="adulto-doc-input" class="block text-[11px] font-semibold text-slate-700 mb-1">
                  Número de Cédula / Documento <span class="text-rose-600">*</span>
                </label>
                <input
                  id="adulto-doc-input"
                  type="text"
                  [(ngModel)]="documentoAdulto"
                  placeholder="Ej. 1098765432"
                  class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600" />
              </div>

              <div>
                <label for="adulto-nombre-input" class="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nombre completo <span class="text-rose-600">*</span>
                </label>
                <input
                  id="adulto-nombre-input"
                  type="text"
                  [(ngModel)]="nombreAdulto"
                  placeholder="Ej. Carlos Mendoza"
                  class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600" />
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label for="adulto-cel-input" class="block text-[11px] font-semibold text-slate-700 mb-1">
                    Celular
                  </label>
                  <input
                    id="adulto-cel-input"
                    type="tel"
                    [(ngModel)]="telefonoAdulto"
                    placeholder="3001234567"
                    class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs" />
                </div>

                <div>
                  <label for="adulto-email-input" class="block text-[11px] font-semibold text-slate-700 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    id="adulto-email-input"
                    type="email"
                    [(ngModel)]="correoAdulto"
                    placeholder="tucorreo@ejemplo.com"
                    class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs" />
                </div>
              </div>

              <p class="text-[11px] text-slate-500">
                🔒 Te enviaremos el comprobante y los boletos con código QR a este correo para que los tengas a mano.
              </p>

              <!-- Trampa Anti-Spam (Honeypot) oculta a humanos -->
              <div class="hidden" aria-hidden="true">
                <label for="website-honeypot-input">Website</label>
                <input
                  id="website-honeypot-input"
                  type="text"
                  [(ngModel)]="honeypot"
                  tabindex="-1"
                  autocomplete="off" />
              </div>
            </div>

            <!-- Desglose de Pago -->
            <div class="p-4 rounded-2xl bg-slate-100/70 border border-slate-200/80 space-y-1.5 text-xs">
              <div class="flex justify-between text-slate-600">
                <span>Subtotal boletas:</span>
                <span class="font-mono font-medium">\${{ tiendaService.subtotal() | number }} COP</span>
              </div>
              <div class="flex justify-between text-slate-600">
                <span>Impuesto (IVA 19%):</span>
                <span class="font-mono font-medium">\${{ tiendaService.impuestosEstimados() | number }} COP</span>
              </div>
              <div class="pt-2 border-t border-slate-200 flex justify-between items-baseline font-extrabold text-slate-900 text-sm">
                <span>Total a pagar:</span>
                <span class="text-base text-emerald-700 font-mono font-black">
                  \${{ tiendaService.totalPagar() | number }} COP
                </span>
              </div>
            </div>

          }

        </div>

        <!-- Botón de Pago en el Footer -->
        @if (tiendaService.carrito().length > 0) {
          <div class="p-4 border-t border-slate-100 bg-white">
            <button
              type="button"
              (click)="abrirPasarela()"
              [disabled]="!formularioValido() || guardandoCompra()"
              class="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-600/25 disabled:opacity-50 transition-[transform,background-color,box-shadow] duration-150 enabled:active:scale-[0.96] flex items-center justify-center gap-2">
              @if (guardandoCompra()) {
                <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full motion-safe:animate-spin"></span>
                <span>Emitiendo boletas...</span>
              } @else {
                <span>Continuar al Pago (\${{ tiendaService.totalPagar() | number }} COP)</span>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              }
            </button>
          </div>
        }

      </div>
    </div>

    <!-- Modal Simulador de Pasarela de Pago -->
    @if (mostrarPasarela()) {
      <app-pasarela-modal
        [totalPagar]="tiendaService.totalPagar()"
        (pagoCompletado)="onPagoExitoso($event)"
        (cancelar)="mostrarPasarela.set(false)" />
    }
  `
})
export class CarritoDrawerComponent {
  readonly tiendaService = inject(TiendaService);
  private router = inject(Router);

  @Output() close = new EventEmitter<void>();

  readonly mostrarPasarela = signal<boolean>(false);
  readonly guardandoCompra = signal<boolean>(false);

  documentoAdulto = '';
  nombreAdulto = '';
  telefonoAdulto = '';
  correoAdulto = '';
  honeypot = '';

  readonly formularioValido = computed(() => {
    return (
      this.documentoAdulto.trim().length >= 4 &&
      this.nombreAdulto.trim().length >= 3 &&
      this.tiendaService.carrito().length > 0
    );
  });

  cerrar(): void {
    this.tiendaService.cerrarCarrito();
    this.close.emit();
  }

  abrirPasarela(): void {
    if (!this.formularioValido()) return;
    this.mostrarPasarela.set(true);
  }

  onPagoExitoso(resultado: ResultadoPagoSimulado): void {
    this.mostrarPasarela.set(false);
    this.guardandoCompra.set(true);

    const itemsDto: ItemCompraOnlineDTO[] = this.tiendaService.carrito().map((it) => ({
      atraccionId: it.atraccionId,
      tipoTarifa: it.tipoTarifa,
      tarifaTiempoId: it.tarifaTiempoId || null,
      tarifaEventoId: it.tarifaEventoId || null,
      duracionMinutos: it.duracionMinutos || null,
      cantidad: it.cantidad,
      nombreMenor: it.nombreMenor,
      edadMenor: it.edadMenor,
      documentoMenor: it.documentoMenor || null
    }));

    const req: CompraOnlineRequest = {
      documentoAdulto: this.documentoAdulto.trim(),
      nombreAdulto: this.nombreAdulto.trim(),
      telefonoAdulto: this.telefonoAdulto.trim() || null,
      correoAdulto: this.correoAdulto.trim() || null,
      metodoPago: resultado.metodo,
      codigoReferenciaPago: resultado.codigoReferencia,
      items: itemsDto,
      website: this.honeypot || null
    };

    this.tiendaService.procesarCompra(req).subscribe({
      next: (res) => {
        this.guardandoCompra.set(false);
        this.cerrar();
        // Redirigir inmediatamente a la pantalla de presentación de boletas con QR
        this.router.navigate(['/mis-boletos']);
      },
      error: (err) => {
        this.guardandoCompra.set(false);
        alert(
          err.error?.detalles ||
          err.error?.mensaje ||
          'Ocurrió un error al procesar la compra online. Por favor intenta nuevamente.'
        );
      }
    });
  }
}
