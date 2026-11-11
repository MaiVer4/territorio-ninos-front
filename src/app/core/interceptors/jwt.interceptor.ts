import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // Evitar inyección en solicitudes hacia dominios externos o assets locales no confiables (OWASP A07)
  const isInternalUrl = (url: string, prefix: string) => url === prefix || url.startsWith(`${prefix}/`);
  const isApiUrl =
    Boolean(environment.apiUrl && isInternalUrl(req.url, environment.apiUrl)) ||
    isInternalUrl(req.url, '/api') ||
    isInternalUrl(req.url, '/territorioninos/api') ||
    (typeof window !== 'undefined' && (
      isInternalUrl(req.url, `${window.location.origin}/api`) ||
      isInternalUrl(req.url, `${window.location.origin}/territorioninos/api`)
    ));
  if (!isApiUrl) {
    return next(req);
  }

  // No adjuntar token en endpoints públicos de autenticación
  if (req.url.includes('/api/auth/login') ||
      req.url.includes('/api/auth/forgot-password') ||
      req.url.includes('/api/auth/reset-password')) {
    return next(req);
  }

  // Evitar inyectar AuthService directamente para prevenir Dependencia Circular
  // con HttpClient (HttpClient -> Interceptor -> AuthService -> HttpClient)
  let token: string | null = null;
  
  try {
    token = localStorage.getItem('tdn_jwt_token');
  } catch (err) {
    console.error('Error accediendo a localStorage en interceptor', err);
  }

  if (token) {
    try {
      const authData = JSON.parse(token);
      if (authData && authData.token) {
        const clonedReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${authData.token}`
          }
        });
        return next(clonedReq);
      }
    } catch (e) {
      console.error('Error parseando token en interceptor', e);
    }
  }

  return next(req);
};
