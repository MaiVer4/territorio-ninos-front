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

  // No autenticado: preservar URL solicitada para redirección posterior
  return router.createUrlTree(['/login'], { 
    queryParams: state?.url ? { returnUrl: state.url } : undefined 
  });
};
