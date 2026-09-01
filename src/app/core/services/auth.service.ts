import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest } from '../models/auth.model';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
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
          localStorage.setItem(this.TOKEN_KEY, JSON.stringify(response));
          this.currentUser.set(response);
        }
      }),
      catchError(error => {
        console.error('Error de autenticación', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    const authData = localStorage.getItem(this.TOKEN_KEY);
    if (authData) {
      const response: AuthResponse = JSON.parse(authData);
      return response.token;
    }
    return null;
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null; // En producción se verificaría la expiración
  }

  getRole(): string | null {
    const authData = localStorage.getItem(this.TOKEN_KEY);
    if (authData) {
      const response: AuthResponse = JSON.parse(authData);
      return response.rol;
    }
    return null;
  }

  private loadTokenFromStorage(): void {
    const authData = localStorage.getItem(this.TOKEN_KEY);
    if (authData) {
      try { this.currentUser.set(JSON.parse(authData)); } catch(e) { console.error("Error parsing token", e); localStorage.removeItem(this.TOKEN_KEY); }
    }
  }
}
