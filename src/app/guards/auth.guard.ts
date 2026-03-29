import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = (route.data?.['roles'] as string[] | undefined)?.map((role) =>
    authService.normalizeRole(role)
  );

  if (!authService.isAuthenticated()) {
    return router.parseUrl('/login');
  }

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const storedRole = authService.getStoredRole();

  if (storedRole) {
    if (allowedRoles.includes(storedRole)) {
      return true;
    }

    return router.parseUrl(authService.getDashboardRouteByRole(storedRole));
  }

  return authService.getCurrentUser().pipe(
    map((user) => {
      authService.persistCurrentUser(user);
      const userRole = authService.normalizeRole(user?.rol);

      if (allowedRoles.includes(userRole)) {
        return true;
      }

      return router.parseUrl(authService.getDashboardRouteByRole(userRole));
    }),
    catchError(() => of(router.parseUrl('/login')))
  );
};
