export interface ConfiguracionParque {
  id?: number | string;
  nombreComercial: string;
  razonSocial: string;
  nit: string;
  direccion: string;
  telefono: string;
  ciudad: string;
  politicasSeguridad: string;
  anchoPapelMm: 58 | 80;
  mensajePie: string;
  tiempoGraciaGeneralSegundos: number;
  nombreParque?: string;
  pieTicketLegal?: string;
  fechaActualizacion?: string;
}

export const CONFIG_PARQUE_DEFAULT: ConfiguracionParque = {
  nombreComercial: 'Territorio de Niños',
  razonSocial: 'Territorio de Niños S.A.S.',
  nit: '901.458.789-2',
  direccion: 'Av. Bolívar # 14N-55',
  telefono: '3104567890',
  ciudad: 'Armenia, Quindío',
  politicasSeguridad:
    'Uso obligatorio de medias antideslizantes. Menores bajo supervisión de un adulto responsable. Prohibido alimentos en atracciones.',
  anchoPapelMm: 80,
  mensajePie: '¡Gracias por su visita a Territorio de Niños!',
  tiempoGraciaGeneralSegundos: 300
};

