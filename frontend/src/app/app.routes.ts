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

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: AdminComponent },
  { path: 'cargar', component: ManualOrderComponent },
  { path: 'rutas', component: RoutesComponent },
  { path: 'historial', component: HistoryComponent },
  { path: 'usuarios', component: UsersComponent },
  { path: 'ruta/:routeId', component: RouteReviewComponent },
  { path: 'chofer', component: DriverRoutesComponent },
  { path: 'chofer/:routeId', component: DriverComponent },
  { path: '**', redirectTo: '' }
];
