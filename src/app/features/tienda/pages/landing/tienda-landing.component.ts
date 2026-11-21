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
    <div class="min-h-screen bg-slate-50 font-sans flex flex-col selection:bg-emerald-500 selection:text-white scroll-smooth">

      <!-- 1. Top Announcement Bar Ticker -->
      <aside aria-label="Aviso comercial" class="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white text-xs font-semibold py-2 px-4 shadow-inner">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left">
          <div class="flex items-center gap-2">
            <span class="inline-flex h-2 w-2 rounded-full bg-emerald-400 motion-safe:animate-ping"></span>
            <span>🎉 <strong>¡Abierto hoy hasta las 9:00 PM!</strong> • Compra en línea y entra directo sin filas en taquilla</span>
          </div>
          <div class="hidden md:flex items-center gap-4 text-[11px] text-emerald-100">
            <span>💳 Pagos seguros con Nequi, PSE y Tarjeta</span>
            <span class="opacity-40">|</span>
            <a href="https://wa.me/573001234567" target="_blank" rel="noopener noreferrer" class="hover:underline flex items-center gap-1">
              <span>💬 WhatsApp: +57 (300) 123-4567</span>
            </a>
          </div>
        </div>
      </aside>

      <!-- 2. Navbar Comercial Principal -->
      <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <!-- Logo de Marca -->
          <a routerLink="/" class="flex items-center gap-2.5 group">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400 p-0.5 shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform duration-150">
              <div class="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-white">
                <span class="text-xl">🎪</span>
              </div>
            </div>
            <div>
              <span class="block text-lg font-black tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                Territorio de Niños
              </span>
              <span class="block text-[10px] uppercase font-bold tracking-widest text-emerald-600">
                Parque de Aventuras
              </span>
            </div>
          </a>

          <!-- Navegación de Contenido -->
          <nav class="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-600">
            <a href="#atracciones" class="hover:text-emerald-600 transition-colors">Atracciones</a>
            <a href="#como-funciona" class="hover:text-emerald-600 transition-colors">Cómo Funciona</a>
            <a href="#cumpleanos" class="hover:text-emerald-600 transition-colors">Cumpleaños</a>
            <a href="#beneficios" class="hover:text-emerald-600 transition-colors">Por Qué Elegirnos</a>
            <a href="#faq" class="hover:text-emerald-600 transition-colors">Preguntas Frecuentes</a>
            <a href="#ubicacion" class="hover:text-emerald-600 transition-colors">Ubicación</a>
          </nav>

          <!-- Acciones Comerciales -->
          <div class="flex items-center gap-2 sm:gap-3">
            <!-- Botón Mis Boletos -->
            <a
              routerLink="/mis-boletos"
              class="px-3.5 py-2.5 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-white text-slate-700 hover:text-emerald-800 text-xs font-bold transition-[border-color,color,background-color] duration-150 enabled:active:scale-[0.96] flex items-center gap-1.5 shadow-2xs">
              <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
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
              class="px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-semibold transition-[background-color,color] duration-150 enabled:active:scale-[0.96] hidden md:inline-flex items-center gap-1"
              title="Portal de colaboradores y operarios">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Personal</span>
            </a>

            <!-- Cesta de Compras -->
            <button
              type="button"
              (click)="tiendaService.abrirCarrito()"
              class="relative px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/25 transition-[background-color,transform] duration-150 enabled:active:scale-[0.96] flex items-center gap-2"
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

      <!-- 3. Hero Section de Alta Conversión -->
      <section class="relative bg-gradient-to-b from-emerald-50/70 via-teal-50/30 to-slate-50 py-12 sm:py-20 border-b border-slate-200/60 overflow-hidden">
        <!-- Elementos de fondo sutiles -->
        <div class="absolute -top-24 -left-24 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute top-1/2 -right-24 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <!-- Badge de Propuesta de Valor -->
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-emerald-800 text-xs font-extrabold border border-emerald-200 shadow-xs">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>⚡ ENTRADA PRIORITARIA DIGITAL • 100% SEGURO</span>
          </div>

          <!-- Titular Principal -->
          <h1 class="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] sm:leading-[1.12]">
            Donde la diversión <br class="hidden sm:inline" />
            <span class="bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 bg-clip-text text-transparent">
              no hace filas
            </span>
          </h1>

          <!-- Subtítulo Comercial -->
          <p class="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Compra las boletas de tus pequeños mientras vas en camino, entra directo mostrando el código QR en el acceso y regálales un día inolvidable de juegos y risas.
          </p>

          <!-- Botones de Llamado a la Acción -->
          <div class="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#atracciones"
              class="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition-[transform,background-color] duration-150 enabled:active:scale-[0.96] flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <span>Ver Atracciones y Comprar</span>
            </a>

            <a
              href="#cumpleanos"
              class="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-sm border border-slate-200 shadow-xs transition-[transform,background-color] duration-150 enabled:active:scale-[0.96] flex items-center justify-center gap-2">
              <span>🎂 Fiestas y Cumpleaños</span>
            </a>
          </div>

          <!-- Sellos de Confianza Social Proof -->
          <div class="pt-6 border-t border-slate-200/60 max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-slate-600">
            <div class="flex items-center justify-center gap-1.5">
              <span class="text-amber-500 text-sm">★★★★★</span>
              <span>4.9 Calificación</span>
            </div>
            <div class="flex items-center justify-center gap-1.5">
              <span>🛡️</span>
              <span>Operarios Certificados</span>
            </div>
            <div class="flex items-center justify-center gap-1.5">
              <span>🧼</span>
              <span>Higiene Continua</span>
            </div>
            <div class="flex items-center justify-center gap-1.5">
              <span>☕</span>
              <span>Zona Padres con WiFi</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. Vitrina de Atracciones con Filtros Reactivos -->
      <section id="atracciones" class="max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16">
        
        <!-- Encabezado de Sección y Píldoras de Filtro -->
        <div class="space-y-4 mb-8">
          <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span class="text-xs font-black uppercase tracking-widest text-emerald-700 block mb-1">
                Catálogo en Tiempo Real
              </span>
              <h2 class="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Elige la Aventura de Hoy
              </h2>
              <p class="text-xs sm:text-sm text-slate-500 mt-1">
                Boletas individuales válidas durante todo el día. Consulta aforo en vivo y edades recomendadas.
              </p>
            </div>

            <!-- Botón de Recargar Catálogo -->
            <button
              type="button"
              (click)="recargarCatalogo()"
              class="self-start sm:self-auto px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Actualizar Aforo</span>
            </button>
          </div>

          <!-- Píldoras de Filtro Horizontal (Mobile Touch-Friendly) -->
          <div class="flex items-center gap-2 overflow-x-auto pb-2 overscroll-contain no-scrollbar">
            <button
              type="button"
              (click)="filtroActivo.set('TODAS')"
              [class]="filtroActivo() === 'TODAS'
                ? 'bg-slate-900 text-white font-extrabold shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'"
              class="px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-[background-color,color,border-color] duration-150 enabled:active:scale-[0.96]">
              🎪 Todas ({{ totalAtracciones() }})
            </button>

            <button
              type="button"
              (click)="filtroActivo.set('PEQUENOS')"
              [class]="filtroActivo() === 'PEQUENOS'
                ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'"
              class="px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-[background-color,color,border-color] duration-150 enabled:active:scale-[0.96]">
              👶 Pequeños (1 a 4 años)
            </button>

            <button
              type="button"
              (click)="filtroActivo.set('GRANDES')"
              [class]="filtroActivo() === 'GRANDES'
                ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'"
              class="px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-[background-color,color,border-color] duration-150 enabled:active:scale-[0.96]">
              🚀 Grandes (5 a 12 años)
            </button>

            <button
              type="button"
              (click)="filtroActivo.set('TIEMPO')"
              [class]="filtroActivo() === 'TIEMPO'
                ? 'bg-purple-600 text-white font-extrabold shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'"
              class="px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-[background-color,color,border-color] duration-150 enabled:active:scale-[0.96]">
              ⏱️ Por Tiempo
            </button>

            <button
              type="button"
              (click)="filtroActivo.set('CAIDAS')"
              [class]="filtroActivo() === 'CAIDAS'
                ? 'bg-amber-600 text-white font-extrabold shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'"
              class="px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-[background-color,color,border-color] duration-150 enabled:active:scale-[0.96]">
              🎯 Por Caídas / Retos
            </button>
          </div>
        </div>

        <!-- Estado de Carga -->
        @if (tiendaService.cargandoCatalogo()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <div class="rounded-3xl p-6 bg-white border border-slate-200 shadow-xs animate-pulse space-y-4">
                <div class="h-44 bg-slate-200 rounded-2xl w-full"></div>
                <div class="h-6 bg-slate-200 rounded-xl w-3/4"></div>
                <div class="h-4 bg-slate-100 rounded-lg w-full"></div>
                <div class="h-10 bg-slate-200 rounded-2xl w-full"></div>
              </div>
            }
          </div>
        } @else if (atraccionesFiltradas().length === 0) {
          <div class="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs max-w-md mx-auto space-y-3">
            <span class="text-4xl">🔍</span>
            <h3 class="text-base font-extrabold text-slate-800">No hay atracciones para este filtro</h3>
            <p class="text-xs text-slate-500">
              Prueba seleccionando otra categoría o restablece los filtros para ver todo el parque.
            </p>
            <button
              type="button"
              (click)="filtroActivo.set('TODAS')"
              class="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold enabled:active:scale-[0.96]">
              Ver Todas las Atracciones
            </button>
          </div>
        } @else {
          <!-- Grilla de Tarjetas E-Commerce de Producto -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            @for (atr of atraccionesFiltradas(); track atr.id) {
              <div
                class="rounded-[32px] bg-white border border-transparent shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.12)] transition-[box-shadow,transform] duration-200 flex flex-col justify-between overflow-hidden group">

                <div>
                  <!-- Banner Visual Temático con Overlay de Contraste -->
                  <div class="relative h-48 bg-slate-900 overflow-hidden">
                    <img
                      [src]="obtenerImagenAtraccion(atr)"
                      [alt]="atr.nombre"
                      (error)="onImageError($event, atr)"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90" />

                    <!-- Gradiente de Contraste para Badges -->
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>

                    <!-- Badges Flotantes -->
                    <div class="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span
                        [class]="atr.tipoAtraccion === 'TEMPORIZADA'
                          ? 'bg-blue-600/90 text-white'
                          : 'bg-purple-600/90 text-white'"
                        class="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide backdrop-blur-md shadow-xs">
                        {{ atr.tipoAtraccion === 'TEMPORIZADA' ? '⏱️ Por Tiempo' : '🎯 Por Caídas' }}
                      </span>

                      @if (atr.cuposLibres > 0) {
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/90 text-white backdrop-blur-md shadow-xs flex items-center gap-1">
                          <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
                          <span>{{ atr.cuposLibres }} cupos libres</span>
                        </span>
                      } @else {
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/90 text-white backdrop-blur-md shadow-xs">
                          Aforo completo (Entrada diferida)
                        </span>
                      }
                    </div>

                    <!-- Nombre en la base del banner -->
                    <div class="absolute bottom-3 left-4 right-4">
                      <span class="text-[10px] uppercase font-bold tracking-widest text-emerald-300 block mb-0.5">
                        Atracción Oficial
                      </span>
                      <h3 class="text-xl font-black text-white leading-tight drop-shadow-sm">
                        {{ atr.nombre }}
                      </h3>
                    </div>
                  </div>

                  <!-- Cuerpo de la Tarjeta Comercial -->
                  <div class="p-5 space-y-3.5">
                    <!-- Rango de Edad y Capacidad -->
                    <div class="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span class="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-xl">
                        <span>👶</span>
                        <span>{{ atr.edadMinima }} a {{ atr.edadMaxima }} años</span>
                      </span>

                      <span class="text-slate-500 text-[11px]">
                        Máx. {{ atr.capacidadMaxima }} simultáneos
                      </span>
                    </div>

                    <!-- Descripción breve -->
                    <p class="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {{ atr.descripcion || 'Zona interactiva diseñada bajo estrictos protocolos de diversión y seguridad infantil.' }}
                    </p>

                    <!-- Caja de Precios y Opciones -->
                    <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <span class="text-[10px] uppercase font-bold text-slate-400 block">Tarifas desde</span>
                        <span class="text-xl font-black font-mono text-emerald-700 tracking-tight">
                          \${{ calcularPrecioDesde(atr) | number }}
                        </span>
                        <span class="text-[10px] font-bold text-slate-400 ml-1">COP</span>
                      </div>

                      <span class="text-[11px] font-bold text-slate-500">
                        {{ atr.tipoAtraccion === 'TEMPORIZADA' ? (atr.tarifasTiempo.length + ' opciones') : (atr.tarifasEvento.length + ' paquetes') }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Botones de Acción (Normas + Comprar) -->
                <div class="p-5 pt-0 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    (click)="abrirModalNormas(atr)"
                    class="py-3 px-2 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-[background-color,border-color] duration-150 enabled:active:scale-[0.96] flex items-center justify-center gap-1"
                    title="Ver normas y reglas de seguridad">
                    <span>Normas</span>
                  </button>

                  <button
                    type="button"
                    (click)="abrirModalAtraccion(atr)"
                    class="col-span-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-[background-color,transform] duration-150 enabled:active:scale-[0.96] flex items-center justify-center gap-1.5">
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

      <!-- 5. Paso a Paso: Cómo Funciona en 3 Pasos -->
      <section id="como-funciona" class="bg-white py-14 sm:py-20 border-y border-slate-200/80">
        <div class="max-w-6xl mx-auto px-4 sm:px-6">
          <div class="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <span class="text-xs font-black uppercase tracking-widest text-emerald-700">Sin Esperas</span>
            <h2 class="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              ¿Cómo Comprar y Entrar en 3 Pasos?
            </h2>
            <p class="text-xs sm:text-sm text-slate-500">
              Diseñado para que los padres compren desde el carro o el transporte antes de llegar
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Paso 1 -->
            <div class="p-6 rounded-[28px] bg-slate-50 border border-slate-200/70 space-y-3 relative">
              <span class="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-base flex items-center justify-center shadow-xs">
                1
              </span>
              <h3 class="text-base font-extrabold text-slate-900">Elige la atracción y niño</h3>
              <p class="text-xs text-slate-600 leading-relaxed">
                Selecciona el tiempo o caídas, escribe el nombre de tu hijo y nuestro sistema verificará su edad en tiempo real.
              </p>
            </div>

            <!-- Paso 2 -->
            <div class="p-6 rounded-[28px] bg-slate-50 border border-slate-200/70 space-y-3 relative">
              <span class="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 font-black text-base flex items-center justify-center shadow-xs">
                2
              </span>
              <h3 class="text-base font-extrabold text-slate-900">Paga seguro sin registro</h3>
              <p class="text-xs text-slate-600 leading-relaxed">
                Usa Nequi, PSE o tu tarjeta de débito/crédito sin necesidad de crear contraseñas ni llenar formularios eternos.
              </p>
            </div>

            <!-- Paso 3 -->
            <div class="p-6 rounded-[28px] bg-slate-50 border border-slate-200/70 space-y-3 relative">
              <span class="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 font-black text-base flex items-center justify-center shadow-xs">
                3
              </span>
              <h3 class="text-base font-extrabold text-slate-900">Muestra el QR y ¡a jugar!</h3>
              <p class="text-xs text-slate-600 leading-relaxed">
                Al llegar, abre la pantalla "Mis Boletos", el operario escaneará el código en segundos y tu hijo empezará a divertirse.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 6. Sección Especial de Fiestas y Cumpleaños -->
      <section id="cumpleanos" class="py-14 sm:py-20 bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-950 text-white relative overflow-hidden">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div class="max-w-3xl space-y-4 mb-10">
            <span class="inline-block px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider">
              🎉 Planes de Fiesta Exclusivos
            </span>
            <h2 class="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              ¡Celebra el Cumpleaños de tus Pequeños con Nosotros!
            </h2>
            <p class="text-sm sm:text-base text-slate-300 leading-relaxed">
              Reserva una zona temática privada con anfitrión de juegos, torta, sorpresas personalizadas y acceso a las mejores atracciones del parque.
            </p>
          </div>

          <!-- Cards de Planes de Fiesta -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-slate-900">
            <!-- Plan 1 -->
            <div class="p-6 rounded-[32px] bg-white space-y-4 flex flex-col justify-between shadow-xl">
              <div class="space-y-2">
                <span class="text-xs font-black uppercase tracking-wider text-purple-700 block">Plan Aventurero</span>
                <h3 class="text-xl font-black text-slate-900">Hasta 10 niños</h3>
                <p class="text-xs text-slate-500">2 horas de diversión guiada + espacio decorado.</p>
                <ul class="text-xs text-slate-600 space-y-1.5 pt-2">
                  <li>✓ 2 atracciones incluidas</li>
                  <li>✓ Invitaciones digitales</li>
                  <li>✓ Anfitrión de dinámicas</li>
                </ul>
              </div>
              <a
                href="https://wa.me/573001234567?text=Hola,%20deseo%20cotizar%20el%20Plan%20Aventurero%20para%20un%20cumplea%C3%B1os"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs text-center transition-colors enabled:active:scale-[0.96]">
                Cotizar Plan Aventurero
              </a>
            </div>

            <!-- Plan 2 (Destacado) -->
            <div class="p-6 rounded-[32px] bg-gradient-to-b from-amber-50 to-white border-2 border-amber-400 space-y-4 flex flex-col justify-between shadow-2xl relative">
              <span class="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-widest shadow-sm">
                Más Elegido
              </span>
              <div class="space-y-2">
                <span class="text-xs font-black uppercase tracking-wider text-amber-700 block">Plan Mágico VIP</span>
                <h3 class="text-xl font-black text-slate-900">Hasta 20 niños</h3>
                <p class="text-xs text-slate-500">3 horas con todas las atracciones liberadas.</p>
                <ul class="text-xs text-slate-600 space-y-1.5 pt-2">
                  <li>✓ Acceso a todas las atracciones</li>
                  <li>✓ Torta temática y refrigerios</li>
                  <li>✓ Animación y fotografías</li>
                  <li>✓ Salón privado de piñata</li>
                </ul>
              </div>
              <a
                href="https://wa.me/573001234567?text=Hola,%20deseo%20cotizar%20el%20Plan%20M%C3%A1gico%20VIP%20para%20un%20cumplea%C3%B1os"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs text-center shadow-md transition-colors enabled:active:scale-[0.96]">
                Cotizar Plan VIP por WhatsApp
              </a>
            </div>

            <!-- Plan 3 -->
            <div class="p-6 rounded-[32px] bg-white space-y-4 flex flex-col justify-between shadow-xl">
              <div class="space-y-2">
                <span class="text-xs font-black uppercase tracking-wider text-blue-700 block">Plan Personalizado</span>
                <h3 class="text-xl font-black text-slate-900">Eventos Escolares</h3>
                <p class="text-xs text-slate-500">Para colegios, jardines y grupos grandes (+30 niños).</p>
                <ul class="text-xs text-slate-600 space-y-1.5 pt-2">
                  <li>✓ Tarifas grupales especiales</li>
                  <li>✓ Coordinador operativo asignado</li>
                  <li>✓ Horarios matutinos exclusivos</li>
                </ul>
              </div>
              <a
                href="https://wa.me/573001234567?text=Hola,%20deseo%20cotizar%20un%20evento%20escolar%20o%20grupal"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs text-center transition-colors enabled:active:scale-[0.96]">
                Consultar Grupo Escolar
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- 7. Pilares de Confianza / Por Qué Elegirnos -->
      <section id="beneficios" class="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div class="text-center max-w-2xl mx-auto space-y-2 mb-12">
          <span class="text-xs font-black uppercase tracking-widest text-emerald-700">Tranquilidad Total</span>
          <h2 class="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            ¿Por Qué las Familias Nos Eligen?
          </h2>
          <p class="text-xs sm:text-sm text-slate-500">
            Diseñamos cada rincón pensando tanto en la felicidad de los niños como en la paz mental de los papás.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="p-6 rounded-[28px] bg-white border border-slate-200/80 shadow-xs space-y-2">
            <span class="text-3xl block mb-2">🛡️</span>
            <h3 class="text-base font-extrabold text-slate-900">Seguridad Certificada</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Operarios capacitados en cada atracción, superficies acolchadas y botiquín de primeros auxilios.
            </p>
          </div>

          <div class="p-6 rounded-[28px] bg-white border border-slate-200/80 shadow-xs space-y-2">
            <span class="text-3xl block mb-2">🧼</span>
            <h3 class="text-base font-extrabold text-slate-900">Higiene Continua</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Desinfección profunda permanente de pelotas, toboganes y colchonetas con productos inocuos.
            </p>
          </div>

          <div class="p-6 rounded-[28px] bg-white border border-slate-200/80 shadow-xs space-y-2">
            <span class="text-3xl block mb-2">☕</span>
            <h3 class="text-base font-extrabold text-slate-900">Zona de Padres Cómoda</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Cafetería con snacks, mesas con enchufes, WiFi de alta velocidad y vista clara hacia los niños.
            </p>
          </div>

          <div class="p-6 rounded-[28px] bg-white border border-slate-200/80 shadow-xs space-y-2">
            <span class="text-3xl block mb-2">🎟️</span>
            <h3 class="text-base font-extrabold text-slate-900">Boletas Válidas Todo el Día</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Tus compras online no tienen horario fijo estricto: puedes llegar a cualquier hora del día y redimir.
            </p>
          </div>
        </div>
      </section>

      <!-- 8. Preguntas Frecuentes (FAQ Accordion) -->
      <section id="faq" class="bg-slate-100/70 py-14 sm:py-20 border-t border-slate-200">
        <div class="max-w-4xl mx-auto px-4 sm:px-6">
          <div class="text-center space-y-2 mb-10">
            <span class="text-xs font-black uppercase tracking-widest text-emerald-700">Dudas Comunes</span>
            <h2 class="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p class="text-xs sm:text-sm text-slate-500">
              Respuestas rápidas para que tu visita sea perfecta y sin contratiempos
            </p>
          </div>

          <div class="space-y-3">
            @for (faq of faqs(); track faq.pregunta; let i = $index) {
              <div class="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  (click)="toggleFaq(i)"
                  class="w-full p-4 sm:p-5 text-left font-extrabold text-sm text-slate-900 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <span>{{ faq.pregunta }}</span>
                  <span class="text-slate-400 font-mono text-base transform transition-transform duration-150" [class.rotate-180]="faq.abierto">
                    ▼
                  </span>
                </button>
                @if (faq.abierto) {
                  <div class="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {{ faq.respuesta }}
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </section>

      <!-- 9. Ubicación, Horarios y Contacto Directo -->
      <section id="ubicacion" class="bg-white py-14 sm:py-20 border-t border-slate-200">
        <div class="max-w-6xl mx-auto px-4 sm:px-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
            <!-- Información de Llegada y Horarios -->
            <div class="space-y-5">
              <span class="text-xs font-black uppercase tracking-widest text-emerald-700 block">Visítanos Hoy</span>
              <h2 class="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                ¿Dónde Estamos y Cuáles son los Horarios?
              </h2>
              
              <div class="space-y-3 text-xs text-slate-600">
                <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong class="font-extrabold text-slate-900 block text-sm">📍 Ubicación del Parque</strong>
                  <p>Parque Infantil Territorio de Niños • Calle Principal de Atracciones, Cali, Valle del Cauca.</p>
                  <div class="pt-2 flex items-center gap-2">
                    <a
                      href="https://maps.google.com/?q=Territorio+de+Ninos"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors">
                      Abrir en Google Maps ↗
                    </a>
                  </div>
                </div>

                <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong class="font-extrabold text-slate-900 block text-sm">⏰ Horarios de Atención</strong>
                  <p><strong>Lunes a Viernes:</strong> 1:00 PM – 8:00 PM</p>
                  <p><strong>Sábados, Domingos y Festivos:</strong> 10:00 AM – 9:00 PM</p>
                </div>
              </div>

              <!-- Botón WhatsApp -->
              <a
                href="https://wa.me/573001234567?text=Hola,%20tengo%20una%20consulta%20sobre%20las%20boletas%20del%20parque"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md transition-colors enabled:active:scale-[0.96]">
                <span>💬 Escríbenos por WhatsApp si vienes en camino</span>
              </a>
            </div>

            <!-- Banner Visual del Parque -->
            <div class="rounded-[36px] bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-700 p-8 text-white shadow-xl flex flex-col justify-between min-h-[300px]">
              <div class="space-y-2">
                <span class="text-4xl">🎪</span>
                <h3 class="text-2xl font-black">¡Te esperamos para vivir un día mágico!</h3>
                <p class="text-xs text-emerald-100 leading-relaxed">
                  Recuerda traer calcetines para los pequeños. Si no tienes, también disponemos de calcetines antideslizantes oficiales en la entrada.
                </p>
              </div>

              <div class="pt-4 border-t border-white/20 flex items-center justify-between text-xs font-bold">
                <span>Parqueadero disponible</span>
                <span>Zonas climatizadas</span>
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
            class="px-5 py-3.5 rounded-full bg-emerald-600 text-white font-black text-sm shadow-2xl shadow-emerald-600/50 flex items-center gap-2.5 enabled:active:scale-[0.96] transition-[transform,background-color] duration-150 motion-safe:animate-bounce">
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

      <!-- 11. Footer Comercial E-Commerce Completo -->
      <footer class="bg-slate-950 text-slate-400 py-12 text-xs border-t border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          
          <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
            <!-- Columna 1: Marca -->
            <div class="space-y-3 md:col-span-1">
              <div class="flex items-center gap-2 text-white font-black text-base">
                <span>🎪</span>
                <span>Territorio de Niños</span>
              </div>
              <p class="text-xs text-slate-500 leading-relaxed">
                Parque de diversiones y entretenimiento familiar. Creamos experiencias mágicas, seguras e inolvidables para los más pequeños.
              </p>
              <div class="text-[11px] text-slate-500">
                <span>Cali, Colombia • Nit: 900.123.456-7</span>
              </div>
            </div>

            <!-- Columna 2: Navegación -->
            <div class="space-y-2">
              <strong class="text-white font-bold block text-xs uppercase tracking-wider">Explorar</strong>
              <ul class="space-y-1.5 text-slate-400">
                <li><a href="#atracciones" class="hover:text-emerald-400 transition-colors">Atracciones y Tarifas</a></li>
                <li><a routerLink="/mis-boletos" class="hover:text-emerald-400 transition-colors">Mis Boletos Digitales</a></li>
                <li><a href="#cumpleanos" class="hover:text-emerald-400 transition-colors">Fiestas y Cumpleaños</a></li>
                <li><a href="#como-funciona" class="hover:text-emerald-400 transition-colors">Cómo Funciona</a></li>
              </ul>
            </div>

            <!-- Columna 3: Medios de Pago -->
            <div class="space-y-2">
              <strong class="text-white font-bold block text-xs uppercase tracking-wider">Medios de Pago Aceptados</strong>
              <p class="text-xs text-slate-500">Transacciones 100% cifradas:</p>
              <div class="flex flex-wrap gap-2 text-white text-[11px] font-bold">
                <span class="px-2 py-1 rounded-md bg-slate-800 border border-slate-700">🟣 Nequi</span>
                <span class="px-2 py-1 rounded-md bg-slate-800 border border-slate-700">🔵 PSE</span>
                <span class="px-2 py-1 rounded-md bg-slate-800 border border-slate-700">💳 Visa / Mastercard</span>
                <span class="px-2 py-1 rounded-md bg-slate-800 border border-slate-700">🟡 Bancolombia</span>
              </div>
            </div>

            <!-- Columna 4: Legal & Personal -->
            <div class="space-y-2">
              <strong class="text-white font-bold block text-xs uppercase tracking-wider">Enlaces & Colaboradores</strong>
              <ul class="space-y-1.5 text-slate-400">
                <li><a routerLink="/login" class="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">🔐 Acceso Colaboradores</a></li>
                <li><span class="text-slate-600">Términos y Condiciones</span></li>
                <li><span class="text-slate-600">Política de Tratamiento de Datos</span></li>
                <li><span class="text-slate-600">Reglamento Interno de Seguridad</span></li>
              </ul>
            </div>
          </div>

          <!-- Bottom Copyright -->
          <div class="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <span>© 2026 Territorio de Niños S.A.S. Todos los derechos reservados.</span>
            <div class="flex items-center gap-3">
              <span>Hecho con ❤️ para las familias</span>
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

  readonly totalAtracciones = computed(() => this.tiendaService.catalogo().length);

  readonly atraccionesFiltradas = computed(() => {
    const list = this.tiendaService.catalogo();
    const filtro = this.filtroActivo();

    switch (filtro) {
      case 'PEQUENOS':
        return list.filter((a) => (a.edadMinima ?? 0) <= 3);
      case 'GRANDES':
        return list.filter((a) => (a.edadMaxima ?? 99) >= 6);
      case 'TIEMPO':
        return list.filter((a) => a.tipoAtraccion === 'TEMPORIZADA');
      case 'CAIDAS':
        return list.filter((a) => a.tipoAtraccion === 'EVENTOS_CAIDAS');
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
    // Imagen representativa de parque infantil por defecto
    return 'https://images.unsplash.com/photo-1566454825481-4e48f80aa4d7?auto=format&fit=crop&w=800&q=80';
  }

  onImageError(event: Event, atr: CatalogoAtraccionOnline): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      // Fallback a un gradiente SVG embebido si no hay conexión a internet
      imgElement.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23059669"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="800" height="400" fill="url(%23g)"/><text x="50%" y="50%" font-family="sans-serif" font-size="28" font-weight="900" fill="white" text-anchor="middle" dominant-baseline="middle">Territorio de Niños</text></svg>';
    }
  }
}
