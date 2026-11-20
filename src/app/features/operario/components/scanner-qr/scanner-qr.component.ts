import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  output,
  signal,
  viewChild,
  HostListener
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
      <!-- Contenedor del Visor de Cámara y Retícula Visual (HU-25.05, HU-25.07) -->
      <div class="relative w-full aspect-square bg-slate-950 rounded-3xl overflow-hidden shadow-lg border border-slate-800 flex items-center justify-center">
        <!-- Elemento Video para Escaneo Óptico -->
        <video
          #videoElement
          data-testid="scanner-video-feed"
          class="w-full h-full object-cover"
          autoplay
          muted
          playsinline
          webkit-playsinline></video>

        <!-- Retícula Visual Semitransparente de Encuadre (HU-25.07 / Notion: SCRUM-399) -->
        <div
          data-testid="reticula-encuadre-qr"
          class="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
          <div class="relative w-3/4 aspect-square border-2 border-dashed border-emerald-400/80 rounded-2xl bg-emerald-500/5 backdrop-contrast-125 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <!-- Esquinas de Guía Óptica -->
            <span class="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm"></span>
            <span class="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm"></span>
            <span class="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm"></span>
            <span class="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-sm"></span>

            <!-- Línea Láser Animada -->
            @if (operacionService.escanerDesbloqueado() && camaraActiva()) {
              <div class="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent motion-safe:animate-pulse shadow-[0_0_8px_#34d399]"></div>
            }

            <p class="text-[11px] font-bold text-white/90 bg-slate-900/80 px-2.5 py-1 rounded-full text-center">
              Alinea el QR del boleto térmico
            </p>
          </div>
        </div>

        <!-- Mensaje de Estado / Permiso de Cámara y Fallback Nativo -->
        @if (!camaraActiva()) {
          <div class="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-white z-10 space-y-3">
            <svg class="w-12 h-12 text-slate-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p class="text-xs text-slate-300 font-medium max-w-xs leading-relaxed">
              {{ mensajeErrorCamara() || 'Cámara en espera o no disponible.' }}
            </p>

            <div class="flex flex-col sm:flex-row items-center gap-2 pt-1 w-full max-w-xs">
              <!-- Botón Fallback Nativo Móvil (Siempre disponible) -->
              <button
                type="button"
                data-testid="btn-capturar-foto-qr"
                (click)="fileInput.click()"
                [disabled]="procesandoFoto()"
                class="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-xs">
                @if (procesandoFoto()) {
                  <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Leyendo QR...</span>
                } @else {
                  <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
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
                class="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2">
                @if (iniciandoCamara()) {
                  <span class="inline-block w-3 h-3 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></span>
                  <span>Iniciando...</span>
                } @else {
                  <span>Reintentar en Vivo</span>
                }
              </button>
            </div>

            @if (permisoDenegado()) {
              <button
                type="button"
                data-testid="btn-abrir-guia-permisos"
                (click)="mostrarGuiaPermisos.set(true)"
                class="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer inline-flex items-center gap-1 pt-1">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>¿Cómo activar el permiso en Android?</span>
              </button>
            }
          </div>
        }

        <!-- Input nativo oculto para escaneo por foto móvil (funciona siempre) -->
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
            class="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20">
            <div class="w-14 h-14 rounded-2xl bg-red-950 text-red-400 border border-red-700 flex items-center justify-center mb-3">
              <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-base font-extrabold text-white mb-1">AFORO COMPLETO</h3>
            <p class="text-xs text-slate-300 max-w-xs mb-4">
              La atracción ha alcanzado su capacidad máxima ({{ operacionService.capacidadMaxima() }}/{{ operacionService.capacidadMaxima() }}). El escáner se desbloqueará tan pronto se confirme una salida.
            </p>
            <button
              type="button"
              data-testid="btn-abrir-override-supervisor"
              (click)="operacionService.modalAforoCompletoAbierto.set(true)"
              class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-transform duration-150 ease-out enabled:active:scale-[0.96] cursor-pointer">
              Ingreso Forzado (Supervisor)
            </button>
          </div>
        }
      </div>

      <!-- Campo de Contingencia para Digitación Manual de UUID / Foto Rápida (HU-25.05 / Notion: CA-04) -->
      <div class="w-full mt-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-2">
        <div class="flex items-center justify-between">
          <label for="inputContingencia" class="block text-[11px] font-bold text-slate-600">
            Contingencia (Boleto deteriorado o sin cámara):
          </label>
          <button
            type="button"
            data-testid="btn-foto-contingencia"
            (click)="fileInput.click()"
            class="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            <span>Foto rápida QR</span>
          </button>
        </div>
        <div class="flex items-center gap-2">
          <input
            id="inputContingencia"
            data-testid="input-contingencia-uuid"
            type="text"
            [(ngModel)]="codigoManual"
            (keydown.enter)="validarCodigoManual()"
            placeholder="Escribe UUID o código BOL-XXXXXX"
            class="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 uppercase" />
          <button
            type="button"
            data-testid="btn-validar-uuid-manual"
            (click)="validarCodigoManual()"
            [disabled]="!codigoManual.trim()"
            class="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-transform duration-150 ease-out enabled:active:scale-[0.96] cursor-pointer flex items-center gap-1 shrink-0">
            <span>Validar</span>
          </button>
        </div>
      </div>

      <!-- Modal de Advertencia AFORO COMPLETO y Override Supervisor (HU-34.05 / Notion: CA-02, CA-04) -->
      @if (operacionService.modalAforoCompletoAbierto()) {
        <div
          data-testid="modal-aforo-completo"
          (click)="onBackdropClick($event)"
          class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain cursor-pointer">
          <div
            (click)="$event.stopPropagation()"
            class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-red-200 text-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 duration-200 cursor-default">
            <div class="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-lg font-black text-slate-800 mb-1">Capacidad Máxima Alcanzada</h3>
            <p class="text-xs text-slate-500 mb-4 leading-relaxed">
              No hay cupos disponibles ({{ operacionService.ocupacionActual() }}/{{ operacionService.capacidadMaxima() }}). El ingreso forzado requiere confirmación de supervisor.
            </p>

            <div class="mb-4 text-left">
              <label class="block text-[11px] font-bold text-slate-700 mb-1">PIN de Supervisor / Administrador:</label>
              <input
                type="password"
                [(ngModel)]="pinSupervisor"
                autocomplete="off"
                placeholder="Ingresa PIN de autorización"
                class="w-full px-3 py-2 text-center text-sm font-mono tracking-widest border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500" />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                (click)="operacionService.cerrarModalAforoCompleto()"
                class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-transform duration-150 ease-out enabled:active:scale-[0.96] cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                data-testid="btn-ingreso-forzado-supervisor"
                [disabled]="autorizandoSupervisor()"
                (click)="autorizarSupervisor()"
                class="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs rounded-xl transition-transform duration-150 ease-out enabled:active:scale-[0.96] shadow-xs cursor-pointer">
                {{ autorizandoSupervisor() ? 'Verificando...' : 'Permitir Ingreso' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal: Guía Paso a Paso para Habilitar Permisos de Cámara en Android -->
      @if (mostrarGuiaPermisos()) {
        <div
          data-testid="modal-guia-permisos-camara"
          (click)="onBackdropClick($event)"
          class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain cursor-pointer">
          <div
            (click)="$event.stopPropagation()"
            class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-slate-800 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 cursor-default">
            
            <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>

            <h3 class="text-base font-black text-slate-900 text-center mb-1">
              Habilitar Cámara en Android
            </h3>
            <p class="text-xs text-slate-500 text-center mb-4 leading-relaxed">
              El navegador tiene bloqueado el acceso a la cámara. Sigue estos 3 pasos para activarlo en Chrome:
            </p>

            <ol class="space-y-2.5 text-xs mb-5">
              <li class="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span class="w-5 h-5 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <div>
                  <strong class="text-slate-800">Toca el candado o ajustes:</strong>
                  <p class="text-slate-500 text-[11px] mt-0.5">En la barra superior de Chrome (junto a la dirección web), toca el ícono 🔒 o los controles del sitio.</p>
                </div>
              </li>
              <li class="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span class="w-5 h-5 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <div>
                  <strong class="text-slate-800">Abre Permisos y Cámara:</strong>
                  <p class="text-slate-500 text-[11px] mt-0.5">Selecciona "Permisos", entra a "Cámara" y cámbialo a <strong>"Permitir"</strong>.</p>
                </div>
              </li>
              <li class="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span class="w-5 h-5 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <div>
                  <strong class="text-slate-800">Toca "Reintentar":</strong>
                  <p class="text-slate-500 text-[11px] mt-0.5">Toca el botón verde a continuación para activar el escáner de inmediato.</p>
                </div>
              </li>
            </ol>

            <div class="space-y-2">
              <button
                type="button"
                data-testid="btn-guia-reintentar"
                (click)="reintentarTrasGuia()"
                class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5">
                <span>¡Listo, ya lo permití! Reintentar</span>
              </button>

              <button
                type="button"
                data-testid="btn-guia-cerrar"
                (click)="cerrarGuiaPermisos()"
                class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer">
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

    if (this.esContextoInseguro() || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.camaraActiva.set(false);
      this.iniciandoCamara.set(false);
      this.mensajeErrorCamara.set(
        this.esContextoInseguro()
          ? 'La cámara en vivo requiere HTTPS en móviles. Usa el botón "Tomar Foto del QR" a continuación para escanear.'
          : 'Cámara en espera o no soportada en este entorno.'
      );
      return;
    }

    try {
      this.codeReader = new BrowserMultiFormatReader();

      let stream: MediaStream;
      try {
        // 1. Intentar cámara trasera en móvil sin forzar resoluciones rígidas
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
      } catch {
        // 2. Fallback permisivo a cualquier sensor de video disponible
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
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
        this.mensajeErrorCamara.set('Permiso de cámara denegado. Habilita los permisos en el candado/ajustes de tu navegador.');
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

  async reintentarCamara(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (status.state === 'denied') {
          this.permisoDenegado.set(true);
          this.mostrarGuiaPermisos.set(true);
          this.mensajeErrorCamara.set('El permiso de cámara está bloqueado en tu navegador.');
          return;
        }
      } catch {
        // Ignorar si el navegador no soporta query de 'camera'
      }
    }

    await this.iniciarCamara();
    if (this.permisoDenegado()) {
      this.mostrarGuiaPermisos.set(true);
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
      this.scannerControls = await this.codeReader.decodeFromVideoElement(video, (result) => {
        if (result) {
          if (this.operacionService.resultadoValidacionActual() || this.operacionService.modalAforoCompletoAbierto()) {
            return;
          }
          const text = result.getText();
          const now = Date.now();
          // Prevenir lecturas repetidas en menos de 1.5s del mismo código
          if (text !== this.ultimoCodigoLeido || (now - this.ultimoScanTimestamp > 1500)) {
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
      this.mensajeErrorCamara.set('No se detectó un código QR legible en la foto. Intenta con mejor enfoque e iluminación.');
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
    if (this.mostrarGuiaPermisos()) {
      this.cerrarGuiaPermisos();
    }
    if (this.operacionService.modalAforoCompletoAbierto()) {
      this.operacionService.cerrarModalAforoCompleto();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
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
