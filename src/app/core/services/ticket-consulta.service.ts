import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { EstadoVisualTicket, Ticket, TiempoRestanteInfo } from '../models/ticket.model';
import { ColaEmisionService } from './cola-emision.service';

@Injectable({
  providedIn: 'root'
})
export class TicketConsultaService {
  private readonly http = inject(HttpClient);
  private readonly colaEmisionService = inject(ColaEmisionService);

  private readonly apiUrl = `${environment.apiUrl}/tickets`;

  /**
   * Determina el estado visual normalizado (Pills: PAGADO, EN_USO, CONSUMIDO) para un ticket (HU-23.05 / SCRUM-387).
   */
  obtenerEstadoVisual(ticket: Ticket): EstadoVisualTicket {
    if (!ticket) return 'PAGADO';

    const estado = ticket.estado;
    if (estado === 'CONSUMIDO' || estado === 'FINALIZADO' || estado === 'ANULADO') {
      return 'CONSUMIDO';
    }

    if (estado === 'EN_USO') {
      return 'EN_USO';
    }

    // Por defecto 'PAGADO' para boletas activas/emitidas listas para disfrute
    return 'PAGADO';
  }

  /**
   * Calcula el tiempo o caídas restantes con metadatos para la barra de progreso (HU-23.05 / SCRUM-387).
   */
  calcularTiempoRestanteInfo(ticket: Ticket): TiempoRestanteInfo {
    if (!ticket) {
      return {
        etiqueta: 'Sin información',
        minutosRestantes: 0,
        porcentaje: 0,
        agotado: true
      };
    }

    const estadoVisual = this.obtenerEstadoVisual(ticket);

    // Modalidad por eventos / caídas
    if (ticket.tipoAtraccion === 'EVENTOS_CAIDAS') {
      const caidasTotal = ticket.caidasPermitidas || 3;
      let caidasRestantes = ticket.caidasRestantes !== undefined
        ? ticket.caidasRestantes
        : (estadoVisual === 'CONSUMIDO' ? 0 : caidasTotal);

      if (estadoVisual === 'CONSUMIDO') {
        caidasRestantes = 0;
      }

      const agotado = caidasRestantes <= 0 || estadoVisual === 'CONSUMIDO';
      const porcentaje = Math.max(0, Math.min(100, Math.round((caidasRestantes / caidasTotal) * 100)));

      return {
        etiqueta: agotado ? 'Caídas agotadas (0 restantes)' : `${caidasRestantes} de ${caidasTotal} caídas restantes`,
        minutosRestantes: 0,
        caidasRestantes,
        porcentaje,
        agotado
      };
    }

    // Modalidad temporizada (por minutos)
    const duracionBase = ticket.duracionMinutos || 15;

    if (estadoVisual === 'CONSUMIDO') {
      return {
        etiqueta: 'Tiempo agotado (0 min)',
        minutosRestantes: 0,
        segundosRestantes: 0,
        porcentaje: 0,
        agotado: true
      };
    }

    if (estadoVisual === 'EN_USO') {
      let restantes = ticket.tiempoRestanteMinutos !== undefined
        ? ticket.tiempoRestanteMinutos
        : Math.round(duracionBase * 0.6); // Fallback razonable si está en uso

      if (restantes < 0) restantes = 0;
      const agotado = restantes <= 0;
      const porcentaje = Math.max(0, Math.min(100, Math.round((restantes / duracionBase) * 100)));

      return {
        etiqueta: agotado ? 'Tiempo por vencer (0 min)' : `${restantes} min restantes de ${duracionBase} min`,
        minutosRestantes: restantes,
        segundosRestantes: ticket.tiempoRestanteSegundos ?? restantes * 60,
        porcentaje,
        agotado
      };
    }

    // Estado 'PAGADO' (Listo para activar)
    return {
      etiqueta: `${duracionBase} min disponibles`,
      minutosRestantes: duracionBase,
      segundosRestantes: duracionBase * 60,
      porcentaje: 100,
      agotado: false
    };
  }

  /**
   * Busca tickets por número de documento/cédula, UUID o código de boleta con filtrado opcional por estado (HU-23.04).
   */
  buscarTickets(
    termino: string,
    filtroEstado: 'TODOS' | EstadoVisualTicket = 'TODOS'
  ): Observable<Ticket[]> {
    const termLimpio = (termino || '').trim().toLowerCase();
    const params = new HttpParams().set('criterio', termLimpio);

    return this.http.get<Ticket[]>(`${this.apiUrl}/buscar`, { params }).pipe(
      map(remotos => this.combinarConLocales(remotos || [], termLimpio)),
      catchError(() => {
        // En caso de que el backend no tenga el endpoint activo, consultar sobre el historial local del turno
        return of(this.filtrarLocales(termLimpio));
      }),
      map(tickets => {
        if (filtroEstado === 'TODOS') return tickets;
        return tickets.filter(t => this.obtenerEstadoVisual(t) === filtroEstado);
      })
    );
  }

  /**
   * Consulta un ticket específico por su UUID.
   */
  obtenerTicketPorUuid(uuid: string): Observable<Ticket | null> {
    const uuidLimpio = (uuid || '').trim();
    if (!uuidLimpio) return of(null);

    return this.buscarTickets(uuidLimpio).pipe(
      map(lista => {
        const exacto = lista.find(t => t.uuid?.toLowerCase() === uuidLimpio.toLowerCase() || t.codigoBoleta === uuidLimpio);
        return exacto || (lista.length > 0 ? lista[0] : null);
      })
    );
  }

  /**
   * Combina resultados remotos con boletas emitidas en el turno actual en memoria.
   */
  private combinarConLocales(remotos: Ticket[], termLimpio: string): Ticket[] {
    const locales = this.filtrarLocales(termLimpio);
    const mapa = new Map<string, Ticket>();

    // Primero los remotos
    for (const t of remotos) {
      const key = (t.uuid || t.idTicket || t.id || t.codigoBoleta || '').toString();
      if (key) mapa.set(key, t);
    }

    // Luego los locales (sobrescriben con estado más reciente de la sesión si coinciden)
    for (const t of locales) {
      const key = (t.uuid || t.idTicket || t.id || t.codigoBoleta || '').toString();
      if (key) mapa.set(key, t);
    }

    return Array.from(mapa.values());
  }

  /**
   * Filtra las boletas del turno activo que coincidan con la búsqueda.
   */
  private filtrarLocales(termLimpio: string): Ticket[] {
    const historial = this.colaEmisionService.historialTicketsTurno();
    const recientes = this.colaEmisionService.boletasGeneradas();
    const todasLocales = [...historial];

    for (const b of recientes) {
      if (!todasLocales.some(t => t.uuid === b.uuid || t.codigoBoleta === b.codigoBoleta)) {
        todasLocales.push(b);
      }
    }

    if (!termLimpio) {
      return todasLocales;
    }

    return todasLocales.filter(ticket => {
      const doc = (ticket.clienteDocumento || '').toLowerCase();
      const uuid = (ticket.uuid || '').toLowerCase();
      const codigo = (ticket.codigoBoleta || '').toLowerCase();
      const cliente = (ticket.clienteNombre || '').toLowerCase();
      const menor = (ticket.menorNombre || '').toLowerCase();
      const atraccion = (ticket.atraccionNombre || '').toLowerCase();

      return (
        doc.includes(termLimpio) ||
        uuid.includes(termLimpio) ||
        codigo.includes(termLimpio) ||
        cliente.includes(termLimpio) ||
        menor.includes(termLimpio) ||
        atraccion.includes(termLimpio)
      );
    });
  }
}
