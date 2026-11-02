import { Injectable } from '@angular/core';
import { ResumenLiquidacionPOS, SeleccionCatalogoPOS } from '../models/atraccion.model';
import { MetodoPagoPOS } from '../models/enums';

export interface ParametrosLiquidacionPOS {
  items: SeleccionCatalogoPOS[];
  porcentajeIva?: number;
  metodoPago: MetodoPagoPOS;
  montoRecibido: number;
  fecha?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class VentaCalculoService {
  readonly PORCENTAJE_IVA_DEFAULT = 19;

  calcularTotalBoletas(items: SeleccionCatalogoPOS[] | null | undefined): number {
    if (!items || items.length === 0) return 0;
    return items.reduce((acc, it) => acc + (it.cantidad ?? 1), 0);
  }

  calcularSubtotalLinea(item: SeleccionCatalogoPOS | null | undefined): number {
    if (!item) return 0;
    const cantidad = item.cantidad ?? 1;
    const precio = item.modalidad?.precio ?? 0;
    return Math.max(0, cantidad * precio);
  }

  calcularGranTotal(items: SeleccionCatalogoPOS[] | null | undefined): number {
    if (!items || items.length === 0) return 0;
    return items.reduce((acc, it) => acc + this.calcularSubtotalLinea(it), 0);
  }

  calcularSubtotalBase(granTotal: number, porcentajeIva: number = this.PORCENTAJE_IVA_DEFAULT): number {
    if (granTotal <= 0) return 0;
    if (porcentajeIva <= 0) return granTotal;
    return Math.round(granTotal / (1 + (porcentajeIva / 100)));
  }

  calcularImpuestos(granTotal: number, porcentajeIva: number = this.PORCENTAJE_IVA_DEFAULT): number {
    if (granTotal <= 0) return 0;
    return granTotal - this.calcularSubtotalBase(granTotal, porcentajeIva);
  }

  calcularCambio(granTotal: number, montoRecibido: number, metodoPago: MetodoPagoPOS): number {
    if (metodoPago !== 'EFECTIVO') return 0;
    return Math.max(0, montoRecibido - granTotal);
  }

  calcularFaltanteEfectivo(granTotal: number, montoRecibido: number, metodoPago: MetodoPagoPOS): number {
    if (metodoPago !== 'EFECTIVO') return 0;
    return Math.max(0, granTotal - montoRecibido);
  }

  esPagoValido(
    items: SeleccionCatalogoPOS[] | null | undefined,
    granTotal: number,
    montoRecibido: number,
    metodoPago: MetodoPagoPOS
  ): boolean {
    if (!items || items.length === 0) return false;
    if (granTotal <= 0) return false;
    if (metodoPago === 'EFECTIVO') {
      return montoRecibido >= granTotal;
    }
    return true;
  }

  construirResumenLiquidacion(params: ParametrosLiquidacionPOS): ResumenLiquidacionPOS {
    const items = params.items ? [...params.items] : [];
    const porcentajeIva = params.porcentajeIva ?? this.PORCENTAJE_IVA_DEFAULT;
    const totalBoletas = this.calcularTotalBoletas(items);
    const granTotal = this.calcularGranTotal(items);
    const subtotal = this.calcularSubtotalBase(granTotal, porcentajeIva);
    const impuestos = this.calcularImpuestos(granTotal, porcentajeIva);
    const cambio = this.calcularCambio(granTotal, params.montoRecibido, params.metodoPago);
    const montoEfectivoFinal = params.metodoPago === 'EFECTIVO' ? params.montoRecibido : granTotal;

    return {
      items,
      totalBoletas,
      subtotal,
      porcentajeIva,
      impuestos,
      granTotal,
      metodoPago: params.metodoPago,
      montoRecibido: montoEfectivoFinal,
      cambio,
      fecha: params.fecha ?? new Date()
    };
  }

  formatearCOP(valor: number): string {
    return '$' + (valor || 0).toLocaleString('es-CO');
  }
}
