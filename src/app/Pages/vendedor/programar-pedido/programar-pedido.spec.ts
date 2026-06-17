import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgramarPedidoComponent } from './programar-pedido';

describe('ProgramarPedidoComponent', () => {
  let component: ProgramarPedidoComponent;
  let fixture: ComponentFixture<ProgramarPedidoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgramarPedidoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgramarPedidoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form on component creation', () => {
    expect(component.formulario).toBeDefined();
    expect(component.formulario.get('idCliente')).toBeDefined();
    expect(component.formulario.get('fechaProgramada')).toBeDefined();
    expect(component.formulario.get('prioridad')).toBeDefined();
  });

  it('should add product to detallesPedido', () => {
    const producto = {
      id: '1',
      nombre: 'Test Product',
      cantidad_disponible: 100,
    };
    component.agregarProducto(producto);
    expect(component.detallesPedido.length).toBeGreaterThan(0);
  });

  it('should increment product quantity', () => {
    const producto = {
      id: '1',
      nombre: 'Test Product',
      cantidad_disponible: 100,
    };
    component.agregarProducto(producto);
    const initialQty = component.detallesPedido[0].cantidad;
    component.incrementarCantidad(0);
    expect(component.detallesPedido[0].cantidad).toBe(initialQty + 1);
  });

  it('should decrement product quantity', () => {
    const producto = {
      id: '1',
      nombre: 'Test Product',
      cantidad_disponible: 100,
    };
    component.agregarProducto(producto);
    component.detallesPedido[0].cantidad = 5;
    const initialQty = component.detallesPedido[0].cantidad;
    component.decrementarCantidad(0);
    expect(component.detallesPedido[0].cantidad).toBe(initialQty - 1);
  });

  it('should remove product from detallesPedido', () => {
    const producto = {
      id: '1',
      nombre: 'Test Product',
      cantidad_disponible: 100,
    };
    component.agregarProducto(producto);
    component.eliminarProducto(0);
    expect(component.detallesPedido.length).toBe(0);
  });

  it('should filter products by search term', () => {
    component.productos = [
      { id: '1', nombre: 'Apple', cantidad_disponible: 50 },
      { id: '2', nombre: 'Banana', cantidad_disponible: 30 },
    ];
    component.buscarProducto = 'Apple';
    component.filtrarProductos();
    expect(component.productosFiltrados.length).toBeGreaterThan(0);
    expect(component.productosFiltrados[0].nombre).toBe('Apple');
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
});
