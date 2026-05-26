import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { VendedorNavbar } from '../../../components/vendedor-navbar/vendedor-navbar';
import { ApiService, Producto, Cliente, CrearVentaRequest, VentaResponse } from '../../../services/api.service';
import { ClientesService } from '../../../services/clientes.service';
import { ProductosService } from '../../../services/productos.service';
import { AuthService } from '../../../services/auth.service';

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  subtotal: number;
}

@Component({
  selector: 'app-venta-vendedor',
  standalone: true,
  imports: [CommonModule, FormsModule, VendedorNavbar, TranslateModule],
  templateUrl: './venta-vendedor.html',
  styleUrls: ['./venta-vendedor.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class VentaVendedorComponent implements OnInit {

  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  clientes: Cliente[] = [];

  clienteSeleccionadoId: string = '';
  clienteSeleccionado: Cliente | null = null;
  busquedaCliente: string = '';
  clientesFiltrados: Cliente[] = [];
  mostrarDropdownClientes: boolean = false;

  busqueda: string = '';
  cantidades: Map<string, number> = new Map();

  carrito: ItemCarrito[] = [];
  descuento: number = 0;

  mostrarModalCarrito: boolean = false;
  mostrarModalExito: boolean = false;
  ventaConfirmada: VentaResponse | null = null;

  cargando: boolean = false;
  enviandoVenta: boolean = false;
  error: string = '';
  jornadaCerrada: boolean = false;

  idVendedor: string = '';
  readonly fechaHoy: string = this.getFechaHoy();

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private clientesService: ClientesService,
    private productosService: ProductosService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getStoredUser();
    if (user) {
      this.idVendedor = user.id_usuario || '';
    }
    this.verificarJornada();
  }

  private verificarJornada(): void {
    if (!this.idVendedor) return;
    this.apiService.getCierresVendedor(this.idVendedor).pipe(
      catchError(() => of([]))
    ).subscribe(cierres => {
      this.jornadaCerrada = cierres.some(c => c.fecha === this.fechaHoy);
      if (!this.jornadaCerrada) {
        this.cargarProductos();
        this.cargarClientes();
      }
    });
  }

  private getFechaHoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  cargarProductos(): void {
    if (!this.idVendedor) return;
    this.cargando = true;

    forkJoin({
      inventario: this.apiService.getInventarioVendedor(this.idVendedor),
      todos: this.productosService.getProductos()
    }).subscribe({
      next: ({ inventario, todos }) => {
        // Suma de cantidad_actual por producto para cargas VALIDADO
        const cantidadAsignada = new Map<string, number>();
        for (const carga of inventario) {
          if (carga.estado_validacion !== 'VALIDADO') continue;
          const id = String(carga.id_producto);
          cantidadAsignada.set(id, (cantidadAsignada.get(id) ?? 0) + (carga.cantidad_actual ?? 0));
        }

        // Stock actual del vendedor = cantidad_actual asignada
        this.productos = todos
          .filter(p => cantidadAsignada.has(String(p.id_producto ?? p.sku)))
          .map(p => {
            const id = String(p.id_producto ?? p.sku);
            const stock = cantidadAsignada.get(id) ?? 0;
            return { ...p, stock_almacen_central: stock };
          });

        this.productosFiltrados = [...this.productos];
        this.productos.forEach(p => this.cantidades.set(this.getKey(p), 0));
        this.cargando = false;
      },
      error: () => {
        this.error = 'Error al cargar productos';
        this.cargando = false;
      }
    });
  }

  cargarClientes(): void {
    if (!this.idVendedor) return;
    this.clientesService.getClientes(this.idVendedor).subscribe({
      next: (clientes) => {
        this.clientes = clientes.filter(c => c.estado?.toUpperCase() === 'ACTIVO');
      },
      error: () => {}
    });
  }

  getKey(producto: Producto): string {
    return String(producto.id_producto ?? producto.sku);
  }

  getCantidad(producto: Producto): number {
    return this.cantidades.get(this.getKey(producto)) ?? 0;
  }

  filtrarClientes(): void {
    const term = this.busquedaCliente.toLowerCase().trim();
    if (!term) {
      this.clientesFiltrados = [];
      this.mostrarDropdownClientes = false;
      return;
    }
    this.clientesFiltrados = this.clientes.filter(c =>
      c.nombre_negocio.toLowerCase().includes(term) ||
      (c.ci_nit || '').toLowerCase().includes(term)
    );
    this.mostrarDropdownClientes = this.clientesFiltrados.length > 0;
  }

  seleccionarCliente(cliente: Cliente): void {
    this.clienteSeleccionado = cliente;
    this.clienteSeleccionadoId = cliente.id_cliente || '';
    this.busquedaCliente = cliente.nombre_negocio;
    this.mostrarDropdownClientes = false;
    this.clientesFiltrados = [];
  }

  cerrarDropdownClientes(): void {
    setTimeout(() => { this.mostrarDropdownClientes = false; }, 150);
  }

  limpiarCliente(): void {
    this.clienteSeleccionado = null;
    this.clienteSeleccionadoId = '';
    this.busquedaCliente = '';
    this.clientesFiltrados = [];
    this.mostrarDropdownClientes = false;
  }

  buscarProductos(): void {
    const term = this.busqueda.toLowerCase().trim();
    this.productosFiltrados = term
      ? this.productos.filter(p =>
          p.nombre.toLowerCase().includes(term) ||
          (p.descripcion ?? '').toLowerCase().includes(term)
        )
      : [...this.productos];
  }

  incrementar(producto: Producto): void {
    const key = this.getKey(producto);
    const actual = this.cantidades.get(key) ?? 0;
    if (actual < producto.stock_almacen_central) {
      const nueva = actual + 1;
      this.cantidades.set(key, nueva);
      this.actualizarCarrito(producto, nueva);
    }
  }

  decrementar(producto: Producto): void {
    const key = this.getKey(producto);
    const actual = this.cantidades.get(key) ?? 0;
    if (actual > 0) {
      const nueva = actual - 1;
      this.cantidades.set(key, nueva);
      this.actualizarCarrito(producto, nueva);
    }
  }

  private actualizarCarrito(producto: Producto, cantidad: number): void {
    const key = this.getKey(producto);
    const idx = this.carrito.findIndex(i => this.getKey(i.producto) === key);
    if (cantidad === 0) {
      if (idx >= 0) this.carrito.splice(idx, 1);
    } else {
      const item: ItemCarrito = {
        producto,
        cantidad,
        subtotal: producto.precio_unidad * cantidad
      };
      if (idx >= 0) this.carrito[idx] = item;
      else this.carrito.push(item);
    }
  }

  get totalItems(): number {
    return this.carrito.reduce((s, i) => s + i.cantidad, 0);
  }

  get subtotalCarrito(): number {
    return this.carrito.reduce((s, i) => s + i.subtotal, 0);
  }

  get totalFinal(): number {
    return Math.max(0, this.subtotalCarrito - (this.descuento || 0));
  }

  abrirModalCarrito(): void {
    if (this.carrito.length > 0) this.mostrarModalCarrito = true;
  }

  cerrarModalCarrito(): void {
    this.mostrarModalCarrito = false;
    this.error = '';
  }

  eliminarDelCarrito(item: ItemCarrito): void {
    this.cantidades.set(this.getKey(item.producto), 0);
    this.actualizarCarrito(item.producto, 0);
  }

  confirmarVenta(): void {
    if (!this.clienteSeleccionadoId) {
      this.error = 'Selecciona un cliente para continuar';
      return;
    }
    this.error = '';
    this.enviandoVenta = true;

    const payload: CrearVentaRequest = {
      idCliente: Number(this.clienteSeleccionadoId),
      idVendedor: this.idVendedor,
      descuento: this.descuento || 0,
      items: this.carrito.map(i => ({
        idProducto: this.getKey(i.producto),
        cantidad: i.cantidad,
        tipoUnidad: 'UNIDAD'
      }))
    };

    this.apiService.crearVenta(payload).subscribe({
      next: (venta) => {
        this.ventaConfirmada = venta;
        this.mostrarModalCarrito = false;
        this.mostrarModalExito = true;
        this.limpiarCarrito();
        this.enviandoVenta = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al procesar la venta. Intenta de nuevo.';
        this.enviandoVenta = false;
      }
    });
  }

  private limpiarCarrito(): void {
    this.carrito = [];
    this.descuento = 0;
    this.productos.forEach(p => this.cantidades.set(this.getKey(p), 0));
  }

  nuevaVenta(): void {
    this.mostrarModalExito = false;
    this.ventaConfirmada = null;
    this.limpiarCliente();
    this.cargarProductos();
  }

  trackByKey(_: number, producto: Producto): string {
    return this.getKey(producto);
  }
}
