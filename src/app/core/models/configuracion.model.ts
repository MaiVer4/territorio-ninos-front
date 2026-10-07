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
  fechaActualizacion?: string;
}
