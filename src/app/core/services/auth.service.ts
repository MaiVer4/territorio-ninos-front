import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest } from '../models/auth.model';
import { RolUsuario } from '../models/enums';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

import { NotificationService } from './notification.service';

export interface JwtPayload {
  exp: number;
  sub?: string;
  rol?: RolUsuario;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'tdn_jwt_token';

  // Manejo de estado reactivo moderno con Signals (Angular 16+)
  currentUser = signal<AuthResponse | null>(null);

  readonly currentUserName = computed<string>(() => {
    const user = this.currentUser();
    if (user?.nombre && user.nombre.trim().length > 0) {
      return user.nombre.trim();
    }
    if (user?.correo && user.correo.trim().length > 0) {
      const prefix = user.correo.split('@')[0].trim();
      if (prefix.length > 0) {
        return prefix
          .replace(/[._-]+/g, ' ')
          .split(' ')
          .filter(Boolean)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ') || 'Usuario';
      }
    }
    return 'Usuario';
  });

  readonly currentUserInitials = computed<string>(() => {
    const name = this.currentUserName();
    if (!name || name === 'Usuario') {
      return 'U';
    }
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    if (words.length === 1 && words[0].length > 0) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return 'U';
  });

  constructor() {
    this.loadTokenFromStorage();
  }

  forgotPassword(correo: string) {
    return this.http.post<{mensaje: string}>(`${this.apiUrl}/forgot-password`, { correo, email: correo });
  }

  resetPassword(token: string, nuevaContrasena: string) {
    return this.http.patch<{mensaje: string}>(`${this.apiUrl}/reset-password`, { token, nuevaContrasena });
  }

  login(credentials: LoginRequest) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response.token) {
          try {
            localStorage.setItem(this.TOKEN_KEY, JSON.stringify(response));
          } catch (e) {
            console.error('Error guardando en localStorage', e);
          }
          this.currentUser.set(response);
        }
      }),
      catchError(error => {
        console.error('Error de autenticación', error);
        return throwError(() => error);
      })
    );
  }

  logout(force = false): void {
    if (force || !this.getToken()) {
      this.clearSessionAndRedirect();
      return;
    }

    this.http.post<{mensaje?: string}>(`${this.apiUrl}/logout`, {}).subscribe({
      next: (res) => {
        this.clearSessionAndRedirect();
        if (res?.mensaje) {
          this.notificationService.info(res.mensaje);
        }
      },
      error: (err) => {
        // En caso de conflicto de negocio (ej: código 409 por caja abierta en taquilla)
        if (err.status === 409) {
          const motivo = err.error?.mensaje || 'No puedes cerrar sesión porque tienes un turno de caja activo. Cierra la caja primero.';
          this.notificationService.warn(motivo);
          return;
        }

        // Si fue error de token expirado (401), red o servidor, procedemos con logout local preventivo
        this.clearSessionAndRedirect();
      }
    });
  }

  clearSessionAndRedirect(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
    } catch (e) {
      console.error('Error limpiando localStorage', e);
    }
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    try {
      const authData = localStorage.getItem(this.TOKEN_KEY);
      if (authData) {
        const response: AuthResponse = JSON.parse(authData);
        return response.token;
      }
    } catch (e) {
      console.error('Error leyendo localStorage', e);
    }
    return null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decodedToken = jwtDecode<JwtPayload>(token);
      // Verificar si el token ya expiró
      const isExpired = (decodedToken.exp * 1000) < Date.now();
      if (isExpired) {
        try {
          localStorage.removeItem(this.TOKEN_KEY);
        } catch (e) {
          console.error('Error limpiando token expirado', e);
        }
        this.currentUser.set(null);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Token inválido', error);
      return false; // Si el token está mal formado
    }
  }

  getRole(): RolUsuario | null {
    try {
      const authData = localStorage.getItem(this.TOKEN_KEY);
      if (authData) {
        const response: AuthResponse = JSON.parse(authData);
        return response.rol;
      }
    } catch (e) {
      console.error('Error leyendo rol de localStorage', e);
    }
    return null;
  }

  private loadTokenFromStorage(): void {
    try {
      const authData = localStorage.getItem(this.TOKEN_KEY);
      if (authData) {
        this.currentUser.set(JSON.parse(authData));
      }
    } catch(e) { 
      console.error("Error parsing token", e); 
      localStorage.removeItem(this.TOKEN_KEY); 
    }
  }
}
