import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardVendedor } from './dashboard-vendedor';

describe('DashboardVendedorComponent', () => {
  let component: DashboardVendedor;
  let fixture: ComponentFixture<DashboardVendedor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DashboardVendedor]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardVendedor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});