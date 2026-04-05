import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VendedorNavbar } from '../../../components/vendedor-navbar/vendedor-navbar';
import { ApiService, InventarioAsignacion, Producto, Usuario } from '../../../services/api.service';
import { forkJoin } from 'rxjs';

interface ProductoTransporte {
  idProducto: string;
  nombre: string;
  cantidad: number;
  precio: number;
}

@Component({
  selector: 'app-dashboard-vendedor',
  standalone: true,
  imports: [CommonModule, VendedorNavbar],
  templateUrl: './dashboard-vendedor.html',
  styleUrls: ['./dashboard-vendedor.scss']
})
export class DashboardVendedor implements OnInit {
  perfil: Usuario | null = null;
  productosCatalogo: Producto[] = [];
  cargas: InventarioAsignacion[] = [];

  cargando = false;
  confirmando = '';
  errorMensaje = '';
  exitoMensaje = '';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    this.cargando = true;
    this.errorMensaje = '';

    this.apiService.getMyProfile().subscribe({
      next: (perfil) => {
        this.perfil = perfil;

        forkJoin({
          productos: this.apiService.getProductos(),
          cargas: this.apiService.getInventarioVendedor(perfil.id_usuario),
        }).subscribe({
          next: ({ productos, cargas }) => {
            this.productosCatalogo = productos;
            this.cargas = cargas;
            this.cargando = false;
          },
          error: (error) => {
            this.errorMensaje = error?.error?.message ?? 'No se pudo cargar el inventario del transporte.';
            this.cargando = false;
          },
        });
      },
      error: (error) => {
        this.errorMensaje = error?.error?.message ?? 'No se pudo cargar tu perfil.';
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
        this.exitoMensaje = `Carga ${idCarga} confirmada correctamente.`;
        this.confirmando = '';
        this.cargarDashboard();
      },
      error: (error) => {
        this.errorMensaje = error?.error?.message ?? 'No se pudo confirmar la carga.';
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
    const acumulado = new Map<string, ProductoTransporte>();

    for (const carga of this.cargas) {
      const estado = this.normalizarEstado(carga.estado_validacion);
      if (estado !== 'VALIDADO_ADMIN' && estado !== 'VALIDADO') {
        continue;
      }

      const idProducto = String(carga.id_producto);
      const producto = this.productosCatalogo.find((item) => String(item.id_producto) === idProducto);
      const existente = acumulado.get(idProducto);

      if (existente) {
        existente.cantidad += carga.cantidad_inicial;
        continue;
      }

      acumulado.set(idProducto, {
        idProducto,
        nombre: producto?.nombre ?? `Producto ${idProducto}`,
        cantidad: carga.cantidad_inicial,
        precio: producto?.precio_unidad ?? 0,
      });
    }

    return [...acumulado.values()];
  }

  get stockActual(): number {
    return this.stockTransporte.reduce((acumulado, item) => acumulado + item.cantidad, 0);
  }

  get ventasHoy(): number {
    return 0;
  }

  get ingresos(): number {
    return 0;
  }

  getNombreProducto(idProducto: string): string {
    const producto = this.productosCatalogo.find((item) => String(item.id_producto) === String(idProducto));
    return producto?.nombre ?? `Producto ${idProducto}`;
  }

  private normalizarEstado(estado: string | null | undefined): string {
    return (estado ?? '').trim().toUpperCase();
  }
}
