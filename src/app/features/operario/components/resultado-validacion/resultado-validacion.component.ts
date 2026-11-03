import { ChangeDetectionStrategy, Component, inject, output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperacionService } from '../../../../core/services/operacion.service';
import { ResultadoValidacionQr, SesionJuegoMenor } from '../../../../core/models/operador.model';

@Component({
  selector: 'app-resultado-validacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (operacionService.resultadoValidacionActual(); as res) {
      <div
        data-testid="modal-resultado-validacion"
        (click)="onBackdropClick($event)"
        class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto overscroll-contain cursor-pointer">
        
        <div
          class="bg-white rounded-3xl max-w-sm sm:max-w-md w-full overflow-hidden shadow-2xl border-2 animate-in fade-in motion-safe:zoom-in-95 duration-150 cursor-default"
          (click)="$event.stopPropagation()"
          [ngClass]="res.aprobado ? 'border-emerald-500 shadow-emerald-500/20' : 'border-red-600 shadow-red-600/25'">
          
          <!-- Franja Superior de Estado de Alto Contraste (HU-26.07 / RNF3) -->
          <div
            class="p-6 text-center text-white flex flex-col items-center justify-center"
            [ngClass]="res.aprobado ? 'bg-emerald-600' : 'bg-red-600'">
            
            <div
              class="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 text-white ring-4 ring-white/30"
              [ngClass]="res.aprobado ? 'bg-emerald-700' : 'bg-red-700'">
              @if (res.aprobado) {
                <!-- Ícono Aprobado / Checkmark -->
                <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              } @else {
                <!-- Ícono Rechazado / X -->
                <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
            </div>

            <span
              data-testid="badge-estado-validacion"
              class="text-xs uppercase tracking-widest font-black px-3 py-1 rounded-full bg-black/25">
              {{ res.aprobado ? 'BOLETO APROBADO' : 'ACCESO RECHAZADO' }}
            </span>
            <h2 class="text-xl sm:text-2xl font-black mt-2 leading-tight">
              {{ res.aprobado ? 'Acceso Autorizado' : 'Ingreso Bloqueado' }}
            </h2>
          </div>

          <!-- Cuerpo de Información y Metadatos -->
          <div class="p-6 space-y-4">
            <!-- Mensaje Explicativo de Rechazo (HU-26.08 / Notion: CA-02, CA-03, CA-04) -->
            @if (!res.aprobado) {
              <div
                data-testid="causa-rechazo-mensaje"
                class="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <p class="text-xs font-black text-red-700 uppercase tracking-wide mb-1">
                  Motivo de Denegación:
                </p>
                <p class="text-sm font-extrabold text-red-900 leading-snug">
                  {{ res.mensajeExplicativo }}
                </p>
                @if (res.causaRechazo) {
                  <span class="inline-block mt-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-red-200 text-red-800">
                    COD: {{ res.causaRechazo }}
                  </span>
                }
              </div>
            }

            <!-- Detalle del Menor y de la Entrada -->
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
              <div class="flex justify-between items-center pb-1.5 border-b border-slate-200">
                <span class="text-slate-500 font-semibold">Boleto:</span>
                <span class="font-mono font-bold text-slate-800">{{ res.codigoBoleta || res.uuid }}</span>
              </div>
              @if (res.menorNombre) {
                <div class="flex justify-between items-center">
                  <span class="text-slate-500 font-semibold">Menor:</span>
                  <span class="font-bold text-slate-900">{{ res.menorNombre }} {{ res.menorEdad ? '(' + res.menorEdad + ' años)' : '' }}</span>
                </div>
              }
              @if (res.acudienteNombre) {
                <div class="flex justify-between items-center">
                  <span class="text-slate-500 font-semibold">Acudiente:</span>
                  <span class="font-medium text-slate-700">{{ res.acudienteNombre }}</span>
                </div>
              }
              <div class="flex justify-between items-center">
                <span class="text-slate-500 font-semibold">Atracción:</span>
                <span class="font-bold text-slate-800">{{ res.atraccionNombre || operacionService.estacionActiva()?.atraccionNombre }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-500 font-semibold">Modalidad:</span>
                <span class="font-extrabold text-emerald-700">
                  {{ res.tipoAtraccion === 'EVENTOS_CAIDAS' ? (res.caidasPermitidas || 3) + ' Caídas' : (res.duracionMinutos || 15) + ' Minutos' }}
                </span>
              </div>
            </div>

            <!-- Acciones Táctiles (HU-26.09 / Notion: SCRUM-406) -->
            <div class="pt-2 flex flex-col gap-2.5">
              @if (res.aprobado) {
                <button
                  type="button"
                  data-testid="btn-permitir-ingreso"
                  (click)="permitirIngreso(res)"
                  class="w-full min-h-[52px] bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  <span>Permitir Ingreso</span>
                </button>
              }

              <button
                type="button"
                data-testid="btn-cerrar-resultado-validacion"
                (click)="cerrar()"
                class="w-full min-h-[44px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs rounded-2xl transition cursor-pointer">
                {{ res.aprobado ? 'Cancelar / No ingresó' : 'Entendido / Cerrar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class ResultadoValidacionComponent {
  operacionService = inject(OperacionService);

  ingresoConfirmado = output<SesionJuegoMenor>();
  cerrado = output<void>();

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    this.cerrar();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cerrar();
    }
  }

  permitirIngreso(res: ResultadoValidacionQr): void {
    const sesion = this.operacionService.permitirIngresoMenor(res);
    if (sesion) {
      this.ingresoConfirmado.emit(sesion);
    }
  }

  cerrar(): void {
    this.operacionService.cerrarResultadoValidacion();
    this.cerrado.emit();
  }
}
