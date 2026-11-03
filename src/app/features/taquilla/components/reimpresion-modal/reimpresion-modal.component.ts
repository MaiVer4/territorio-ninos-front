import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  Input,
  Output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CodigoMotivoReimpresion,
  OPCIONES_MOTIVO_REIMPRESION,
  OpcionMotivoReimpresion,
  Ticket
} from '../../../../core/models/ticket.model';

@Component({
  selector: 'app-reimpresion-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop bloqueante -->
    <div
      class="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reimpresion-modal-title"
      data-testid="modal-reimpresion">

      <!-- Contenedor del Modal -->
      <div
        class="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 flex flex-col space-y-4 animate-in fade-in motion-safe:zoom-in-95 duration-150 my-auto"
        (click)="$event.stopPropagation()">

        <!-- Encabezado con Ícono y Botón Cerrar -->
        <div class="flex items-start justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner font-bold text-lg">
              🖨️
            </div>
            <div>
              <h2 id="reimpresion-modal-title" class="text-lg font-extrabold text-slate-800">
                Reimpresión Auditada de Boleta
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">
                Registra el motivo antes de disparar la impresión térmica
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-cerrar-modal-reimpresion"
            [disabled]="estaProcesando()"
            (click)="onCancelar()"
            class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Cerrar modal">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Alerta de Bloqueo si el Ticket está CONSUMIDO, FINALIZADO o ANULADO (Notion: CA-01, CA-04) -->
        @if (esTicketInvalido()) {
          <div
            data-testid="alerta-ticket-bloqueado"
            class="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
            <span class="text-base">⛔</span>
            <div>
              <p class="font-bold">Boleta No Disponible para Reimpresión (HTTP 409)</p>
              <p class="text-[11px] text-rose-700 mt-0.5">
                Esta boleta figura en estado <strong>{{ ticket?.estado }}</strong>. El sistema bloquea la emisión para prevenir doble consumo en atracciones.
              </p>
            </div>
          </div>
        }

        <!-- Resumen de la Boleta a Reimprimir -->
        @if (ticket; as t) {
          <div
            data-testid="resumen-boleta-reimpresion"
            class="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-xs space-y-1.5">
            <div class="flex items-center justify-between font-bold">
              <div class="flex items-center gap-1.5">
                <span class="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded font-mono">
                  #{{ t.codigoBoleta }}
                </span>
                <span class="text-slate-800 text-xs truncate max-w-[200px]">{{ t.atraccionNombre }}</span>
              </div>
              <span class="font-mono text-slate-700 font-extrabold">\${{ t.precioUnitario.toLocaleString('es-CO') }}</span>
            </div>

            <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
              <div>
                <span class="font-medium text-slate-400">Modalidad:</span>
                <span class="font-semibold text-slate-700 ml-1">{{ t.modalidadEtiqueta }}</span>
              </div>
              <div>
                <span class="font-medium text-slate-400">Menor:</span>
                <span class="font-semibold text-slate-700 ml-1 truncate">{{ t.menorNombre || 'Sin menor' }}</span>
              </div>
              <div class="col-span-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>UUID: <code class="font-mono text-slate-600">{{ t.uuid || 'N/A' }}</code></span>
                <span class="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  {{ t.totalReimpresiones ? (t.totalReimpresiones + ' reimpresiones previas') : 'Primera reimpresión' }}
                </span>
              </div>
            </div>
          </div>
        }

        <!-- Selector de Motivo Obligatorio (HU-22.06 / SCRUM-382 / SCRUM-379: @NotBlank) -->
        <div class="space-y-2">
          <label class="block text-xs font-bold text-slate-700">
            Motivo de Reimpresión <span class="text-rose-500">*</span>
          </label>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Motivo de reimpresión">
            @for (opcion of opcionesMotivo; track opcion.codigo) {
              @let seleccionado = motivoSeleccionado() === opcion.codigo;
              <button
                type="button"
                [attr.data-testid]="'btn-motivo-' + opcion.codigo"
                [disabled]="esTicketInvalido() || estaProcesando()"
                (click)="seleccionarMotivo(opcion.codigo)"
                [class.ring-2]="seleccionado"
                [class.ring-amber-500]="seleccionado"
                [class.bg-amber-50]="seleccionado"
                [class.border-amber-300]="seleccionado"
                [class.bg-white]="!seleccionado"
                [class.border-slate-200]="!seleccionado"
                class="flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition cursor-pointer hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <span class="text-xl mb-1">{{ opcion.icono }}</span>
                <span class="text-xs font-bold text-slate-800 leading-tight">{{ opcion.etiqueta }}</span>
                <span class="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">{{ opcion.descripcion }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Detalle Adicional Opcional -->
        <div class="space-y-1">
          <label for="observacionReimpresion" class="block text-[11px] font-bold text-slate-600">
            Observación Adicional <span class="text-slate-400 font-normal">(Opcional)</span>
          </label>
          <input
            id="observacionReimpresion"
            data-testid="input-observacion-reimpresion"
            type="text"
            [disabled]="esTicketInvalido() || estaProcesando()"
            [ngModel]="observacion()"
            (ngModelChange)="observacion.set($event)"
            placeholder="Ej: Se cambió el rollo de papel en caja principal"
            maxlength="150"
            class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition text-slate-800 disabled:opacity-40" />
        </div>

        <!-- Indicador de Progreso Durante el Procesamiento -->
        @if (estaProcesando()) {
          <div data-testid="indicador-procesando-reimpresion" class="space-y-1.5 pt-1">
            <div class="flex items-center justify-between text-xs text-amber-700 font-semibold">
              <span class="flex items-center gap-1.5">
                <svg class="animate-spin w-3.5 h-3.5 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Registrando evento de auditoría y enviando a impresora...</span>
              </span>
            </div>
            <div class="w-full bg-amber-100 rounded-full h-1.5 overflow-hidden">
              <div class="bg-amber-500 h-1.5 rounded-full motion-safe:animate-pulse w-full"></div>
            </div>
          </div>
        }

        <!-- Botones de Acción con Guarda de Doble Clic -->
        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            data-testid="btn-cancelar-reimpresion"
            [disabled]="estaProcesando()"
            (click)="onCancelar()"
            class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            Cancelar
          </button>

          <button
            type="button"
            data-testid="btn-confirmar-reimpresion"
            [disabled]="!puedeConfirmar()"
            (click)="onConfirmar()"
            class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 transition-transform duration-150 ease-out enabled:active:scale-[0.96] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none">
            @if (estaProcesando()) {
              <svg class="animate-spin w-3.5 h-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Reimprimiendo...</span>
            } @else {
              <span>🖨️ Confirmar y Reimprimir</span>
            }
          </button>
        </div>

      </div>
    </div>
  `
})
export class ReimpresionModalComponent {
  private readonly _ticket = signal<Ticket | null>(null);

  @Input() set ticket(val: Ticket | null) {
    this._ticket.set(val);
  }
  get ticket(): Ticket | null {
    return this._ticket();
  }

  @Input() set procesandoExterno(val: boolean) {
    this._procesandoExterno.set(val);
  }

  @Output() confirmarReimpresion = new EventEmitter<{
    ticket: Ticket;
    motivo: string;
    codigoMotivo: CodigoMotivoReimpresion;
  }>();

  @Output() cancelar = new EventEmitter<void>();

  readonly opcionesMotivo: OpcionMotivoReimpresion[] = OPCIONES_MOTIVO_REIMPRESION;

  readonly motivoSeleccionado = signal<CodigoMotivoReimpresion | null>(null);
  readonly observacion = signal<string>('');
  readonly enviando = signal<boolean>(false);
  private readonly _procesandoExterno = signal<boolean>(false);

  readonly estaProcesando = computed(() => this.enviando() || this._procesandoExterno());

  readonly esTicketInvalido = computed(() => {
    const estado = this._ticket()?.estado;
    return estado === 'CONSUMIDO' || estado === 'FINALIZADO' || estado === 'ANULADO';
  });

  readonly puedeConfirmar = computed(() => {
    return (
      !!this._ticket() &&
      !!this.motivoSeleccionado() &&
      !this.esTicketInvalido() &&
      !this.estaProcesando()
    );
  });

  seleccionarMotivo(codigo: CodigoMotivoReimpresion): void {
    if (this.estaProcesando() || this.esTicketInvalido()) return;
    this.motivoSeleccionado.set(codigo);
  }

  onCancelar(): void {
    if (this.estaProcesando()) return;
    this.cancelar.emit();
  }

  onConfirmar(): void {
    const t = this._ticket();
    if (!this.puedeConfirmar() || !t) return;

    // Guarda estricta de doble clic
    this.enviando.set(true);

    const motivoObj = this.opcionesMotivo.find(o => o.codigo === this.motivoSeleccionado());
    const motivoTexto = motivoObj?.etiqueta || this.motivoSeleccionado()!;
    const obs = this.observacion().trim();
    const motivoCompleto = obs ? `${motivoTexto} - ${obs}` : motivoTexto;

    this.confirmarReimpresion.emit({
      ticket: t,
      motivo: motivoCompleto,
      codigoMotivo: this.motivoSeleccionado()!
    });
  }

  reset(): void {
    this.motivoSeleccionado.set(null);
    this.observacion.set('');
    this.enviando.set(false);
  }
}
