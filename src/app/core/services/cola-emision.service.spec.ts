import { TestBed } from '@angular/core/testing';
import { ColaEmisionService } from './cola-emision.service';
import { ResumenLiquidacionPOS, SeleccionCatalogoPOS } from '../models/atraccion.model';
import { VentaResponseDTO } from '../models/ticket.model';

describe('ColaEmisionService', () => {
  let service: ColaEmisionService;

  const mockItem1: SeleccionCatalogoPOS = {
    atraccion: {
      id: 1,
      nombre: 'Inflable Gigante',
      tipo: 'TEMPORIZADA',
      tarifaMinuto: 600,
      capacidadMaxima: 10,
      ninosActivos: 2,
      duracionMinutosBase: 15
    },
    modalidad: {
      tipo: 'TEMPORIZADA',
      etiqueta: '15 min',
      valor: 15,
      precio: 9000
    },
    cantidad: 2,
    menorAsignado: { idMenor: 1, nombreCompleto: 'Lucas Gómez', edad: 5 }
  };

  const mockItem2: SeleccionCatalogoPOS = {
    atraccion: {
      id: 2,
      nombre: 'Toro Mecánico',
      tipo: 'EVENTOS_CAIDAS',
      tarifaMinuto: 10000,
      capacidadMaxima: 5,
      ninosActivos: 1,
      duracionMinutosBase: 0,
      caidasLimite: 3
    },
    modalidad: {
      tipo: 'EVENTOS_CAIDAS',
      etiqueta: '3 caídas',
      valor: 3,
      precio: 10000
    },
    cantidad: 1,
    menorAsignado: null
  };

  const mockResumen: ResumenLiquidacionPOS = {
    items: [mockItem1, mockItem2],
    totalBoletas: 3,
    subtotal: 23529,
    porcentajeIva: 19,
    impuestos: 4471,
    granTotal: 28000,
    metodoPago: 'EFECTIVO',
    montoRecibido: 30000,
    cambio: 2000,
    fecha: new Date('2026-11-01T10:00:00Z')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ColaEmisionService);
    service.limpiarTodo();
  });

  it('should be created and start with empty queue and empty ticket state', () => {
    expect(service).toBeTruthy();
    expect(service.ordenes().length).toBe(0);
    expect(service.cantidadOrdenesPendientes()).toBe(0);
    expect(service.totalBoletasPendientes()).toBe(0);
    expect(service.ordenReciente()).toBeNull();
    expect(service.boletasGeneradas().length).toBe(0);
    expect(service.historialTicketsTurno().length).toBe(0);
    expect(service.totalBoletasGeneradas()).toBe(0);
    expect(service.cantidadBoletasTurno()).toBe(0);
  });

  it('should enqueue sale and expand items into individual physical tickets', () => {
    const orden = service.encolarVenta(mockResumen, 'Carlos Gómez');

    expect(orden).toBeTruthy();
    expect(orden.clienteNombre).toBe('Carlos Gómez');
    expect(orden.metodoPago).toBe('EFECTIVO');
    expect(orden.granTotal).toBe(28000);
    expect(orden.estado).toBe('PENDIENTE');

    // 2 tickets from mockItem1 + 1 ticket from mockItem2 = 3 physical tickets
    expect(orden.boletas.length).toBe(3);
    expect(orden.totalBoletas).toBe(3);

    // Verify first two tickets are for Inflable Gigante, assigned to Lucas Gómez
    expect(orden.boletas[0].atraccionNombre).toBe('Inflable Gigante');
    expect(orden.boletas[0].menorNombre).toBe('Lucas Gómez');
    expect(orden.boletas[0].codigoBoleta).toContain('TDN-1-');
    expect(orden.boletas[0].uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(orden.boletas[0].codigoQr).toBe(orden.boletas[0].uuid);
    expect(orden.boletas[0].estado).toBe('PENDIENTE');

    expect(orden.boletas[1].atraccionNombre).toBe('Inflable Gigante');
    expect(orden.boletas[1].menorNombre).toBe('Lucas Gómez');

    // Third ticket has no minor assigned -> fallback
    expect(orden.boletas[2].atraccionNombre).toBe('Toro Mecánico');
    expect(orden.boletas[2].menorNombre).toBe('Sin menor asignado');

    // Verify reactive signals
    expect(service.cantidadOrdenesPendientes()).toBe(1);
    expect(service.totalBoletasPendientes()).toBe(3);
    expect(service.ordenReciente()?.idOrden).toBe(orden.idOrden);

    // HU-19.09: Boletas generadas en estado reactivo
    expect(service.boletasGeneradas().length).toBe(3);
    expect(service.totalBoletasGeneradas()).toBe(3);
    expect(service.boletasGeneradasPendientes().length).toBe(3);
  });

  it('should mark an order and all its physical tickets as EMITIDA', () => {
    const orden = service.encolarVenta(mockResumen, 'Laura Restrepo');
    expect(service.cantidadOrdenesPendientes()).toBe(1);

    service.marcarOrdenEmitida(orden.idOrden);

    expect(service.cantidadOrdenesPendientes()).toBe(0);
    expect(service.totalBoletasPendientes()).toBe(0);

    const ordenActualizada = service.ordenes().find(o => o.idOrden === orden.idOrden);
    expect(ordenActualizada?.estado).toBe('EMITIDA');
    expect(ordenActualizada?.boletas.every(b => b.estado === 'EMITIDA')).toBe(true);
    expect(service.ordenReciente()?.estado).toBe('EMITIDA');

    // HU-19.09: Verificar actualización en boletasGeneradas e historial
    expect(service.boletasGeneradas().every(b => b.estado === 'EMITIDA')).toBe(true);
    expect(service.boletasGeneradasPendientes().length).toBe(0);
  });

  it('should clean emitted orders from queue while keeping pending ones', () => {
    const orden1 = service.encolarVenta(mockResumen, 'Cliente 1');
    const orden2 = service.encolarVenta(mockResumen, 'Cliente 2');

    expect(service.ordenes().length).toBe(2);

    service.marcarOrdenEmitida(orden1.idOrden);
    expect(service.cantidadOrdenesPendientes()).toBe(1);

    service.limpiarEmitidas();

    expect(service.ordenes().length).toBe(1);
    expect(service.ordenes()[0].idOrden).toBe(orden2.idOrden);
  });

  it('should use default customer name when not provided', () => {
    const orden = service.encolarVenta(mockResumen);
    expect(orden.clienteNombre).toBe('Cliente de Mostrador');
  });

  describe('HU-19.09: Mapeo de boletas en el estado de la aplicación', () => {
    it('should map tickets directly from VentaResponseDTO backend response', () => {
      const responseDTO: VentaResponseDTO = {
        idVenta: 105,
        idOrden: 'ORD-SRV-999',
        numeroFactura: 'FAC-2026-0012',
        clienteNombre: 'Andrea Rincón',
        clienteDocumento: '1094901234',
        clienteId: 42,
        metodoPago: 'TARJETA_CREDITO',
        totalVenta: 25000,
        boletas: [
          {
            id: 881,
            codigoBoleta: 'TDN-SRV-001',
            codigoQr: 'TDN-QR:TDN-SRV-001',
            atraccionId: 3,
            atraccionNombre: 'Laberinto Láser',
            tipoAtraccion: 'TEMPORIZADA',
            modalidadEtiqueta: '20 min',
            duracionMinutos: 20,
            menorId: 10,
            menorNombre: 'Martina Rincón',
            menorEdad: 7,
            precioUnitario: 15000,
            estado: 'GENERADO'
          },
          {
            id: 882,
            codigoBoleta: 'TDN-SRV-002',
            atraccionId: 4,
            atraccionNombre: 'Muro de Escalar',
            tipoAtraccion: 'EVENTOS_CAIDAS',
            modalidadEtiqueta: '3 intentos',
            caidasPermitidas: 3,
            menorId: 10,
            menorNombre: 'Martina Rincón',
            menorEdad: 7,
            precioUnitario: 10000,
            estado: 'GENERADO'
          }
        ]
      };

      const boletas = service.mapearBoletasDesdeRespuestaVenta(responseDTO);

      expect(boletas.length).toBe(2);
      expect(service.boletasGeneradas().length).toBe(2);
      expect(service.cantidadBoletasTurno()).toBe(2);

      // Primer ticket
      const ticket1 = boletas[0];
      expect(ticket1.codigoBoleta).toBe('TDN-SRV-001');
      expect(ticket1.codigoQr).toBe('TDN-QR:TDN-SRV-001');
      expect(ticket1.atraccionNombre).toBe('Laberinto Láser');
      expect(ticket1.tipoAtraccion).toBe('TEMPORIZADA');
      expect(ticket1.duracionMinutos).toBe(20);
      expect(ticket1.menorNombre).toBe('Martina Rincón');
      expect(ticket1.clienteNombre).toBe('Andrea Rincón');
      expect(ticket1.clienteDocumento).toBe('1094901234');
      expect(ticket1.metodoPago).toBe('TARJETA_CREDITO');
      expect(ticket1.estado).toBe('GENERADO');

      // Segundo ticket con QR autogenerado y modalidad caídas
      const ticket2 = boletas[1];
      expect(ticket2.codigoBoleta).toBe('TDN-SRV-002');
      expect(ticket2.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(ticket2.codigoQr).toBe(ticket2.uuid);
      expect(ticket2.atraccionNombre).toBe('Muro de Escalar');
      expect(ticket2.caidasPermitidas).toBe(3);
    });

    it('should support tickets field alternative in VentaResponseDTO', () => {
      const responseDTO: VentaResponseDTO = {
        idVenta: 201,
        clienteNombre: 'Pedro Pérez',
        tickets: [
          {
            codigoBoleta: 'TK-ALT-10',
            atraccionId: 1,
            atraccionNombre: 'Camas Elásticas',
            modalidadEtiqueta: '15 min',
            precioUnitario: 8000,
            estado: 'GENERADO'
          }
        ]
      };

      const boletas = service.mapearBoletasDesdeRespuestaVenta(responseDTO);
      expect(boletas.length).toBe(1);
      expect(boletas[0].codigoBoleta).toBe('TK-ALT-10');
      expect(service.boletasGeneradas()[0].atraccionNombre).toBe('Camas Elásticas');
    });

    it('should support encolarVenta with ContextoVentaTicket containing document and id', () => {
      const orden = service.encolarVenta(mockResumen, {
        clienteNombre: 'Valentina Duque',
        clienteDocumento: '1094888777',
        clienteId: 99
      });

      expect(orden.clienteNombre).toBe('Valentina Duque');
      expect(service.boletasGeneradas().length).toBe(3);

      const boleta1 = service.boletasGeneradas()[0];
      expect(boleta1.clienteNombre).toBe('Valentina Duque');
      expect(boleta1.clienteDocumento).toBe('1094888777');
      expect(boleta1.clienteId).toBe(99);
      expect(boleta1.metodoPago).toBe('EFECTIVO');
      expect(boleta1.idOrden).toBe(orden.idOrden);
    });

    it('should accumulate tickets into historialTicketsTurno across multiple sales', () => {
      service.encolarVenta(mockResumen, 'Cliente Venta 1');
      expect(service.boletasGeneradas().length).toBe(3);
      expect(service.cantidadBoletasTurno()).toBe(3);

      // Segunda venta con 1 ítem de 1 boleta
      const resumen2: ResumenLiquidacionPOS = {
        items: [mockItem2],
        subtotal: 8403,
        porcentajeIva: 19,
        impuestos: 1597,
        granTotal: 10000,
        metodoPago: 'TRANSFERENCIA',
        montoRecibido: 10000,
        cambio: 0
      };

      service.encolarVenta(resumen2, 'Cliente Venta 2');

      // boletasGeneradas solo contiene las de la última venta
      expect(service.boletasGeneradas().length).toBe(1);
      expect(service.totalBoletasGeneradas()).toBe(1);

      // historialTicketsTurno contiene el acumulado de ambas ventas (3 + 1 = 4)
      expect(service.cantidadBoletasTurno()).toBe(4);
      expect(service.historialTicketsTurno().length).toBe(4);
    });

    it('should reset boletasGeneradas using limpiarBoletasGeneradas', () => {
      service.encolarVenta(mockResumen, 'Cliente X');
      expect(service.boletasGeneradas().length).toBe(3);

      service.limpiarBoletasGeneradas();
      expect(service.boletasGeneradas().length).toBe(0);
      expect(service.totalBoletasGeneradas()).toBe(0);
      // El historial debe conservarse
      expect(service.cantidadBoletasTurno()).toBe(3);
    });

    it('should reset all state including tickets on limpiarTodo', () => {
      service.encolarVenta(mockResumen, 'Cliente X');
      expect(service.boletasGeneradas().length).toBe(3);
      expect(service.historialTicketsTurno().length).toBe(3);

      service.limpiarTodo();

      expect(service.ordenes().length).toBe(0);
      expect(service.ordenReciente()).toBeNull();
      expect(service.boletasGeneradas().length).toBe(0);
      expect(service.historialTicketsTurno().length).toBe(0);
    });

    it('[SCRUM-372] HU-20.06: should generate unique UUID v4 and link it as QR payload for optical camera compatibility', () => {
      const uuid1 = service.generarUuidTicket();
      const uuid2 = service.generarUuidTicket();

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid1).toMatch(uuidRegex);
      expect(uuid2).toMatch(uuidRegex);
      expect(uuid1).not.toBe(uuid2);

      const orden = service.encolarVenta(mockResumen, 'Cliente Óptico');
      for (const boleta of orden.boletas) {
        expect(boleta.uuid).toMatch(uuidRegex);
        expect(boleta.codigoQr).toBe(boleta.uuid);
      }
    });
  });
});
