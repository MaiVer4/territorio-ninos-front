import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  output,
  signal,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { OperacionService } from '../../../../core/services/operacion.service';
import { SoundNotificationService } from '../../../../core/services/sound-notification.service';
import { ResultadoValidacionQr } from '../../../../core/models/operador.model';

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
          playsinline></video>

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
              <div class="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_8px_#34d399]"></div>
            }

            <p class="text-[11px] font-bold text-white/90 bg-slate-900/80 px-2.5 py-1 rounded-full text-center">
              Alinea el QR del boleto térmico
            </p>
          </div>
        </div>

        <!-- Mensaje de Estado / Permiso de Cámara -->
        @if (!camaraActiva()) {
          <div class="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-white z-10">
            <svg class="w-12 h-12 text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p class="text-xs text-slate-300 font-medium mb-3">
              {{ mensajeErrorCamara() || 'Cámara en espera o no disponible.' }}
            </p>
            <button
              type="button"
              (click)="iniciarCamara()"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer">
              Reintentar Cámara
            </button>
          </div>
        }

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
              class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer">
              Ingreso Forzado (Supervisor)
            </button>
          </div>
        }
      </div>

      <!-- Campo de Contingencia para Digitación Manual de UUID (HU-25.05 / Notion: CA-04) -->
      <div class="w-full mt-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
        <label for="inputContingencia" class="block text-[11px] font-bold text-slate-600 mb-1.5">
          Contingencia Manual (Boleto deteriorado o sin cámara):
        </label>
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
            class="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0">
            <span>Validar</span>
          </button>
        </div>
      </div>

      <!-- Modal de Advertencia AFORO COMPLETO y Override Supervisor (HU-34.05 / Notion: CA-02, CA-04) -->
      @if (operacionService.modalAforoCompletoAbierto()) {
        <div
          data-testid="modal-aforo-completo"
          class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-red-200 text-center animate-in fade-in zoom-in-95 duration-200">
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
                placeholder="Ingresa PIN (ej. 1234)"
                class="w-full px-3 py-2 text-center text-sm font-mono tracking-widest border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500" />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                (click)="operacionService.cerrarModalAforoCompleto()"
                class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                data-testid="btn-ingreso-forzado-supervisor"
                (click)="autorizarSupervisor()"
                class="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition shadow-xs cursor-pointer">
                Permitir Ingreso
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

  codigoDetectado = output<string>();

  videoRef = viewChild<ElementRef<HTMLVideoElement>>('videoElement');

  codigoManual = '';
  pinSupervisor = '';
  camaraActiva = signal<boolean>(false);
  mensajeErrorCamara = signal<string | null>(null);

  private codeReader: BrowserMultiFormatReader | null = null;
  private scanningStream: MediaStream | null = null;
  private ultimoCodigoLeido = '';
  private ultimoScanTimestamp = 0;

  ngOnInit(): void {
    this.iniciarCamara();
  }

  ngOnDestroy(): void {
    this.detenerCamara();
  }

  iniciarCamara(): void {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.mensajeErrorCamara.set('Cámara no soportada en este entorno.');
      return;
    }

    try {
      this.codeReader = new BrowserMultiFormatReader();
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        .then(stream => {
          this.scanningStream = stream;
          const video = this.videoRef()?.nativeElement;
          if (video) {
            video.srcObject = stream;
            video.play().catch(() => {});
          }
          this.camaraActiva.set(true);
          this.mensajeErrorCamara.set(null);
          this.iniciarDecodificacionContinua();
        })
        .catch(err => {
          this.camaraActiva.set(false);
          this.mensajeErrorCamara.set(err?.message || 'Acceso a cámara denegado o no disponible.');
        });
    } catch {
      this.camaraActiva.set(false);
      this.mensajeErrorCamara.set('Error inicializando lector óptico.');
    }
  }

  private iniciarDecodificacionContinua(): void {
    const video = this.videoRef()?.nativeElement;
    if (!video || !this.codeReader) return;

    this.codeReader.decodeFromVideoElement(video, (result, error) => {
      if (result) {
        const text = result.getText();
        const now = Date.now();
        // Prevenir lecturas repetidas en menos de 1.5s del mismo código
        if (text !== this.ultimoCodigoLeido || (now - this.ultimoScanTimestamp > 1500)) {
          this.ultimoCodigoLeido = text;
          this.ultimoScanTimestamp = now;
          this.procesarCodigoEscaneado(text);
        }
      }
    }).catch(() => {});
  }

  procesarCodigoEscaneado(codigo: string): void {
    const limpio = (codigo || '').trim();
    if (!limpio) return;

    this.codigoDetectado.emit(limpio);
    this.operacionService.validarTicketQr(limpio).subscribe();
  }

  validarCodigoManual(): void {
    const codigo = this.codigoManual.trim();
    if (!codigo) return;

    this.procesarCodigoEscaneado(codigo);
    this.codigoManual = '';
  }

  autorizarSupervisor(): void {
    const ok = this.operacionService.autorizarIngresoForzadoSupervisor(this.pinSupervisor);
    if (ok) {
      this.pinSupervisor = '';
    }
  }

  detenerCamara(): void {
    if (this.scanningStream) {
      this.scanningStream.getTracks().forEach(t => t.stop());
      this.scanningStream = null;
    }
    this.camaraActiva.set(false);
  }
}
