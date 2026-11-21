import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
  output,
  signal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { OperacionService } from '../../../../core/services/operacion.service';
import { SoundNotificationService } from '../../../../core/services/sound-notification.service';

@Component({
  selector: 'app-scanner-qr',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative w-full max-w-md mx-auto flex flex-col items-center">
      <!-- Visor de Cámara Protagonista y Retícula Limpia (HU-25.05, HU-25.07) -->
      <div class="relative w-full aspect-square max-h-[56dvh] bg-slate-950 rounded-[20px] overflow-hidden shadow-lg border border-slate-800 flex items-center justify-center">
        <!-- Elemento Video para Escaneo Óptico -->
        <video
          #videoElement
          data-testid="scanner-video-feed"
          class="w-full h-full object-cover"
          autoplay
          muted
          playsinline
          webkit-playsinline></video>

        @if (camaraActiva()) {
          <!-- Botón Flotante 44×44 para Alternar Cámara -->
          <button
            type="button"
            data-testid="btn-alternar-camara"
            (click)="alternarCamara()"
            class="absolute top-3 right-3 z-20 w-11 h-11 rounded-full bg-slate-950/75 hover:bg-slate-900 text-white border border-white/15 shadow-md backdrop-blur-xs transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer flex items-center justify-center"
            [title]="modoCamaraTrasera() ? 'Cambiar a cámara frontal' : 'Cambiar a cámara trasera'"
            [attr.aria-label]="modoCamaraTrasera() ? 'Cambiar a cámara frontal' : 'Cambiar a cámara trasera'">
            <svg class="w-5 h-5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        }

        <!-- Retícula Óptica sin Obstáculos en el Centro (HU-25.07 / Notion: SCRUM-399) -->
        <div
          data-testid="reticula-encuadre-qr"
          class="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-8">
          <div class="relative w-3/4 aspect-square rounded-2xl bg-emerald-500/5">
            <!-- Esquinas de Guía Óptica -->
            <span class="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></span>
            <span class="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></span>
            <span class="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></span>
            <span class="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></span>

            <!-- Línea Láser de Escaneo Activo -->
            @if (operacionService.escanerDesbloqueado() && camaraActiva()) {
              <div class="absolute inset-x-3 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent motion-safe:animate-pulse shadow-[0_0_8px_#34d399]"></div>
            }
          </div>
        </div>

        <!-- Píldora Informativa debajo de la Retícula (Centro Libre) -->
        @if (camaraActiva() && operacionService.escanerDesbloqueado()) {
          <div class="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none px-4">
            <p class="text-[11px] font-bold text-white/95 bg-slate-950/75 border border-white/10 backdrop-blur-xs px-3 py-1 rounded-full">
              Enfoca el QR del boleto
            </p>
          </div>
        }

        <!-- Mensaje de Estado / Permiso de Cámara y Fallback Nativo -->
        @if (!camaraActiva()) {
          <div class="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-5 text-center text-white z-10 space-y-3 overflow-y-auto overscroll-contain">
            <svg class="w-11 h-11 op-icon text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p class="text-xs text-slate-300 font-medium max-w-xs leading-relaxed">
              {{ mensajeErrorCamara() || 'Cámara en espera o no disponible.' }}
            </p>

            <div class="flex flex-col sm:flex-row items-center gap-2 pt-1 w-full max-w-xs">
              <!-- Botón Fallback Nativo Móvil -->
              <button
                type="button"
                data-testid="btn-capturar-foto-qr"
                (click)="fileInput.click()"
                [disabled]="procesandoFoto()"
                class="w-full min-h-[44px] ps-3.5 pe-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer flex items-center justify-center gap-2 shadow-xs">
                @if (procesandoFoto()) {
                  <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full motion-safe:animate-spin"></span>
                  <span>Leyendo QR...</span>
                } @else {
                  <svg class="w-4 h-4 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Tomar Foto del QR</span>
                }
              </button>

              <!-- Botón Reintentar Streaming en Vivo -->
              <button
                type="button"
                data-testid="btn-reintentar-camara"
                (click)="reintentarCamara()"
                [disabled]="iniciandoCamara()"
                class="w-full min-h-[44px] px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-100 border border-slate-700 font-bold text-xs rounded-xl transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer flex items-center justify-center gap-2">
                @if (iniciandoCamara()) {
                  <span class="inline-block w-3 h-3 border-2 border-slate-300 border-t-transparent rounded-full motion-safe:animate-spin"></span>
                  <span>Iniciando...</span>
                } @else {
                  <span>Reintentar en Vivo</span>
                }
              </button>
            </div>

            @if (permisoDenegado()) {
              <div class="flex flex-col gap-2 w-full max-w-xs pt-1">
                <button
                  type="button"
                  data-testid="btn-abrir-ajustes-android"
                  (click)="abrirAjustesDispositivo()"
                  class="w-full min-h-[44px] ps-3.5 pe-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5">
                  <svg class="w-4 h-4 op-icon text-slate-950 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Abrir Ajustes de Android</span>
                </button>

                <button
                  type="button"
                  data-testid="btn-abrir-guia-permisos"
                  (click)="mostrarGuiaPermisos.set(true)"
                  class="min-h-[36px] text-xs font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer inline-flex items-center justify-center gap-1 transition-colors duration-150 ease-out">
                  <svg class="w-4 h-4 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Ver pasos para activar en Chrome</span>
                </button>
              </div>
            }
          </div>
        }

        <!-- Input nativo oculto para escaneo por foto móvil -->
        <input
          #fileInput
          type="file"
          accept="image/*"
          capture="environment"
          (change)="onFileCaptured($event)"
          class="hidden" />

        <!-- Bloqueo por Aforo Completo (HU-34.05 / Notion: CA-02) -->
        @if (!operacionService.escanerDesbloqueado() && operacionService.aforoCompleto()) {
          <div
            data-testid="overlay-aforo-completo"
            class="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-5 text-center z-20">
            <div class="w-12 h-12 rounded-xl bg-red-950 text-red-400 border border-red-700 flex items-center justify-center mb-3">
              <svg class="w-7 h-7 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-base font-extrabold text-white mb-1">AFORO COMPLETO</h3>
            <p class="text-xs text-slate-300 max-w-xs mb-4 leading-relaxed">
              Capacidad máxima alcanzada (<span class="font-mono tabular-nums font-bold">{{ operacionService.capacidadMaxima() }}/{{ operacionService.capacidadMaxima() }}</span>). Se desbloqueará al confirmar una salida.
            </p>
            <button
              type="button"
              data-testid="btn-abrir-override-supervisor"
              (click)="operacionService.modalAforoCompletoAbierto.set(true)"
              class="min-h-[44px] px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
              Ingreso Forzado (Supervisor)
            </button>
          </div>
        }
      </div>

      <!-- Barra Compacta de Acciones de Contingencia (Progressive Disclosure) -->
      <div class="grid grid-cols-2 gap-2.5 mt-3 w-full">
        <button
          type="button"
          data-testid="btn-abrir-contingencia-manual"
          (click)="abrirContingenciaManual()"
          class="min-h-[48px] ps-3.5 pe-4 rounded-[14px] bg-white surface-card hover:bg-slate-50 text-slate-800 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition-[transform,background-color,box-shadow] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
          <svg class="w-4 h-4 op-icon text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Código manual</span>
        </button>

        <button
          type="button"
          data-testid="btn-foto-contingencia"
          (click)="fileInput.click()"
          [disabled]="procesandoFoto()"
          class="min-h-[48px] ps-3.5 pe-4 rounded-[14px] bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
          <svg class="w-4 h-4 op-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{{ procesandoFoto() ? 'Leyendo...' : 'Foto QR' }}</span>
        </button>
      </div>

      <!-- Bottom Sheet: Digitación Manual en Contingencia (HU-25.05 / Notion: CA-04) -->
      @if (mostrarContingenciaManual()) {
        <div
          data-testid="modal-contingencia-manual"
          (click)="onBackdropClick($event)"
          class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 op-backdrop-enter cursor-pointer">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-contingencia-manual"
            (click)="$event.stopPropagation()"
            class="bg-white rounded-t-[28px] sm:rounded-[28px] max-w-md w-full p-4 pb-sheet-safe max-h-[90dvh] overflow-y-auto overscroll-contain shadow-2xl border border-slate-200 op-sheet-enter cursor-default space-y-3">
            <div class="w-10 h-1 rounded-full bg-slate-300 mx-auto sm:hidden" aria-hidden="true"></div>

            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 id="titulo-contingencia-manual" class="text-base font-extrabold text-slate-900">
                  Ingresar código del boleto
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  Usa el código impreso si el QR está deteriorado o sin cámara.
                </p>
              </div>
              <button
                type="button"
                (click)="cerrarContingenciaManual()"
                aria-label="Cerrar ingreso manual"
                class="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer shrink-0">
                <svg class="w-5 h-5 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <label for="inputContingencia" class="block text-xs font-bold text-slate-700 mb-1.5">
                Código corto o UUID del ticket
              </label>
              <input
                id="inputContingencia"
                data-testid="input-contingencia-uuid"
                type="text"
                [(ngModel)]="codigoManual"
                (keydown.enter)="validarCodigoManual()"
                placeholder="Ej: BOL-1234 o UUID"
                class="w-full min-h-[48px] px-3.5 text-base font-mono uppercase border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div class="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                (click)="cerrarContingenciaManual()"
                class="min-h-[48px] px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                data-testid="btn-validar-uuid-manual"
                (click)="validarCodigoManual()"
                [disabled]="!codigoManual.trim()"
                class="min-h-[48px] px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-extrabold rounded-xl transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
                Validar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Bottom Sheet: Advertencia AFORO COMPLETO y Override Supervisor (HU-34.05 / Notion: CA-02, CA-04) -->
      @if (operacionService.modalAforoCompletoAbierto()) {
        <div
          data-testid="modal-aforo-completo"
          (click)="onBackdropClick($event)"
          class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 op-backdrop-enter cursor-pointer">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-aforo-completo"
            (click)="$event.stopPropagation()"
            class="bg-white rounded-t-[28px] sm:rounded-[28px] max-w-md w-full p-4 pb-sheet-safe max-h-[90dvh] overflow-y-auto overscroll-contain shadow-2xl border border-red-200 text-center op-sheet-enter cursor-default space-y-4">
            <div class="w-10 h-1 rounded-full bg-slate-300 mx-auto sm:hidden" aria-hidden="true"></div>

            <div>
              <div class="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <svg class="w-7 h-7 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 id="titulo-aforo-completo" class="text-lg font-black text-slate-900">Capacidad Máxima Alcanzada</h3>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                No hay cupos disponibles (<span class="font-mono tabular-nums font-bold">{{ operacionService.ocupacionActual() }}/{{ operacionService.capacidadMaxima() }}</span>). El ingreso forzado requiere PIN de supervisor.
              </p>
            </div>

            <div class="text-left">
              <label for="inputPinSupervisor" class="block text-xs font-bold text-slate-700 mb-1.5">
                PIN de Supervisor / Administrador
              </label>
              <input
                id="inputPinSupervisor"
                type="password"
                [(ngModel)]="pinSupervisor"
                autocomplete="off"
                placeholder="Ingresa PIN de autorización"
                class="w-full min-h-[48px] px-3.5 text-center text-base font-mono tracking-widest border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                (click)="operacionService.cerrarModalAforoCompleto()"
                class="w-full min-h-[48px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                data-testid="btn-ingreso-forzado-supervisor"
                [disabled]="autorizandoSupervisor()"
                (click)="autorizarSupervisor()"
                class="w-full min-h-[48px] bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-sm rounded-xl transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] shadow-xs cursor-pointer">
                {{ autorizandoSupervisor() ? 'Verificando...' : 'Permitir Ingreso' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Bottom Sheet: Guía Paso a Paso para Habilitar Permisos de Cámara en Android -->
      @if (mostrarGuiaPermisos()) {
        <div
          data-testid="modal-guia-permisos-camara"
          (click)="onBackdropClick($event)"
          class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 op-backdrop-enter cursor-pointer">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-guia-permisos"
            (click)="$event.stopPropagation()"
            class="bg-white rounded-t-[28px] sm:rounded-[28px] max-w-md w-full p-4 pb-sheet-safe max-h-[90dvh] overflow-y-auto overscroll-contain shadow-2xl border border-slate-200 text-slate-800 op-sheet-enter cursor-default space-y-4">
            <div class="w-10 h-1 rounded-full bg-slate-300 mx-auto sm:hidden" aria-hidden="true"></div>

            <div class="text-center">
              <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
                <svg class="w-6 h-6 op-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 id="titulo-guia-permisos" class="text-base font-black text-slate-900">
                Habilitar Cámara en Android
              </h3>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                El navegador bloqueó el acceso a la cámara. Sigue estos 3 pasos para activarlo en Chrome:
              </p>
            </div>

            <ol class="space-y-2.5 text-xs">
              <li class="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span class="w-5 h-5 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5 tabular-nums">1</span>
                <div>
                  <strong class="text-slate-900">Toca el candado o ajustes del sitio:</strong>
                  <p class="text-slate-500 text-[11px] mt-0.5 leading-snug">
                    En la barra superior de Chrome (junto a la dirección web), toca el ícono de candado o controles del sitio.
                  </p>
                </div>
              </li>
              <li class="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span class="w-5 h-5 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5 tabular-nums">2</span>
                <div>
                  <strong class="text-slate-900">Abre Permisos y Cámara:</strong>
                  <p class="text-slate-500 text-[11px] mt-0.5 leading-snug">
                    Selecciona "Permisos", entra a "Cámara" y cámbialo a <strong>"Permitir"</strong>.
                  </p>
                </div>
              </li>
              <li class="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span class="w-5 h-5 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5 tabular-nums">3</span>
                <div>
                  <strong class="text-slate-900">Toca "Reintentar":</strong>
                  <p class="text-slate-500 text-[11px] mt-0.5 leading-snug">
                    Pulsa el botón verde abajo para activar el escáner de inmediato.
                  </p>
                </div>
              </li>
            </ol>

            <div class="space-y-2">
              <button
                type="button"
                data-testid="btn-guia-abrir-ajustes"
                (click)="abrirAjustesDispositivo()"
                class="w-full min-h-[48px] ps-3.5 pe-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer flex items-center justify-center gap-2">
                <svg class="w-4 h-4 op-icon text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Abrir Ajustes de la App</span>
              </button>

              <button
                type="button"
                data-testid="btn-guia-reintentar"
                (click)="reintentarTrasGuia()"
                class="w-full min-h-[48px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer flex items-center justify-center">
                <span>¡Listo, ya lo permití! Reintentar</span>
              </button>

              <button
                type="button"
                data-testid="btn-guia-cerrar"
                (click)="cerrarGuiaPermisos()"
                class="w-full min-h-[44px] px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-[transform,background-color] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] cursor-pointer">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ScannerQrComponent implements OnInit, OnDestroy {
  operacionService = inject(OperacionService);
  soundService = inject(SoundNotificationService);
  private destroyRef = inject(DestroyRef);

  codigoDetectado = output<string>();

  videoRef = viewChild<ElementRef<HTMLVideoElement>>('videoElement');

  codigoManual = '';
  pinSupervisor = '';
  camaraActiva = signal<boolean>(false);
  iniciandoCamara = signal<boolean>(false);
  procesandoFoto = signal<boolean>(false);
  mensajeErrorCamara = signal<string | null>(null);
  autorizandoSupervisor = signal<boolean>(false);
  permisoDenegado = signal<boolean>(false);
  mostrarGuiaPermisos = signal<boolean>(false);
  mostrarContingenciaManual = signal<boolean>(false);
  modoCamaraTrasera = signal<boolean>(true);
  dispositivoCamaraActivoId = signal<string | null>(null);
  hayMultiplesCamaras = signal<boolean>(false);

  private codeReader: BrowserMultiFormatReader | null = null;
  private scannerControls: { stop: () => void } | null = null;
  private scanningStream: MediaStream | null = null;
  private ultimoCodigoLeido = '';
  private ultimoScanTimestamp = 0;

  ngOnInit(): void {
    this.iniciarCamara();
  }

  ngOnDestroy(): void {
    this.detenerCamara();
  }

  abrirContingenciaManual(): void {
    this.mostrarContingenciaManual.set(true);
  }

  cerrarContingenciaManual(): void {
    this.mostrarContingenciaManual.set(false);
  }

  esContextoInseguro(): boolean {
    if (typeof window === 'undefined') return false;
    if (window.isSecureContext === false) return true;
    const isHttp = window.location.protocol === 'http:';
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return isHttp && !isLocal;
  }

  async iniciarCamara(): Promise<void> {
    this.detenerCamara();
    this.iniciandoCamara.set(true);
    this.mensajeErrorCamara.set(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.camaraActiva.set(false);
      this.iniciandoCamara.set(false);
      this.permisoDenegado.set(true);
      this.mensajeErrorCamara.set(
        this.esContextoInseguro()
          ? 'En Android, Chrome bloquea la cámara sobre HTTP (dirección IP). Abre la app mediante HTTPS (ej. npm run start:ssl) o usa el botón "Tomar Foto del QR".'
          : 'Cámara en espera o no soportada en este entorno.'
      );
      return;
    }

    try {
      this.codeReader = new BrowserMultiFormatReader();

      let stream: MediaStream;
      const trasera = this.modoCamaraTrasera();
      const targetFacing: 'environment' | 'user' = trasera ? 'environment' : 'user';

      if (this.dispositivoCamaraActivoId()) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: this.dispositivoCamaraActivoId()! } },
            audio: false
          });
        } catch {
          this.dispositivoCamaraActivoId.set(null);
          stream = await this.obtenerStreamPorFacingMode(targetFacing);
        }
      } else {
        stream = await this.obtenerStreamPorFacingMode(targetFacing);
      }

      if (navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          this.hayMultiplesCamaras.set(videoDevices.length > 1);

          const currentTrack = stream.getVideoTracks()[0];
          const currentSettings = currentTrack?.getSettings?.() || {};
          const currentFacing = currentSettings.facingMode;
          const currentDeviceId = currentSettings.deviceId;

          if (currentDeviceId) {
            this.dispositivoCamaraActivoId.set(currentDeviceId);
          }

          if (trasera && currentFacing === 'user' && videoDevices.length > 1) {
            const rearDevice =
              videoDevices.find(d => {
                const lbl = (d.label || '').toLowerCase();
                return (
                  lbl.includes('back') ||
                  lbl.includes('rear') ||
                  lbl.includes('traser') ||
                  lbl.includes('environment')
                );
              }) || videoDevices.find(d => d.deviceId !== currentDeviceId);

            if (rearDevice && rearDevice.deviceId !== currentDeviceId) {
              currentTrack.stop();
              stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: rearDevice.deviceId } },
                audio: false
              });
              this.dispositivoCamaraActivoId.set(rearDevice.deviceId);
            }
          }
        } catch (errEnumerate) {
          console.warn('Aviso enumerando dispositivos de cámara:', errEnumerate);
        }
      }

      this.scanningStream = stream;
      const video = this.videoRef()?.nativeElement;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        await video.play().catch(e => console.warn('Autoplay video aviso:', e));
      }

      this.camaraActiva.set(true);
      this.mensajeErrorCamara.set(null);
      this.permisoDenegado.set(false);
      this.mostrarGuiaPermisos.set(false);
      await this.iniciarDecodificacionContinua();
    } catch (err: unknown) {
      this.camaraActiva.set(false);
      const errorObj = err as { name?: string; message?: string };
      if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
        this.permisoDenegado.set(true);
        this.mensajeErrorCamara.set(
          'Permiso de cámara denegado. Toca "Abrir Ajustes de Android" o permite el acceso en el candado de la URL.'
        );
      } else if (errorObj?.name === 'NotFoundError' || errorObj?.name === 'DevicesNotFoundError') {
        this.mensajeErrorCamara.set('No se encontró ninguna cámara disponible en este dispositivo.');
      } else if (errorObj?.name === 'NotReadableError' || errorObj?.name === 'TrackStartError') {
        this.mensajeErrorCamara.set('La cámara está en uso por otra app o bloqueada por el sistema operativo.');
      } else {
        this.mensajeErrorCamara.set(errorObj?.message || 'No fue posible acceder a la cámara del dispositivo.');
      }
    } finally {
      this.iniciandoCamara.set(false);
    }
  }

  private async obtenerStreamPorFacingMode(facing: 'environment' | 'user'): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: facing } },
        audio: false
      });
    } catch {
      // Ignorar si el dispositivo no soporta 'exact'
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing } },
        audio: false
      });
    } catch {
      // Ignorar e ir a fallback
    }

    return await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });
  }

  async alternarCamara(): Promise<void> {
    if (this.iniciandoCamara()) return;

    if (navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');

        if (videoDevices.length > 1) {
          const currentId = this.dispositivoCamaraActivoId();
          const currentIndex = videoDevices.findIndex(d => d.deviceId === currentId);
          const nextIndex = (currentIndex + 1) % videoDevices.length;
          const nextDevice = videoDevices[nextIndex];

          this.dispositivoCamaraActivoId.set(nextDevice.deviceId);
          const lbl = (nextDevice.label || '').toLowerCase();
          const esTrasera = !(lbl.includes('front') || lbl.includes('user') || lbl.includes('delanter'));
          this.modoCamaraTrasera.set(esTrasera);
        } else {
          this.modoCamaraTrasera.update(v => !v);
          this.dispositivoCamaraActivoId.set(null);
        }
      } catch {
        this.modoCamaraTrasera.update(v => !v);
        this.dispositivoCamaraActivoId.set(null);
      }
    } else {
      this.modoCamaraTrasera.update(v => !v);
      this.dispositivoCamaraActivoId.set(null);
    }

    await this.iniciarCamara();
  }

  async reintentarCamara(): Promise<void> {
    await this.iniciarCamara();
    if (this.permisoDenegado()) {
      this.mostrarGuiaPermisos.set(true);
    }
  }

  abrirAjustesDispositivo(): void {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent || '';
    let pkg = 'com.android.chrome';
    if (userAgent.includes('SamsungBrowser')) {
      pkg = 'com.sec.android.app.sbrowser';
    } else if (userAgent.includes('Firefox')) {
      pkg = 'org.mozilla.firefox';
    } else if (userAgent.includes('MiuiBrowser')) {
      pkg = 'com.mi.globalbrowser';
    }

    const intentUrl = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${pkg};end`;

    this.redirigirAjustes(intentUrl);
  }

  redirigirAjustes(url: string): void {
    try {
      window.location.href = url;
    } catch {
      // Ignorar si el navegador bloquea la redirección directa por intent
    }
  }

  async reintentarTrasGuia(): Promise<void> {
    this.mostrarGuiaPermisos.set(false);
    await this.iniciarCamara();
  }

  cerrarGuiaPermisos(): void {
    this.mostrarGuiaPermisos.set(false);
  }

  private async iniciarDecodificacionContinua(): Promise<void> {
    const video = this.videoRef()?.nativeElement;
    if (!video || !this.codeReader) return;

    try {
      this.scannerControls = await this.codeReader.decodeFromVideoElement(video, result => {
        if (result) {
          if (this.operacionService.resultadoValidacionActual() || this.operacionService.modalAforoCompletoAbierto()) {
            return;
          }
          const text = result.getText();
          const now = Date.now();
          if (text !== this.ultimoCodigoLeido || now - this.ultimoScanTimestamp > 1500) {
            this.ultimoCodigoLeido = text;
            this.ultimoScanTimestamp = now;
            this.procesarCodigoEscaneado(text);
          }
        }
      });
    } catch (e) {
      console.warn('Decodificación continua detenida:', e);
    }
  }

  async onFileCaptured(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.procesandoFoto.set(true);
    const url = URL.createObjectURL(file);
    try {
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(url);
      if (result) {
        const text = result.getText();
        this.procesarCodigoEscaneado(text);
        this.soundService.reproducirBeepEscaneo();
      } else {
        this.mensajeErrorCamara.set('No se detectó un código QR legible en la foto.');
      }
    } catch {
      this.mensajeErrorCamara.set(
        'No se detectó un código QR legible en la foto. Intenta con mejor enfoque e iluminación.'
      );
    } finally {
      URL.revokeObjectURL(url);
      input.value = '';
      this.procesandoFoto.set(false);
    }
  }

  procesarCodigoEscaneado(codigo: string): void {
    const limpio = (codigo || '').trim();
    if (!limpio) return;

    this.codigoDetectado.emit(limpio);
    this.operacionService
      .validarTicketQr(limpio)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.mostrarContingenciaManual()) {
      this.cerrarContingenciaManual();
    }
    if (this.mostrarGuiaPermisos()) {
      this.cerrarGuiaPermisos();
    }
    if (this.operacionService.modalAforoCompletoAbierto()) {
      this.operacionService.cerrarModalAforoCompleto();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      if (this.mostrarContingenciaManual()) {
        this.cerrarContingenciaManual();
      }
      if (this.mostrarGuiaPermisos()) {
        this.cerrarGuiaPermisos();
      }
      this.operacionService.cerrarModalAforoCompleto();
    }
  }

  validarCodigoManual(): void {
    const codigo = this.codigoManual.trim();
    if (!codigo) return;

    this.procesarCodigoEscaneado(codigo);
    this.codigoManual = '';
    this.mostrarContingenciaManual.set(false);
  }

  autorizarSupervisor(): void {
    if (this.autorizandoSupervisor()) return;
    this.autorizandoSupervisor.set(true);
    this.operacionService
      .autorizarIngresoForzadoSupervisor(this.pinSupervisor)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.autorizandoSupervisor.set(false))
      )
      .subscribe(ok => {
        if (ok) {
          this.pinSupervisor = '';
        }
      });
  }

  detenerCamara(): void {
    if (this.scannerControls) {
      try {
        this.scannerControls.stop();
      } catch {
        // Ignorar
      }
      this.scannerControls = null;
    }
    this.codeReader = null;
    if (this.scanningStream) {
      this.scanningStream.getTracks().forEach(t => {
        try {
          t.stop();
        } catch {
          // Ignorar
        }
      });
      this.scanningStream = null;
    }
    const video = this.videoRef()?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
    this.camaraActiva.set(false);
  }
}
