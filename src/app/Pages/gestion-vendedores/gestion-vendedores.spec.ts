import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionVendedores } from './gestion-vendedores';

describe('GestionVendedores', () => {
  let component: GestionVendedores;
  let fixture: ComponentFixture<GestionVendedores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionVendedores]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionVendedores);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
