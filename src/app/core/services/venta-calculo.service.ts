import { Injectable } from '@angular/core';
import { ResumenLiquidacionPOS, SeleccionCatalogoPOS } from '../models/atraccion.model';
import { MetodoPagoPOS } from '../models/enums';

export type ModalidadImpuesto = 'INCLUIDO' | 'MAS_IVA';

export interface ParametrosLiquidacionPOS {
  items: SeleccionCatalogoPOS[];
  porcentajeIva?: number;
  modalidadImpuesto?: ModalidadImpuesto;
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

  calcularSubtotalBase(
    valor: number,
    porcentajeIva: number = this.PORCENTAJE_IVA_DEFAULT,
    modalidad: ModalidadImpuesto = 'INCLUIDO'
  ): number {
    if (valor <= 0) return 0;
    if (porcentajeIva <= 0) return valor;
    if (modalidad === 'MAS_IVA') {
      return valor;
    }
    return Math.round(valor / (1 + (porcentajeIva / 100)));
  }

  calcularImpuestos(
    valor: number,
    porcentajeIva: number = this.PORCENTAJE_IVA_DEFAULT,
    modalidad: ModalidadImpuesto = 'INCLUIDO'
  ): number {
    if (valor <= 0) return 0;
    if (porcentajeIva <= 0) return 0;
    if (modalidad === 'MAS_IVA') {
      return Math.round(valor * (porcentajeIva / 100));
    }
    return valor - this.calcularSubtotalBase(valor, porcentajeIva, 'INCLUIDO');
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
    const modalidad = params.modalidadImpuesto ?? 'INCLUIDO';
    const totalBoletas = this.calcularTotalBoletas(items);
    const granTotal = this.calcularGranTotal(items);
    const subtotal = this.calcularSubtotalBase(granTotal, porcentajeIva, modalidad);
    const impuestos = this.calcularImpuestos(granTotal, porcentajeIva, modalidad);
    const totalFinal = modalidad === 'MAS_IVA' ? granTotal + impuestos : granTotal;
    const cambio = this.calcularCambio(totalFinal, params.montoRecibido, params.metodoPago);
    const montoEfectivoFinal = params.metodoPago === 'EFECTIVO' ? params.montoRecibido : totalFinal;

    return {
      items,
      totalBoletas,
      subtotal,
      porcentajeIva,
      impuestos,
      granTotal: totalFinal,
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
