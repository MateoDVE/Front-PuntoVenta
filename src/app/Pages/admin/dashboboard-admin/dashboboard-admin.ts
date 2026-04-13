import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { ApiService, Producto, VendedorBackend } from '../../../services/api.service';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';

interface DashboardMetric {
  title: string;
  value: string;
  detail: string;
  icon: string;
}

@Component({
  selector: 'app-dashboboard-admin',
  standalone: true,
  imports: [CommonModule, AdminNavbar],
  templateUrl: './dashboboard-admin.html',
  styleUrl: './dashboboard-admin.scss',
})
export class DashboboardAdmin implements OnInit {
  private readonly umbralStockBajo = 100;

  metrics: DashboardMetric[] = [];
  productos: Producto[] = [];
  productosConStockBajo: Producto[] = [];
  vendedores: VendedorBackend[] = [];
  
  cargando = true;
  error: string | null = null;

  constructor(
    private authService: AuthService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.error = null;

    // Cargar productos y vendedores en paralelo
    Promise.all([
      this.cargarProductos(),
      this.cargarVendedores(),
      this.cargarProductosStockBajo(),
    ])
      .then(() => {
        this.actualizarMetricas();
        this.cargando = false;
      })
      .catch((err) => {
        console.error('Error al cargar datos:', err);
        this.error = 'Error al cargar los datos del dashboard';
        this.cargando = false;
      });
  }

  cargarProductos(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.getProductos().subscribe({
        next: (datos) => {
          this.productos = datos;
          resolve();
        },
        error: (err) => {
          console.error('Error al cargar productos:', err);
          this.productos = [];
          reject(err);
        },
      });
    });
  }

  cargarVendedores(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.getVendedores().subscribe({
        next: (datos) => {
          this.vendedores = datos;
          resolve();
        },
        error: (err) => {
          console.error('Error al cargar vendedores:', err);
          this.vendedores = [];
          reject(err);
        },
      });
    });
  }

  cargarProductosStockBajo(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.getProductosStockBajo(this.umbralStockBajo).subscribe({
        next: (datos) => {
          this.productosConStockBajo = datos;
          resolve();
        },
        error: (err) => {
          console.error('Error al cargar alertas de stock bajo:', err);
          this.productosConStockBajo = [];
          reject(err);
        },
      });
    });
  }

  actualizarMetricas(): void {
    const totalStockProductos = this.productos.reduce(
      (sum, p) => sum + (p.stock_almacen_central || 0),
      0
    );

    const totalProductosValor = this.productos.reduce(
      (sum, p) => sum + (p.stock_almacen_central || 0) * p.precio_unidad,
      0
    );

    this.metrics = [
      {
        title: 'Productos en Catálogo',
        value: this.productos.length.toString(),
        detail: `${totalStockProductos} unidades en almacén`,
        icon: 'icon-products',
      },
      {
        title: 'Vendedores Registrados',
        value: this.vendedores.length.toString(),
        detail: `${this.vendedores.filter((v) => String(v.estado).trim().toLowerCase() === 'activo').length} activos`,
        icon: 'icon-vendors',
      },
      {
        title: 'Stock Total',
        value: totalStockProductos.toString(),
        detail: `Valor: Bs. ${totalProductosValor.toFixed(2)}`,
        icon: 'icon-stock',
      },
      {
        title: 'Proyectos de Venta',
        value: '0',
        detail: 'Sin ventas registradas',
        icon: 'icon-sales',
      },
    ];
  }

  onSignOut(): void {
    this.authService.signOut().subscribe();
  }
}
