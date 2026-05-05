import { Routes } from '@angular/router';
import { Iniciarsesion } from './Pages/iniciarsesion/iniciarsesion';
import { DashboboardAdmin } from './Pages/admin/dashboboard-admin/dashboboard-admin';
import { GestionVendedoresComponent } from './Pages/admin/gestion-vendedores/gestion-vendedores';
import { GestionClientesComponent } from './Pages/admin/gestion-clientes/gestion-clientes';
import { authGuard } from './guards/auth.guard';
import { Catalogo } from './Pages/admin/catalogo/catalogo';
import { DashboardVendedor } from './Pages/vendedor/dashboard-vendedor';
import { Mapa } from './Pages/vendedor/mapa/mapa';
import { Asignacion } from './Pages/admin/asignacion/asignacion';
import { VentaVendedorComponent } from './Pages/vendedor/venta-vendedor/venta-vendedor';
import { CierreVendedor } from './Pages/vendedor/cierre-vendedor/cierre-vendedor';

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
    path: 'admin/gestion-clientes',
    component: GestionClientesComponent,
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

  { path: 'vendedor/dashboard', component: DashboardVendedor, canActivate: [authGuard], data: { roles: ['vendedor'] } },

  { path: 'vendedor/mapa', component: Mapa, canActivate: [authGuard], data: { roles: ['vendedor'] } },

  { path: 'vendedor/venta', component: VentaVendedorComponent, canActivate: [authGuard], data: { roles: ['vendedor'] } },

  { path: 'vendedor/cierre', component: CierreVendedor, canActivate: [authGuard], data: { roles: ['vendedor'] } },

  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: '**', redirectTo: 'login' }
];
