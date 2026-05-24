import { Routes } from '@angular/router';
import { AdminComponent } from './pages/admin/admin.component';
import { ManualOrderComponent } from './pages/manual-order/manual-order.component';
import { DriverComponent } from './pages/driver/driver.component';
import { LoginComponent } from './pages/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: AdminComponent },
  { path: 'cargar', component: ManualOrderComponent },
  { path: 'chofer/:routeId', component: DriverComponent },
  { path: '**', redirectTo: '' }
];
