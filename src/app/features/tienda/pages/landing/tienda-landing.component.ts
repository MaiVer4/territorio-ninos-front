import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
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
import { NormasModalComponent } from '../../components/normas-modal/normas-modal.component';
import { CarritoDrawerComponent } from '../../components/carrito-drawer/carrito-drawer.component';

type FiltroCategoria = 'TODAS' | 'PEQUENOS' | 'GRANDES' | 'TIEMPO' | 'CAIDAS';

interface FaqItem {
  pregunta: string;
  respuesta: string;
  abierto: boolean;
}

@Component({
  selector: 'app-tienda-landing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    ModalidadModalComponent,
    NormasModalComponent,
    CarritoDrawerComponent
  ],
  template: `
    <div class="min-h-screen bg-[#FAFAFC] text-slate-800 font-sans flex flex-col selection:bg-emerald-500 selection:text-white scroll-smooth relative overflow-x-hidden">

      <!-- 1. Top Announcement Bar (Ticker Comercial Premium) -->
      <aside aria-label="Aviso comercial" class="bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 text-white text-[11px] font-black py-2.5 px-4 shadow-sm relative z-50">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div class="flex items-center gap-2">
            <span class="inline-flex h-2 w-2 rounded-full bg-white motion-safe:animate-ping"></span>
            <span>🎉 <strong>¡PARQUE ABIERTO HOY HASTA LAS 9:00 PM!</strong> • Compra en línea y entra directo sin filas en taquilla</span>
          </div>
          <div class="hidden md:flex items-center gap-4 text-[11px] text-white/90">
            <span>💳 Pagos 100% seguros con Nequi, PSE y Tarjetas</span>
          </div>
        </div>
      </aside>

      <!-- 2. Navbar Comercial Flotante (Pill Design Estilo SkyZone / Disney Parks) -->
      <header class="sticky top-3 z-40 px-3 sm:px-6 pointer-events-none">
        <div class="max-w-7xl mx-auto rounded-full bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.08)] px-4 sm:px-6 py-3 flex items-center justify-between pointer-events-auto transition-all">
          
          <!-- Logo de Marca -->
          <a routerLink="/" class="flex items-center gap-3 group">
            <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-amber-400 p-0.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
              <div class="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-white">
                <span class="text-xl">🎪</span>
              </div>
            </div>
            <div>
              <span class="block font-display text-lg sm:text-xl font-black tracking-tight text-slate-950 group-hover:text-emerald-600 transition-colors leading-none">
                Territorio de Niños
              </span>
              <span class="block text-[9px] uppercase font-extrabold tracking-widest text-emerald-600 mt-0.5">
                Parque de Aventuras
              </span>
            </div>
          </a>

          <!-- Navegación de Contenido -->
          <nav class="hidden lg:flex items-center gap-1 text-xs font-extrabold text-slate-600">
            <a href="#atracciones" class="hover:text-slate-950 hover:bg-slate-100/80 px-3.5 py-1.5 rounded-full transition-all">Atracciones</a>
            <a href="#como-funciona" class="hover:text-slate-950 hover:bg-slate-100/80 px-3.5 py-1.5 rounded-full transition-all">Cómo Funciona</a>
            <a href="#cumpleanos" class="hover:text-slate-950 hover:bg-slate-100/80 px-3.5 py-1.5 rounded-full transition-all">Cumpleaños</a>
            <a href="#beneficios" class="hover:text-slate-950 hover:bg-slate-100/80 px-3.5 py-1.5 rounded-full transition-all">Por Qué Elegirnos</a>
            <a href="#faq" class="hover:text-slate-950 hover:bg-slate-100/80 px-3.5 py-1.5 rounded-full transition-all">Preguntas</a>
            <a href="#ubicacion" class="hover:text-slate-950 hover:bg-slate-100/80 px-3.5 py-1.5 rounded-full transition-all">Ubicación</a>
          </nav>

          <!-- Acciones Comerciales -->
          <div class="flex items-center gap-2 sm:gap-3">
            <!-- Botón Mis Boletos -->
            <a
              routerLink="/mis-boletos"
              class="px-3.5 sm:px-4 py-2 rounded-full border border-slate-200/80 hover:border-emerald-300 bg-white hover:bg-emerald-50/50 text-slate-800 hover:text-emerald-800 text-xs font-black transition-all duration-150 active:scale-95 flex items-center gap-1.5 shadow-2xs">
              <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <span>Mis Boletos</span>
              @if (tiendaService.boletosLocales().length > 0) {
                <span class="w-2 h-2 rounded-full bg-emerald-500 motion-safe:animate-pulse"></span>
              }
            </a>

            <!-- Acceso a Colaboradores -->
            <a
              routerLink="/login"
              class="px-3 py-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all hidden md:inline-flex items-center gap-1"
              title="Portal de colaboradores y operarios">
              <span>Personal</span>
            </a>

            <!-- Cesta de Compras -->
            <button
              type="button"
              (click)="tiendaService.abrirCarrito()"
              class="relative px-4 sm:px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black shadow-lg shadow-emerald-500/25 transition-all duration-150 active:scale-95 flex items-center gap-2"
              aria-label="Ver cesta de compras">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span class="hidden sm:inline">Cesta</span>
              @if (tiendaService.totalItems() > 0) {
                <span class="bg-white text-emerald-800 text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center font-mono tabular-nums shadow-xs">
                  {{ tiendaService.totalItems() }}
                </span>
              }
            </button>
          </div>

        </div>
      </header>

      <!-- 3. Hero Section Asimétrico de Alto Impacto (Parque de Diversiones Premium) -->
      <section class="relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden">
        
        <!-- Auras de Color y Resplandor Ambiental -->
        <div class="absolute -top-32 -left-32 w-[520px] h-[520px] bg-emerald-300/35 rounded-full blur-[110px] pointer-events-none"></div>
        <div class="absolute top-1/4 -right-32 w-[540px] h-[540px] bg-amber-200/35 rounded-full blur-[120px] pointer-events-none"></div>
        <div class="absolute bottom-0 left-1/3 w-[450px] h-[450px] bg-teal-200/25 rounded-full blur-[100px] pointer-events-none"></div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            <!-- Columna Izquierda: Copy Persuasivo y Llamado a la Acción -->
            <div class="lg:col-span-7 space-y-6 text-center lg:text-left">

              <!-- Titular Principal con Font Display -->
              <h1 class="font-display text-4xl sm:text-6xl lg:text-[68px] font-black text-slate-950 tracking-tight leading-[1.06]">
                Donde la diversión <br class="hidden sm:inline" />
                <span class="bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500 bg-clip-text text-transparent">
                  no hace filas
                </span>
              </h1>

              <!-- Subtítulo Comercial -->
              <p class="text-base sm:text-lg text-slate-600 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                Compra las boletas de tus niños mientras vas en camino, entra directo escaneando el código QR desde tu celular y regálales un día inolvidable de juegos y risas en un ambiente 100% seguro y climatizado.
              </p>

              <!-- Botones de Acción (Pill Design) -->
              <div class="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                <a
                  href="#atracciones"
                  class="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/40 active:scale-95 transition-all flex items-center justify-center gap-2.5 group">
                  <svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  <span>Ver Atracciones y Comprar</span>
                  <span class="group-hover:translate-x-1 transition-transform">→</span>
                </a>

                <a
                  href="#cumpleanos"
                  class="w-full sm:w-auto px-7 py-4 rounded-full bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-sm border border-slate-200 shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2">
                  <span>🎂 Fiestas y Cumpleaños</span>
                </a>
              </div>

              <!-- Sellos de Confianza Social Proof -->
              <div class="pt-6 border-t border-slate-200/70 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-extrabold text-slate-700">
                <div class="flex items-center justify-center lg:justify-start gap-1.5">
                  <span class="text-amber-500 text-sm">★★★★★</span>
                  <span>4.9 (+2.4k familias)</span>
                </div>
                <div class="flex items-center justify-center lg:justify-start gap-1.5">
                  <span>🛡️</span>
                  <span>Operarios Calificados</span>
                </div>
                <div class="flex items-center justify-center lg:justify-start gap-1.5">
                  <span>🧼</span>
                  <span>Higiene Continua</span>
                </div>
                <div class="flex items-center justify-center lg:justify-start gap-1.5">
                  <span>☕</span>
                  <span>Zona Padres + WiFi</span>
                </div>
              </div>

            </div>

            <!-- Columna Derecha: Mockup 3D Interactivo de "Pase Digital VIP" -->
            <div class="lg:col-span-5 flex justify-center">
              <div class="relative w-full max-w-sm">
                
                <!-- Resplandor Detrás del Boleto -->
                <div class="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-[40px] opacity-35 blur-xl"></div>
                
                <!-- Tarjeta de Boleto Digital (Disney FastPass / SkyZone Ticket Style) -->
                <div class="relative rounded-[36px] bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 sm:p-7 text-white shadow-2xl border border-white/10 transform lg:rotate-2 hover:rotate-0 transition-transform duration-300 ease-out">
                  
                  <!-- Muescas de Perforación Lateral de Boleto de Parque -->
                  <div class="absolute top-[54%] -left-3.5 w-7 h-7 rounded-full bg-[#FAFAFC] border-r border-slate-200"></div>
                  <div class="absolute top-[54%] -right-3.5 w-7 h-7 rounded-full bg-[#FAFAFC] border-l border-slate-200"></div>

                  <!-- Header del Boleto -->
                  <div class="flex items-center justify-between pb-4 border-b border-white/10">
                    <div class="flex items-center gap-2">
                      <span class="text-2xl">🎪</span>
                      <div>
                        <span class="font-display font-black text-sm uppercase tracking-wide block leading-none">
                          Pase Digital Oficial
                        </span>
                        <span class="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest">
                          Acceso Rápido
                        </span>
                      </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                      VÁLIDO HOY
                    </span>
                  </div>

                  <!-- QR Code Mockup en Alta Fidelidad con Láser Verde -->
                  <div class="my-5 p-4 rounded-3xl bg-white text-slate-950 shadow-inner flex flex-col items-center justify-center relative overflow-hidden group">
                    <!-- Línea de Escáner Animada -->
                    <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent motion-safe:animate-pulse"></div>
                    
                    <div class="w-36 h-36 bg-slate-950 rounded-2xl p-2.5 flex items-center justify-center shadow-md">
                      <!-- Gráfico SVG de Código QR Realista -->
                      <svg class="w-full h-full text-white" viewBox="0 0 100 100" fill="currentColor">
                        <rect x="10" y="10" width="25" height="25" rx="3" fill="none" stroke="currentColor" stroke-width="6"/>
                        <rect x="18" y="18" width="9" height="9" fill="currentColor"/>
                        <rect x="65" y="10" width="25" height="25" rx="3" fill="none" stroke="currentColor" stroke-width="6"/>
                        <rect x="73" y="18" width="9" height="9" fill="currentColor"/>
                        <rect x="10" y="65" width="25" height="25" rx="3" fill="none" stroke="currentColor" stroke-width="6"/>
                        <rect x="18" y="73" width="9" height="9" fill="currentColor"/>
                        <rect x="42" y="12" width="6" height="6"/>
                        <rect x="52" y="12" width="6" height="6"/>
                        <rect x="42" y="24" width="6" height="6"/>
                        <rect x="12" y="44" width="6" height="6"/>
                        <rect x="24" y="44" width="6" height="6"/>
                        <rect x="42" y="44" width="16" height="16" rx="2" fill="#059669"/>
                        <rect x="65" y="44" width="6" height="6"/>
                        <rect x="78" y="44" width="6" height="6"/>
                        <rect x="42" y="68" width="6" height="6"/>
                        <rect x="52" y="76" width="6" height="6"/>
                        <rect x="68" y="68" width="16" height="6"/>
                        <rect x="76" y="80" width="12" height="6"/>
                      </svg>
                    </div>

                    <span class="text-[11px] font-black text-slate-800 mt-2 tracking-wide font-mono">
                      TDN-ONLINE-PASS
                    </span>
                  </div>

                  <!-- Línea Punteada de Perforación -->
                  <div class="border-b-2 border-dashed border-white/20 my-4 -mx-7"></div>

                  <!-- Detalles del Boleto -->
                  <div class="space-y-1.5 text-xs">
                    <div class="flex items-center justify-between text-slate-300">
                      <span>Titular:</span>
                      <strong class="text-white font-extrabold">Familia Gómez</strong>
                    </div>
                    <div class="flex items-center justify-between text-slate-300">
                      <span>Acompañante adulto:</span>
                      <strong class="text-emerald-400 font-extrabold">¡GRATIS!</strong>
                    </div>
                    <div class="flex items-center justify-between text-slate-300">
                      <span>Tiempo de ingreso:</span>
                      <strong class="text-white font-extrabold">⚡ En menos de 2 seg</strong>
                    </div>
                  </div>

                  <!-- Sticker Flotante: Entrada Express -->
                  <div class="absolute -top-3 -right-3 px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] shadow-lg transform rotate-6 border border-amber-300">
                    ⚡ 0 Filas en Entrada
                  </div>

                  <!-- Sticker Flotante: Seguridad 100% -->
                  <div class="absolute -bottom-3 -left-3 px-3.5 py-1 rounded-full bg-emerald-500 text-white font-black text-[11px] shadow-lg transform -rotate-3 border border-emerald-400">
                    🛡️ Válido Todo el Día
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- 4. Vitrina E-Commerce de Atracciones (Atracciones Reales con Precios, Tiempos y Categoría) -->
      <section id="atracciones" class="max-w-7xl w-full mx-auto px-4 sm:px-6 py-14 sm:py-20 relative">
        
        <!-- Encabezado de Sección y Píldoras de Filtro -->
        <div class="space-y-5 mb-10">
          <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span class="text-xs font-black uppercase tracking-widest text-emerald-700 block mb-1">
                Catálogo Oficial en Tiempo Real
              </span>
              <h2 class="font-display text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
                Elige la Aventura de Hoy
              </h2>
              <p class="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Boletas individuales válidas durante toda la jornada. Consulta tarifas por tiempo o por caídas y cupos disponibles en vivo.
              </p>
            </div>

            <!-- Botón de Actualizar Aforo -->
            <button
              type="button"
              (click)="recargarCatalogo()"
              class="self-start sm:self-auto px-4 py-2.5 rounded-full border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold flex items-center gap-2 transition-all shadow-2xs active:scale-95">
              <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Actualizar Aforo</span>
            </button>
          </div>

          <!-- Píldoras de Filtro Horizontal (Mobile Touch-Friendly Estilo E-Commerce) -->
          <div class="flex items-center gap-2.5 overflow-x-auto pb-2 overscroll-contain no-scrollbar">
            <button
              type="button"
              (click)="filtroActivo.set('TODAS')"
              [class]="filtroActivo() === 'TODAS'
                ? 'bg-slate-950 text-white font-black shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 font-bold'"
              class="px-5 py-2.5 rounded-full text-xs whitespace-nowrap transition-all duration-150 active:scale-95">
              🎪 Todas las Atracciones ({{ totalAtracciones() }})
            </button>

            <button
              type="button"
              (click)="filtroActivo.set('TIEMPO')"
              [class]="filtroActivo() === 'TIEMPO'
                ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-600/25'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 font-bold'"
              class="px-5 py-2.5 rounded-full text-xs whitespace-nowrap transition-all duration-150 active:scale-95">
              ⏱️ Por Tiempo
            </button>

            <button
              type="button"
              (click)="filtroActivo.set('CAIDAS')"
              [class]="filtroActivo() === 'CAIDAS'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/25'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 font-bold'"
              class="px-5 py-2.5 rounded-full text-xs whitespace-nowrap transition-all duration-150 active:scale-95">
              🎯 Por Caídas / Retos
            </button>

            <button
              type="button"
              (click)="filtroActivo.set('PEQUENOS')"
              [class]="filtroActivo() === 'PEQUENOS'
                ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/25'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 font-bold'"
              class="px-5 py-2.5 rounded-full text-xs whitespace-nowrap transition-all duration-150 active:scale-95">
              👶 Pequeños (1 a 4 años)
            </button>

            <button
              type="button"
              (click)="filtroActivo.set('GRANDES')"
              [class]="filtroActivo() === 'GRANDES'
                ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/25'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 font-bold'"
              class="px-5 py-2.5 rounded-full text-xs whitespace-nowrap transition-all duration-150 active:scale-95">
              🚀 Grandes (5 a 12 años)
            </button>
          </div>
        </div>

        <!-- Estado de Carga -->
        @if (tiendaService.cargandoCatalogo()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            @for (i of [1, 2, 3]; track i) {
              <div class="rounded-[32px] p-6 bg-white border border-slate-100 shadow-sm animate-pulse space-y-4">
                <div class="h-48 bg-slate-200 rounded-2xl w-full"></div>
                <div class="h-6 bg-slate-200 rounded-xl w-3/4"></div>
                <div class="h-4 bg-slate-100 rounded-lg w-full"></div>
                <div class="h-12 bg-slate-200 rounded-full w-full"></div>
              </div>
            }
          </div>
        } @else if (atraccionesFiltradas().length === 0) {
          <div class="p-12 text-center bg-white rounded-[32px] border border-slate-200 shadow-xs max-w-md mx-auto space-y-3">
            <span class="text-4xl">🔍</span>
            <h3 class="font-display text-lg font-black text-slate-900">No hay atracciones para este filtro</h3>
            <p class="text-xs text-slate-500">
              Prueba seleccionando otra categoría o restablece los filtros para ver todo el catálogo.
            </p>
            <button
              type="button"
              (click)="filtroActivo.set('TODAS')"
              class="px-6 py-2.5 rounded-full bg-slate-950 text-white text-xs font-black active:scale-95 transition-all">
              Ver Todas las Atracciones
            </button>
          </div>
        } @else {
          <!-- Grilla de Tarjetas E-Commerce de Experiencia (Atracciones Reales) -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            @for (atr of atraccionesFiltradas(); track atr.id) {
              <div
                class="group relative rounded-[32px] bg-white border border-slate-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden">

                <div>
                  <!-- Banner Visual Temático con Zoom y Badges Flotantes -->
                  <div class="relative h-52 bg-slate-950 overflow-hidden">
                    <img
                      [src]="obtenerImagenAtraccion(atr)"
                      [alt]="atr.nombre"
                      (error)="onImageError($event, atr)"
                      class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out opacity-90" />

                    <!-- Gradiente de Contraste para Badges -->
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent"></div>

                    <!-- Badges Flotantes Superiores en Cristal (Glassmorphism) -->
                    <div class="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 pointer-events-none">
                      <!-- Badge Categoría Correcta (Por Tiempo vs Por Caídas) -->
                      <span
                        [class]="isPorTiempo(atr)
                          ? 'bg-blue-600/90 text-white'
                          : 'bg-amber-500/95 text-slate-950'"
                        class="px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-md">
                        {{ isPorTiempo(atr) ? '⏱️ Por Tiempo' : '🎯 Por Caídas' }}
                      </span>

                      <!-- Badge Aforo en Vivo -->
                      @if (atr.cuposLibres > 0) {
                        <span class="px-3 py-1.5 rounded-full text-[11px] font-black bg-emerald-500/90 text-white backdrop-blur-md shadow-md flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full bg-white motion-safe:animate-pulse"></span>
                          <span>{{ atr.cuposLibres }} cupos</span>
                        </span>
                      } @else {
                        <span class="px-3 py-1.5 rounded-full text-[11px] font-black bg-amber-500/95 text-slate-950 backdrop-blur-md shadow-md">
                          Lleno · {{ textoIngresoCatalogo(atr) }}
                        </span>
                      }
                    </div>

                    <!-- Badges Flotantes Inferiores sobre Imagen -->
                    <div class="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-2 pointer-events-none">
                      <!-- Nombre de la Atracción Real -->
                      <div class="max-w-[65%]">
                        <span class="text-[9px] uppercase font-black tracking-widest text-emerald-300 block mb-0.5">
                          Atracción Oficial
                        </span>
                        <h3 class="font-display text-xl font-black text-white leading-tight drop-shadow-md">
                          {{ atr.nombre }}
                        </h3>
                      </div>

                      <!-- Chip de Precio Base Flotante en Cristal -->
                      <div class="px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-slate-950 font-black shadow-lg text-right flex items-baseline gap-1">
                        <span class="text-[9px] uppercase font-extrabold text-slate-500">Desde</span>
                        <span class="text-sm font-black font-mono text-emerald-700">
                          \${{ calcularPrecioDesde(atr) | number }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Cuerpo de la Tarjeta: Detalles, Categoría, Tiempos y Precios -->
                  <div class="p-6 space-y-4">
                    
                    <!-- Chips de Especificaciones (Edad, Aforo y Categoría) -->
                    <div class="flex flex-wrap items-center gap-2 text-xs font-extrabold text-slate-600">
                      <span class="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                        <span>👶</span>
                        <span>{{ atr.edadMinima }} a {{ atr.edadMaxima }} años</span>
                      </span>

                      <span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full">
                        <span>👥</span>
                        <span>Máx. {{ atr.capacidadMaxima }} niños</span>
                      </span>

                      <span
                        [class]="isPorTiempo(atr) ? 'bg-blue-50 text-blue-700 border-blue-200/60' : 'bg-amber-50 text-amber-800 border-amber-200/60'"
                        class="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[11px] font-black">
                        <span>{{ isPorTiempo(atr) ? '⏱️ Modalidad Tiempo' : '🎯 Modalidad Caídas' }}</span>
                      </span>
                    </div>

                    <!-- Descripción de la Experiencia -->
                    <p class="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                      {{ atr.descripcion || 'Zona interactiva diseñada bajo estrictos protocolos de diversión y seguridad infantil.' }}
                    </p>

                    <!-- TABLA DE PRECIOS Y TIEMPOS REALES -->
                    <div class="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-100 space-y-2">
                      <div class="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <span>{{ isPorTiempo(atr) ? 'Tiempos Disponibles' : 'Paquetes de Caídas' }}</span>
                        <span>Precio Boleta</span>
                      </div>

                      <div class="space-y-1.5">
                        @if (isPorTiempo(atr)) {
                          @if (atr.tarifasTiempo.length > 0) {
                            @for (tarifa of atr.tarifasTiempo; track tarifa.id) {
                              <div class="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
                                <span class="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  ⏱️ {{ tarifa.duracionMinutos }} minutos
                                </span>
                                <span class="font-display font-black text-emerald-700 text-xs font-mono">
                                  \${{ tarifa.precio | number }} <span class="text-[9px] text-slate-400 font-sans">COP</span>
                                </span>
                              </div>
                            }
                          } @else {
                            <div class="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
                              <span class="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                ⏱️ {{ atr.duracionRecomendadaMinutos || 15 }} minutos
                              </span>
                              <span class="font-display font-black text-emerald-700 text-xs font-mono">
                                \${{ calcularPrecioDesde(atr) | number }} <span class="text-[9px] text-slate-400 font-sans">COP</span>
                              </span>
                            </div>
                          }
                        } @else {
                          @if (atr.tarifasEvento.length > 0) {
                            @for (tarifa of atr.tarifasEvento; track tarifa.id) {
                              <div class="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
                                <span class="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  🎯 {{ tarifa.intentos }} caídas
                                </span>
                                <span class="font-display font-black text-amber-700 text-xs font-mono">
                                  \${{ tarifa.precio | number }} <span class="text-[9px] text-slate-400 font-sans">COP</span>
                                </span>
                              </div>
                            }
                          } @else {
                            <div class="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
                              <span class="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                🎯 1 caída / intento
                              </span>
                              <span class="font-display font-black text-amber-700 text-xs font-mono">
                                \${{ calcularPrecioDesde(atr) | number }} <span class="text-[9px] text-slate-400 font-sans">COP</span>
                              </span>
                            </div>
                          }
                        }
                      </div>
                    </div>

                  </div>
                </div>

                <!-- Botones de Acción (Pill Design) -->
                <div class="p-6 pt-0 grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    (click)="abrirModalNormas(atr)"
                    class="py-3 px-3 rounded-full border border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs transition-all active:scale-95 flex items-center justify-center gap-1 shadow-2xs"
                    title="Ver normas y reglas de seguridad">
                    <span>Normas</span>
                  </button>

                  <button
                    type="button"
                    (click)="abrirModalAtraccion(atr)"
                    class="col-span-2 py-3 px-5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2">
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

      </section>

      <!-- 5. Paso a Paso: Cómo Funciona en 3 Pasos (Proceso E-Commerce Lúdico) -->
      <section id="como-funciona" class="bg-white py-16 sm:py-24 border-y border-slate-200/80 relative">
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
          <div class="text-center max-w-2xl mx-auto space-y-2 mb-14">
            <span class="text-xs font-black uppercase tracking-widest text-emerald-700">Sin Filas de Taquilla</span>
            <h2 class="font-display text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
              ¿Cómo Comprar y Entrar en 3 Pasos?
            </h2>
            <p class="text-xs sm:text-sm text-slate-500 font-medium">
              Diseñado para que los padres compren en minutos desde el carro o el transporte antes de llegar.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Paso 1 -->
            <div class="p-8 rounded-[32px] bg-slate-50 border border-slate-200/60 space-y-4 relative hover:shadow-lg transition-shadow">
              <span class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-black text-lg flex items-center justify-center shadow-md shadow-emerald-500/25">
                01
              </span>
              <h3 class="font-display text-lg font-black text-slate-900">1. Elige la atracción y niño</h3>
              <p class="text-xs text-slate-600 leading-relaxed font-medium">
                Selecciona el tiempo de juego o cantidad de caídas, escribe el nombre de tu hijo y nuestro sistema validará su edad recomendada al instante.
              </p>
            </div>

            <!-- Paso 2 -->
            <div class="p-8 rounded-[32px] bg-slate-50 border border-slate-200/60 space-y-4 relative hover:shadow-lg transition-shadow">
              <span class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 text-white font-black text-lg flex items-center justify-center shadow-md shadow-teal-500/25">
                02
              </span>
              <h3 class="font-display text-lg font-black text-slate-900">2. Paga seguro en línea</h3>
              <p class="text-xs text-slate-600 leading-relaxed font-medium">
                Paga en segundos con Nequi, PSE o tarjeta sin crear cuentas pesadas. Recibes tus boletos digitales de inmediato en tu pantalla.
              </p>
            </div>

            <!-- Paso 3 -->
            <div class="p-8 rounded-[32px] bg-slate-50 border border-slate-200/60 space-y-4 relative hover:shadow-lg transition-shadow">
              <span class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-400 text-slate-950 font-black text-lg flex items-center justify-center shadow-md shadow-amber-400/25">
                03
              </span>
              <h3 class="font-display text-lg font-black text-slate-900">3. Muestra el QR y ¡a jugar!</h3>
              <p class="text-xs text-slate-600 leading-relaxed font-medium">
                Llegas al parque, el operario escanea tu código QR en 2 segundos desde tu celular y tus pequeños ingresan a disfrutar sin filas.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 6. Zona Comercial de Fiestas y Cumpleaños (Paquetes VIP) -->
      <section id="cumpleanos" class="py-16 sm:py-24 bg-gradient-to-b from-purple-950 via-slate-950 to-slate-950 text-white relative overflow-hidden">
        
        <!-- Elementos de luz decorativos -->
        <div class="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 space-y-12">
          <div class="text-center max-w-2xl mx-auto space-y-3">
            <span class="inline-block px-4 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-black uppercase tracking-widest border border-purple-500/30">
              Celebraciones Mágicas
            </span>
            <h2 class="font-display text-3xl sm:text-5xl font-black tracking-tight text-white">
              ¡Celebra el Mejor Cumpleaños!
            </h2>
            <p class="text-xs sm:text-sm text-purple-200/80 font-medium">
              Paquetes todo incluido con anfitrión exclusivo, dinámicas, torta y atracciones liberadas para que los padres solo se dediquen a disfrutar.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Plan 1 -->
            <div class="p-8 rounded-[36px] bg-white/5 border border-white/10 space-y-6 flex flex-col justify-between backdrop-blur-md hover:bg-white/10 transition-all">
              <div class="space-y-3">
                <span class="text-xs font-black uppercase tracking-wider text-purple-300 block">Plan Aventurero</span>
                <h3 class="font-display text-2xl font-black text-white">Hasta 10 niños</h3>
                <p class="text-xs text-slate-300 font-medium">Ideal para celebraciones íntimas y familiares.</p>
                <ul class="text-xs text-slate-300 space-y-2.5 pt-4 border-t border-white/10 font-medium">
                  <li class="flex items-center gap-2"><span class="text-emerald-400 font-black">✓</span> 2 atracciones incluidas</li>
                  <li class="flex items-center gap-2"><span class="text-emerald-400 font-black">✓</span> Invitaciones digitales personalizadas</li>
                  <li class="flex items-center gap-2"><span class="text-emerald-400 font-black">✓</span> Anfitrión de juegos y dinámicas</li>
                </ul>
              </div>
              <a
                href="https://wa.me/573001234567?text=Hola,%20deseo%20cotizar%20el%20Plan%20Aventurero%20para%20un%20cumplea%C3%B1os"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-black text-xs text-center border border-white/20 transition-all active:scale-95">
                Cotizar Plan Aventurero
              </a>
            </div>

            <!-- Plan 2 (Destacado VIP) -->
            <div class="p-8 rounded-[36px] bg-gradient-to-b from-amber-400/10 via-amber-400/5 to-white/5 border-2 border-amber-400 space-y-6 flex flex-col justify-between shadow-2xl relative backdrop-blur-md">
              <span class="absolute -top-3.5 right-8 px-4 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-widest shadow-md">
                ⭐ Más Elegido
              </span>
              <div class="space-y-3">
                <span class="text-xs font-black uppercase tracking-wider text-amber-400 block">Plan Mágico VIP</span>
                <h3 class="font-display text-2xl font-black text-white">Hasta 20 niños</h3>
                <p class="text-xs text-amber-100 font-medium">3 horas completas con todas las atracciones liberadas.</p>
                <ul class="text-xs text-slate-200 space-y-2.5 pt-4 border-t border-amber-400/20 font-medium">
                  <li class="flex items-center gap-2"><span class="text-amber-400 font-black">✓</span> Acceso ilimitado a todas las atracciones</li>
                  <li class="flex items-center gap-2"><span class="text-amber-400 font-black">✓</span> Torta temática y refrigerios premium</li>
                  <li class="flex items-center gap-2"><span class="text-amber-400 font-black">✓</span> Animación profesional y fotografías HD</li>
                  <li class="flex items-center gap-2"><span class="text-amber-400 font-black">✓</span> Salón privado decorado para piñata</li>
                </ul>
              </div>
              <a
                href="https://wa.me/573001234567?text=Hola,%20deseo%20cotizar%20el%20Plan%20M%C3%A1gico%20VIP%20para%20un%20cumplea%C3%B1os"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full py-4 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-black text-xs text-center shadow-lg shadow-amber-400/30 transition-all active:scale-95">
                Cotizar Plan VIP por WhatsApp
              </a>
            </div>

            <!-- Plan 3 (Escolar) -->
            <div class="p-8 rounded-[36px] bg-white/5 border border-white/10 space-y-6 flex flex-col justify-between backdrop-blur-md hover:bg-white/10 transition-all">
              <div class="space-y-3">
                <span class="text-xs font-black uppercase tracking-wider text-blue-300 block">Plan Escolar & Grupos</span>
                <h3 class="font-display text-2xl font-black text-white">+30 niños</h3>
                <p class="text-xs text-slate-300 font-medium">Tarifas especiales para colegios, jardines y empresas.</p>
                <ul class="text-xs text-slate-300 space-y-2.5 pt-4 border-t border-white/10 font-medium">
                  <li class="flex items-center gap-2"><span class="text-blue-400 font-black">✓</span> Descuentos por volumen grupal</li>
                  <li class="flex items-center gap-2"><span class="text-blue-400 font-black">✓</span> Coordinador operativo dedicado</li>
                  <li class="flex items-center gap-2"><span class="text-blue-400 font-black">✓</span> Horarios matutinos exclusivos</li>
                </ul>
              </div>
              <a
                href="https://wa.me/573001234567?text=Hola,%20deseo%20cotizar%20un%20evento%20escolar%20o%20grupal"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-black text-xs text-center border border-white/20 transition-all active:scale-95">
                Consultar Grupo Escolar
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- 7. Pilares de Confianza / Por Qué Elegirnos -->
      <section id="beneficios" class="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div class="text-center max-w-2xl mx-auto space-y-2 mb-14">
          <span class="text-xs font-black uppercase tracking-widest text-emerald-700">Tranquilidad Total</span>
          <h2 class="font-display text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
            ¿Por Qué las Familias Nos Eligen?
          </h2>
          <p class="text-xs sm:text-sm text-slate-500 font-medium">
            Diseñamos cada atracción pensando tanto en la felicidad de los niños como en la paz mental de los papás.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="p-8 rounded-[32px] bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-3">
            <span class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 text-2xl flex items-center justify-center mb-4">🛡️</span>
            <h3 class="font-display text-lg font-black text-slate-900">Seguridad Certificada</h3>
            <p class="text-xs text-slate-500 font-medium leading-relaxed">
              Operarios calificados en cada atracción, superficies 100% acolchadas y botiquín de primeros auxilios.
            </p>
          </div>

          <div class="p-8 rounded-[32px] bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-3">
            <span class="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 text-2xl flex items-center justify-center mb-4">🧼</span>
            <h3 class="font-display text-lg font-black text-slate-900">Higiene Permanente</h3>
            <p class="text-xs text-slate-500 font-medium leading-relaxed">
              Desinfección profunda continua de pelotas, toboganes y colchonetas con productos inocuos certificados.
            </p>
          </div>

          <div class="p-8 rounded-[32px] bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-3">
            <span class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 text-2xl flex items-center justify-center mb-4">☕</span>
            <h3 class="font-display text-lg font-black text-slate-900">Zona Padres + WiFi</h3>
            <p class="text-xs text-slate-500 font-medium leading-relaxed">
              Cafetería con snacks, mesas con enchufes, WiFi de alta velocidad y vista panorámica hacia todas las áreas de juego.
            </p>
          </div>

          <div class="p-8 rounded-[32px] bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-3">
            <span class="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 text-2xl flex items-center justify-center mb-4">🎟️</span>
            <h3 class="font-display text-lg font-black text-slate-900">Boletas Todo el Día</h3>
            <p class="text-xs text-slate-500 font-medium leading-relaxed">
              Tus compras online no tienen horario estricto: puedes llegar a cualquier hora de la jornada y redimir tus boletos.
            </p>
          </div>
        </div>
      </section>

      <!-- 8. Preguntas Frecuentes (FAQ Accordion con Curvas E-Commerce) -->
      <section id="faq" class="bg-slate-100/70 py-16 sm:py-24 border-t border-slate-200">
        <div class="max-w-4xl mx-auto px-4 sm:px-6">
          <div class="text-center space-y-2 mb-12">
            <span class="text-xs font-black uppercase tracking-widest text-emerald-700">Dudas Comunes</span>
            <h2 class="font-display text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p class="text-xs sm:text-sm text-slate-500 font-medium">
              Respuestas rápidas para que tu visita sea perfecta y sin contratiempos
            </p>
          </div>

          <div class="space-y-3.5">
            @for (faq of faqs(); track faq.pregunta; let i = $index) {
              <div class="rounded-3xl bg-white border border-slate-200/80 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  (click)="toggleFaq(i)"
                  class="w-full p-5 sm:p-6 text-left font-display font-black text-base text-slate-900 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <span>{{ faq.pregunta }}</span>
                  <span class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs transform transition-transform duration-200" [class.rotate-180]="faq.abierto">
                    ▼
                  </span>
                </button>
                @if (faq.abierto) {
                  <div class="px-6 pb-6 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-4">
                    {{ faq.respuesta }}
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </section>

      <!-- 9. Ubicación, Horarios y Contacto Directo -->
      <section id="ubicacion" class="bg-white py-16 sm:py-24 border-t border-slate-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            
            <!-- Información de Llegada y Horarios -->
            <div class="space-y-6">
              <span class="text-xs font-black uppercase tracking-widest text-emerald-700 block">Visítanos Hoy</span>
              <h2 class="font-display text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
                ¿Dónde Estamos y Cuáles son los Horarios?
              </h2>
              
              <div class="space-y-4 text-xs font-medium text-slate-600">
                <div class="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <strong class="font-display font-black text-slate-900 block text-base">📍 Ubicación del Parque</strong>
                  <p>Parque Infantil Territorio de Niños • Calle Principal de Atracciones, Cali, Valle del Cauca.</p>
                  <div class="pt-3 flex items-center gap-2">
                    <a
                      href="https://maps.google.com/?q=Territorio+de+Ninos"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all active:scale-95 shadow-md shadow-emerald-600/20">
                      Abrir en Google Maps ↗
                    </a>
                  </div>
                </div>

                <div class="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <strong class="font-display font-black text-slate-900 block text-base">⏰ Horarios de Atención</strong>
                  <p><strong>Lunes a Viernes:</strong> 1:00 PM – 8:00 PM</p>
                  <p><strong>Sábados, Domingos y Festivos:</strong> 10:00 AM – 9:00 PM</p>
                </div>
              </div>

              <!-- Botón WhatsApp -->
              <a
                href="https://wa.me/573001234567?text=Hola,%20tengo%20una%20consulta%20sobre%20las%20boletas%20del%20parque"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2.5 px-6 py-4 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                <span>💬 Escríbenos por WhatsApp si vienes en camino</span>
              </a>
            </div>

            <!-- Banner Visual del Parque -->
            <div class="rounded-[40px] bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-700 p-8 sm:p-10 text-white shadow-2xl flex flex-col justify-between min-h-[340px]">
              <div class="space-y-3">
                <span class="text-4xl">🎪</span>
                <h3 class="font-display text-3xl font-black">¡Te esperamos para vivir un día mágico!</h3>
                <p class="text-xs sm:text-sm text-emerald-100 font-medium leading-relaxed">
                  Recuerda traer calcetines para los pequeños. Si no tienes, también disponemos de medias antideslizantes oficiales del parque en la entrada.
                </p>
              </div>

              <div class="pt-6 border-t border-white/20 flex items-center justify-between text-xs font-black">
                <span>🚗 Parqueadero propio</span>
                <span>❄️ Zonas 100% climatizadas</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- 10. Botón Flotante de Cesta (Mobile-First) -->
      @if (tiendaService.totalItems() > 0) {
        <aside
          class="fixed bottom-5 right-5 z-40 sm:hidden">
          <button
            type="button"
            (click)="tiendaService.abrirCarrito()"
            class="px-5 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm shadow-2xl shadow-emerald-600/50 flex items-center gap-2.5 active:scale-95 transition-all motion-safe:animate-bounce">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span>Cesta ({{ tiendaService.totalItems() }})</span>
            <span class="px-2.5 py-0.5 rounded-full bg-slate-950/40 text-xs font-mono">
              \${{ tiendaService.totalPagar() | number }}
            </span>
          </button>
        </aside>
      }

      <!-- 11. Footer Comercial E-Commerce Completo -->
      <footer class="bg-slate-950 text-slate-400 py-16 text-xs border-t border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          
          <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
            <!-- Columna 1: Marca -->
            <div class="space-y-3 md:col-span-1">
              <div class="flex items-center gap-2.5 text-white font-black text-lg">
                <span>🎪</span>
                <span class="font-display">Territorio de Niños</span>
              </div>
              <p class="text-xs text-slate-500 leading-relaxed font-medium">
                Parque de diversiones y entretenimiento familiar. Creamos experiencias mágicas, seguras e inolvidables para los más pequeños.
              </p>
              <div class="text-[11px] text-slate-500 font-bold">
                <span>Cali, Colombia • Nit: 900.123.456-7</span>
              </div>
            </div>

            <!-- Columna 2: Navegación -->
            <div class="space-y-2.5">
              <strong class="font-display text-white font-black block text-xs uppercase tracking-wider">Explorar</strong>
              <ul class="space-y-2 text-slate-400 font-medium">
                <li><a href="#atracciones" class="hover:text-emerald-400 transition-colors">Atracciones y Tarifas</a></li>
                <li><a routerLink="/mis-boletos" class="hover:text-emerald-400 transition-colors">Mis Boletos Digitales</a></li>
                <li><a href="#cumpleanos" class="hover:text-emerald-400 transition-colors">Fiestas y Cumpleaños</a></li>
                <li><a href="#como-funciona" class="hover:text-emerald-400 transition-colors">Cómo Funciona</a></li>
              </ul>
            </div>

            <!-- Columna 3: Medios de Pago -->
            <div class="space-y-2.5">
              <strong class="font-display text-white font-black block text-xs uppercase tracking-wider">Medios de Pago</strong>
              <p class="text-xs text-slate-500 font-medium">Transacciones 100% cifradas:</p>
              <div class="flex flex-wrap gap-2 text-white text-[11px] font-black">
                <span class="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">🟣 Nequi</span>
                <span class="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">🔵 PSE</span>
                <span class="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">💳 Visa / Master</span>
                <span class="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">🟡 Bancolombia</span>
              </div>
            </div>

            <!-- Columna 4: Legal & Personal -->
            <div class="space-y-2.5">
              <strong class="font-display text-white font-black block text-xs uppercase tracking-wider">Colaboradores & Legal</strong>
              <ul class="space-y-2 text-slate-400 font-medium">
                <li><a routerLink="/login" class="text-emerald-400 hover:text-emerald-300 font-black transition-colors">🔐 Acceso Colaboradores</a></li>
                <li><span class="text-slate-600">Términos y Condiciones</span></li>
                <li><span class="text-slate-600">Política de Privacidad</span></li>
                <li><span class="text-slate-600">Reglamento de Seguridad</span></li>
              </ul>
            </div>
          </div>

          <!-- Bottom Copyright -->
          <div class="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 font-medium">
            <span>© 2026 Territorio de Niños S.A.S. Todos los derechos reservados.</span>
            <div class="flex items-center gap-3">
              <span>Diseñado con ❤️ para las familias</span>
            </div>
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

    <!-- Modal de Normas y Detalles -->
    @if (atraccionNormas()) {
      <app-normas-modal
        [atraccion]="atraccionNormas()"
        (cerrar)="atraccionNormas.set(null)"
        (comprar)="onComprarDesdeNormas()" />
    }

    <!-- Drawer del Carrito con Cross-Selling -->
    @if (tiendaService.carritoAbierto()) {
      <app-carrito-drawer
        (close)="tiendaService.cerrarCarrito()"
        (configurarAtraccion)="abrirModalAtraccion($event)" />
    }
  `
})
export class TiendaLandingComponent implements OnInit {
  readonly tiendaService = inject(TiendaService);

