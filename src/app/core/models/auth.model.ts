import { RolUsuario } from './enums';

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  tipoToken: string;
  id?: number;
  nombre?: string;
  correo: string;
  rol: RolUsuario;
}

export interface ForgotPasswordRequest {
  correo: string;
}

export interface ResetPasswordRequest {
  token: string;
  nuevaContrasena: string;
}
