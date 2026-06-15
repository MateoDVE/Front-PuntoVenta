import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { ApiService, Producto, VendedorBackend, VentaResumenResponse } from '../../../services/api.service';
import { ProductosService } from '../../../services/productos.service';
import { VendedoresService } from '../../../services/vendedores.service';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Sucursal, SucursalesService } from '../../../services/sucursales.service';
import { environment } from '../../../../environments/environment';

interface DashboardMetric {
  titleKey: string;
  value: string;
  detailKey: string;
  detailParams?: Record<string, string | number>;
  icon: string;
}

@Component({
  selector: 'app-dashboboard-admin',
  standalone: true,
  imports: [CommonModule, AdminNavbar, TranslateModule, FormsModule],
  templateUrl: './dashboboard-admin.html',
  styleUrls: ['./dashboboard-admin.scss'],
})
export class DashboboardAdmin implements OnInit {
  sucursales: Sucursal[] = [];
  mostrarModalInicial = false;
  mostrarModalSucursales = false;
  cargandoUbicacion = false;
  geoErrorMsg = '';

  nuevaSucursal: any = {
    nombre: '',
    latitud: null,
    longitud: null,
    esPrincipal: false
  };
  editandoSucursalId: string | null = null;

  private map: any;
  private marker: any;

  @ViewChild('inicialMapContainer', { static: false }) inicialMapContainer?: ElementRef<HTMLElement>;
  @ViewChild('sucursalMapContainer', { static: false }) sucursalMapContainer?: ElementRef<HTMLElement>;
  private readonly umbralStockBajo = 100;

  metrics: DashboardMetric[] = [];
  productos: Producto[] = [];
  productosConStockBajo: Producto[] = [];
  vendedores: VendedorBackend[] = [];
  ventas: VentaResumenResponse[] = [];
  
  cargando = true;
  error: string | null = null;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private translate: TranslateService,
    private productosService: ProductosService,
    private vendedoresService: VendedoresService,
    private sucursalesService: SucursalesService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.error = null;

