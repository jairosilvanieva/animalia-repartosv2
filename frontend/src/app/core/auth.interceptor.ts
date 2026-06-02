import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = localStorage.getItem('animalia_token');

  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((err) => {
      // Token expirado o invalido => deslogueamos y mandamos al login.
      if (err instanceof HttpErrorResponse && err.status === 401) {
        auth.user.set(null);
        localStorage.removeItem('animalia_token');
        localStorage.removeItem('animalia_user');
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    })
  );
};
