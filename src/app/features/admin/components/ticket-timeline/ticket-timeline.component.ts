import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditoriaTicket, TimelineEventoTicket } from '../../../../core/models/auditoria.model';

@Component({
  selector: 'app-ticket-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div data-testid="contenedor-ticket-timeline" class="space-y-6">
      <!-- Tarjeta Resumen del Expediente de la Boleta (HU-38.08) -->
      <div class="bg-white border border-slate-200/90 rounded-[33px] p-5 shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs uppercase font-black text-slate-400 tracking-wider">Expediente de Boleta:</span>
              <span data-testid="timeline-codigo-boleta" class="font-mono font-extrabold text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                {{ auditoria.codigoBoleta }}
              </span>
              <span
                class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                [ngClass]="{
                  'bg-emerald-100 text-emerald-800 border border-emerald-300': auditoria.estadoActual === 'PAGADO',
                  'bg-amber-100 text-amber-800 border border-amber-300': auditoria.estadoActual === 'EN_USO',
                  'bg-slate-200 text-slate-700': auditoria.estadoActual === 'CONSUMIDO',
                  'bg-red-100 text-red-800': auditoria.estadoActual === 'ANULADO'
                }">
                {{ auditoria.estadoActual }}
              </span>
            </div>
            <p class="text-xs font-mono text-slate-400 mt-1 truncate max-w-md">UUID: {{ auditoria.ticketUuid }}</p>
          </div>

          <div class="text-left sm:text-right">
            <span class="text-xs font-semibold text-slate-400 block">Total Pagado:</span>
            <span class="text-lg font-black text-slate-900 font-mono">\${{ (auditoria.valorPagado || 0).toLocaleString('es-CO') }} COP</span>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div class="bg-slate-50 rounded-xl p-2.5">
            <span class="text-slate-400 text-[10px] block font-medium">Menor:</span>
            <span class="font-bold text-slate-800">{{ auditoria.menorNombre }} {{ auditoria.menorEdad ? '(' + auditoria.menorEdad + 'a)' : '' }}</span>
          </div>
          <div class="bg-slate-50 rounded-xl p-2.5">
            <span class="text-slate-400 text-[10px] block font-medium">Acudiente / Cédula:</span>
            <span class="font-bold text-slate-800 truncate block">{{ auditoria.clienteNombre || auditoria.adultoResponsable }} · {{ auditoria.clienteDocumento || auditoria.adultoDocumento }}</span>
          </div>
          <div class="bg-slate-50 rounded-xl p-2.5">
            <span class="text-slate-400 text-[10px] block font-medium">Atracción:</span>
            <span class="font-bold text-slate-800">{{ auditoria.atraccionNombre }}</span>
          </div>
          <div class="bg-slate-50 rounded-xl p-2.5">
            <span class="text-slate-400 text-[10px] block font-medium">Modalidad:</span>
            <span class="font-extrabold text-emerald-700">{{ auditoria.modalidad || 'TEMPORIZADA' }}</span>
          </div>
        </div>
      </div>

      <!-- Línea de Tiempo Cronológica con Hitos e Iconografía (HU-38.09) -->
      <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
        <h3 class="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
          <span>Cronología de Eventos y Trazabilidad</span>
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        </h3>

        <div class="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          @for (evento of auditoria.eventos; track evento.idEvento; let index = $index) {
            <div class="relative">
              <!-- Punto / Ícono del Hito (HU-38.09) -->
              <div
                class="absolute -left-6 sm:-left-8 top-0 w-6 sm:w-8 h-6 sm:h-8 rounded-full flex items-center justify-center text-white ring-4 ring-white shadow-xs"
                [ngClass]="obtenerColorHito(evento)">
                <span class="text-xs font-bold leading-none">{{ index + 1 }}</span>
              </div>

              <!-- Contenido del Evento -->
              <div class="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 transition-colors duration-150 ease-out hover:bg-slate-50">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h4 class="text-sm font-extrabold text-slate-900">{{ evento.titulo || evento.tituloHito }}</h4>
                    <span
                      class="text-[9px] uppercase font-bold px-2 py-0.5 rounded-md tracking-wider"
                      [ngClass]="obtenerBadgeHito(evento)">
                      {{ evento.tipoHito }}
                    </span>
                  </div>
                  <time class="text-xs font-mono font-medium text-slate-500">{{ formatearFechaHora(evento.fechaHora || evento.timestamp) }}</time>
                </div>

                <p class="text-xs text-slate-600 mb-3">{{ evento.descripcion }}</p>

                <!-- Botón Desplegable para Metadatos Técnicos (HU-38.10 / Notion: CA-02, CA-03) -->
                <button
                  type="button"
                  [attr.data-testid]="'btn-toggle-metadatos-' + evento.idEvento"
                  (click)="toggleMetadatos(evento.idEvento)"
                  class="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-out">
                  <span>{{ esMetadatosVisible(evento.idEvento) ? 'Ocultar metadatos técnicos' : 'Ver metadatos forenses (IP, Cajero, Operario, Estación)' }}</span>
                  <svg
                    class="w-3.5 h-3.5 transition-transform duration-150 ease-out"
                    [class.rotate-180]="esMetadatosVisible(evento.idEvento)"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <!-- Tarjeta Desplegable con Metadatos Técnicos (HU-38.10) -->
                @if (esMetadatosVisible(evento.idEvento)) {
                  <div
                    [attr.data-testid]="'panel-metadatos-' + evento.idEvento"
                    class="mt-3 bg-white border border-slate-200 rounded-lg p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs animate-in fade-in duration-150">
                    
                    @if (evento.metadatos.cajeroEmisor) {
                      <div>
                        <span class="text-slate-500 text-[10px] block font-semibold">Cajero Emisor:</span>
                        <span class="font-bold text-slate-800">{{ evento.metadatos.cajeroEmisor }}</span>
                      </div>
                    }

                    @if (evento.metadatos.operarioValidador) {
                      <div>
                        <span class="text-slate-500 text-[10px] block font-semibold">Operario Validador:</span>
                        <span class="font-bold text-slate-800">{{ evento.metadatos.operarioValidador }}</span>
                      </div>
                    }

                    <div>
                      <span class="text-slate-500 text-[10px] block font-semibold">Estación Física:</span>
                      <span class="font-medium text-slate-800">{{ evento.metadatos.estacionFisica }}</span>
                    </div>

                    @if (evento.metadatos.duracionMinutosJuego !== undefined) {
                      <div>
                        <span class="text-slate-500 text-[10px] block font-semibold">Duración en Juego:</span>
                        <span class="font-extrabold text-emerald-700">{{ evento.metadatos.duracionMinutosJuego }} minutos</span>
                      </div>
                    }

                    <div>
                      <span class="text-slate-500 text-[10px] block font-semibold">Dirección IP Terminal:</span>
                      <span class="font-mono font-bold text-slate-700">{{ evento.metadatos.direccionIpTerminal }}</span>
                    </div>

                    @if (evento.metadatos.motivoIncidente) {
                      <div class="sm:col-span-2 bg-amber-50 rounded-lg p-2 text-amber-900 border border-amber-200">
                        <span class="font-bold text-[10px] uppercase block">Motivo Registrado:</span>
                        <span>{{ evento.metadatos.motivoIncidente }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class TicketTimelineComponent {
  @Input({ required: true }) auditoria!: AuditoriaTicket;

  private desplegados = signal<Record<string, boolean>>({
    'EVT-01': true // Desplegar el primero por defecto
  });

  esMetadatosVisible(idEvento: string): boolean {
    return !!this.desplegados()[idEvento];
  }

  toggleMetadatos(idEvento: string): void {
    this.desplegados.update(map => ({
      ...map,
      [idEvento]: !map[idEvento]
    }));
  }

  formatearFechaHora(valor?: string): string {
    if (!valor) return '—';
    return valor.replace('T', ' ').split('.')[0];
  }

  obtenerColorHito(evento: TimelineEventoTicket): string {
    switch (evento.tipoHito) {
      case 'VENTA_CAJA':
        return 'bg-emerald-600';
      case 'ESCANEO_ACCESO':
        return 'bg-blue-600';
      case 'PAUSA_APLICADA':
        return 'bg-amber-500';
      case 'REANUDACION_JUEGO':
        return 'bg-teal-600';
      case 'CONFIRMACION_SALIDA':
        return 'bg-purple-600';
      default:
        return 'bg-slate-700';
    }
  }

  obtenerBadgeHito(evento: TimelineEventoTicket): string {
    switch (evento.tipoHito) {
      case 'VENTA_CAJA':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      case 'ESCANEO_ACCESO':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'PAUSA_APLICADA':
        return 'bg-amber-100 text-amber-900 border border-amber-300';
      case 'CONFIRMACION_SALIDA':
        return 'bg-purple-100 text-purple-800 border border-purple-300';
      default:
        return 'bg-slate-200 text-slate-800';
    }
  }
}