  readonly atraccionSeleccionada = signal<CatalogoAtraccionOnline | null>(null);
  readonly atraccionNormas = signal<CatalogoAtraccionOnline | null>(null);
  readonly filtroActivo = signal<FiltroCategoria>('TODAS');

  readonly faqs = signal<FaqItem[]>([
    {
      pregunta: '¿Qué pasa si compro boletas en línea hoy y llego más tarde?',
      respuesta: 'Tus boletas son válidas durante todo el día de la compra (hasta la hora de cierre del parque). No te preocupes si hay tráfico o imprevistos: al llegar, tu código QR estará 100% activo en el sistema.',
      abierto: false
    },
    {
      pregunta: '¿Los adultos o acudientes acompañantes pagan entrada?',
      respuesta: '¡No! Los acudientes ingresan gratis a las zonas perimetrales y cafetería del parque. Solo se paga por los niños que ingresan a disfrutar de las atracciones.',
      abierto: false
    },
    {
      pregunta: '¿Cómo le muestro el boleto al operario al llegar?',
      respuesta: 'Simplemente entra a la sección "Mis Boletos" desde tu celular. Allí verás el código QR de cada niño en alta resolución. El operario lo escaneará con su lector óptico en menos de 2 segundos.',
      abierto: false
    },
    {
      pregunta: '¿Qué ropa o calzado deben llevar los niños?',
      respuesta: 'Ropa cómoda para jugar y es obligatorio el uso de calcetines o medias por higiene. No se permite el ingreso con zapatos dentro de las áreas acolchadas o piscinas de pelotas/arena.',
      abierto: false
    },
    {
      pregunta: '¿Qué métodos de pago puedo usar en la página?',
      respuesta: 'Aceptamos Nequi, PSE (cuentas de ahorros y corrientes de todos los bancos de Colombia) y tarjetas de crédito o débito Visa y Mastercard.',
      abierto: false
    }
  ]);

