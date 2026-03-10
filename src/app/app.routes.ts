import { Routes } from '@angular/router';
import { Iniciarsesion } from './Pages/iniciarsesion/iniciarsesion';

export const routes: Routes = [
  { path: 'login', component: Iniciarsesion },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  // Aquí irán tus dashboards protegidos con guards
  // { path: 'dashboard-usuario', component: DashboardUsuario, canActivate: [AuthGuard] },
  // { path: 'dashboard-vendedor', component: DashboardVendedor, canActivate: [AuthGuard] },
];
