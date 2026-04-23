import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VentaVendedorComponent } from './venta-vendedor';

describe('VentaVendedorComponent', () => {
  let component: VentaVendedorComponent;
  let fixture: ComponentFixture<VentaVendedorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VentaVendedorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(VentaVendedorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the header title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Proceso de Venta');
  });

  it('should render the product list', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.producto-card');
    expect(cards.length).toBeGreaterThan(0);
  });
});