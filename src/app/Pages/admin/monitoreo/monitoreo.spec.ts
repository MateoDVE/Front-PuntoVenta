import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { MonitoreoComponent } from './monitoreo';
import { ApiService } from '../../../services/api.service';
import { ClientesService } from '../../../services/clientes.service';
import { VendedoresService } from '../../../services/vendedores.service';

const VENDEDOR_STUB = {
  id_usuario: 'v1',
  nombre: 'Juan Pérez',
  email: 'juan@test.com',
  rol: 'vendedor',
  estado: 'EN RUTA',
  created_at: '2024-01-01',
};

describe('MonitoreoComponent', () => {
  let component: MonitoreoComponent;
  let fixture: ComponentFixture<MonitoreoComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  let mockApiService: jasmine.SpyObj<Pick<ApiService, 'getInventarioVendedor' | 'getCierreJornada' | 'getCierresVendedor' | 'getVentas'>>;
  let mockClientesService: jasmine.SpyObj<Pick<ClientesService, 'getClientes'>>;
  let mockVendedoresService: jasmine.SpyObj<Pick<VendedoresService, 'getVendedores'>>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockApiService = {
      getInventarioVendedor: jasmine.createSpy().and.returnValue(of([])),
      getCierreJornada:      jasmine.createSpy().and.returnValue(of(null)),
      getCierresVendedor:    jasmine.createSpy().and.returnValue(of([])),
      getVentas:             jasmine.createSpy().and.returnValue(of([])),
    };

    mockClientesService = {
      getClientes: jasmine.createSpy().and.returnValue(of([])),
    };

    mockVendedoresService = {
      getVendedores: jasmine.createSpy().and.returnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [MonitoreoComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: ApiService,        useValue: mockApiService },
        { provide: ClientesService,   useValue: mockClientesService },
        { provide: VendedoresService, useValue: mockVendedoresService },
        { provide: Router,            useValue: mockRouter },
      ],
    }).compileComponents();

    fixture  = TestBed.createComponent(MonitoreoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Creación ──────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── getInitials ───────────────────────────────────────────────────────────

  describe('getInitials', () => {
    it('returns initials from a two-word name', () => {
      expect(component.getInitials('Juan Pérez')).toBe('JP');
    });

    it('returns single initial for a one-word name', () => {
      expect(component.getInitials('Carlos')).toBe('C');
    });

    it('uses only the first two words', () => {
      expect(component.getInitials('Ana María López')).toBe('AM');
    });

    it('returns uppercase initials', () => {
      expect(component.getInitials('ana pérez')).toBe('AP');
    });
  });

  // ── esEnRuta ──────────────────────────────────────────────────────────────

  describe('esEnRuta', () => {
    it('returns true for EN RUTA', () => {
      expect(component.esEnRuta('EN RUTA')).toBeTrue();
    });

    it('returns false for ACTIVO', () => {
      expect(component.esEnRuta('ACTIVO')).toBeFalse();
    });

    it('returns false for JORNADA CERRADA', () => {
      expect(component.esEnRuta('JORNADA CERRADA')).toBeFalse();
    });

    it('is case-insensitive', () => {
      expect(component.esEnRuta('en ruta')).toBeTrue();
    });
  });

  // ── esCerrado ─────────────────────────────────────────────────────────────

  describe('esCerrado', () => {
    it('returns true for JORNADA CERRADA', () => {
      expect(component.esCerrado('JORNADA CERRADA')).toBeTrue();
    });

    it('returns false for ACTIVO', () => {
      expect(component.esCerrado('ACTIVO')).toBeFalse();
    });

    it('returns false for EN RUTA', () => {
      expect(component.esCerrado('EN RUTA')).toBeFalse();
    });

    it('is case-insensitive', () => {
      expect(component.esCerrado('jornada cerrada')).toBeTrue();
    });
  });

  // ── totalIngresos ─────────────────────────────────────────────────────────

  describe('totalIngresos', () => {
    it('returns 0 when there are no vendedores', () => {
      component.vendedoresDatos = [];
      expect(component.totalIngresos).toBe(0);
    });

    it('sums ingresos from all vendedores', () => {
      component.vendedoresDatos = [
        { id: '1', nombre: 'A', email: '', estadoDisplay: 'ACTIVO', stock: 0, ventas: 0, ingresos: 150 },
        { id: '2', nombre: 'B', email: '', estadoDisplay: 'ACTIVO', stock: 0, ventas: 0, ingresos: 300 },
      ];
      expect(component.totalIngresos).toBe(450);
    });

    it('ignores vendedores with 0 ingresos', () => {
      component.vendedoresDatos = [
        { id: '1', nombre: 'A', email: '', estadoDisplay: 'EN RUTA', stock: 0, ventas: 0, ingresos: 0 },
        { id: '2', nombre: 'B', email: '', estadoDisplay: 'ACTIVO', stock: 0, ventas: 0, ingresos: 200 },
      ];
      expect(component.totalIngresos).toBe(200);
    });
  });

  // ── vendedoresEnRuta ──────────────────────────────────────────────────────

  describe('vendedoresEnRuta', () => {
    it('returns 0 when there are no vendedores', () => {
      component.vendedoresDatos = [];
      expect(component.vendedoresEnRuta).toBe(0);
    });

    it('counts only vendedores with EN RUTA state', () => {
      component.vendedoresDatos = [
        { id: '1', nombre: 'A', email: '', estadoDisplay: 'EN RUTA',        stock: 0, ventas: 0, ingresos: 0 },
        { id: '2', nombre: 'B', email: '', estadoDisplay: 'ACTIVO',          stock: 0, ventas: 0, ingresos: 0 },
        { id: '3', nombre: 'C', email: '', estadoDisplay: 'JORNADA CERRADA', stock: 0, ventas: 0, ingresos: 0 },
      ];
      expect(component.vendedoresEnRuta).toBe(1);
    });

    it('counts multiple vendedores en ruta', () => {
      component.vendedoresDatos = [
        { id: '1', nombre: 'A', email: '', estadoDisplay: 'EN RUTA', stock: 0, ventas: 0, ingresos: 0 },
        { id: '2', nombre: 'B', email: '', estadoDisplay: 'EN RUTA', stock: 0, ventas: 0, ingresos: 0 },
      ];
      expect(component.vendedoresEnRuta).toBe(2);
    });
  });

  // ── onSignOut ─────────────────────────────────────────────────────────────

  describe('onSignOut', () => {
    it('navigates to /login', () => {
      component.onSignOut();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  // ── cargar ────────────────────────────────────────────────────────────────

  describe('cargar', () => {
    it('sets cargando to false after load with no vendors', () => {
      mockVendedoresService.getVendedores.and.returnValue(of([]));
      component.cargar();
      expect(component.cargando).toBeFalse();
    });

    it('leaves vendedoresDatos empty when backend returns no vendors', () => {
      mockVendedoresService.getVendedores.and.returnValue(of([]));
      component.cargar();
      expect(component.vendedoresDatos).toEqual([]);
    });

    it('leaves clientesMapa empty when backend returns no vendors', () => {
      mockVendedoresService.getVendedores.and.returnValue(of([]));
      component.cargar();
      expect(component.clientesMapa).toEqual([]);
    });

    it('sets error and clears cargando when getVendedores fails', () => {
      mockVendedoresService.getVendedores.and.returnValue(
        throwError(() => new Error('Network error'))
      );
      component.cargar();
      expect(component.cargando).toBeFalse();
      expect(component.error).toBeTruthy();
    });

    it('resets error on each new cargar call', () => {
      component.error = 'Error previo';
      mockVendedoresService.getVendedores.and.returnValue(of([]));
      component.cargar();
      expect(component.error).toBe('');
    });

    it('processes vendor data when vendors are returned', () => {
      mockVendedoresService.getVendedores.and.returnValue(of([VENDEDOR_STUB]));
      mockApiService.getInventarioVendedor.and.returnValue(of([]));
      mockApiService.getCierreJornada.and.returnValue(of(null));
      mockApiService.getCierresVendedor.and.returnValue(of([]));
      mockClientesService.getClientes.and.returnValue(of([]));
      mockApiService.getVentas.and.returnValue(of([]));

      component.cargar();

      expect(component.vendedoresDatos.length).toBe(1);
      expect(component.vendedoresDatos[0].nombre).toBe('Juan Pérez');
    });

    it('sets estadoDisplay to JORNADA CERRADA when cierre exists for today', () => {
      const today = new Date();
      const fechaHoy = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      mockVendedoresService.getVendedores.and.returnValue(of([VENDEDOR_STUB]));
      mockApiService.getInventarioVendedor.and.returnValue(of([]));
      mockApiService.getCierreJornada.and.returnValue(of(null));
      mockApiService.getCierresVendedor.and.returnValue(of([
        { id_cierre: 'c1', id_vendedor: 'v1', fecha: fechaHoy } as any
      ]));
      mockClientesService.getClientes.and.returnValue(of([]));
      mockApiService.getVentas.and.returnValue(of([]));

      component.cargar();

      expect(component.vendedoresDatos[0].estadoDisplay).toBe('JORNADA CERRADA');
    });
  });
});
