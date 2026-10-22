export interface Menor {
  idMenor?: number;
  nombreCompleto: string;
  documento?: string;
  fechaNacimiento?: string;
  edad?: number;
  parentesco?: string;
  observacionesMedicas?: string;
}

export interface Cliente {
  idCliente?: number;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PASAPORTE' | string;
  numeroDocumento: string;
  nombreCompleto: string;
  telefono: string;
  correo?: string;
  direccion?: string;
  fechaRegistro?: string;
  menores?: Menor[];
}

export interface ClienteRegistroDTO {
  tipoDocumento?: string;
  numeroDocumento: string;
  nombreCompleto: string;
  telefono: string;
  correo?: string;
  direccion?: string;
  menores?: Menor[];
}
