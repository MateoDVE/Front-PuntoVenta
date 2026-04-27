import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CierreVendedor } from './cierre-vendedor';

describe('CierreVendedor', () => {
  let component: CierreVendedor;
  let fixture: ComponentFixture<CierreVendedor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CierreVendedor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CierreVendedor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
