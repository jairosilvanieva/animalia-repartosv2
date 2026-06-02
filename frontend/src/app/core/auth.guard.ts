import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Guard general: requiere estar logueado.
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigateByUrl('/login');
  return false;
};

// Solo administradores.
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin()) return true;
  router.navigateByUrl(auth.isAuthenticated() ? '/' : '/login');
  return false;
};

// Staff (administrador o local).
export const staffGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isStaff()) return true;
  // Si esta logueado pero no es staff (es chofer), lo mandamos a /chofer.
  if (auth.isAuthenticated()) router.navigateByUrl('/chofer');
  else router.navigateByUrl('/login');
  return false;
};
