import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { AdminNavbar } from '../../components/admin-navbar/admin-navbar';

interface DashboardMetric {
  title: string;
  value: string;
  detail: string;
}

interface ProductStock {
  nombre: string;
  categoria: string;
  unidades: number;
  precio: string;
}

interface SellerStatus {
  nombre: string;
  vehiculo: string;
  stock: number;
  ventas: number;
  total: string;
}

@Component({
  selector: 'app-dashboboard-admin',
  standalone: true,
  imports: [CommonModule, AdminNavbar],
  templateUrl: './dashboboard-admin.html',
  styleUrl: './dashboboard-admin.scss',
})
export class DashboboardAdmin {
  metrics: DashboardMetric[] = [
    { title: 'Productos en Catalogo', value: '5', detail: '+2 este mes' },
    { title: 'Clientes Registrados', value: '2', detail: '2 activos' },
    { title: 'Vendedores Activos', value: '2', detail: 'En ruta' },
    { title: 'Ingresos del Dia', value: 'Bs. 0.00', detail: '0 ventas' },
  ];

  stocks: ProductStock[] = [
    { nombre: 'Coca Cola 2L', categoria: 'Bebidas', unidades: 500, precio: 'Bs. 15.5' },
    { nombre: 'Agua Vital 2L', categoria: 'Bebidas', unidades: 800, precio: 'Bs. 6' },
    { nombre: 'Papas Lays 150g', categoria: 'Snacks', unidades: 300, precio: 'Bs. 8.5' },
    { nombre: 'Galletas Oreo', categoria: 'Snacks', unidades: 250, precio: 'Bs. 12' },
    { nombre: 'Leche Pil 1L', categoria: 'Lacteos', unidades: 400, precio: 'Bs. 10' },
  ];

  sellers: SellerStatus[] = [
    { nombre: 'Juan Perez', vehiculo: 'Camion A-123', stock: 225, ventas: 0, total: 'Bs. 0.00' },
    { nombre: 'Maria Lopez', vehiculo: 'Camion B-456', stock: 270, ventas: 0, total: 'Bs. 0.00' },
  ];

  constructor(private authService: AuthService) {}

  onSignOut() {
    this.authService.signOut().subscribe();
  }

}
