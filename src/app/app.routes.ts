import { Routes } from '@angular/router';
import { Iniciarsesion } from './Pages/iniciarsesion/iniciarsesion';
import { DashboboardAdmin } from './Pages/dashboboard-admin/dashboboard-admin';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Iniciarsesion },
  { path: 'admin/dashboard', component: DashboboardAdmin, canActivate: [authGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];
