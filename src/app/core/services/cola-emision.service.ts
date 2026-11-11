import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BoletaEmisionFisica, OrdenEmisionFisica, ResumenLiquidacionPOS } from '../models/atraccion.model';
import { ContextoVentaTicket, EstadoTicket, Ticket, VentaResponseDTO } from '../models/ticket.model';

@Injectable({
  providedIn: 'root'
})
export class ColaEmisionService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiUrl = `${environment.apiUrl}/ventas`;

  readonly ordenes = signal<OrdenEmisionFisica[]>([]);
  readonly ordenReciente = signal<OrdenEmisionFisica | null>(null);

  /**
   * Lista reactiva de boletas individuales generadas en la venta más reciente (HU-19.09 / SCRUM-368).
   */
  readonly boletasGeneradas = signal<Ticket[]>([]);

  /**
   * Historial acumulado de boletas generadas durante el turno activo.
   */
  readonly historialTicketsTurno = signal<Ticket[]>([]);

  readonly totalBoletasGeneradas = computed(() => {
    return this.boletasGeneradas().length;
  });

  readonly cantidadBoletasTurno = computed(() => {
    return this.historialTicketsTurno().length;
  });

  readonly boletasGeneradasPendientes = computed(() => {
    return this.boletasGeneradas().filter(b => b.estado === 'PENDIENTE' || b.estado === 'GENERADO');
  });

  readonly ordenesPendientes = computed(() => {
    return this.ordenes().filter(o => o.estado === 'PENDIENTE');
  });

  readonly cantidadOrdenesPendientes = computed(() => {
    return this.ordenesPendientes().length;
  });

  readonly totalBoletasPendientes = computed(() => {
    return this.ordenesPendientes().reduce((acc, o) => {
      return acc + o.boletas.filter(b => b.estado === 'PENDIENTE').length;
    }, 0);
  });

  /**
   * Última boleta emitida en el turno activo (HU-22.07 / SCRUM-383).
   */
  readonly ultimaBoletaEmitida = computed<Ticket | null>(() => {
    return this.historialTicketsTurno()[0] ?? this.boletasGeneradas()[0] ?? null;
  });

  /**
   * Genera un identificador universal único (UUID v4) para cada ticket.
   * Utiliza la API nativa crypto.randomUUID() cuando está disponible,
   * con algoritmo pseudoaleatorio RFC 4122 v4 como respaldo.
   */
  generarUuidTicket(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID();
      } catch {
        // Fallback en caso de entorno sin contexto seguro
      }
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Mapea en el estado de la aplicación la lista de boletas generadas tras recibir la respuesta de venta (HU-19.09 / SCRUM-368).
   * Acepta tanto DTOs del backend (`VentaResponseDTO`) como el resumen de cálculo POS (`ResumenLiquidacionPOS`).
   * Vincula el código UUID del ticket como carga útil del QR (HU-20.06 / Notion: CA-04).
   */
  mapearBoletasDesdeRespuestaVenta(
    origen: ResumenLiquidacionPOS | VentaResponseDTO,
    contexto?: ContextoVentaTicket
  ): Ticket[] {
    const timestamp = Date.now();
    const boletasMapeadas: Ticket[] = [];

    const origenDTO = origen as VentaResponseDTO;
    const listaDTO = origenDTO.boletas || origenDTO.tickets;

    if (Array.isArray(listaDTO) && listaDTO.length > 0) {
      listaDTO.forEach((item, index) => {
        const atraccionId = item.atraccionId ?? 0;
        const codigoBoleta =
          item.codigoBoleta?.trim() ||
          `TDN-${atraccionId}-${timestamp.toString(36).toUpperCase()}-${String(index + 1).padStart(3, '0')}`;
        const uuid = item.uuid?.trim() || this.generarUuidTicket();
        const codigoQr = item.codigoQr?.trim() || uuid;

        const ticket: Ticket = {
          id: item.id ?? item.idTicket,
          idTicket: item.idTicket ?? item.id,
          uuid,
          idVenta: origenDTO.idVenta ?? contexto?.idVenta,
          idOrden: item.idOrden ?? origenDTO.idOrden ?? contexto?.idOrden,
          codigoBoleta,
          codigoQr,
          atraccionId,
          atraccionNombre: item.atraccionNombre || 'Atracción',
          tipoAtraccion: item.tipoAtraccion,
          modalidadEtiqueta: item.modalidadEtiqueta || 'Estándar',
          duracionMinutos: item.duracionMinutos,
          caidasPermitidas: item.caidasPermitidas,
          menorId: item.menorId,
          menorNombre: item.menorNombre?.trim() || 'Sin menor asignado',
          menorEdad: item.menorEdad,
          clienteId: item.clienteId ?? origenDTO.clienteId ?? contexto?.clienteId,
          clienteNombre:
            item.clienteNombre?.trim() ||
            origenDTO.clienteNombre?.trim() ||
            contexto?.clienteNombre?.trim() ||
            'Cliente de Mostrador',
          clienteDocumento:
            item.clienteDocumento?.trim() ||
            origenDTO.clienteDocumento?.trim() ||
            contexto?.clienteDocumento?.trim(),
          precioUnitario: item.precioUnitario ?? 0,
          metodoPago: item.metodoPago ?? origenDTO.metodoPago ?? contexto?.metodoPago,
          fechaEmision: item.fechaEmision ?? origenDTO.fecha ?? contexto?.fechaEmision ?? new Date(),
          estado: (item.estado as EstadoTicket) ?? 'GENERADO',
          observaciones: item.observaciones
        };

        boletasMapeadas.push(ticket);
      });
    } else {
      const resumenPOS = origen as ResumenLiquidacionPOS;
      let contadorBoleta = 1;

      for (const item of resumenPOS.items || []) {
        const cantidad = Math.max(1, item.cantidad ?? 1);
        const menorNombre = item.menorAsignado?.nombreCompleto?.trim() || 'Sin menor asignado';
        const atraccionId = item.atraccion.id ?? 0;

        for (let i = 0; i < cantidad; i++) {
          const codigoBoleta = `TDN-${atraccionId}-${timestamp.toString(36).toUpperCase()}-${String(contadorBoleta).padStart(3, '0')}`;
          const uuid = this.generarUuidTicket();
          // Carga útil óptica con UUID v4 (HU-20.06 / Notion: CA-04)
          const codigoQr = uuid;
          contadorBoleta++;

          const ticket: Ticket = {
            idTicket: undefined,
            uuid,
            idOrden: contexto?.idOrden,
            idVenta: contexto?.idVenta,
            codigoBoleta,
            codigoQr,
            atraccionId,
            atraccionNombre: item.atraccion.nombre,
            tipoAtraccion: item.atraccion.tipo,
            modalidadEtiqueta: item.modalidad.etiqueta,
            duracionMinutos: item.atraccion.tipo === 'TEMPORIZADA' ? item.modalidad.valor : undefined,
            caidasPermitidas: item.atraccion.tipo === 'EVENTOS_CAIDAS' ? item.modalidad.valor : undefined,
            menorId: item.menorAsignado?.idMenor,
            menorNombre,
            menorEdad: item.menorAsignado?.edad,
            clienteId: contexto?.clienteId,
            clienteNombre: contexto?.clienteNombre?.trim() || 'Cliente de Mostrador',
            clienteDocumento: contexto?.clienteDocumento?.trim(),
            precioUnitario: item.modalidad.precio,
            metodoPago: resumenPOS.metodoPago ?? contexto?.metodoPago,
            fechaEmision: contexto?.fechaEmision ?? new Date(),
            estado: 'PENDIENTE'
          };

          boletasMapeadas.push(ticket);
        }
      }
    }

    // Actualizar estado reactivo de la aplicación
    this.boletasGeneradas.set(boletasMapeadas);
    this.historialTicketsTurno.update(prev => [...boletasMapeadas, ...prev]);

    return boletasMapeadas;
  }

  /**
   * Desglosa los ítems del resumen de liquidación en boletas físicas individuales,
   * actualizando el estado de boletas generadas y encolando la orden para emisión física.
   */
  encolarVenta(
    resumen: ResumenLiquidacionPOS,
    clienteInfo?: string | ContextoVentaTicket
  ): OrdenEmisionFisica {
    const timestamp = Date.now();
    const contexto: ContextoVentaTicket =
      typeof clienteInfo === 'string'
        ? { clienteNombre: clienteInfo }
        : { ...(clienteInfo || {}) };

    const idOrden = contexto.idOrden || `ORD-${timestamp}-${Math.floor(Math.random() * 900 + 100)}`;
    contexto.idOrden = idOrden;
    if (!contexto.metodoPago) {
      contexto.metodoPago = resumen.metodoPago;
    }

    const boletas = this.mapearBoletasDesdeRespuestaVenta(resumen, contexto);

    const nuevaOrden: OrdenEmisionFisica = {
      idOrden,
      clienteNombre: contexto.clienteNombre?.trim() || 'Cliente de Mostrador',
      metodoPago: resumen.metodoPago,
      granTotal: resumen.granTotal,
      totalBoletas: boletas.length,
      fechaEmision: new Date(),
      boletas,
      estado: 'PENDIENTE'
    };

    this.ordenes.update(lista => [nuevaOrden, ...lista]);
    this.ordenReciente.set(nuevaOrden);

    return nuevaOrden;
  }

  /**
   * Sincroniza la orden de venta y sus boletas emitidas con el backend para persistencia financiera y validación QR en atracciones.
   */
  sincronizarVentaBackend(orden: OrdenEmisionFisica, clienteId?: number, clienteDocumento?: string): void {
    if (!this.http) return;

    this.http
      .post<VentaResponseDTO>(this.apiUrl, {
        idOrden: orden.idOrden,
        clienteId,
        clienteDocumento,
        clienteNombre: orden.clienteNombre,
        metodoPago: orden.metodoPago,
        granTotal: orden.granTotal,
        boletas: orden.boletas
      })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  /**
   * Marca una orden completa y todas sus boletas asociadas como EMITIDA.
   * También actualiza el estado de las boletas en `boletasGeneradas` y en `historialTicketsTurno`.
   */
  marcarOrdenEmitida(idOrden: string): void {
    this.ordenes.update(lista =>
      lista.map(o => {
        if (o.idOrden === idOrden) {
          return {
            ...o,
            estado: 'EMITIDA',
            boletas: o.boletas.map(b => ({ ...b, estado: 'EMITIDA' }))
          };
        }
        return o;
      })
    );

    if (this.ordenReciente()?.idOrden === idOrden) {
      const actual = this.ordenReciente()!;
      this.ordenReciente.set({
        ...actual,
        estado: 'EMITIDA',
        boletas: actual.boletas.map(b => ({ ...b, estado: 'EMITIDA' }))
      });
    }

    this.boletasGeneradas.update(lista =>
      lista.map(b => (b.idOrden === idOrden ? { ...b, estado: 'EMITIDA' } : b))
    );

    this.historialTicketsTurno.update(lista =>
      lista.map(b => (b.idOrden === idOrden ? { ...b, estado: 'EMITIDA' } : b))
    );
  }

  /**
   * Actualiza el estado de una boleta tras su reimpresión auditada (HU-22.04 / HU-22.05).
   * Refleja los cambios reactivamente en `boletasGeneradas`, `historialTicketsTurno` y `ordenes`.
   */
  actualizarBoletaReimpresa(ticketUuidOId: string, cambios: Partial<Ticket> = {}): Ticket | null {
    let boletaActualizada: Ticket | null = null;

    const actualizar = (b: Ticket): Ticket => {
      const coincide =
        (b.uuid && b.uuid === ticketUuidOId) ||
        (b.idTicket && String(b.idTicket) === ticketUuidOId) ||
        (b.id && String(b.id) === ticketUuidOId) ||
        b.codigoBoleta === ticketUuidOId;

      if (coincide) {
        boletaActualizada = {
          ...b,
          ...cambios,
          esReimpresion: true,
          marcaImpresion: cambios.marcaImpresion || '** REIMPRESIÓN **',
          totalReimpresiones: (b.totalReimpresiones || 0) + 1,
          fechaUltimaReimpresion: cambios.fechaUltimaReimpresion || new Date()
        };
        return boletaActualizada;
      }
      return b;
    };

    this.boletasGeneradas.update(lista => lista.map(actualizar));
    this.historialTicketsTurno.update(lista => lista.map(actualizar));

    this.ordenes.update(lista =>
      lista.map(o => ({
        ...o,
        boletas: o.boletas.map(actualizar)
      }))
    );

    if (this.ordenReciente()) {
      const o = this.ordenReciente()!;
      this.ordenReciente.set({
        ...o,
        boletas: o.boletas.map(actualizar)
      });
    }

    return boletaActualizada;
  }

  /**
   * Remueve de la memoria las órdenes que ya fueron emitidas físicamente.
   */
  limpiarEmitidas(): void {
    this.ordenes.update(lista => lista.filter(o => o.estado !== 'EMITIDA'));
    if (this.ordenReciente()?.estado === 'EMITIDA') {
      this.ordenReciente.set(null);
    }
  }

  /**
   * Limpia la lista de boletas generadas en la venta actual.
   */
  limpiarBoletasGeneradas(): void {
    this.boletasGeneradas.set([]);
  }

  /**
   * Limpia toda la cola y el historial (útil para pruebas o cambio de turno).
   */
  limpiarTodo(): void {
    this.ordenes.set([]);
    this.ordenReciente.set(null);
    this.boletasGeneradas.set([]);
    this.historialTicketsTurno.set([]);
  }
}
