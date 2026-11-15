export interface Menor {
  id?: number;
  idMenor?: number;
  nombreCompleto: string;
  documento?: string;
  fechaNacimiento?: string;
  edad?: number;
  parentesco?: string;
  observacionesMedicas?: string;
}

export interface Cliente {
  id?: number;
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
  nombres?: string;
  apellidos?: string;
  telefono: string;
  correo?: string;
  direccion?: string;
  menores?: Menor[];
}
