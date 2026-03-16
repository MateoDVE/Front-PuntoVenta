import { Routes } from '@angular/router';
import { Iniciarsesion } from './Pages/iniciarsesion/iniciarsesion';
import { DashboboardAdmin } from './Pages/admin/dashboboard-admin/dashboboard-admin';
import { GestionVendedoresComponent } from './Pages/admin/gestion-vendedores/gestion-vendedores';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Iniciarsesion },

  { path: 'admin/dashboard', component: DashboboardAdmin, canActivate: [authGuard] },

  { path: 'admin/gestion-vendedores', component: GestionVendedoresComponent, canActivate: [authGuard] },

  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: '**', redirectTo: 'login' }
];
