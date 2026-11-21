import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TiendaService } from '../../../../core/services/tienda.service';
import {
  CatalogoAtraccionOnline,
  ItemCarritoOnline
} from '../../../../core/models/tienda.model';
import { ModalidadModalComponent } from '../../components/modalidad-modal/modalidad-modal.component';
import { CarritoDrawerComponent } from '../../components/carrito-drawer/carrito-drawer.component';

@Component({
  selector: 'app-tienda-landing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    ModalidadModalComponent,
    CarritoDrawerComponent
  ],
  template: `
    <div class="min-h-screen bg-slate-50 font-sans flex flex-col selection:bg-emerald-500 selection:text-white">

      <!-- Barra de Navegación Pública Superior -->
      <header class="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-colors">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <!-- Logo / Marca -->
          <a routerLink="/" class="flex items-center gap-2.5 group">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-150">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span class="block text-base font-black tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                Territorio de Niños
              </span>
              <span class="block text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Parque de Diversiones
              </span>
            </div>
          </a>

          <!-- Acciones de Navegación -->
          <div class="flex items-center gap-2 sm:gap-3">
            <!-- Botón Mis Boletos -->
            <a
              routerLink="/mis-boletos"
              class="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:text-slate-900 text-xs font-bold transition-[border-color,color,background-color] duration-150 enabled:active:scale-[0.96] flex items-center gap-1.5 shadow-2xs">
              <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <span>Mis Boletos</span>
              @if (tiendaService.boletosLocales().length > 0) {
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              }
            </a>

            <!-- Acceso a Taquilla/Operario/Admin -->
            <a
              routerLink="/login"
              class="px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-semibold transition-[background-color,color] duration-150 enabled:active:scale-[0.96] hidden sm:inline-flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Colaboradores</span>
            </a>

            <!-- Botón de Cesta en Barra Superior -->
            <button
              type="button"
              (click)="tiendaService.abrirCarrito()"
              class="relative px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-[background-color,transform] duration-150 enabled:active:scale-[0.96] flex items-center gap-1.5"
              aria-label="Ver cesta de compras">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span class="hidden sm:inline">Cesta</span>
              @if (tiendaService.totalItems() > 0) {
                <span class="bg-white text-emerald-800 text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center font-mono tabular-nums">
                  {{ tiendaService.totalItems() }}
                </span>
              }
            </button>
          </div>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="relative bg-gradient-to-b from-emerald-50/60 via-teal-50/30 to-slate-50 py-10 sm:py-14 border-b border-slate-200/50">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-3.5">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-800 text-xs font-extrabold border border-emerald-300/60 shadow-2xs">
            <span>✨ Compra en camino y entra directo</span>
          </div>

          <h1 class="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            ¡Tus boletos en línea sin filas ni esperas!
          </h1>

          <p class="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Compra las entradas de tus hijos desde el celular mientras viajan al parque. Al llegar, presenta el código QR al operario y ¡que empiece la diversión!
          </p>

          <div class="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-600">
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              Boletas 100% digitales con QR
            </span>
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              Válidas durante todo el día
            </span>
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              Pago fácil con Nequi, PSE o Tarjeta
            </span>
          </div>
        </div>
      </section>

      <!-- Catálogo de Atracciones -->
      <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div class="flex items-end justify-between mb-6">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Atracciones Disponibles Hoy
            </h2>
            <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
              Consulta aforo y selecciona la atracción ideal para la edad de tu pequeño
            </p>
          </div>

          <button
            type="button"
            (click)="recargarCatalogo()"
            class="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
            title="Actualizar catálogo">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <!-- Estado de Carga -->
        @if (tiendaService.cargandoCatalogo()) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <div class="rounded-3xl p-6 bg-white border border-slate-200 shadow-xs animate-pulse space-y-4">
                <div class="h-6 bg-slate-200 rounded-xl w-3/4"></div>
                <div class="h-4 bg-slate-100 rounded-lg w-full"></div>
                <div class="h-4 bg-slate-100 rounded-lg w-1/2"></div>
                <div class="h-10 bg-slate-200 rounded-2xl w-full"></div>
              </div>
            }
          </div>
        } @else if (tiendaService.errorCatalogo()) {
          <div class="p-8 rounded-3xl bg-rose-50 border border-rose-200 text-center max-w-md mx-auto space-y-3">
            <p class="text-sm font-bold text-rose-800">{{ tiendaService.errorCatalogo() }}</p>
            <button
              type="button"
              (click)="recargarCatalogo()"
              class="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold transition-transform enabled:active:scale-[0.96]">
              Reintentar
            </button>
          </div>
        } @else if (tiendaService.catalogo().length === 0) {
          <div class="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs max-w-md mx-auto space-y-3">
            <span class="text-4xl">🎪</span>
            <h3 class="text-base font-extrabold text-slate-800">No hay atracciones disponibles en este momento</h3>
            <p class="text-xs text-slate-500">
              Estamos preparando las instalaciones del parque. Por favor vuelve a consultar en unos minutos.
            </p>
          </div>
        } @else {
          <!-- Grilla de Atracciones -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (atr of tiendaService.catalogo(); track atr.id) {
              <div
                class="rounded-3xl p-6 bg-white border border-transparent shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-[box-shadow,transform] duration-200 flex flex-col justify-between group">

                <div class="space-y-3">
                  <!-- Badges superiores -->
                  <div class="flex items-center justify-between gap-2">
                    <span
                      [class]="atr.tipoAtraccion === 'TEMPORIZADA'
                        ? 'bg-blue-50 text-blue-700 border-blue-200/60'
                        : 'bg-purple-50 text-purple-700 border-purple-200/60'"
                      class="px-2.5 py-1 rounded-full text-[11px] font-bold border">
                      {{ atr.tipoAtraccion === 'TEMPORIZADA' ? '⏱️ Por Tiempo' : '🎯 Por Intentos' }}
                    </span>

                    <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                      {{ atr.edadMinima }} a {{ atr.edadMaxima }} años
                    </span>
                  </div>

                  <!-- Título y descripción -->
                  <div>
                    <h3 class="text-xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {{ atr.nombre }}
                    </h3>
                    <p class="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {{ atr.descripcion || 'Atracción interactiva diseñada para la diversión y seguridad de los niños.' }}
                    </p>
                  </div>

                  <!-- Métricas de Disponibilidad / Tarifas -->
                  <div class="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span class="text-[10px] uppercase font-bold text-slate-400 block">Capacidad</span>
                      <span class="font-extrabold text-slate-800">
                        {{ atr.cuposLibres }} / {{ atr.capacidadMaxima }} libres
                      </span>
                    </div>

                    <div class="text-right">
                      <span class="text-[10px] uppercase font-bold text-slate-400 block">Tarifas desde</span>
                      <span class="font-black text-emerald-700 text-sm font-mono">
                        \${{ calcularPrecioDesde(atr) | number }} COP
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Botón de compra / configuración -->
                <div class="pt-5 mt-4 border-t border-slate-100">
                  <button
                    type="button"
                    (click)="abrirModalAtraccion(atr)"
                    class="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md transition-[background-color,transform] duration-150 enabled:active:scale-[0.96] flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Comprar Boleta</span>
                  </button>
                </div>

              </div>
            }
          </div>
        }
      </main>

      <!-- Botón Flotante de Cesta (Mobile-First) -->
      @if (tiendaService.totalItems() > 0) {
        <aside
          class="fixed bottom-5 right-5 z-40 sm:hidden">
          <button
            type="button"
            (click)="tiendaService.abrirCarrito()"
            class="px-5 py-3.5 rounded-full bg-emerald-600 text-white font-black text-sm shadow-2xl shadow-emerald-600/50 flex items-center gap-2.5 enabled:active:scale-[0.96] transition-[transform,background-color] duration-150">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span>Cesta ({{ tiendaService.totalItems() }})</span>
            <span class="px-2 py-0.5 rounded-full bg-emerald-800 text-xs font-mono">
              \${{ tiendaService.totalPagar() | number }}
            </span>
          </button>
        </aside>
      }

      <!-- Pie de Página -->
      <footer class="bg-white border-t border-slate-200 mt-12 py-8 text-xs text-slate-500">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <span class="font-extrabold text-slate-800">Territorio de Niños</span>
            <span>— Diversión segura y recuerdos inolvidables.</span>
          </div>

          <div class="flex items-center gap-4">
            <a routerLink="/mis-boletos" class="hover:text-emerald-700 font-semibold transition-colors">
              Mis Boletos
            </a>
            <a routerLink="/login" class="hover:text-emerald-700 font-semibold transition-colors">
              Acceso Colaboradores
            </a>
          </div>
        </div>
      </footer>

    </div>

    <!-- Modal de Configuración de Boleta -->
    @if (atraccionSeleccionada()) {
      <app-modalidad-modal
        [atraccion]="atraccionSeleccionada()"
        (close)="atraccionSeleccionada.set(null)"
        (addToCart)="onItemAgregado($event)" />
    }

    <!-- Drawer del Carrito -->
    @if (tiendaService.carritoAbierto()) {
      <app-carrito-drawer (close)="tiendaService.cerrarCarrito()" />
    }
  `
})
export class TiendaLandingComponent implements OnInit {
  readonly tiendaService = inject(TiendaService);

