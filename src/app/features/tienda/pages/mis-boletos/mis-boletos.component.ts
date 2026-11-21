import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import * as QRCode from 'qrcode';
import { TiendaService } from '../../../../core/services/tienda.service';
import { TicketOnline } from '../../../../core/models/tienda.model';

interface TicketConQr extends TicketOnline {
  qrDataUrl?: string;
}

@Component({
  selector: 'app-mis-boletos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-white pb-12">

      <!-- Barra Superior -->
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div class="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <a routerLink="/" class="flex items-center gap-2 text-slate-700 hover:text-emerald-700 transition-colors font-bold text-sm">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Volver a la tienda</span>
          </a>

          <span class="text-xs font-black uppercase tracking-wider text-slate-500">
            Boletas Digitales
          </span>
        </div>
      </header>

      <main class="max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">

        <!-- Banner de Confirmación si hay una orden recién generada -->
        @if (tiendaService.ordenReciente()) {
          <div class="p-5 rounded-3xl bg-emerald-600 text-white shadow-xl shadow-emerald-600/20 space-y-2">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-white text-emerald-700 font-black text-xs flex items-center justify-center">
                ✓
              </span>
              <h2 class="text-base sm:text-lg font-black tracking-tight">
                ¡Compra Exitosa! Orden #{{ tiendaService.ordenReciente()?.codigoOrden }}
              </h2>
            </div>
            <p class="text-xs text-emerald-100 leading-relaxed">
              Tus boletas ya están activadas en el sistema del parque. Puedes mostrarlas directamente desde esta pantalla al llegar a cada atracción.
            </p>
          </div>
        }

        <!-- Buscador de Boletas por Documento o Correo -->
        <div class="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <label for="buscar-doc-input" class="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Consultar boletas activas
          </label>
          <div class="flex flex-col sm:flex-row gap-2">
            <div class="relative flex-1">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="buscar-doc-input"
                type="text"
                [(ngModel)]="criterioBusqueda"
                (keydown.enter)="buscarBoletos()"
                placeholder="Ingresa cédula del adulto o correo electrónico"
                class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600" />
            </div>

            <button
              type="button"
              (click)="buscarBoletos()"
              [disabled]="buscando() || criterioBusqueda.trim().length < 3"
              class="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-extrabold text-xs transition-[background-color,transform] duration-150 enabled:active:scale-[0.96] disabled:opacity-50 flex items-center justify-center gap-1.5">
              @if (buscando()) {
                <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full motion-safe:animate-spin"></span>
                <span>Buscando...</span>
              } @else {
                <span>Buscar</span>
              }
            </button>
          </div>
          @if (mensajeBusqueda()) {
            <p class="text-xs text-amber-700 font-medium">{{ mensajeBusqueda() }}</p>
          }
        </div>

        <!-- Listado de Boletas con Códigos QR -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-extrabold text-slate-900">
              Boletas disponibles ({{ boletosConQr().length }})
            </h3>
            @if (boletosConQr().length > 0) {
              <button
                type="button"
                (click)="imprimir()"
                class="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Imprimir / PDF</span>
              </button>
            }
          </div>

          @if (boletosConQr().length === 0) {
            <div class="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <span class="text-4xl">🎟️</span>
              <h4 class="text-base font-extrabold text-slate-800">No se encontraron boletas activas</h4>
              <p class="text-xs text-slate-500 max-w-sm mx-auto">
                Realiza una compra desde el catálogo o busca por tu documento para recuperar tus boletas del día.
              </p>
              <a
                routerLink="/"
                class="inline-block mt-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-600/20 enabled:active:scale-[0.96]">
                Ir a la Tienda
              </a>
            </div>
          } @else {
            <!-- Tarjetas de Boletos -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              @for (ticket of boletosConQr(); track ticket.uuidCodigo) {
                <div class="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">

                  <!-- Header del Ticket -->
                  <div class="flex items-start justify-between">
                    <div>
                      <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1">
                        {{ ticket.estadoTicket === 'PAGADO' ? 'Listo para ingresar' : ticket.estadoTicket }}
                      </span>
                      <h4 class="text-lg font-black text-slate-900 leading-tight">
                        {{ ticket.nombreAtraccion }}
                      </h4>
                      <p class="text-xs font-semibold text-slate-600 mt-0.5">
                        Menor: <span class="text-emerald-700 font-bold">{{ ticket.nombreMenor }}</span>
                      </p>
                    </div>

                    <div class="text-right">
                      <span class="text-[10px] uppercase font-bold text-slate-400 block">Modalidad</span>
                      <span class="text-xs font-extrabold text-slate-800">
                        {{ ticket.tipoTarifa === 'TIEMPO' ? (ticket.duracionMinutos + ' min') : (ticket.intentosTotales + ' caídas') }}
                      </span>
                    </div>
                  </div>

                  <!-- Código QR de Alto Contraste para Escáner -->
                  <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center space-y-2">
                    @if (ticket.qrDataUrl) {
                      <button
                        type="button"
                        (click)="abrirQrGrande(ticket)"
                        class="p-2 bg-white rounded-xl shadow-xs border border-slate-200/60 hover:scale-105 transition-transform duration-150 cursor-zoom-in"
                        title="Toca para ampliar el QR">
                        <img
                          [src]="ticket.qrDataUrl"
                          [alt]="'Código QR boleta ' + ticket.codigoCorto"
                          class="w-44 h-44 object-contain rounded-lg" />
                      </button>
                    } @else {
                      <div class="w-44 h-44 bg-slate-200 rounded-xl animate-pulse flex items-center justify-center text-xs text-slate-400">
                        Generando QR...
                      </div>
                    }

                    <div class="text-center">
                      <span class="text-[11px] font-mono font-bold tracking-widest text-slate-700 block">
                        {{ ticket.codigoCorto }}
                      </span>
                      <span class="text-[10px] text-slate-400">
                        Toca el QR para ampliar en pantalla completa
                      </span>
                    </div>
                  </div>

                  <!-- Instrucción Operativa para el Padre -->
                  <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span class="flex items-center gap-1">
                      <span>📍</span>
                      <span>Presenta al operario en el acceso</span>
                    </span>

                    <button
                      type="button"
                      (click)="abrirQrGrande(ticket)"
                      class="font-bold text-emerald-700 hover:text-emerald-800">
                      Ver grande ↗
                    </button>
                  </div>

                </div>
              }
            </div>
          }
        </div>

      </main>

      <!-- Modal QR Pantalla Completa para Escaneo Óptico en Molinete/Android -->
      @if (ticketAmpliado()) {
        <div
          class="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 overscroll-contain"
          (click)="ticketAmpliado.set(null)">

          <div
            class="bg-white rounded-[32px] p-6 max-w-sm w-full text-center space-y-4 shadow-2xl"
            (click)="$event.stopPropagation()">

            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <div class="text-left">
                <span class="text-xs font-bold text-emerald-600 block">Territorio de Niños</span>
                <h4 class="text-base font-black text-slate-900">{{ ticketAmpliado()?.nombreAtraccion }}</h4>
              </div>
              <button
                type="button"
                (click)="ticketAmpliado.set(null)"
                class="p-2 text-slate-400 hover:text-slate-700 rounded-full">
                ✕
              </button>
            </div>

            <p class="text-xs font-semibold text-slate-700">
              Niño(a): <strong class="text-slate-900">{{ ticketAmpliado()?.nombreMenor }}</strong>
            </p>

            <!-- Imagen QR Gigante en Alto Brillo -->
            <div class="p-4 bg-white rounded-2xl border-2 border-slate-900 flex justify-center">
              <img
                [src]="ticketAmpliado()?.qrDataUrl"
                [alt]="'QR ' + ticketAmpliado()?.codigoCorto"
                class="w-64 h-64 object-contain" />
            </div>

            <p class="font-mono font-black text-base text-slate-900 tracking-wider">
              {{ ticketAmpliado()?.codigoCorto }}
            </p>

            <button
              type="button"
              (click)="ticketAmpliado.set(null)"
              class="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs enabled:active:scale-[0.96]">
              Cerrar
            </button>
          </div>
        </div>
      }

    </div>
  `
})
export class MisBoletosComponent implements OnInit {
  readonly tiendaService = inject(TiendaService);

  criterioBusqueda = '';
  readonly buscando = signal<boolean>(false);
  readonly mensajeBusqueda = signal<string | null>(null);

  readonly boletosConQr = signal<TicketConQr[]>([]);
  readonly ticketAmpliado = signal<TicketConQr | null>(null);

  ngOnInit(): void {
    // Si hay boletos locales en el signal del servicio, generamos sus QRs
    this.cargarQrs(this.tiendaService.boletosLocales());
  }

  buscarBoletos(): void {
    const term = this.criterioBusqueda.trim();
    if (term.length < 3) return;

    this.buscando.set(true);
    this.mensajeBusqueda.set(null);

    this.tiendaService.consultarBoletos(term).subscribe({
      next: (boletos) => {
        this.buscando.set(false);
        if (!boletos || boletos.length === 0) {
          this.mensajeBusqueda.set('No se encontraron boletas activas para el documento o correo ingresado.');
        } else {
          this.cargarQrs(boletos);
        }
      },
      error: (err) => {
        this.buscando.set(false);
        this.mensajeBusqueda.set(
          err.error?.detalles || err.error?.mensaje || 'Error al buscar boletas.'
        );
      }
    });
  }

  private async cargarQrs(boletos: TicketOnline[]): Promise<void> {
    if (!boletos || boletos.length === 0) {
      this.boletosConQr.set([]);
      return;
    }

    // Mostrar inmediatamente los boletos en la UI sin bloquear
    this.boletosConQr.set(boletos.map((t) => ({ ...t })));

    const conQr: TicketConQr[] = await Promise.all(
      boletos.map(async (t) => {
        try {
          const qrDataUrl = await QRCode.toDataURL(t.uuidCodigo, {
            width: 300,
            margin: 1,
            color: {
              dark: '#0f172a',
              light: '#ffffff'
            }
          });
          return { ...t, qrDataUrl };
        } catch {
          return { ...t, qrDataUrl: undefined };
        }
      })
    );

    this.boletosConQr.set(conQr);
  }

  abrirQrGrande(ticket: TicketConQr): void {
    this.ticketAmpliado.set(ticket);
  }

  imprimir(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
