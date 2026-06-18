import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PedidosAdminComponent } from './pedidos';

describe('PedidosAdminComponent', () => {
  let component: PedidosAdminComponent;
  let fixture: ComponentFixture<PedidosAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PedidosAdminComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PedidosAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load vendedores, clientes, and pedidos on init', () => {
    expect(component.vendedores).toBeDefined();
    expect(component.clientes).toBeDefined();
    expect(component.pedidosProgramados).toBeDefined();
  });

  it('should filter pedidos by vendor', () => {
    component.pedidosProgramados = [
      {
        id: '1',
        idVendedor: 'vendor1',
        vendedorNombre: 'Vendor 1',
        clienteNombre: 'Client 1',
        fechaProgramada: '2026-06-20',
        estado: 'PENDIENTE',
        prioridad: 'ALTA',
        detalles: [],
      },
      {
        id: '2',
        idVendedor: 'vendor2',
        vendedorNombre: 'Vendor 2',
        clienteNombre: 'Client 2',
        fechaProgramada: '2026-06-21',
        estado: 'EN_RUTA',
        prioridad: 'MEDIA',
        detalles: [],
      },
    ];
    component.vendedorSeleccionado = 'vendor1';
    component.aplicarFiltros();
    expect(component.pedidosFiltrados.length).toBeGreaterThan(0);
    expect(component.pedidosFiltrados[0].idVendedor).toBe('vendor1');
  });

  it('should filter pedidos by status', () => {
    component.pedidosProgramados = [
      {
        id: '1',
        idVendedor: 'vendor1',
        vendedorNombre: 'Vendor 1',
        clienteNombre: 'Client 1',
        fechaProgramada: '2026-06-20',
        estado: 'PENDIENTE',
        prioridad: 'ALTA',
        detalles: [],
      },
    ];
    component.estadoSeleccionado = 'PENDIENTE';
    component.aplicarFiltros();
    expect(component.pedidosFiltrados.length).toBeGreaterThan(0);
    expect(component.pedidosFiltrados[0].estado).toBe('PENDIENTE');
  });

  it('should toggle expander for pedido', () => {
    const pedido: any = {
      id: '1',
      expandido: false,
    };
    component.toggleExpander(pedido);
    expect(pedido.expandido).toBe(true);
    component.toggleExpander(pedido);
    expect(pedido.expandido).toBe(false);
  });

  it('should get client name by id', () => {
    component.clientes = [
      { id_cliente: 1, nombre_negocio: 'Client 1' },
      { id_cliente: 2, nombre_negocio: 'Client 2' },
    ];
    const nombre = component.getClienteNombre(1);
    expect(nombre).toBe('Client 1');
  });

  it('should get vendor name by id', () => {
    component.vendedores = [
      { id: 'v1', nombre: 'Vendor 1' },
      { id: 'v2', nombre: 'Vendor 2' },
    ];
    const nombre = component.getVendedorNombre('v1');
    expect(nombre).toBe('Vendor 1');
  });

  it('should clear filters', () => {
    component.vendedorSeleccionado = 'vendor1';
    component.estadoSeleccionado = 'PENDIENTE';
    component.fechaSeleccionada = '2026-06-20';
    component.limpiarFiltros();
    expect(component.vendedorSeleccionado).toBe('');
    expect(component.estadoSeleccionado).toBe('');
    expect(component.fechaSeleccionada).toBe('');
  });
});