  // Solo mostramos atracciones reales activas y disponibles para venta en el parque
  readonly atraccionesReales = computed(() => {
    return this.tiendaService.catalogo().filter((a) => a.estado === 'ACTIVO' && a.disponibleParaCompra !== false);
  });

  readonly totalAtracciones = computed(() => this.atraccionesReales().length);

  readonly atraccionesFiltradas = computed(() => {
    const list = this.atraccionesReales();
    const filtro = this.filtroActivo();

    switch (filtro) {
      case 'PEQUENOS':
        return list.filter((a) => (a.edadMinima ?? 0) <= 3);
      case 'GRANDES':
        return list.filter((a) => (a.edadMaxima ?? 99) >= 6);
      case 'TIEMPO':
        return list.filter((a) => this.isPorTiempo(a));
      case 'CAIDAS':
        return list.filter((a) => this.isPorCaidas(a));
      case 'TODAS':
      default:
        return list;
    }
  });

  ngOnInit(): void {
    this.recargarCatalogo();
  }

  recargarCatalogo(): void {
    this.tiendaService.obtenerCatalogo().subscribe();
  }

  isPorTiempo(atr: CatalogoAtraccionOnline): boolean {
    const tipo = atr.tipoAtraccion || atr.tipo;
    return tipo === 'TEMPORIZADA' || (atr.tarifasTiempo?.length > 0 && (!atr.tarifasEvento || atr.tarifasEvento.length === 0));
  }

