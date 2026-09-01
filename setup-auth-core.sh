#!/bin/bash
set -e

# 1. Update Environments (remove /v1 as Backend uses /api/auth)
cat << 'ENV' > src/environments/environment.ts
export const environment = {
  production: true,
  apiUrl: 'http://localhost:8080/api'
};
ENV
cat << 'ENVDEV' > src/environments/environment.development.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api'
};
ENVDEV

# 2. Models
mkdir -p src/app/core/models
cat << 'MODEL' > src/app/core/models/auth.model.ts
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
MODEL

# 3. AuthService
cat << 'SERVICE' > src/app/core/services/auth.service.ts
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
      this.currentUser.set(JSON.parse(authData));
    }
  }
}
SERVICE

# 4. JWT Interceptor (Functional)
cat << 'INTERCEPTOR' > src/app/core/interceptors/jwt.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedReq);
  }

  return next(req);
};
INTERCEPTOR

# 5. Auth Guard (Functional)
cat << 'GUARD' > src/app/core/guards/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Si la ruta requiere roles específicos
    const requiredRoles = route.data['roles'] as Array<string>;
    if (requiredRoles) {
      const userRole = authService.getRole();
      if (userRole && requiredRoles.includes(userRole)) {
        return true;
      }
      // Sin permisos
      return router.createUrlTree(['/unauthorized']);
    }
    return true; // Autenticado, sin restricción de rol
  }

  // No autenticado
  return router.createUrlTree(['/login']);
};
GUARD

# 6. Update app.config.ts to inject HttpClient and Interceptor
cat << 'CONFIGTS' > src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    provideAnimationsAsync()
  ]
};
CONFIGTS

git add .
git commit -m "feat: implement auth service, jwt interceptor and role-based guards"

echo "Auth Core implementado exitosamente."
