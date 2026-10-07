import { RolUsuario, EstadoUsuario } from './enums';

export interface Usuario {
  id?: number;
  nombre?: string;
  correo: string;
  rol: RolUsuario;
  estado?: EstadoUsuario;
  password?: string;
  contrasena?: string; // Alias transitorio para plantillas
  fechaCreacion?: string;
  fechaActualizacion?: string;
}
