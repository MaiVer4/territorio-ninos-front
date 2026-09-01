export interface LoginRequest {
  correo: string;
  contrasena: string;
}

export interface AuthResponse {
  token: string;
  tipoToken: string;
  correo: string;
  rol: string;
}
