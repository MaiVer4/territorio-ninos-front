export interface LoginRequest {
  correo: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  tipoToken: string;
  correo: string;
  rol: string;
}
