import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
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
