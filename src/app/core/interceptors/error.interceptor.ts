import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService, { optional: true });

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el backend responde 401 y no es petición de autenticación (login/logout)
      const isAuthUrl = req.url.includes('/auth/login') || req.url.includes('/auth/logout');
      if (error.status === 401 && !isAuthUrl) {
        // Cierre preventivo forzado inmediato sin disparar llamada HTTP circular
        authService.logout(true);
      } else if (error.status === 403) {
        const mensaje = error.error?.mensaje || error.error?.detalles || 'Acceso denegado: No tienes permisos suficientes para realizar esta acción.';
        notificationService?.error(mensaje);
      }
      return throwError(() => error);
    })
  );
};
