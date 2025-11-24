import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * HTTP interceptor that automatically adds the Bearer token to all HTTP requests
 * Uses the access token from AuthService for authentication
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken;
  
  if (token) {
    req = req.clone({ 
      setHeaders: { 
        Authorization: `Bearer ${token}` 
      } 
    });
  }
  
  return next(req);
};
