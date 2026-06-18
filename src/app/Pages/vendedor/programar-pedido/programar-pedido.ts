import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { PedidosProgramadosService, PedidoProgramado, DetallePedido } from '../../../services/pedidos-programados.service';
import { ClientesService } from '../../../services/clientes.service';
import { ProductosService } from '../../../services/productos.service';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { VendedorNavbar } from '../../../components/vendedor-navbar/vendedor-navbar';
import { AppModalComponent, AppModalVariant } from '../../../components/app-modal/app-modal.component';

@Component({
  selector: 'app-programar-pedido',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, VendedorNavbar, AppModalComponent],
  templateUrl: './programar-pedido.html',
  styleUrls: ['./programar-pedido.scss']
})
export class ProgramarPedidoComponent implements OnInit {
  formulario: FormGroup;
  clientes: any[] = [];
  productos: any[] = [];
  productosFiltrados: any[] = [];
  buscarProducto: string = '';
  mostrarDropdownProductos: boolean = false;
  detallesPedido: DetallePedido[] = [];
  pedidosProgramados: PedidoProgramado[] = [];
  cargando: boolean = false;
  guardando: boolean = false;
  hoy: string = new Date().toISOString().split('T')[0];
  idVendedor: string = '';

  // Custom search and dropdown properties
  buscarCliente: string = '';
  mostrarDropdownClientes: boolean = false;
  clientesFiltrados: any[] = [];
  clienteSeleccionado: any = null;
  mostrarDropdownPrioridades: boolean = false;

  modalState = {
    open: false,
    title: '',
    message: '',
    variant: 'info' as AppModalVariant
  };

