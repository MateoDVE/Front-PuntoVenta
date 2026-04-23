import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VentaVendedor } from './venta-vendedor';

describe('VentaVendedor', () => {
  let component: VentaVendedor;
  let fixture: ComponentFixture<VentaVendedor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VentaVendedor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VentaVendedor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
