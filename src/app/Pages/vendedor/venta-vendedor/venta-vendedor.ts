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
import { PedidosProgramadosService, PedidoProgramado } from '../../../services/pedidos-programados.service';
import { AppModalComponent, AppModalVariant } from '../../../components/app-modal/app-modal.component';

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  subtotal: number;
}

@Component({
  selector: 'app-venta-vendedor',
  standalone: true,
  imports: [CommonModule, FormsModule, VendedorNavbar, TranslateModule, AppModalComponent],
  templateUrl: './venta-vendedor.html',
  styleUrls: ['./venta-vendedor.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class VentaVendedorComponent implements OnInit {

  modalState = {
    open: false,
    title: '',
    message: '',
    variant: 'info' as AppModalVariant
  };

  mostrarMensaje(title: string, message: string, variant: AppModalVariant = 'info'): void {
    this.modalState = {
      open: true,
      title,
      message,
      variant
    };
  }

  cerrarModalMensaje(): void {
    this.modalState.open = false;
  }

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

  pedidosHoy: PedidoProgramado[] = [];
  preventaPendiente: PedidoProgramado | null = null;
  pedidoActivo: PedidoProgramado | null = null;
  mostrarModalReprogramar: boolean = false;
  nuevaFechaReprogramacion: string = '';
  hoy: string = new Date().toISOString().split('T')[0];

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private clientesService: ClientesService,
    private productosService: ProductosService,
    private pedidosService: PedidosProgramadosService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getStoredUser();
    if (user) {
      this.idVendedor = user.id_usuario || (user as any).id || '';
    }
    this.verificarJornada();
  }

  private verificarJornada(): void {
    if (!this.idVendedor) return;

    try {
      const localClosed = localStorage.getItem(`cierre_${this.idVendedor}_${this.fechaHoy}`);
      if (localClosed === 'true') {
        this.jornadaCerrada = true;
        return;
      }
    } catch (e) {}

    this.apiService.getCierresVendedor(this.idVendedor).pipe(
      catchError(() => of([]))
    ).subscribe(cierres => {
      this.jornadaCerrada = cierres.some(c => c.fecha === this.fechaHoy);
      if (this.jornadaCerrada) {
        try {
          localStorage.setItem(`cierre_${this.idVendedor}_${this.fechaHoy}`, 'true');
        } catch (e) {}
      } else {
        this.cargarProductos();
        this.cargarClientes();
        this.cargarPreventasHoy();
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
          if (carga.fecha_asignacion && String(carga.fecha_asignacion).substring(0, 10) !== this.fechaHoy) continue;
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
    this.clienteSeleccionadoId = cliente.id_cliente || (cliente as any).id || '';
    this.busquedaCliente = cliente.nombre_negocio;
    this.mostrarDropdownClientes = false;
    this.clientesFiltrados = [];

    const idCliNum = Number(this.clienteSeleccionadoId);
    this.preventaPendiente = this.pedidosHoy.find(
      p => Number(p.idCliente || (p as any).id_cliente) === idCliNum && (p.estado === 'PENDIENTE' || p.estado === 'EN_RUTA')
    ) || null;
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
    this.preventaPendiente = null;
    this.pedidoActivo = null;
    this.limpiarCarrito();
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

  cambiarCantidad(producto: Producto, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    let nueva = parseInt(input.value, 10);
    if (isNaN(nueva) || nueva < 0) {
      nueva = 0;
    }

    if (nueva > producto.stock_almacen_central) {
      nueva = producto.stock_almacen_central;
      input.value = String(nueva);
    }

    const key = this.getKey(producto);
    this.cantidades.set(key, nueva);
    this.actualizarCarrito(producto, nueva);
  }

  seleccionarTexto(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      input.select();
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

        if (this.pedidoActivo) {
          const pedidoId = this.pedidoActivo.id || (this.pedidoActivo as any).id_pedido_programado || '';
          this.pedidosService.actualizarEstado(pedidoId, 'ENTREGADO').subscribe({
            next: () => {
              console.log('Preventa marcada como ENTREGADA exitosamente');
              this.pedidoActivo = null;
              this.preventaPendiente = null;
              this.cargarPreventasHoy();
            },
            error: (err) => console.error('Error al marcar preventa como entregada:', err)
          });
        }

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

  cargarPreventasHoy(): void {
    if (!this.idVendedor) return;
    this.pedidosService.obtenerPedidos(this.idVendedor, this.fechaHoy).subscribe({
      next: (pedidos) => {
        this.pedidosHoy = pedidos || [];
        // Evitar race condition: si el cliente fue seleccionado antes de que cargaran los pedidos
        const activeClientId = this.clienteSeleccionadoId || this.clienteSeleccionado?.id_cliente || (this.clienteSeleccionado as any)?.id;
        if (activeClientId) {
          const idCliNum = Number(activeClientId);
          this.preventaPendiente = this.pedidosHoy.find(
            p => Number(p.idCliente || (p as any).id_cliente) === idCliNum && 
                 (p.estado === 'PENDIENTE' || p.estado === 'EN_RUTA')
          ) || null;
        }
      },
      error: (err) => {
        console.error('Error al cargar preventas de hoy:', err);
      }
    });
  }

  autocompletarCarrito(): void {
    if (!this.preventaPendiente) return;
    this.limpiarCarrito();
    this.pedidoActivo = this.preventaPendiente;

    const detalles = this.pedidoActivo.detalles || (this.pedidoActivo as any).detalle || [];
    let agregados = 0;
    let sinStockNombres: string[] = [];
    let noCargadoNombres: string[] = [];

    for (const det of detalles) {
      const targetId = String(det.idProducto || (det as any).id_producto);
      const prod = this.productos.find(p => String(p.id_producto ?? p.sku) === targetId);
      if (prod) {
        const cant = Math.min(det.cantidad, prod.stock_almacen_central);
        if (cant > 0) {
          this.cantidades.set(this.getKey(prod), cant);
          this.actualizarCarrito(prod, cant);
          agregados++;
        } else {
          sinStockNombres.push(prod.nombre);
        }
      } else {
        noCargadoNombres.push(targetId);
      }
    }

    if (agregados > 0) {
      this.mostrarModalCarrito = true;
      this.error = '';
      if (sinStockNombres.length > 0 || noCargadoNombres.length > 0) {
        this.mostrarMensaje(
          'Autocompletado Parcial',
          'Algunos productos de la preventa no se agregaron o se agregaron parcialmente por falta de stock disponible en el camión.',
          'warning'
        );
      }
    } else {
      this.mostrarMensaje(
        'Sin Stock en Camión',
        'No se pudo autocompletar el carrito. Los productos de la preventa no están cargados en el inventario de tu camión o tienen stock 0.',
        'error'
      );
    }
  }

  reprogramarPreventa(): void {
    this.nuevaFechaReprogramacion = '';
    this.mostrarModalReprogramar = true;
  }

  confirmarReprogramar(): void {
    if (!this.pedidoActivo || !this.nuevaFechaReprogramacion) return;

    const pedidoId = this.pedidoActivo.id || (this.pedidoActivo as any).id_pedido_programado || '';
    this.pedidosService.actualizarEstado(pedidoId, 'REPROGRAMADO', this.nuevaFechaReprogramacion).subscribe({
      next: () => {
        console.log('Pedido reprogramado con éxito');
        this.mostrarModalReprogramar = false;
        this.mostrarModalCarrito = false;
        this.limpiarCarrito();
        this.pedidoActivo = null;
        this.preventaPendiente = null;
        this.cargarPreventasHoy();
      },
      error: (err) => {
        this.error = 'Error al reprogramar pedido: ' + (err?.error?.message || err?.message);
      }
    });
  }

  rechazarPreventa(): void {
    if (!this.pedidoActivo) return;

    if (confirm('¿Está seguro de que desea rechazar esta preventa?')) {
      const pedidoId = this.pedidoActivo.id || (this.pedidoActivo as any).id_pedido_programado || '';
      this.pedidosService.actualizarEstado(pedidoId, 'RECHAZADO').subscribe({
        next: () => {
          console.log('Pedido rechazado con éxito');
          this.mostrarModalCarrito = false;
          this.limpiarCarrito();
          this.pedidoActivo = null;
          this.preventaPendiente = null;
          this.cargarPreventasHoy();
        },
        error: (err) => {
          this.error = 'Error al rechazar pedido: ' + (err?.error?.message || err?.message);
        }
      });
    }
  }
}