  constructor(
    private fb: FormBuilder,
    private pedidosService: PedidosProgramadosService,
    private clientesService: ClientesService,
    private productosService: ProductosService,
    private authService: AuthService,
    private router: Router
  ) {
    this.formulario = this.fb.group({
      idCliente: ['', Validators.required],
      fechaProgramada: ['', Validators.required],
      prioridad: ['MEDIA', Validators.required],
      observaciones: ['']
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
    this.formulario.get('fechaProgramada')?.valueChanges.subscribe(() => {
      this.cargarPedidosProgramados();
    });
  }

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

  cargarDatos(): void {
    const user = this.authService.getStoredUser();
    this.idVendedor = user?.id_usuario || (user as any)?.id || '';
    
    if (!this.idVendedor) {
      console.warn('Advertencia: idVendedor no disponible al cargar datos.');
      this.clientes = [];
    } else {
      this.clientesService.getClientes(this.idVendedor).subscribe(
        (response: any) => {
          const rawClients = response.data || response || [];
          this.clientes = rawClients.filter((c: any) => c.id_vendedor_creador === this.idVendedor);
        },
        (error: any) => console.error('Error al cargar clientes:', error)
      );
    }

    this.productosService.getProductos().subscribe(
      (response: any) => {
        const rawList = response.data || response;
        this.productos = rawList.map((p: any) => ({
          ...p,
          id: p.id_producto || p.id,
          cantidad_disponible: p.stock_almacen_central ?? p.cantidad_disponible ?? 0
        }));
      },
      (error: any) => console.error('Error al cargar productos:', error)
    );
  }

  filtrarProductos(): void {
    const termino = this.buscarProducto.toLowerCase().trim();
    if (!termino) {
      this.productosFiltrados = [...this.productos];
      return;
    }
    this.productosFiltrados = this.productos.filter(p => 
      p.nombre.toLowerCase().includes(termino)
    );
  }

  abrirDropdownProductos(): void {
    this.mostrarDropdownProductos = true;
    this.filtrarProductos();
  }

  cerrarDropdownProductosConDelay(): void {
    setTimeout(() => {
      this.mostrarDropdownProductos = false;
    }, 200);
  }

  toggleDropdownProductos(): void {
    this.mostrarDropdownProductos = !this.mostrarDropdownProductos;
    if (this.mostrarDropdownProductos) {
      this.filtrarProductos();
    }
  }

  agregarProducto(producto: any): void {
    const pId = String(producto.id_producto || producto.id);
    const existe = this.detallesPedido.find(d => d.idProducto === pId);
    
    if (existe) {
      existe.cantidad++;
      existe.cantidadDisplay = String(existe.cantidad);
    } else {
      this.detallesPedido.push({
        idProducto: pId,
        cantidad: 1,
        cantidadDisplay: '1',
        nombre: producto.nombre
      });
    }

    this.buscarProducto = '';
    this.productosFiltrados = [];
  }

  incrementarCantidad(index: number): void {
    if (index >= 0 && index < this.detallesPedido.length) {
      this.detallesPedido[index].cantidad++;
      this.detallesPedido[index].cantidadDisplay = String(this.detallesPedido[index].cantidad);
    }
  }

  decrementarCantidad(index: number): void {
    if (index >= 0 && index < this.detallesPedido.length) {
      if (this.detallesPedido[index].cantidad > 1) {
        this.detallesPedido[index].cantidad--;
        this.detallesPedido[index].cantidadDisplay = String(this.detallesPedido[index].cantidad);
      }
    }
  }

  onCantidadInput(event: any, index: number): void {
    const raw = event.target.value;
    // allow empty while typing
    this.detallesPedido[index].cantidadDisplay = raw;

    if (!raw) {
      // don't set cantidad yet; leave it to blur or explicit parse
      this.detallesPedido[index].cantidad = 0;
      return;
    }

    // parse integer and enforce positive
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed > 0) {
      this.detallesPedido[index].cantidad = parsed;
    }
  }

  onCantidadBlur(index: number): void {
    const detalle = this.detallesPedido[index];
    const raw = detalle.cantidadDisplay ?? '';
    const parsed = parseInt(String(raw), 10);
    if (isNaN(parsed) || parsed < 1) {
      detalle.cantidad = 1;
      detalle.cantidadDisplay = '1';
    } else {
      detalle.cantidad = parsed;
      detalle.cantidadDisplay = String(parsed);
    }
  }

  eliminarProducto(index: number): void {
    this.detallesPedido.splice(index, 1);
  }

  cargarPedidosProgramados(): void {
    const fecha = this.formulario.get('fechaProgramada')?.value;
    if (!fecha || !this.idVendedor) return;

    this.pedidosService.obtenerPedidos(this.idVendedor, fecha).subscribe(
      (pedidos: PedidoProgramado[]) => {
        this.pedidosProgramados = pedidos.map(p => ({
          ...p,
          detalles: p.detalles.map(d => {
            const prod = this.productos.find(pr => String(pr.id_producto ?? pr.sku ?? pr.id) === String(d.idProducto));
            return {
              ...d,
              nombre: prod ? prod.nombre : 'Producto desconocido'
            };
          }),
          expandido: false
        }));
      },
      (error: any) => console.error('Error al cargar pedidos programados:', error)
    );
  }

  crearPedido(): void {
    if (this.formulario.invalid || this.detallesPedido.length === 0) {
      this.mostrarMensaje('Formulario Inválido', 'Por favor complete todos los campos requeridos y agregue al menos un producto.', 'warning');
      return;
    }

    // Validate quantities: all must be positive integers > 0
    const invalidCantidad = this.detallesPedido.some(d => !d.cantidad || d.cantidad < 1 || !Number.isInteger(d.cantidad));
    if (invalidCantidad) {
      this.mostrarMensaje('Cantidad Inválida', 'Por favor asegúrese de que todas las cantidades sean enteros positivos mayores a 0.', 'warning');
      return;
    }

    this.guardando = true;
    const pedido: PedidoProgramado = {
      idCliente: Number(this.formulario.get('idCliente')?.value),
      idVendedor: this.idVendedor,
      fechaProgramada: this.formulario.get('fechaProgramada')?.value,
      estado: 'PENDIENTE',
      prioridad: this.formulario.get('prioridad')?.value,
      observaciones: this.formulario.get('observaciones')?.value,
      detalles: this.detallesPedido
    };

    this.pedidosService.crearPedido(pedido).subscribe({
      next: (response: any) => {
        this.guardando = false;
        this.mostrarMensaje(
          'Pedido Creado',
          'El pedido programado se ha registrado exitosamente en el sistema.',
          'success'
        );
        this.limpiarFormulario();
        this.cargarPedidosProgramados();
      },
      error: (error: any) => {
        this.guardando = false;
        const errorMsg = error?.error?.message || error?.message || 'Error desconocido al registrar el pedido.';
        this.mostrarMensaje(
          'Error al crear pedido',
          errorMsg,
          'error'
        );
        console.error('Error al crear pedido:', error);
      }
    });
  }

  toggleExpander(pedido: PedidoProgramado): void {
    pedido.expandido = !pedido.expandido;
  }

  getClienteNombre(idCliente: number): string {
    const cliente = this.clientes.find(c => Number(c.id_cliente) === Number(idCliente));
    return cliente ? cliente.nombre_negocio : 'Cliente desconocido';
  }

  // Client dropdown methods
  filtrarClientes(): void {
    const termino = this.buscarCliente.toLowerCase().trim();
    if (!termino) {
      this.clientesFiltrados = [...this.clientes];
      return;
    }
    this.clientesFiltrados = this.clientes.filter(c => 
      c.nombre_negocio.toLowerCase().includes(termino) ||
      (c.ci_nit && String(c.ci_nit).toLowerCase().includes(termino))
    );
  }

  abrirDropdownClientes(): void {
    this.mostrarDropdownClientes = true;
    this.filtrarClientes();
  }

  cerrarDropdownClientesConDelay(): void {
    setTimeout(() => {
      this.mostrarDropdownClientes = false;
    }, 200);
  }

  toggleDropdownClientes(): void {
    this.mostrarDropdownClientes = !this.mostrarDropdownClientes;
    if (this.mostrarDropdownClientes) {
      this.filtrarClientes();
    }
  }

  seleccionarCliente(cliente: any): void {
    this.clienteSeleccionado = cliente;
    this.formulario.get('idCliente')?.setValue(cliente.id_cliente);
    this.buscarCliente = `${cliente.nombre_negocio} (CI/NIT: ${cliente.ci_nit})`;
    this.mostrarDropdownClientes = false;
    this.clientesFiltrados = [];
  }

  limpiarCliente(): void {
    this.clienteSeleccionado = null;
    this.formulario.get('idCliente')?.setValue('');
    this.buscarCliente = '';
    this.clientesFiltrados = [...this.clientes];
  }

  // Priority dropdown methods
  abrirDropdownPrioridades(): void {
    this.mostrarDropdownPrioridades = true;
  }

  cerrarDropdownPrioridadesConDelay(): void {
    setTimeout(() => {
      this.mostrarDropdownPrioridades = false;
    }, 200);
  }

  toggleDropdownPrioridades(): void {
    this.mostrarDropdownPrioridades = !this.mostrarDropdownPrioridades;
  }

  seleccionarPrioridad(valor: string): void {
    this.formulario.get('prioridad')?.setValue(valor);
    this.mostrarDropdownPrioridades = false;
  }

  limpiarFormulario(): void {
    this.formulario.reset({
      prioridad: 'MEDIA'
    });
    this.clienteSeleccionado = null;
    this.buscarCliente = '';
    this.clientesFiltrados = [];
    this.detallesPedido = [];
    this.buscarProducto = '';
    this.productosFiltrados = [];
  }
}
