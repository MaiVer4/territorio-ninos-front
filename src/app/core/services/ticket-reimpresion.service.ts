import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { EventoReimpresionDTO, ReimpresionRequestDTO, Ticket } from '../models/ticket.model';
import { AuthService } from './auth.service';
import { OfflineQueueService } from './offline-queue.service';

@Injectable({
  providedIn: 'root'
})
export class TicketReimpresionService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService, { optional: true });
  private readonly offlineQueue = inject(OfflineQueueService, { optional: true });

  private readonly apiUrl = `${environment.apiUrl}/tickets`;

  /**
   * Registro histórico reactivo de eventos de reimpresión de la sesión activa.
   */
  readonly historialReimpresiones = signal<EventoReimpresionDTO[]>([]);
  readonly ultimaReimpresion = signal<EventoReimpresionDTO | null>(null);
  readonly procesandoReimpresion = signal<boolean>(false);

  /**
   * Solicita la reimpresión auditada de un ticket enviando POST /api/tickets/{uuid}/reimprimir (HU-22.03, HU-22.04, HU-22.05).
   *
   * @param ticket Boleta a reimprimir.
   * @param request Datos de la petición con motivo obligatorio (@NotBlank).
   */
  solicitarReimpresion(
    ticket: Ticket,
    request: ReimpresionRequestDTO
  ): Observable<EventoReimpresionDTO> {
    const motivoLimpio = request?.motivo?.trim();

    // 1. Validación de motivo obligatorio (HU-22.03 / SCRUM-379: @NotBlank)
    if (!motivoLimpio) {
      return throwError(() => new Error('El motivo de la reimpresión es obligatorio y no puede estar vacío.'));
    }

    // 2. Validación de ticket válido
    if (!ticket) {
      return throwError(() => new Error('No se ha proporcionado un ticket válido para reimpresión.'));
    }

    const uuid = ticket.uuid?.trim() || String(ticket.idTicket || ticket.id || ticket.codigoBoleta);
    if (!uuid) {
      return throwError(() => new Error('El ticket no cuenta con un identificador o UUID válido.'));
    }

    // 3. Validación de estado: bloquear si se encuentra CONSUMIDO, FINALIZADO o ANULADO (HU-22.04 / SCRUM-380: HTTP 409)
    if (ticket.estado === 'CONSUMIDO' || ticket.estado === 'FINALIZADO' || ticket.estado === 'ANULADO') {
      const errorMsg = `No se puede reimprimir la boleta #${ticket.codigoBoleta} porque se encuentra en estado ${ticket.estado}.`;
      return throwError(() => new HttpErrorResponse({
        error: { message: errorMsg },
        status: 409,
        statusText: 'Conflict',
        url: `${this.apiUrl}/${uuid}/reimprimir`
      }));
    }

    this.procesandoReimpresion.set(true);

    const payload: ReimpresionRequestDTO = {
      motivo: motivoLimpio
    };

    return this.http.post<EventoReimpresionDTO>(`${this.apiUrl}/${uuid}/reimprimir`, payload).pipe(
      map(response => {
        // Garantizar marca visible en el payload (HU-22.05 / Notion: CA-02)
        const evento: EventoReimpresionDTO = {
          ...response,
          ticketUuid: response.ticketUuid || uuid,
          codigoBoleta: response.codigoBoleta || ticket.codigoBoleta,
          motivo: response.motivo || motivoLimpio,
          marcaImpresion: response.marcaImpresion || '** REIMPRESIÓN **',
          fechaReimpresion: response.fechaReimpresion || new Date().toISOString()
        };
        return evento;
      }),
      tap(evento => {
        this.registrarEventoEnHistorial(evento);
        this.procesandoReimpresion.set(false);
      }),
      catchError((error: HttpErrorResponse | Error) => {
        this.procesandoReimpresion.set(false);

        // Si es un error de conflicto de negocio (409) o validación (400 / 403), propagar
        if (error instanceof HttpErrorResponse && (error.status === 409 || error.status === 400 || error.status === 403)) {
          return throwError(() => error);
        }

        // Respaldo de contingencia local si el endpoint no responde en entorno de desarrollo/offline (status 0 ó 404)
        if (error instanceof HttpErrorResponse && (error.status === 0 || error.status === 404)) {
          const timestamp = Date.now();
          const eventoFallback: EventoReimpresionDTO = {
            idLog: `LOG-${timestamp}-${Math.floor(Math.random() * 900 + 100)}`,
            ticketUuid: uuid,
            codigoBoleta: ticket.codigoBoleta,
            usuarioId: this.authService?.currentUser()?.correo || 'taquillero',
            usuarioNombre: this.authService?.currentUserName() || 'Taquillero de Turno',
            motivo: motivoLimpio,
            fechaReimpresion: new Date().toISOString(),
            marcaImpresion: '** REIMPRESIÓN **',
            ticket: {
              ...ticket,
              esReimpresion: true,
              marcaImpresion: '** REIMPRESIÓN **',
              motivoUltimaReimpresion: motivoLimpio,
              fechaUltimaReimpresion: new Date().toISOString(),
              totalReimpresiones: (ticket.totalReimpresiones || 0) + 1
            }
          };

          this.registrarEventoEnHistorial(eventoFallback);

          // Encolar evento para sincronización diferida cuando se recupere la conexión (HU-35.06)
          this.offlineQueue?.encolarAccion(
            'REIMPRIMIR_TICKET',
            ticket.atraccionId || 1,
            {
              ticketUuid: uuid,
              codigoBoleta: ticket.codigoBoleta,
              motivo: motivoLimpio,
              fechaReimpresion: eventoFallback.fechaReimpresion
            },
            undefined,
            uuid
          );

          return of(eventoFallback);
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Agrega un evento de auditoría al historial reactivo de reimpresiones.
   */
  private registrarEventoEnHistorial(evento: EventoReimpresionDTO): void {
    this.historialReimpresiones.update(historial => [evento, ...historial]);
    this.ultimaReimpresion.set(evento);
  }
}
