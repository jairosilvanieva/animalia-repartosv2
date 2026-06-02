import { Routes } from '@angular/router';
import { AdminComponent } from './pages/admin/admin.component';
import { ManualOrderComponent } from './pages/manual-order/manual-order.component';
import { DriverComponent } from './pages/driver/driver.component';
import { LoginComponent } from './pages/login/login.component';
import { RouteReviewComponent } from './pages/route-review/route-review.component';
import { DriverRoutesComponent } from './pages/driver-routes/driver-routes.component';
import { HistoryComponent } from './pages/history/history.component';
import { RoutesComponent } from './pages/routes/routes.component';
import { UsersComponent } from './pages/users/users.component';
import { adminGuard, authGuard, staffGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  // Staff (administrador o local)
  { path: '', component: AdminComponent, canActivate: [staffGuard] },
  { path: 'cargar', component: ManualOrderComponent, canActivate: [staffGuard] },
  { path: 'rutas', component: RoutesComponent, canActivate: [staffGuard] },
  { path: 'historial', component: HistoryComponent, canActivate: [staffGuard] },
  { path: 'ruta/:routeId', component: RouteReviewComponent, canActivate: [staffGuard] },

  // Solo administradores
  { path: 'usuarios', component: UsersComponent, canActivate: [adminGuard] },

  // Choferes (y tambien staff puede ver para supervisar)
  { path: 'chofer', component: DriverRoutesComponent, canActivate: [authGuard] },
  { path: 'chofer/:routeId', component: DriverComponent, canActivate: [authGuard] },

  { path: '**', redirectTo: '' }
];
