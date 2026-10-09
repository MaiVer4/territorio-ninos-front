import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el backend responde 401 y no es petición de autenticación (login/logout)
      const isAuthUrl = req.url.includes('/auth/login') || req.url.includes('/auth/logout');
      if (error.status === 401 && !isAuthUrl) {
        // Cierre preventivo forzado inmediato sin disparar llamada HTTP circular
        authService.logout(true);
      }
      return throwError(() => error);
    })
  );
};
