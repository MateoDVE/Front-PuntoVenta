import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { VendedorNavbar } from '../../../components/vendedor-navbar/vendedor-navbar';
import { ApiService, CierreJornadaResponse, InventarioAsignacion, Producto, Usuario } from '../../../services/api.service';
import { ProductosService } from '../../../services/productos.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface ProductoTransporte {
  idProducto: string;
  nombre: string;
  cantidad: number;
  precio: number;
}

@Component({
  selector: 'app-dashboard-vendedor',
  standalone: true,
  imports: [CommonModule, VendedorNavbar, TranslateModule],
  templateUrl: './dashboard-vendedor.html',
  styleUrls: ['./dashboard-vendedor.scss']
})
export class DashboardVendedor implements OnInit {
  perfil: Usuario | null = null;
  productosCatalogo: Producto[] = [];
  cargas: InventarioAsignacion[] = [];
  cierreData: CierreJornadaResponse | null = null;

  cargando = false;
  confirmando = '';
  errorMensaje = '';
  exitoMensaje = '';

  constructor(private apiService: ApiService, private translate: TranslateService, private productosService: ProductosService) {
    const idioma = localStorage.getItem('idioma') || 'es';
    this.translate.setDefaultLang('es');
    this.translate.use(idioma);
  }

  ngOnInit(): void {
    this.cargarDashboard();
  }

  private getFechaHoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  cargarDashboard(): void {
    this.cargando = true;
    this.errorMensaje = '';
    const fechaHoy = this.getFechaHoy();

    this.apiService.getMyProfile().subscribe({
      next: (perfil) => {
        this.perfil = perfil;

        forkJoin({
          productos: this.productosService.getProductos(),
          cargas: this.apiService.getInventarioVendedor(perfil.id_usuario),
          cierre: this.apiService.getCierreJornada(perfil.id_usuario, fechaHoy).pipe(
            catchError(() => of(null))
          ),
        }).subscribe({
          next: ({ productos, cargas, cierre }) => {
            this.productosCatalogo = productos;
            this.cargas = cargas;
            this.cierreData = cierre;
            this.cargando = false;
          },
          error: (error) => {
            this.errorMensaje = error?.error?.message ?? this.translate.instant('VENDEDOR.DASHBOARD.CANNOT_LOAD_DASHBOARD');
            this.cargando = false;
          },
        });
      },
      error: (error) => {
        this.errorMensaje = error?.error?.message ?? this.translate.instant('VENDEDOR.DASHBOARD.CANNOT_LOAD_PROFILE');
        this.cargando = false;
      },
    });
  }

  confirmarCarga(idCarga: string): void {
    this.confirmando = idCarga;
    this.errorMensaje = '';
    this.exitoMensaje = '';

    this.apiService.confirmarSalidaVendedor(idCarga).subscribe({
      next: () => {
        this.exitoMensaje = this.translate.instant('VENDEDOR.DASHBOARD.LOAD_CONFIRMED', { idCarga });
        this.confirmando = '';
        this.cargarDashboard();
      },
      error: (error) => {
        this.errorMensaje = error?.error?.message ?? this.translate.instant('VENDEDOR.DASHBOARD.CANNOT_CONFIRM_LOAD');
        this.confirmando = '';
      },
    });
  }

  get fechaActual(): Date {
    return new Date();
  }

  get pendientesAdmin(): InventarioAsignacion[] {
    return this.cargas.filter((carga) => this.normalizarEstado(carga.estado_validacion) === 'PENDIENTE');
  }

  get listosParaConfirmar(): InventarioAsignacion[] {
    return this.cargas.filter((carga) => this.normalizarEstado(carga.estado_validacion) === 'VALIDADO_ADMIN');
  }

  get stockTransporte(): ProductoTransporte[] {
    // Suma de cantidad_actual para cargas VALIDADO
    const acumulado = new Map<string, ProductoTransporte>();
    const fechaHoy = this.getFechaHoy();

    for (const carga of this.cargas) {
      if (this.normalizarEstado(carga.estado_validacion) !== 'VALIDADO') continue;
      if (carga.fecha_asignacion && String(carga.fecha_asignacion).substring(0, 10) !== fechaHoy) continue;

      const idProducto = String(carga.id_producto);
      const producto = this.productosCatalogo.find(p => String(p.id_producto) === idProducto);
      const existente = acumulado.get(idProducto);
      const cantidad = carga.cantidad_actual ?? 0;

      if (existente) {
        existente.cantidad += cantidad;
      } else {
        acumulado.set(idProducto, {
          idProducto,
          nombre: producto?.nombre ?? `Producto ${idProducto}`,
          cantidad: cantidad,
          precio: producto?.precio_unidad ?? 0,
        });
      }
    }

    return [...acumulado.values()];
  }

  get stockActual(): number {
    return this.stockTransporte.reduce((sum, item) => sum + item.cantidad, 0);
  }

  get ultimasVentas() {
    const ventas = this.cierreData?.resumenFinanciero.detalleVentas ?? [];
    return [...ventas].reverse().slice(0, 5);
  }

  get ventasHoy(): number {
    return this.cierreData?.resumenFinanciero.ventasRealizadas ?? 0;
  }

  get ingresos(): number {
    const raw = this.cierreData?.resumenFinanciero.totalEfectivo ?? 0;
    return Math.round(raw * 100) / 100;
  }

  getNombreProducto(idProducto: string): string {
    const producto = this.productosCatalogo.find((item) => String(item.id_producto) === String(idProducto));
    return producto?.nombre ?? `Producto ${idProducto}`;
  }

  translateEstado(estado: string | null | undefined): string {
    const key = `VENDEDOR.STATUS.${this.normalizarEstado(estado)}`;
    const translation = this.translate.instant(key);
    return translation !== key ? translation : estado ?? '';
  }

  private normalizarEstado(estado: string | null | undefined): string {
    return (estado ?? '').trim().toUpperCase();
  }
}