  isPorCaidas(atr: CatalogoAtraccionOnline): boolean {
    const tipo = atr.tipoAtraccion || atr.tipo;
    return tipo === 'EVENTOS_CAIDAS' || (atr.tarifasEvento?.length > 0 && (!atr.tarifasTiempo || atr.tarifasTiempo.length === 0));
  }

  abrirModalAtraccion(atr: CatalogoAtraccionOnline): void {
    this.atraccionNormas.set(null);
    this.atraccionSeleccionada.set(atr);
  }

  abrirModalNormas(atr: CatalogoAtraccionOnline): void {
    this.atraccionNormas.set(atr);
  }

  onComprarDesdeNormas(): void {
    const atr = this.atraccionNormas();
    if (atr) {
      this.abrirModalAtraccion(atr);
    }
  }

  onItemAgregado(item: ItemCarritoOnline): void {
    this.tiendaService.agregarAlCarrito(item);
    this.atraccionSeleccionada.set(null);
    this.tiendaService.abrirCarrito();
  }

  toggleFaq(index: number): void {
    this.faqs.update((items) =>
      items.map((item, i) =>
        i === index ? { ...item, abierto: !item.abierto } : item
      )
    );
  }

  textoIngresoCatalogo(atr: CatalogoAtraccionOnline): string {
    const texto = (atr.ingresoTexto || '').trim();
    if (texto && texto.toUpperCase() !== 'AHORA') {
      return texto;
    }
    if (atr.horaProximoIngreso) {
      const m = String(atr.horaProximoIngreso).match(/T(\d{2}:\d{2})/);
      if (m) return `${m[1]} (aprox.)`;
    }
    return 'Próximo turno';
  }

  calcularPrecioDesde(atr: CatalogoAtraccionOnline): number {
    if (this.isPorTiempo(atr)) {
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

  obtenerImagenAtraccion(atr: CatalogoAtraccionOnline): string {
    const nombre = (atr.nombre || '').toLowerCase();
    if (nombre.includes('pelota')) {
      return 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80';
    } else if (nombre.includes('arena')) {
      return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
    } else if (nombre.includes('castillo') || nombre.includes('inflable')) {
      return 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80';
    } else if (nombre.includes('elastica') || nombre.includes('trampolin')) {
      return 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1566454825481-4e48f80aa4d7?auto=format&fit=crop&w=800&q=80';
  }

  onImageError(event: Event, atr: CatalogoAtraccionOnline): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23059669"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="800" height="400" fill="url(%23g)"/><text x="50%" y="50%" font-family="sans-serif" font-size="28" font-weight="900" fill="white" text-anchor="middle" dominant-baseline="middle">Territorio de Niños</text></svg>';
    }
  }
}
