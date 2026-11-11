import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

function resolveRequiredRoles(route: ActivatedRouteSnapshot): string[] | undefined {
  let current: ActivatedRouteSnapshot | null = route;
  while (current) {
    const roles = current.data?.['roles'] as string[] | undefined;
    if (roles && roles.length > 0) {
      return roles;
    }
    current = current.parent ?? null;
  }
  return undefined;
}

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Si la ruta (o su ruta padre en canActivateChild) requiere roles específicos
    const requiredRoles = resolveRequiredRoles(route);
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
