import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import {
  ApiService,
  InventarioAsignacion,
  Producto,
  VendedorBackend,
} from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { catchError, forkJoin, of } from 'rxjs';

interface ProductoAsignacion {
  id: string;
  nombre: string;
  disponible: number;
  cantidadAsignar: number;
}

interface ItemTransporte {
  idCarga: string;
  nombre: string;
  cantidad: number;
  estado: string;
}

interface TransporteStock {
  vendedorId: string;
  vendedor: string;
  totalItems: number;
  items: ItemTransporte[];
}

@Component({
  selector: 'app-asignacion',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbar],
  templateUrl: './asignacion.html',
  styleUrl: './asignacion.scss',
})
export class Asignacion implements OnInit {
  vendedores: VendedorBackend[] = [];
  selectedVendedorId = '';

  productos: ProductoAsignacion[] = [];
  stockPorTransporte: TransporteStock[] = [];

  cargando = false;
  guardando = false;
  cargandoStockInicial = false;
  validandoCarga = '';
  errorMensaje = '';
  exitoMensaje = '';

  stockInicialProductoId = '';
  stockInicialCantidad = 0;

  private productosCatalogo: Producto[] = [];

  constructor(
    private authService: AuthService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.errorMensaje = '';

    forkJoin({
      vendedores: this.apiService.getVendedores(),
      productos: this.apiService.getProductos(),
    }).subscribe({
      next: ({ vendedores, productos }) => {
        this.vendedores = vendedores;
        this.productosCatalogo = productos;

        this.productos = productos.map((producto) => ({
          id: String(producto.id_producto ?? ''),
          nombre: producto.nombre,
          disponible: producto.stock_almacen_central ?? 0,
          cantidadAsignar: 0,
        }));

        if (!this.selectedVendedorId && this.vendedores.length > 0) {
          this.selectedVendedorId = this.vendedores[0].id_usuario;
        }

        if (!this.stockInicialProductoId && this.productos.length > 0) {
          this.stockInicialProductoId = this.productos[0].id;
        }

        this.cargarStockPorTransporte();
      },
      error: (error) => {
        this.errorMensaje = error?.error?.message ?? 'No se pudo cargar la información de asignación.';
        this.cargando = false;
      },
    });
  }

  cargarStockPorTransporte(): void {
    if (this.vendedores.length === 0) {
      this.stockPorTransporte = [];
      this.cargando = false;
      return;
    }

    const consultas = this.vendedores.map((vendedor) =>
      this.apiService.getInventarioVendedor(vendedor.id_usuario).pipe(catchError(() => of([] as InventarioAsignacion[])))
    );

    forkJoin(consultas).subscribe({
      next: (resultados) => {
        this.stockPorTransporte = this.vendedores.map((vendedor, index) =>
          this.mapStockVendedor(vendedor, resultados[index])
        );
        this.cargando = false;
      },
      error: () => {
        this.stockPorTransporte = [];
        this.cargando = false;
      },
    });
  }

  onAsignarStock(): void {
    this.exitoMensaje = '';
    this.errorMensaje = '';

    if (!this.selectedVendedorId) {
      this.errorMensaje = 'Selecciona un vendedor para asignar stock.';
      return;
    }

    const asignaciones = this.productos
      .filter((producto) => producto.cantidadAsignar > 0)
      .map((producto) => ({
        idVendedor: this.selectedVendedorId,
        idProducto: producto.id,
        cantidad: producto.cantidadAsignar,
      }));

    if (asignaciones.length === 0) {
      this.errorMensaje = 'Ingresa al menos una cantidad mayor a cero.';
      return;
    }

    this.guardando = true;

    forkJoin(asignaciones.map((payload) => this.apiService.asignarStock(payload))).subscribe({
      next: () => {
        this.exitoMensaje = 'Asignación registrada correctamente.';
        this.productos = this.productos.map((producto) => ({ ...producto, cantidadAsignar: 0 }));
        this.cargarDatos();
        this.guardando = false;
      },
      error: (error) => {
        this.errorMensaje = error?.error?.message ?? 'No se pudo registrar la asignación.';
        this.guardando = false;
      },
    });
  }

  validarCargaAdmin(idCarga: string): void {
    this.validandoCarga = idCarga;
    this.errorMensaje = '';
    this.exitoMensaje = '';

    this.apiService.validarAsignacionAdmin(idCarga).subscribe({
      next: () => {
        this.exitoMensaje = `Carga ${idCarga} validada por administrador.`;
        this.cargarStockPorTransporte();
        this.validandoCarga = '';
      },
      error: (error) => {
        this.errorMensaje = error?.error?.message ?? 'No se pudo validar la carga seleccionada.';
        this.validandoCarga = '';
      },
    });
  }

  onSignOut(): void {
    this.authService.signOut().subscribe();
  }

  onCargarStockInicial(): void {
    this.errorMensaje = '';
    this.exitoMensaje = '';

    if (!this.stockInicialProductoId) {
      this.errorMensaje = 'Selecciona un producto para la carga inicial.';
      return;
    }

    if (!this.stockInicialCantidad || this.stockInicialCantidad <= 0) {
      this.errorMensaje = 'La cantidad de stock inicial debe ser mayor a cero.';
      return;
    }

    this.cargandoStockInicial = true;

    this.apiService
      .cargarStockInicial({
        idProducto: this.stockInicialProductoId,
        cantidad: this.stockInicialCantidad,
      })
      .subscribe({
        next: () => {
          this.exitoMensaje = 'Carga inicial registrada correctamente.';
          this.stockInicialCantidad = 0;
          this.cargarDatos();
          this.cargandoStockInicial = false;
        },
        error: (error) => {
          this.errorMensaje = error?.error?.message ?? 'No se pudo registrar la carga inicial.';
          this.cargandoStockInicial = false;
        },
      });
  }

  private mapStockVendedor(vendedor: VendedorBackend, asignaciones: InventarioAsignacion[]): TransporteStock {
    const items = asignaciones.map((asignacion) => {
      const producto = this.productosCatalogo.find(
        (item) => String(item.id_producto) === String(asignacion.id_producto)
      );

      return {
        idCarga: asignacion.id_carga,
        nombre: producto?.nombre ?? `Producto ${asignacion.id_producto}`,
        cantidad: asignacion.cantidad_inicial,
        estado: (asignacion.estado_validacion ?? '').toUpperCase(),
      };
    });

    const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

    return {
      vendedorId: vendedor.id_usuario,
      vendedor: vendedor.nombre,
      totalItems,
      items,
    };
  }
}
