import { TestBed } from '@angular/core/testing';
import { VentaCalculoService } from './venta-calculo.service';
import { SeleccionCatalogoPOS } from '../models/atraccion.model';

describe('VentaCalculoService', () => {
  let service: VentaCalculoService;

  const mockItem1: SeleccionCatalogoPOS = {
    atraccion: {
      id: 1,
      nombre: 'Piscina de Pelotas',
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
    cantidad: 2
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
    cantidad: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VentaCalculoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calcularTotalBoletas', () => {
    it('should return 0 when items is empty or null', () => {
      expect(service.calcularTotalBoletas([])).toBe(0);
      expect(service.calcularTotalBoletas(null)).toBe(0);
      expect(service.calcularTotalBoletas(undefined)).toBe(0);
    });

    it('should calculate total boletas correctly with explicit and implicit quantities', () => {
      // mockItem1 has cantidad: 2, mockItem2 has cantidad: 1
      expect(service.calcularTotalBoletas([mockItem1, mockItem2])).toBe(3);

      // Item without explicit cantidad defaults to 1
      const itemSinCantidad: SeleccionCatalogoPOS = {
        atraccion: mockItem1.atraccion,
        modalidad: mockItem1.modalidad
      };
      expect(service.calcularTotalBoletas([itemSinCantidad])).toBe(1);
    });
  });

  describe('calcularSubtotalLinea y calcularGranTotal', () => {
    it('should calculate line subtotal correctly', () => {
      // 2 * 9000 = 18000
      expect(service.calcularSubtotalLinea(mockItem1)).toBe(18000);
      // 1 * 10000 = 10000
      expect(service.calcularSubtotalLinea(mockItem2)).toBe(10000);
      expect(service.calcularSubtotalLinea(null)).toBe(0);
    });

    it('should calculate grand total correctly', () => {
      // 18000 + 10000 = 28000
      expect(service.calcularGranTotal([mockItem1, mockItem2])).toBe(28000);
      expect(service.calcularGranTotal([])).toBe(0);
      expect(service.calcularGranTotal(null)).toBe(0);
    });
  });

  describe('calcularSubtotalBase y calcularImpuestos (Tributario / IVA)', () => {
    it('should compute tax base and taxes correctly with standard 19% IVA (IVA incluido)', () => {
      const granTotal = 29000;
      // base = Math.round(29000 / 1.19) = 24370
      const base = service.calcularSubtotalBase(granTotal, 19);
      const impuestos = service.calcularImpuestos(granTotal, 19);

      expect(base).toBe(24370);
      expect(impuestos).toBe(4630);
      // Invariant: base + impuestos must equal granTotal
      expect(base + impuestos).toBe(granTotal);
    });

    it('should handle exempt transactions (0% IVA)', () => {
      const granTotal = 50000;
      const base = service.calcularSubtotalBase(granTotal, 0);
      const impuestos = service.calcularImpuestos(granTotal, 0);

      expect(base).toBe(50000);
      expect(impuestos).toBe(0);
      expect(base + impuestos).toBe(granTotal);
    });

    it('should handle custom tax rates (e.g. 5% or 8%)', () => {
      const granTotal = 10000;
      const base5 = service.calcularSubtotalBase(granTotal, 5);
      const imp5 = service.calcularImpuestos(granTotal, 5);
      expect(base5).toBe(9524);
      expect(imp5).toBe(476);
      expect(base5 + imp5).toBe(granTotal);
    });

    it('should return 0 when granTotal is 0 or negative', () => {
      expect(service.calcularSubtotalBase(0, 19)).toBe(0);
      expect(service.calcularImpuestos(0, 19)).toBe(0);
      expect(service.calcularSubtotalBase(-500, 19)).toBe(0);
      expect(service.calcularImpuestos(-500, 19)).toBe(0);
    });
  });

  describe('calcularCambio y calcularFaltanteEfectivo', () => {
    it('should calculate cash change correctly when received cash >= granTotal', () => {
      expect(service.calcularCambio(29000, 50000, 'EFECTIVO')).toBe(21000);
      expect(service.calcularCambio(29000, 29000, 'EFECTIVO')).toBe(0);
      expect(service.calcularFaltanteEfectivo(29000, 50000, 'EFECTIVO')).toBe(0);
    });

    it('should calculate cash shortfall correctly when received cash < granTotal', () => {
      expect(service.calcularCambio(29000, 20000, 'EFECTIVO')).toBe(0);
      expect(service.calcularFaltanteEfectivo(29000, 20000, 'EFECTIVO')).toBe(9000);
    });

    it('should always return 0 for change and shortfall in non-cash payment methods', () => {
      const metodos: ('TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'TRANSFERENCIA')[] = [
        'TARJETA_DEBITO',
        'TARJETA_CREDITO',
        'TRANSFERENCIA'
      ];

      for (const metodo of metodos) {
        expect(service.calcularCambio(29000, 0, metodo)).toBe(0);
        expect(service.calcularFaltanteEfectivo(29000, 0, metodo)).toBe(0);
        expect(service.calcularCambio(29000, 50000, metodo)).toBe(0);
      }
    });
  });

  describe('esPagoValido', () => {
    it('should return false if items list is empty or null', () => {
      expect(service.esPagoValido([], 29000, 50000, 'EFECTIVO')).toBe(false);
      expect(service.esPagoValido(null, 29000, 50000, 'EFECTIVO')).toBe(false);
    });

    it('should return false if granTotal is 0 or negative', () => {
      expect(service.esPagoValido([mockItem1], 0, 50000, 'EFECTIVO')).toBe(false);
    });

    it('should validate cash payment against received cash', () => {
      // 50000 >= 29000 => true
      expect(service.esPagoValido([mockItem1], 29000, 50000, 'EFECTIVO')).toBe(true);
      // Exact cash => true
      expect(service.esPagoValido([mockItem1], 29000, 29000, 'EFECTIVO')).toBe(true);
      // Insufficient cash => false
      expect(service.esPagoValido([mockItem1], 29000, 20000, 'EFECTIVO')).toBe(false);
    });

    it('should validate electronic payments immediately when items are present and granTotal > 0', () => {
      expect(service.esPagoValido([mockItem1], 29000, 0, 'TARJETA_DEBITO')).toBe(true);
      expect(service.esPagoValido([mockItem1], 29000, 0, 'TARJETA_CREDITO')).toBe(true);
      expect(service.esPagoValido([mockItem1], 29000, 0, 'TRANSFERENCIA')).toBe(true);
    });
  });

  describe('construirResumenLiquidacion y formatearCOP', () => {
    it('should build complete ResumenLiquidacionPOS object with all calculated fields', () => {
      const fixedDate = new Date('2026-11-01T12:00:00Z');
      const resumen = service.construirResumenLiquidacion({
        items: [mockItem1, mockItem2],
        porcentajeIva: 19,
        metodoPago: 'EFECTIVO',
        montoRecibido: 50000,
        fecha: fixedDate
      });

      expect(resumen.totalBoletas).toBe(3);
      expect(resumen.granTotal).toBe(28000);
      expect(resumen.subtotal).toBe(23529); // Math.round(28000 / 1.19)
      expect(resumen.impuestos).toBe(4471); // 28000 - 23529
      expect(resumen.metodoPago).toBe('EFECTIVO');
      expect(resumen.montoRecibido).toBe(50000);
      expect(resumen.cambio).toBe(22000); // 50000 - 28000
      expect(resumen.fecha).toBe(fixedDate);
    });

    it('should set montoRecibido to granTotal for electronic payment methods in summary', () => {
      const resumen = service.construirResumenLiquidacion({
        items: [mockItem1],
        metodoPago: 'TARJETA_DEBITO',
        montoRecibido: 0
      });

      expect(resumen.granTotal).toBe(18000);
      expect(resumen.montoRecibido).toBe(18000);
      expect(resumen.cambio).toBe(0);
    });

    it('should format values as Colombian Peso currency (COP)', () => {
      expect(service.formatearCOP(50000)).toBe('$50.000');
      expect(service.formatearCOP(0)).toBe('$0');
      expect(service.formatearCOP(1234567)).toBe('$1.234.567');
    });
  });
});