  readonly atraccionSeleccionada = signal<CatalogoAtraccionOnline | null>(null);

  ngOnInit(): void {
    this.recargarCatalogo();
  }

  recargarCatalogo(): void {
    this.tiendaService.obtenerCatalogo().subscribe({
      error: () => {
        // Manejado reactivamente en el signal errorCatalogo
      }
    });
  }

  abrirModalAtraccion(atr: CatalogoAtraccionOnline): void {
    this.atraccionSeleccionada.set(atr);
  }

  onItemAgregado(item: ItemCarritoOnline): void {
    this.tiendaService.agregarAlCarrito(item);
    this.atraccionSeleccionada.set(null);
    // Abre el carrito para confirmación visual instantánea
    this.tiendaService.abrirCarrito();
  }

  calcularPrecioDesde(atr: CatalogoAtraccionOnline): number {
    if (atr.tipoAtraccion === 'TEMPORIZADA') {
      if (atr.tarifasTiempo?.length) {
        return Math.min(...atr.tarifasTiempo.map((t) => t.precio));
      }
      return (atr.tarifaMinuto || 1000) * (atr.duracionRecomendadaMinutos || 15);
    } else {
      if (atr.tarifasEvento?.length) {
        return Math.min(...atr.tarifasEvento.map((t) => t.precio));
      }
      return 5000;
    }
  }
}