    // Cargar productos, vendedores, ventas y sucursales en paralelo
    Promise.all([
      this.cargarProductos(),
      this.cargarVendedores(),
      this.cargarProductosStockBajo(),
      this.cargarVentas(),
      this.cargarSucursales()
    ])
      .then(() => {
        this.actualizarMetricas();
        this.cargando = false;
        this.verificarAlmacenCentral();
      })
      .catch((err) => {
        console.error('Error al cargar datos:', err);
        this.error = 'Error al cargar los datos del dashboard';
        this.cargando = false;
      });
  }

  cargarProductos(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.productosService.getProductos().subscribe({
        next: (datos) => {
          this.productos = datos;
          resolve();
        },
        error: (err) => {
          console.error('Error al cargar productos:', err);
          this.productos = [];
          reject(err);
        },
      });
    });
  }

  cargarVendedores(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.vendedoresService.getVendedores().subscribe({
        next: (datos) => {
          this.vendedores = datos;
          resolve();
        },
        error: (err) => {
          console.error('Error al cargar vendedores:', err);
          this.vendedores = [];
          reject(err);
        },
      });
    });
  }

  cargarProductosStockBajo(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.productosService.getProductosStockBajo(this.umbralStockBajo).subscribe({
        next: (datos) => {
          this.productosConStockBajo = datos;
          resolve();
        },
        error: (err) => {
          console.error('Error al cargar alertas de stock bajo:', err);
          this.productosConStockBajo = [];
          reject(err);
        },
      });
    });
  }

  cargarVentas(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.getVentas().subscribe({
        next: (datos) => {
          this.ventas = datos;
          resolve();
        },
        error: (err) => {
          console.error('Error al cargar ventas:', err);
          this.ventas = [];
          reject(err);
        },
      });
    });
  }

  actualizarMetricas(): void {
    const totalStockProductos = this.productos.reduce(
      (sum, p) => sum + (p.stock_almacen_central || 0),
      0
    );

    const totalProductosValor = this.productos.reduce(
      (sum, p) => sum + (p.stock_almacen_central || 0) * p.precio_unidad,
      0
    );

    const totalSalesCount = this.ventas.length;
    const rawSalesAmount = this.ventas.reduce(
      (sum, v) => sum + (v.totalEfectivo ?? 0),
      0
    );
    const totalSalesAmount = Math.round(rawSalesAmount * 100) / 100;

    this.metrics = [
      {
        titleKey: 'ADMIN.DASHBOARD.METRIC.CATALOG_TITLE',
        value: this.productos.length.toString(),
        detailKey: 'ADMIN.DASHBOARD.METRIC.CATALOG_DETAIL',
        detailParams: { totalStock: totalStockProductos },
        icon: 'icon-products',
      },
      {
        titleKey: 'ADMIN.DASHBOARD.METRIC.VENDORS_TITLE',
        value: this.vendedores.length.toString(),
        detailKey: 'ADMIN.DASHBOARD.METRIC.VENDORS_DETAIL',
        detailParams: { activeVendors: this.vendedores.filter((v) => String(v.estado).trim().toLowerCase() === 'activo').length },
        icon: 'icon-vendors',
      },
      {
        titleKey: 'ADMIN.DASHBOARD.METRIC.STOCK_TITLE',
        value: totalStockProductos.toString(),
        detailKey: 'ADMIN.DASHBOARD.METRIC.STOCK_DETAIL',
        detailParams: { totalValue: totalProductosValor.toFixed(2) },
        icon: 'icon-stock',
      },
      {
        titleKey: 'ADMIN.DASHBOARD.METRIC.SALES_PROJECTS_TITLE',
        value: `Bs. ${totalSalesAmount.toFixed(2)}`,
        detailKey: 'ADMIN.DASHBOARD.METRIC.SALES_PROJECTS_DETAIL',
        detailParams: { totalSales: totalSalesCount },
        icon: 'icon-sales',
      },
    ];
  }

  onSignOut(): void {
    this.authService.signOut().subscribe();
  }

  private readonly descriptionTermMap: Record<string, string> = {
    'con verduras': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.CON_VERDURAS',
    'extremoo': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.EXTREMOO',
    'de': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.DE',
    'gallina': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.GALLINA',
    'carne': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.CARNE',
    'costilla': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.COSTILLA',
    'picante': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.PICANTE',
    'crocante': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.CROCANTE',
    'pollo': 'ADMIN.DASHBOARD.PRODUCT_DESCRIPTION_TERMS.POLLO',
    'bolsa': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.BOLSA',
    'unidad': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.UNIDAD',
    'caja': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.CAJA',
    'botella': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.BOTELLA',
    'paquete': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.PAQUETE',
    'bl[ií]ster': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.BLISTER',
    'vaso': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.VASO',
    'tira': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.TIRA',
    'sobres': 'ADMIN.DASHBOARD.PRESENTATION_TYPE.SOBRES'
  };

  translateProductDescription(descripcion: string | undefined | null): string {
    if (!descripcion?.trim()) {
      return this.translate.instant('ADMIN.DASHBOARD.NO_DESCRIPTION');
    }

    let current = descripcion.replace(/Presentaci[oó]n/gi, this.translate.instant('ADMIN.DASHBOARD.DESCRIPTION_PRESENTATION'));

    return Object.entries(this.descriptionTermMap)
      .sort(([a], [b]) => b.length - a.length)
      .reduce((texto, [term, translationKey]) => {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        return texto.replace(regex, this.translate.instant(translationKey));
      }, current);
  }

  cargarSucursales(): Promise<void> {
    return new Promise((resolve) => {
      this.sucursalesService.getSucursales().subscribe({
        next: (data) => {
          this.sucursales = data;
          resolve();
        },
        error: (err) => {
          console.error('Error al cargar sucursales:', err);
          this.sucursales = [];
          resolve();
        }
      });
    });
  }

  verificarAlmacenCentral(): void {
    const principal = this.sucursales.find(s => s.esPrincipal);
    if (!principal) {
      this.abrirModalInicialSetup();
    }
  }

  private loadGoogleMapsScript(): Promise<void> {
    if ((window as any).google?.maps) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Error loading Google Maps script')));
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Error loading Google Maps script'));
      document.head.appendChild(script);
    });
  }

  abrirModalInicialSetup(): void {
    this.mostrarModalInicial = true;
    this.mostrarModalSucursales = false;
    this.nuevaSucursal = {
      nombre: 'Almacén Central',
      latitud: -17.3935,
      longitud: -66.1570,
      esPrincipal: true
    };
    setTimeout(() => {
      this.loadGoogleMapsScript()
        .then(() => this.initMap('inicial'))
        .catch(err => console.error('Error al cargar mapa inicial:', err));
    }, 200);
  }

  abrirModalSucursales(): void {
    this.mostrarModalSucursales = true;
    this.mostrarModalInicial = false;
    this.cancelarEdicionBranch();
    setTimeout(() => {
      this.loadGoogleMapsScript()
        .then(() => this.initMap('manager'))
        .catch(err => console.error('Error al cargar mapa de sucursales:', err));
    }, 200);
  }

  cerrarModalSucursales(): void {
    this.mostrarModalSucursales = false;
  }

  initMap(mode: 'inicial' | 'manager'): void {
    const googleMaps = (window as any).google;
    if (!googleMaps?.maps) return;

    const container = mode === 'inicial' 
      ? this.inicialMapContainer?.nativeElement 
      : this.sucursalMapContainer?.nativeElement;

    if (!container) return;

    const defaultCenter = { 
      lat: this.nuevaSucursal.latitud || -17.3935, 
      lng: this.nuevaSucursal.longitud || -66.1570 
    };

    this.map = new googleMaps.maps.Map(container, {
      center: defaultCenter,
      zoom: 13,
      mapTypeControl: false,
    });

    this.marker = new googleMaps.maps.Marker({
      position: defaultCenter,
      map: this.map,
      draggable: true,
      title: this.nuevaSucursal.nombre || 'Seleccionar ubicación'
    });

    googleMaps.maps.event.addListener(this.map, 'click', (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      this.nuevaSucursal.latitud = lat;
      this.nuevaSucursal.longitud = lng;
      this.marker.setPosition(event.latLng);
    });

    googleMaps.maps.event.addListener(this.marker, 'dragend', (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      this.nuevaSucursal.latitud = lat;
      this.nuevaSucursal.longitud = lng;
    });
  }

  obtenerGPSUbicacion(): void {
    this.cargandoUbicacion = true;
    this.geoErrorMsg = '';
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.nuevaSucursal.latitud = coords.lat;
          this.nuevaSucursal.longitud = coords.lng;
          this.cargandoUbicacion = false;
          if (this.map && this.marker) {
            this.map.panTo(coords);
            this.marker.setPosition(coords);
          }
        },
        (error) => {
          this.cargandoUbicacion = false;
          console.error('Error al obtener ubicación:', error);
          this.geoErrorMsg = 'No se pudo obtener la ubicación GPS.';
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      this.cargandoUbicacion = false;
      this.geoErrorMsg = 'La geolocalización no está soportada.';
    }
  }

  guardarInicialSetup(): void {
    if (!this.nuevaSucursal.nombre || this.nuevaSucursal.latitud == null || this.nuevaSucursal.longitud == null) {
      return;
    }

    this.sucursalesService.crearSucursal(this.nuevaSucursal).subscribe({
      next: (data) => {
        this.sucursales.push(data);
        this.mostrarModalInicial = false;
      },
      error: (err) => {
        console.error('Error al guardar almacén central:', err);
        alert('Error al guardar almacén central: ' + (err?.error?.message || 'intente de nuevo.'));
      }
    });
  }

  guardarBranchForm(): void {
    if (!this.nuevaSucursal.nombre || this.nuevaSucursal.latitud == null || this.nuevaSucursal.longitud == null) {
      return;
    }

    if (this.editandoSucursalId) {
      this.sucursalesService.actualizarSucursal(this.editandoSucursalId, this.nuevaSucursal).subscribe({
        next: (actualizada) => {
          this.sucursales = this.sucursales.map(s => s.id === actualizada.id ? actualizada : s);
          if (actualizada.esPrincipal) {
            this.sucursales.forEach(s => {
              if (s.id !== actualizada.id) s.esPrincipal = false;
            });
          }
          this.cancelarEdicionBranch();
        },
        error: (err) => {
          console.error('Error al actualizar sucursal:', err);
          alert('Error: ' + (err?.error?.message || 'intente de nuevo.'));
        }
      });
    } else {
      this.sucursalesService.crearSucursal(this.nuevaSucursal).subscribe({
        next: (creada) => {
          this.sucursales.push(creada);
          if (creada.esPrincipal) {
            this.sucursales.forEach(s => {
              if (s.id !== creada.id) s.esPrincipal = false;
            });
          }
          this.cancelarEdicionBranch();
        },
        error: (err) => {
          console.error('Error al crear sucursal:', err);
          alert('Error: ' + (err?.error?.message || 'intente de nuevo.'));
        }
      });
    }
  }

  editarBranch(sucursal: any): void {
    this.editandoSucursalId = sucursal.id;
    this.nuevaSucursal = {
      nombre: sucursal.nombre,
      latitud: sucursal.latitud,
      longitud: sucursal.longitud,
      esPrincipal: sucursal.esPrincipal
    };
    
    if (this.map && this.marker) {
      const coords = { lat: sucursal.latitud, lng: sucursal.longitud };
      this.map.panTo(coords);
      this.marker.setPosition(coords);
    }
  }

  eliminarBranch(id: string): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta sucursal?')) {
      this.sucursalesService.eliminarSucursal(id).subscribe({
        next: () => {
          this.sucursales = this.sucursales.filter(s => s.id !== id);
          if (this.editandoSucursalId === id) {
            this.cancelarEdicionBranch();
          }
        },
        error: (err) => {
          console.error('Error al eliminar sucursal:', err);
          alert('Error: ' + (err?.error?.message || 'no se pudo eliminar.'));
        }
      });
    }
  }

  hacerPrincipalBranch(id: string): void {
    this.sucursalesService.actualizarSucursal(id, { esPrincipal: true }).subscribe({
      next: (actualizada) => {
        this.sucursales = this.sucursales.map(s => {
          if (s.id === id) {
            s.esPrincipal = true;
          } else {
            s.esPrincipal = false;
          }
          return s;
        });
      },
      error: (err) => {
        console.error('Error al cambiar sucursal principal:', err);
        alert('Error: ' + (err?.error?.message || 'intente de nuevo.'));
      }
    });
  }

  cancelarEdicionBranch(): void {
    this.editandoSucursalId = null;
    this.nuevaSucursal = {
      nombre: '',
      latitud: -17.3935,
      longitud: -66.1570,
      esPrincipal: false
    };
    if (this.map && this.marker) {
      const coords = { lat: -17.3935, lng: -66.1570 };
      this.map.panTo(coords);
      this.marker.setPosition(coords);
    }
  }
}
