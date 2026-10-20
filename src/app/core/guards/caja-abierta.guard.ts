import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CajaService } from '../services/caja.service';
import { NotificationService } from '../services/notification.service';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const cajaAbiertaGuard: CanActivateFn = (route, state) => {
  const cajaService = inject(CajaService);
  const router = inject(Router);
  const notificationService = inject(NotificationService, { optional: true });

  return cajaService.verificarCajaAbierta().pipe(
    map(estaAbierta => {
      if (estaAbierta) {
        return true;
      }
      notificationService?.warn('Debes realizar la apertura de caja antes de ingresar al punto de venta.');
      return router.createUrlTree(['/taquilla/apertura']);
    }),
    catchError(() => {
      notificationService?.warn('No se pudo verificar el estado de la caja. Por favor verifica tu turno.');
      return of(router.createUrlTree(['/taquilla/apertura']));
    })
  );
};
