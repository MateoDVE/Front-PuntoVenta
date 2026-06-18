import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { PedidosProgramadosService, PedidoProgramado } from '../../../services/pedidos-programados.service';
import { ClientesService } from '../../../services/clientes.service';
import { VendedoresService } from '../../../services/vendedores.service';
import { ProductosService } from '../../../services/productos.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import { AuthService } from '../../../services/auth.service';

interface PedidoConDetalles extends PedidoProgramado {
  expandido?: boolean;
  clienteNombre?: string;
  vendedorNombre?: string;
  mostrarFormReprogramar?: boolean;
  nuevaFechaReprogramar?: string;
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, AdminNavbar],
  templateUrl: './pedidos.html',
  styleUrls: ['./pedidos.scss']
})
export class PedidosAdminComponent implements OnInit {
  pedidosProgramados: PedidoConDetalles[] = [];
  pedidosFiltrados: PedidoConDetalles[] = [];
  vendedores: any[] = [];
  clientes: any[] = [];
  vendedorSeleccionado: string = '';
  estadoSeleccionado: string = '';
  fechaSeleccionada: string = '';
  cargando: boolean = false;
  hoy: string = new Date().toISOString().split('T')[0];

  // Custom filter dropdown states
  mostrarDropdownVendedores: boolean = false;
  mostrarDropdownEstados: boolean = false;

  constructor(
    private pedidosService: PedidosProgramadosService,
    private vendedoresService: VendedoresService,
    private clientesService: ClientesService,
    private productosService: ProductosService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    
    forkJoin({
      vendedores: this.vendedoresService.getVendedores().pipe(catchError(() => of([]))),
      clientes: this.clientesService.getClientes().pipe(catchError(() => of([]))),
      productos: this.productosService.getProductos().pipe(catchError(() => of([]))),
      pedidos: this.pedidosService.obtenerPedidos().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ vendedores, clientes, productos, pedidos }) => {
        this.vendedores = Array.isArray(vendedores) ? vendedores : ((vendedores as any).data || []);
        this.clientes = Array.isArray(clientes) ? clientes : ((clientes as any).data || []);
        const prodList = Array.isArray(productos) ? productos : ((productos as any).data || []);
        
        this.pedidosProgramados = pedidos.map(p => ({
          ...p,
          clienteNombre: this.getClienteNombre(p.idCliente),
          vendedorNombre: this.getVendedorNombre(p.idVendedor),
          detalles: p.detalles.map(d => {
            const prod = prodList.find((pr: any) => String(pr.id_producto ?? pr.sku ?? pr.id) === String(d.idProducto));
            return {
              ...d,
              nombre: prod ? prod.nombre : 'Producto desconocido'
            };
          }),
          expandido: false
        }));
        this.pedidosFiltrados = [...this.pedidosProgramados];
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar datos de pedidos:', error);
        this.cargando = false;
      }
    });
  }

  aplicarFiltros(): void {
    this.pedidosFiltrados = this.pedidosProgramados.filter(pedido => {
      const filtroVendedor = !this.vendedorSeleccionado || pedido.idVendedor === this.vendedorSeleccionado;
      const filtroEstado = !this.estadoSeleccionado || pedido.estado === this.estadoSeleccionado;
      const filtroFecha = !this.fechaSeleccionada || pedido.fechaProgramada === this.fechaSeleccionada;
      return filtroVendedor && filtroEstado && filtroFecha;
    });
  }

  limpiarFiltros(): void {
    this.vendedorSeleccionado = '';
    this.estadoSeleccionado = '';
    this.fechaSeleccionada = '';
    this.pedidosFiltrados = [...this.pedidosProgramados];
  }

  toggleExpander(pedido: PedidoConDetalles): void {
    pedido.expandido = !pedido.expandido;
  }

  getClienteNombre(idCliente: number): string {
    const cliente = this.clientes.find(c => Number(c.id_cliente) === Number(idCliente));
    return cliente ? cliente.nombre_negocio : 'Cliente desconocido';
  }

  getVendedorNombre(idVendedor: string): string {
    if (!idVendedor) return 'Todos';
    const vendedor = this.vendedores.find(v => String(v.id_usuario || v.id) === String(idVendedor));
    return vendedor ? vendedor.nombre : 'Vendedor desconocido';
  }

  // Custom filter dropdown methods
  toggleDropdownVendedores(): void {
    this.mostrarDropdownVendedores = !this.mostrarDropdownVendedores;
  }

  cerrarDropdownVendedoresConDelay(): void {
    setTimeout(() => {
      this.mostrarDropdownVendedores = false;
    }, 200);
  }

  seleccionarVendedor(id: string): void {
    this.vendedorSeleccionado = id;
    this.mostrarDropdownVendedores = false;
    this.aplicarFiltros();
  }

  toggleDropdownEstados(): void {
    this.mostrarDropdownEstados = !this.mostrarDropdownEstados;
  }

  cerrarDropdownEstadosConDelay(): void {
    setTimeout(() => {
      this.mostrarDropdownEstados = false;
    }, 200);
  }

  seleccionarEstado(estado: string): void {
    this.estadoSeleccionado = estado;
    this.mostrarDropdownEstados = false;
    this.aplicarFiltros();
  }

  cambiarEstado(pedido: PedidoConDetalles, nuevoEstado: string): void {
    this.pedidosService.actualizarEstado(pedido.id || '', nuevoEstado).subscribe(
      () => {
        pedido.estado = nuevoEstado;
        console.log(`Pedido ${pedido.id} actualizado a ${nuevoEstado}`);
      },
      (error: any) => console.error('Error al actualizar estado:', error)
    );
  }

  iniciarReprogramar(pedido: PedidoConDetalles): void {
    pedido.mostrarFormReprogramar = true;
    pedido.nuevaFechaReprogramar = '';
  }

  cancelarReprogramar(pedido: PedidoConDetalles): void {
    pedido.mostrarFormReprogramar = false;
    pedido.nuevaFechaReprogramar = '';
  }

  confirmarReprogramar(pedido: PedidoConDetalles): void {
    if (!pedido.nuevaFechaReprogramar) return;
    this.pedidosService.actualizarEstado(pedido.id || '', 'REPROGRAMADO', pedido.nuevaFechaReprogramar).subscribe(
      () => {
        pedido.mostrarFormReprogramar = false;
        this.cargarDatos(); // Reload list to reflect the rescheduled date/status
        console.log(`Pedido ${pedido.id} reprogramado para ${pedido.nuevaFechaReprogramar}`);
      },
      (error: any) => console.error('Error al reprogramar pedido:', error)
    );
  }

  onSignOut(): void {
    this.authService.signOut().subscribe();
  }
}
