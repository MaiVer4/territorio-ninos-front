import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest } from '../models/auth.model';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

import { NotificationService } from './notification.service';

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

  constructor() {
    this.loadTokenFromStorage();
  }

  forgotPassword(email: string) {
    return this.http.post<{mensaje: string}>(`${this.apiUrl}/forgot-password`, { email });
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
      const decodedToken: any = jwtDecode(token);
      // Verificar si el token ya expiró
      const isExpired = (decodedToken.exp * 1000) < Date.now();
      if (isExpired) {
        this.logout(true); // Limpiar estado inválido preventivamente sin llamada remota
        return false;
      }
      return true;
    } catch (error) {
      console.error('Token inválido', error);
      return false; // Si el token está mal formado
    }
  }

  getRole(): string | null {
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
