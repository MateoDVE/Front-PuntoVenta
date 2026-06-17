import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ApiService,
  InventarioAsignacion,
  Producto,
  VendedorBackend,
} from '../../../services/api.service';
import { VendedoresService } from '../../../services/vendedores.service';
import { ProductosService } from '../../../services/productos.service';
import { AuthService } from '../../../services/auth.service';
import { PedidosProgramadosService } from '../../../services/pedidos-programados.service';
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
  imports: [CommonModule, FormsModule, AdminNavbar, TranslateModule],
  templateUrl: './asignacion.html',
  styleUrl: './asignacion.scss',
})
export class Asignacion implements OnInit {
  vendedores: VendedorBackend[] = [];
  selectedVendedorId = '';
  busquedaVendedor = '';

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
  fechaAsignacion: string = new Date().toISOString().split('T')[0];
  preventasConsolidadas: Map<string, number> = new Map();

  private productosCatalogo: Producto[] = [];

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private translate: TranslateService,
    private vendedoresService: VendedoresService,
    private productosService: ProductosService,
    private pedidosService: PedidosProgramadosService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.errorMensaje = '';

    forkJoin({
      vendedores: this.vendedoresService.getVendedores(),
      productos: this.productosService.getProductos(),
    }).subscribe({
      next: ({ vendedores, productos }) => {
        this.vendedores = vendedores;
        this.productosCatalogo = productos;
        this.busquedaVendedor = '';

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
        this.cargarPreventas();
      },
      error: (error) => {
        this.errorMensaje = error?.error?.message ?? this.translate.instant('ADMIN.ASIGNACION.ERROR.LOAD_ASSIGNMENT_INFO');
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

  get vendedoresFiltrados(): VendedorBackend[] {
    const termino = this.busquedaVendedor.trim().toLowerCase();
    if (!termino) {
      return this.vendedores;
    }

    return this.vendedores.filter((vendedor) =>
      vendedor.nombre.toLowerCase().includes(termino) ||
      vendedor.email.toLowerCase().includes(termino)
    );
  }

  onAsignarStock(): void {
    this.exitoMensaje = '';
    this.errorMensaje = '';

    if (!this.selectedVendedorId) {
      this.errorMensaje = this.translate.instant('ADMIN.ASIGNACION.ERROR.SELECT_SELLER');
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
      this.errorMensaje = this.translate.instant('ADMIN.ASIGNACION.ERROR.ENTER_QUANTITY');
      return;
    }

    this.guardando = true;

    forkJoin(asignaciones.map((payload) => this.apiService.asignarStock(payload))).subscribe({
      next: () => {
        this.exitoMensaje = this.translate.instant('ADMIN.ASIGNACION.SUCCESS.ASSIGNMENT_REGISTERED');
        this.productos = this.productos.map((producto) => ({ ...producto, cantidadAsignar: 0 }));
        this.cargarDatos();
        this.guardando = false;
      },
      error: (error) => {
        this.errorMensaje = error?.error?.message ?? this.translate.instant('ADMIN.ASIGNACION.ERROR.REGISTER_ASSIGNMENT');
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
        this.exitoMensaje = this.translate.instant('ADMIN.ASIGNACION.SUCCESS.LOAD_VALIDATED', { idCarga });
        this.cargarStockPorTransporte();
        this.validandoCarga = '';
      },
      error: (error) => {
        this.errorMensaje = error?.error?.message ?? this.translate.instant('ADMIN.ASIGNACION.ERROR.VALIDATE_LOAD');
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
      this.errorMensaje = this.translate.instant('ADMIN.ASIGNACION.ERROR.SELECT_PRODUCT_INITIAL_STOCK');
      return;
    }

    if (!this.stockInicialCantidad || this.stockInicialCantidad <= 0) {
      this.errorMensaje = this.translate.instant('ADMIN.ASIGNACION.ERROR.INVALID_INITIAL_QUANTITY');
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
          this.exitoMensaje = this.translate.instant('ADMIN.ASIGNACION.SUCCESS.INITIAL_STOCK_REGISTERED');
          this.stockInicialCantidad = 0;
          this.cargarDatos();
          this.cargandoStockInicial = false;
        },
        error: (error) => {
          this.errorMensaje = error?.error?.message ?? this.translate.instant('ADMIN.ASIGNACION.ERROR.REGISTER_INITIAL_STOCK');
          this.cargandoStockInicial = false;
        },
      });
  }

  private getFechaHoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private mapStockVendedor(vendedor: VendedorBackend, asignaciones: InventarioAsignacion[]): TransporteStock {
    const fechaFiltro = this.fechaAsignacion || this.getFechaHoy();
    const items = asignaciones
      .filter((asignacion) => {
        if (!asignacion.fecha_asignacion) return false;
        const asignadoHoy = String(asignacion.fecha_asignacion).substring(0, 10) === fechaFiltro;
        const estado = (asignacion.estado_validacion ?? '').toUpperCase();
        const enProceso = estado === 'PENDIENTE' || estado === 'VALIDADO_ADMIN';
        return asignadoHoy || enProceso;
      })
      .map((asignacion) => {
        const producto = this.productosCatalogo.find(
          (item) => String(item.id_producto) === String(asignacion.id_producto)
        );

        const estado = (asignacion.estado_validacion ?? '').toUpperCase();
        // Si está VALIDADO, usamos cantidad_actual; de lo contrario, cantidad_inicial
        const cantidad = estado === 'VALIDADO' ? (asignacion.cantidad_actual ?? 0) : asignacion.cantidad_inicial;

        return {
          idCarga: asignacion.id_carga,
          nombre: producto?.nombre ?? `Producto ${asignacion.id_producto}`,
          cantidad: cantidad,
          estado: estado,
        };
      })
      .filter((item) => item.cantidad > 0 || item.estado !== 'VALIDADO');

    const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

    return {
      vendedorId: vendedor.id_usuario,
      vendedor: vendedor.nombre,
      totalItems,
      items,
    };
  }

  cargarPreventas(): void {
    if (!this.selectedVendedorId || !this.fechaAsignacion) {
      this.preventasConsolidadas.clear();
      this.productos.forEach(p => p.cantidadAsignar = 0);
      return;
    }

    this.pedidosService.obtenerPedidos(this.selectedVendedorId, this.fechaAsignacion).subscribe({
      next: (pedidos) => {
        const consolidadas = new Map<string, number>();
        for (const p of pedidos || []) {
          if (p.estado === 'PENDIENTE' || p.estado === 'EN_RUTA') {
            for (const d of p.detalles || []) {
              const pId = String(d.idProducto);
              const prev = consolidadas.get(pId) ?? 0;
              consolidadas.set(pId, prev + d.cantidad);
            }
          }
        }
        this.preventasConsolidadas = consolidadas;

        // Auto-llenar las cantidades a asignar con los totales de preventa consolidados
        for (const producto of this.productos) {
          producto.cantidadAsignar = consolidadas.get(producto.id) ?? 0;
        }
      },
      error: (err) => {
        console.error('Error al cargar preventas consolidadas:', err);
        this.preventasConsolidadas.clear();
        this.productos.forEach(p => p.cantidadAsignar = 0);
      }
    });
  }

  obtenerPreventaCant(productoId: string): number {
    return this.preventasConsolidadas.get(String(productoId)) ?? 0;
  }
}
