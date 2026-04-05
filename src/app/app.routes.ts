import { Routes } from '@angular/router';
import { Iniciarsesion } from './Pages/iniciarsesion/iniciarsesion';
import { DashboboardAdmin } from './Pages/admin/dashboboard-admin/dashboboard-admin';
import { GestionVendedoresComponent } from './Pages/admin/gestion-vendedores/gestion-vendedores';
import { authGuard } from './guards/auth.guard';
import { Catalogo } from './Pages/admin/catalogo/catalogo';
import { DashboardVendedor } from './Pages/vendedor/dashboard-vendedor';
import { Asignacion } from './Pages/admin/asignacion/asignacion';

export const routes: Routes = [

  { path: 'login', component: Iniciarsesion },

  {
    path: 'admin/dashboard',
    component: DashboboardAdmin,
    canActivate: [authGuard],
    data: { roles: ['admin', 'administrador'] }
  },

  {
    path: 'admin/gestion-vendedores',
    component: GestionVendedoresComponent,
    canActivate: [authGuard],
    data: { roles: ['admin', 'administrador'] }
  },

  {
    path: 'admin/catalogo',
    component: Catalogo,
    canActivate: [authGuard],
    data: { roles: ['admin', 'administrador'] }
  },
  
  {
    path: 'admin/asignacion',
    component: Asignacion,
    canActivate: [authGuard],
    data: { roles: ['admin', 'administrador'] }
  },

  { path: 'vendedor/dashboard', component: DashboardVendedor, canActivate: [authGuard],data: { roles: ['vendedor'] }},

  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: '**', redirectTo: 'login' }
];
