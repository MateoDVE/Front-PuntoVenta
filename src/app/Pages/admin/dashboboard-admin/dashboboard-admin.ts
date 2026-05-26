import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { ApiService, Producto, VendedorBackend, VentaResumenResponse } from '../../../services/api.service';
import { ProductosService } from '../../../services/productos.service';
import { VendedoresService } from '../../../services/vendedores.service';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface DashboardMetric {
  titleKey: string;
  value: string;
  detailKey: string;
  detailParams?: Record<string, string | number>;
  icon: string;
}

@Component({
  selector: 'app-dashboboard-admin',
  standalone: true,
  imports: [CommonModule, AdminNavbar, TranslateModule],
  templateUrl: './dashboboard-admin.html',
  styleUrls: ['./dashboboard-admin.scss'],
})
export class DashboboardAdmin implements OnInit {
  private readonly umbralStockBajo = 100;

  metrics: DashboardMetric[] = [];
  productos: Producto[] = [];
  productosConStockBajo: Producto[] = [];
  vendedores: VendedorBackend[] = [];
  ventas: VentaResumenResponse[] = [];
  
  cargando = true;
  error: string | null = null;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private translate: TranslateService,
    private productosService: ProductosService,
    private vendedoresService: VendedoresService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.error = null;

    // Cargar productos, vendedores y ventas en paralelo
    Promise.all([
      this.cargarProductos(),
      this.cargarVendedores(),
      this.cargarProductosStockBajo(),
      this.cargarVentas(),
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
      this.productosService.getProductos().subscribe({
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
      this.vendedoresService.getVendedores().subscribe({
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
      this.productosService.getProductosStockBajo(this.umbralStockBajo).subscribe({
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

  cargarVentas(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.getVentas().subscribe({
        next: (datos) => {
          this.ventas = datos;
          resolve();
        },
        error: (err) => {
          console.error('Error al cargar ventas:', err);
          this.ventas = [];
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

    const totalSalesCount = this.ventas.length;
    const totalSalesAmount = this.ventas.reduce(
      (sum, v) => sum + (v.totalEfectivo ?? 0),
      0
    );

    this.metrics = [
      {
        titleKey: 'ADMIN.DASHBOARD.METRIC.CATALOG_TITLE',
        value: this.productos.length.toString(),
        detailKey: 'ADMIN.DASHBOARD.METRIC.CATALOG_DETAIL',
        detailParams: { totalStock: totalStockProductos },
        icon: 'icon-products',
      },
      {
        titleKey: 'ADMIN.DASHBOARD.METRIC.VENDORS_TITLE',
        value: this.vendedores.length.toString(),
        detailKey: 'ADMIN.DASHBOARD.METRIC.VENDORS_DETAIL',
        detailParams: { activeVendors: this.vendedores.filter((v) => String(v.estado).trim().toLowerCase() === 'activo').length },
        icon: 'icon-vendors',
      },
      {
        titleKey: 'ADMIN.DASHBOARD.METRIC.STOCK_TITLE',
        value: totalStockProductos.toString(),
        detailKey: 'ADMIN.DASHBOARD.METRIC.STOCK_DETAIL',
        detailParams: { totalValue: totalProductosValor.toFixed(2) },
        icon: 'icon-stock',
      },
      {
        titleKey: 'ADMIN.DASHBOARD.METRIC.SALES_PROJECTS_TITLE',
        value: `Bs. ${totalSalesAmount.toFixed(2)}`,
        detailKey: 'ADMIN.DASHBOARD.METRIC.SALES_PROJECTS_DETAIL',
        detailParams: { totalSales: totalSalesCount },
        icon: 'icon-sales',
      },
    ];
  }

  onSignOut(): void {
    this.authService.signOut().subscribe();
  }

  private readonly descriptionTermMap: Record<string, string> = {
    'con verduras': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.CON_VERDURAS',
    'extremoo': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.EXTREMOO',
    'de': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.DE',
    'gallina': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.GALLINA',
    'carne': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.CARNE',
    'costilla': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.COSTILLA',
    'picante': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.PICANTE',
    'crocante': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.CROCANTE',
    'pollo': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.POLLO',
    'bolsa': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.BOLSA',
    'unidad': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.UNIDAD',
    'caja': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.CAJA',
    'botella': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.BOTELLA',
    'paquete': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.PAQUETE',
    'bl[ií]ster': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.BLISTER',
    'vaso': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.VASO',
    'tira': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.TIRA',
    'sobres': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.SOBRES'
  };

  translateProductDescription(descripcion: string | undefined | null): string {
    if (!descripcion?.trim()) {
      return this.translate.instant('ADMIN.DASHBOARD.NO_DESCRIPTION');
    }

    let current = descripcion.replace(/Presentaci[oó]n/gi, this.translate.instant('ADMIN.DASHBOARD.DESCRIPTION_PRESENTATION'));

    return Object.entries(this.descriptionTermMap)
      .sort(([a], [b]) => b.length - a.length)
      .reduce((texto, [term, translationKey]) => {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        return texto.replace(regex, this.translate.instant(translationKey));
      }, current);
  }
}
