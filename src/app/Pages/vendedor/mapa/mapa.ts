import { Component, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { VendedorNavbar } from '../../../components/vendedor-navbar/vendedor-navbar';
import { ApiService, Cliente as ApiCliente, CreateClientePayload, PuntoRuta } from '../../../services/api.service';
import { ClientesService } from '../../../services/clientes.service';
import { AuthService, UserProfile } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { Sucursal, SucursalesService } from '../../../services/sucursales.service';
import { PedidosProgramadosService, PedidoProgramado } from '../../../services/pedidos-programados.service';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, FormsModule, VendedorNavbar, TranslateModule],
  templateUrl: './mapa.html',
  styleUrls: ['./mapa.scss'],
})
export class Mapa implements OnInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLElement>;
  @ViewChild('formMapContainer', { static: false }) formMapContainer!: ElementRef<HTMLElement>;
  @ViewChild('fotoFachadaInput') fotoFachadaInput!: ElementRef<HTMLInputElement>;

  error = '';
  clienteFormError = '';
  ciNitError = '';
  showNewClienteModal = false;
  currentUserId = '';
  loading = false;
  detectingLocation = false;
  fotoPreview?: string;
  archivoFotoCliente?: File;
  celularError = '';

  ubicaciones: ApiCliente[] = [];
  markers: any[] = [];
  map: any;
  formMap: any;
  formPickerMarker: any;

  mapView: 'clients' | 'route' = 'clients';
  rutaPuntos: PuntoRuta[] = [];
  routeDistance = '';
  routeDuration = '';
  directionsRenderer: any;
  directionsService: any;
  fallbackPolyline: any;
  osrmPolyline: any;
  selectedClientIds = new Set<string>();
  outlierClients: any[] = [];
  clientSearchQuery = '';
  routeStartPointId = 'actual';
  ubicacionActualCoordenadas: { lat: number; lng: number } | null = null;
  cargandoUbicacion = false;
  geoErrorMsg = '';
  sucursales: Sucursal[] = [];
  almacenCentralCoordenadas = { lat: -17.3935, lng: -66.1570 };
  almacenCentralNombre = 'Almacén Central';
  pedidosProgramados: PedidoProgramado[] = [];
  mapaPrioridadesPorCliente: Map<number, string> = new Map();

  get activeClientes(): ApiCliente[] {
    return this.ubicaciones.filter(c => c.estado !== 'INACTIVO');
  }

  get filteredActiveClientes(): ApiCliente[] {
    const query = this.clientSearchQuery.toLowerCase().trim();
    if (!query) {
      return this.activeClientes;
    }
    return this.activeClientes.filter(c => 
      c.nombre_negocio.toLowerCase().includes(query)
    );
  }

  onClientSearchChange(): void {
    if (this.map && this.mapView === 'clients') {
      this.addExistingMarkers();
    }
  }

  newCliente: CreateClientePayload = {
    idVendedorCreador: '',
    nombreNegocio: '',
    ciNit: '',
    celular: '',
    latitud: undefined,
    longitud: undefined,
    urlFotoFachada: '',
    frecuenciaVisita: 'Semanal',
  };

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private translate: TranslateService,
    private clientesService: ClientesService,
    private sucursalesService: SucursalesService,
    private pedidosProgramadosService: PedidosProgramadosService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.cargarSucursales();
    this.loadUserAndClientes();
  }

  cargarSucursales(): void {
    this.sucursalesService.getSucursales().subscribe({
      next: (data) => {
        this.sucursales = data;
        const principal = data.find(s => s.esPrincipal);
        if (principal) {
          this.almacenCentralCoordenadas = { lat: principal.latitud, lng: principal.longitud };
          this.almacenCentralNombre = principal.nombre;
          if (!this.routeStartPointId || this.routeStartPointId === 'actual') {
            this.routeStartPointId = principal.id || '';
          }
        } else if (data.length > 0) {
          if (!this.routeStartPointId || this.routeStartPointId === 'actual') {
            this.routeStartPointId = data[0].id || '';
          }
        } else {
          this.routeStartPointId = 'actual';
        }
        if (this.map && this.mapView === 'clients') {
          this.map.panTo(this.almacenCentralCoordenadas);
        }
        if (this.mapView === 'route') {
          this.calculateRouteFromSelection();
        }
      },
      error: (err) => console.error('Error al cargar las sucursales:', err)
    });
  }

  private async loadUserAndClientes(): Promise<void> {
    const storedUser = this.authService.getStoredUser();
    if (storedUser?.id_usuario) {
      this.currentUserId = storedUser.id_usuario;
      this.newCliente.idVendedorCreador = this.currentUserId;
      this.loadMap();
      this.loadClientes();
      return;
    }

    this.authService.getCurrentUser().subscribe({
      next: (user: UserProfile) => {
        this.currentUserId = user.id_usuario;
        this.authService.persistCurrentUser(user);
        this.newCliente.idVendedorCreador = this.currentUserId;
        this.loadMap();
        this.loadClientes();
      },
      error: (err) => {
        console.error('Error al obtener usuario actual:', err);
        this.error = this.translate.instant('VENDEDOR.MAP.USER_INFO_ERROR');
      }
    });
  }

  private loadClientes(): void {
    if (!this.currentUserId) {
      return;
    }

    this.loading = true;
    this.clientesService.getClientes(this.currentUserId).subscribe({
      next: (clientes) => {
        this.ubicaciones = clientes;
        this.selectedClientIds.clear();
        clientes.forEach(c => {
          if (c.id_cliente) this.selectedClientIds.add(c.id_cliente);
        });
        this.loading = false;
        if (this.map) {
          this.addExistingMarkers();
        }
        this.loadScheduledOrders();
        this.calculateRouteFromSelection();
      },
      error: (err) => {
        console.error('Error al cargar clientes:', err);
        this.error = this.translate.instant('VENDEDOR.MAP.CLIENT_LOAD_ERROR');
        this.loading = false;
      }
    });
  }

  private loadScheduledOrders(): void {
    if (!this.currentUserId) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    this.pedidosProgramadosService.obtenerPedidos(this.currentUserId, today).subscribe({
      next: (pedidos) => {
        this.pedidosProgramados = pedidos;
        this.mapaPrioridadesPorCliente.clear();
        
        pedidos.forEach(pedido => {
          const clientId = pedido.idCliente;
          const priority = pedido.prioridad;
          if (clientId && priority) {
            this.mapaPrioridadesPorCliente.set(clientId, priority);
          }
        });
        
        console.log('Scheduled orders loaded:', Array.from(this.mapaPrioridadesPorCliente.entries()));
        this.calculateRouteFromSelection();
      },
      error: (err) => {
        console.warn('Error loading scheduled orders priorities:', err);
        this.calculateRouteFromSelection();
      }
    });
  }

  openFileInput(): void {
    this.fotoFachadaInput?.nativeElement.click();
  }

  onCelularInput(): void {
    const celular = this.newCliente.celular;
    if (!celular || celular.length === 0) {
      this.celularError = '';
      return;
    }
    if (!/^[67]/.test(celular)) {
      this.celularError = this.translate.instant('VENDEDOR.MAP.CELULAR_INVALID_START');
    } else if (!/^\d{8}$/.test(celular)) {
      this.celularError = this.translate.instant('VENDEDOR.MAP.CELULAR_INVALID_LENGTH');
    } else {
      this.celularError = '';
    }
  }

  onCiNitInput(): void {
    if (!this.newCliente.ciNit || !this.newCliente.ciNit.trim()) {
      this.ciNitError = '';
      return;
    }

    if (!this.isCiNitValid(this.newCliente.ciNit)) {
      this.ciNitError = 'Formatos de CI/NIT inválido. Solo se permiten números y extensiones válidas.';
    } else {
      this.ciNitError = '';
    }
  }

  private isCiNitValid(value: string | undefined): boolean {
    if (!value) return false;
    const v = value.trim();
    const re = /^\d{6,12}(?:-?[A-Za-z0-9]{1,3})?$/;
    return re.test(v);
  }

  openNuevoClienteModal(): void {
    this.clienteFormError = '';
    this.celularError = '';
    this.ciNitError = '';
    this.newCliente = {
      idVendedorCreador: this.currentUserId,
      nombreNegocio: '',
      ciNit: '',
      celular: '',
      latitud: undefined,
      longitud: undefined,
      urlFotoFachada: '',
      frecuenciaVisita: 'Semanal',
    };
    this.showNewClienteModal = true;
    setTimeout(() => this.initFormMap(), 100);
  }

  closeNuevoClienteModal(): void {
    this.showNewClienteModal = false;
    if (this.formPickerMarker) {
      this.formPickerMarker.setMap(null);
      this.formPickerMarker = null;
    }
    this.formMap = null;
    this.archivoFotoCliente = undefined;
    this.fotoPreview = undefined;
    this.detectingLocation = false;
  }

  private initFormMap(): void {
    if (this.formMap) {
      return;
    }
    const googleMaps = (window as any).google;
    if (!googleMaps?.maps || !this.formMapContainer) {
      return;
    }

    this.formMap = new googleMaps.maps.Map(this.formMapContainer.nativeElement, {
      center: this.almacenCentralCoordenadas,
      zoom: 15,
      streetViewControl: false,
      mapTypeControl: false,
    });

    this.formMap.addListener('click', (event: any) => {
      const latLng = event.latLng;
      this.setFormLocation(latLng.lat(), latLng.lng());
    });
  }

  private setFormLocation(lat: number, lng: number): void {
    this.newCliente.latitud = lat;
    this.newCliente.longitud = lng;

    const googleMaps = (window as any).google;
    if (!googleMaps?.maps || !this.formMap) {
      return;
    }

    if (this.formPickerMarker) {
      this.formPickerMarker.setPosition({ lat, lng });
      return;
    }

    this.formPickerMarker = new googleMaps.maps.Marker({
      position: { lat, lng },
      map: this.formMap,
      title: this.translate.instant('VENDEDOR.MAP.CLIENT_LOCATION_TITLE'),
      icon: {
        path: googleMaps.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#2563eb',
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      }
    });

    this.formMap.panTo({ lat, lng });
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.clienteFormError = this.translate.instant('VENDEDOR.MAP.GEOLOCATION_NOT_SUPPORTED');
      return;
    }

    this.clienteFormError = '';
    this.detectingLocation = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.detectingLocation = false;
        this.setFormLocation(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        this.detectingLocation = false;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.clienteFormError = this.translate.instant('VENDEDOR.MAP.GEOLOCATION_PERMISSION_DENIED');
            break;
          case error.POSITION_UNAVAILABLE:
            this.clienteFormError = this.translate.instant('VENDEDOR.MAP.GEOLOCATION_UNAVAILABLE');
            break;
          case error.TIMEOUT:
            this.clienteFormError = this.translate.instant('VENDEDOR.MAP.GEOLOCATION_TIMEOUT');
            break;
          default:
            this.clienteFormError = this.translate.instant('VENDEDOR.MAP.GEOLOCATION_ERROR');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }

  onSeleccionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      this.archivoFotoCliente = undefined;
      this.fotoPreview = undefined;
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.clienteFormError = this.translate.instant('VENDEDOR.MAP.UPLOAD_IMAGE_INVALID_TYPE');
      input.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.clienteFormError = this.translate.instant('VENDEDOR.MAP.UPLOAD_IMAGE_TOO_LARGE');
      input.value = '';
      return;
    }

    this.archivoFotoCliente = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.fotoPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    this.clienteFormError = '';
  }

  private subirFotoCliente(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.archivoFotoCliente) {
        resolve();
        return;
      }

      const formData = new FormData();
      formData.append('image', this.archivoFotoCliente);

      this.clientesService.uploadClienteImage(formData).subscribe({
        next: (response: any) => {
          this.newCliente.urlFotoFachada = response.imageUrl;
          this.archivoFotoCliente = undefined;
          resolve();
        },
        error: (err) => {
          console.error('Error al subir foto del cliente:', err);
          reject(new Error(this.translate.instant('VENDEDOR.MAP.UPLOAD_IMAGE_ERROR')));
        }
      });
    });
  }

  saveCliente(): void {
    if (!this.newCliente.nombreNegocio?.trim() || !this.newCliente.ciNit?.trim()) {
      this.clienteFormError = this.translate.instant('VENDEDOR.MAP.CLIENT_FORM_REQUIRED_FIELDS');
      return;
    }

    if (!this.isCiNitValid(this.newCliente.ciNit)) {
      this.ciNitError = 'Formatos de CI/NIT inválido. Solo se permiten números y extensiones válidas.';
      this.clienteFormError = this.ciNitError;
      return;
    }

    if (this.newCliente.latitud == null || this.newCliente.longitud == null) {
      this.clienteFormError = this.translate.instant('VENDEDOR.MAP.CLIENT_FORM_LOCATION_REQUIRED');
      return;
    }

    this.clienteFormError = '';

    this.ciNitError = '';

    const uploadPromise = this.archivoFotoCliente ? this.subirFotoCliente() : Promise.resolve();
    uploadPromise.then(() => {
      this.clientesService.createCliente(this.newCliente).subscribe({
        next: () => {
          this.closeNuevoClienteModal();
          this.loadClientes();
        },
        error: (err) => {
          console.error('Error al crear cliente:', err);
          const errorMsg = err.error?.message || err.error?.error || this.translate.instant('VENDEDOR.MAP.CLIENT_REGISTER_ERROR');
          this.clienteFormError = errorMsg;
        }
      });
    }).catch((error) => {
      this.clienteFormError = error instanceof Error ? error.message : this.translate.instant('VENDEDOR.MAP.CLIENT_UPLOAD_ERROR');
    });
  }

  private async loadMap(): Promise<void> {
    try {
      await this.loadGoogleMapsScript();
      this.initMap();
    } catch (err) {
      console.error('Error cargando Google Maps:', err);
      this.error = this.translate.instant('VENDEDOR.MAP.MAP_LOAD_ERROR');
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

  private initMap(): void {
    const googleMaps = (window as any).google;
    if (!googleMaps?.maps) {
      this.error = 'Google Maps no está disponible.';
      return;
    }

    const center = this.almacenCentralCoordenadas;
    this.map = new googleMaps.maps.Map(this.mapContainer.nativeElement, {
      center,
      zoom: 13,
      streetViewControl: false,
      mapTypeControl: false,
    });

    if (this.mapView === 'route') {
      this.drawRoute();
    } else {
      this.addExistingMarkers();
    }
  }

  loadRutaOptima(): void {
    this.calculateRouteFromSelection();
  }

  toggleClientSelection(clientId: string): void {
    if (this.selectedClientIds.has(clientId)) {
      this.selectedClientIds.delete(clientId);
    } else {
      this.selectedClientIds.add(clientId);
    }
    this.calculateRouteFromSelection();
  }

  onStartPointChange(): void {
    this.geoErrorMsg = '';

    if (this.routeStartPointId === 'actual') {
      if (this.ubicacionActualCoordenadas) {
        this.calculateRouteFromSelection();
      } else {
        this.cargandoUbicacion = true;
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              this.ubicacionActualCoordenadas = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              this.cargandoUbicacion = false;
              this.calculateRouteFromSelection();
            },
            (error) => {
              this.cargandoUbicacion = false;
              const principal = this.sucursales.find(s => s.esPrincipal);
              if (principal) {
                this.routeStartPointId = principal.id || '';
              } else if (this.sucursales.length > 0) {
                this.routeStartPointId = this.sucursales[0].id || '';
              } else {
                this.routeStartPointId = 'actual';
              }
              console.error('Error al obtener geolocalización:', error);
              switch(error.code) {
                case error.PERMISSION_DENIED:
                  this.geoErrorMsg = this.translate.instant('VENDEDOR.MAP.GEOLOCATION_PERMISSION_DENIED') || 'Permiso denegado por el usuario para acceder al GPS.';
                  break;
                case error.POSITION_UNAVAILABLE:
                  this.geoErrorMsg = this.translate.instant('VENDEDOR.MAP.GEOLOCATION_UNAVAILABLE') || 'Información de ubicación no disponible.';
                  break;
                case error.TIMEOUT:
                  this.geoErrorMsg = this.translate.instant('VENDEDOR.MAP.GEOLOCATION_TIMEOUT') || 'Tiempo de espera agotado al obtener ubicación.';
                  break;
                default:
                  this.geoErrorMsg = this.translate.instant('VENDEDOR.MAP.GEOLOCATION_ERROR') || 'No se pudo obtener tu ubicación actual.';
              }
              this.calculateRouteFromSelection();
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
          );
        } else {
          this.cargandoUbicacion = false;
          const principal = this.sucursales.find(s => s.esPrincipal);
          if (principal) {
            this.routeStartPointId = principal.id || '';
          }
          this.geoErrorMsg = this.translate.instant('VENDEDOR.MAP.GEOLOCATION_NOT_SUPPORTED') || 'Tu navegador no soporta geolocalización.';
          this.calculateRouteFromSelection();
        }
      }
    } else {
      this.calculateRouteFromSelection();
    }
  }

  calculateRouteFromSelection(): void {
    const startPoint: PuntoRuta = this.routeStartPointId === 'actual' && this.ubicacionActualCoordenadas
      ? {
          id: 'PUNTO-INICIAL-ACTUAL',
          cliente: this.translate.instant('VENDEDOR.MAP.CURRENT_LOCATION') || 'Mi ubicación actual',
          prioridad: 'ALTA',
          coordenadas: this.ubicacionActualCoordenadas
        }
      : (() => {
          const selectedSucursal = this.sucursales.find(s => s.id === this.routeStartPointId);
          if (selectedSucursal) {
            return {
              id: selectedSucursal.esPrincipal ? 'PUNTO-INICIAL-ALMACEN' : 'PUNTO-INICIAL-SUCURSAL',
              cliente: selectedSucursal.nombre,
              prioridad: 'ALTA',
              coordenadas: { lat: selectedSucursal.latitud, lng: selectedSucursal.longitud }
            };
          }
          return {
            id: 'PUNTO-INICIAL-ALMACEN',
            cliente: this.almacenCentralNombre,
            prioridad: 'ALTA',
            coordenadas: this.almacenCentralCoordenadas
          };
        })();

    const orderRoutePoints = this.getRoutePointsFromOrders(startPoint);
    if (orderRoutePoints.length > 0) {
      const sortedOrders = this.sortNearestNeighbor(startPoint.coordenadas, orderRoutePoints);
      this.rutaPuntos = [startPoint, ...sortedOrders];
      if (this.map && this.mapView === 'route') {
        this.drawRoute();
      }
      return;
    }

    if (this.activeClientes.length === 0) {
      this.outlierClients = [];
      this.apiService.getRutaOptima().subscribe({
        next: (ruta) => {
          const rutaCopiada = [...ruta];
          if (rutaCopiada.length > 0 && (rutaCopiada[0].id === 'PUNTO-INICIAL-ALMACEN' || rutaCopiada[0].id === 'PUNTO-INICIAL-ACTUAL')) {
            rutaCopiada[0] = startPoint;
          }
          this.rutaPuntos = rutaCopiada;
          if (this.map && this.mapView === 'route') {
            this.drawRoute();
          }
        },
        error: () => {
          this.rutaPuntos = [startPoint];
          if (this.map && this.mapView === 'route') {
            this.drawRoute();
          }
        }
      });
      return;
    }

    // Process clients: check for outliers (> 50 km from Warehouse)
    const activeSelected: ApiCliente[] = [];
    const outliers: any[] = [];

    this.activeClientes.forEach(c => {
      if (c.id_cliente && this.selectedClientIds.has(c.id_cliente) && c.latitud != null && c.longitud != null) {
        const dist = this.calculateHaversineDistance(startPoint.coordenadas.lat, startPoint.coordenadas.lng, c.latitud, c.longitud);
        if (dist > 50) {
          outliers.push({
            nombre_negocio: c.nombre_negocio,
            distancia: dist
          });
        } else {
          activeSelected.push(c);
        }
      }
    });

    this.outlierClients = outliers;

    if (activeSelected.length === 0) {
      this.rutaPuntos = [startPoint];
      this.routeDistance = '0 km';
      this.routeDuration = '0 min';
      if (this.map && this.mapView === 'route') {
        this.drawRoute();
      }
      return;
    }

    const customerPoints: PuntoRuta[] = activeSelected.map(c => {
      const clientId = parseInt(c.id_cliente || '0', 10);
      const scheduledPriority = this.mapaPrioridadesPorCliente.get(clientId);
      const priority = scheduledPriority || (c.frecuencia_visita === 'Diaria' || c.frecuencia_visita === 'Semanal' ? 'ALTA' : 'BAJA');
      
      return {
        id: c.id_cliente || '',
        cliente: c.nombre_negocio,
        prioridad: priority,
        coordenadas: { lat: c.latitud!, lng: c.longitud! }
      };
    });

    const sortedCustomers = this.sortNearestNeighbor(startPoint.coordenadas, customerPoints);
    this.rutaPuntos = [startPoint, ...sortedCustomers];

    if (this.map && this.mapView === 'route') {
      this.drawRoute();
    }
  }

  private getRoutePointsFromOrders(startPoint: PuntoRuta): PuntoRuta[] {
    const today = new Date().toISOString().split('T')[0];
    return this.pedidosProgramados
      .filter(pedido => pedido.fechaProgramada === today && pedido.estado === 'PROGRAMADO')
      .map(pedido => {
        const cliente = this.ubicaciones.find(c => c.id_cliente === String(pedido.idCliente));
        const nombreCliente = pedido.nombreNegocio || cliente?.nombre_negocio || `Pedido ${pedido.id}`;
        const coordenadas = cliente?.latitud != null && cliente?.longitud != null
          ? { lat: cliente.latitud, lng: cliente.longitud }
          : null;

        return coordenadas ? {
          id: pedido.id || '',
          cliente: nombreCliente,
          prioridad: pedido.prioridad,
          coordenadas
        } : null;
      })
      .filter((routePoint): routePoint is PuntoRuta => routePoint !== null);
  }

  private sortNearestNeighbor(start: { lat: number; lng: number }, points: PuntoRuta[]): PuntoRuta[] {
    const unvisited = [...points];
    const result: PuntoRuta[] = [];
    let current = start;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const p = unvisited[i].coordenadas;
        const dist = this.calculateHaversineDistance(current.lat, current.lng, p.lat, p.lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }

      const nextPoint = unvisited.splice(nearestIndex, 1)[0];
      result.push(nextPoint);
      current = nextPoint.coordenadas;
    }

    return result;
  }

  setMapView(view: 'clients' | 'route'): void {
    this.mapView = view;
    this.error = '';
    if (this.map) {
      if (view === 'route') {
        this.calculateRouteFromSelection();
      } else {
        if (this.directionsRenderer) {
          this.directionsRenderer.setMap(null);
        }
        if (this.fallbackPolyline) {
          this.fallbackPolyline.setMap(null);
        }
        if (this.osrmPolyline) {
          this.osrmPolyline.setMap(null);
          this.osrmPolyline = null;
        }
        this.addExistingMarkers();
        const googleMaps = (window as any).google;
        if (googleMaps?.maps) {
          this.map.setZoom(13);
          this.map.panTo(this.almacenCentralCoordenadas);
        }
      }
    }
  }

  private drawRoute(): void {
    const googleMaps = (window as any).google;
    if (!googleMaps?.maps || !this.map) return;

    this.clearMarkers();
    this.error = '';

    if (this.rutaPuntos.length < 2) {
      if (this.directionsRenderer) {
        this.directionsRenderer.setMap(null);
      }
      if (this.fallbackPolyline) {
        this.fallbackPolyline.setMap(null);
      }
      if (this.osrmPolyline) {
        this.osrmPolyline.setMap(null);
      }
      this.routeDistance = '0 km';
      this.routeDuration = '0 min';
      this.drawRouteMarkers(googleMaps);
      return;
    }

    const coordsParam = this.rutaPuntos.map(p => `${p.coordenadas.lng},${p.coordenadas.lat}`).join(';');
    const url = `https://router.project-osrm.org/trip/v1/driving/${coordsParam}?source=first&destination=any&roundtrip=false&geometries=geojson&overview=full`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        this.ngZone.run(() => {
          if (data.code === 'Ok' && data.trips && data.trips.length > 0) {
            if (this.directionsRenderer) {
              this.directionsRenderer.setMap(null);
            }
            if (this.fallbackPolyline) {
              this.fallbackPolyline.setMap(null);
            }
            if (this.osrmPolyline) {
              this.osrmPolyline.setMap(null);
            }

            const trip = data.trips[0];
            const pathCoords = trip.geometry.coordinates.map((coord: [number, number]) => ({
              lat: coord[1],
              lng: coord[0]
            }));

            this.osrmPolyline = new googleMaps.maps.Polyline({
              path: pathCoords,
              strokeColor: '#2563eb',
              strokeOpacity: 0.8,
              strokeWeight: 6,
              map: this.map
            });

            const bounds = new googleMaps.maps.LatLngBounds();
            pathCoords.forEach((coord: any) => bounds.extend(coord));
            this.map.fitBounds(bounds);

            if (data.waypoints && data.waypoints.length > 0) {
              const originalClients = this.rutaPuntos.slice(1);
              const clientOrders = originalClients.map((client, index) => {
                const osrmWp = data.waypoints[index + 1];
                return {
                  client,
                  order: osrmWp ? osrmWp.waypoint_index : Infinity
                };
              });

              clientOrders.sort((a, b) => a.order - b.order);

              const startPoint = this.rutaPuntos[0];
              this.rutaPuntos = [startPoint, ...clientOrders.map(co => co.client)];
            }

            const distKm = (trip.distance / 1000).toFixed(1);
            const mins = Math.round(trip.duration / 60);
            const hrs = Math.floor(mins / 60);
            const remainingMins = mins % 60;
            
            const hrsStr = hrs > 0 ? `${hrs} h ` : '';
            const minsStr = `${remainingMins} min`;

            this.routeDistance = `${distKm} km`;
            this.routeDuration = `${hrsStr}${minsStr}`;

            this.drawRouteMarkers(googleMaps);
          } else {
            console.warn('OSRM Trip API returned non-OK status, calling fallback:', data.code);
            this.drawFallbackRoute(googleMaps);
          }
        });
      })
      .catch(err => {
        this.ngZone.run(() => {
          console.error('OSRM API request failed, calling fallback:', err);
          this.drawFallbackRoute(googleMaps);
        });
      });
  }

  private drawFallbackRoute(googleMaps: any): void {
    if (this.directionsRenderer) {
      this.directionsRenderer.setMap(null);
    }
    if (this.fallbackPolyline) {
      this.fallbackPolyline.setMap(null);
    }
    if (this.osrmPolyline) {
      this.osrmPolyline.setMap(null);
    }

    const pathCoordinates = this.rutaPuntos.map(p => ({ lat: p.coordenadas.lat, lng: p.coordenadas.lng }));

    this.fallbackPolyline = new googleMaps.maps.Polyline({
      path: pathCoordinates,
      geodesic: true,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWeight: 6,
      map: this.map
    });

    let totalDist = 0;
    for (let i = 0; i < this.rutaPuntos.length - 1; i++) {
      const p1 = this.rutaPuntos[i].coordenadas;
      const p2 = this.rutaPuntos[i+1].coordenadas;
      totalDist += this.calculateHaversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    }

    const avgSpeedKmh = 30;
    const durationHours = totalDist / avgSpeedKmh;
    const durationMinutes = Math.round(durationHours * 60);

    const hrs = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const hrsStr = hrs > 0 ? `${hrs} h ` : '';
    const minsStr = `${mins} min`;

    this.routeDistance = `~${totalDist.toFixed(1)} km`;
    this.routeDuration = `~${hrsStr}${minsStr}`;

    const bounds = new googleMaps.maps.LatLngBounds();
    pathCoordinates.forEach(coord => bounds.extend(coord));
    this.map.fitBounds(bounds);

    this.drawRouteMarkers(googleMaps);
  }

  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private drawRouteMarkers(googleMaps: any): void {
    this.clearMarkers();
    this.rutaPuntos.forEach((punto, index) => {
      let emoji = '🛻';
      const isStart = punto.id === 'PUNTO-INICIAL-ALMACEN' || punto.id === 'PUNTO-INICIAL-ACTUAL' || punto.id === 'PUNTO-INICIAL-SUCURSAL';
      if (punto.id === 'PUNTO-INICIAL-ALMACEN' || punto.id === 'PUNTO-INICIAL-SUCURSAL') {
        emoji = '🏢';
      } else if (punto.id === 'PUNTO-INICIAL-ACTUAL') {
        emoji = '📍';
      }

      const marker = new googleMaps.maps.Marker({
        position: { lat: punto.coordenadas.lat, lng: punto.coordenadas.lng },
        map: this.map,
        title: punto.cliente,
        label: {
          text: emoji,
          fontSize: '20px',
        },
        icon: {
          path: googleMaps.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: isStart ? '#1e293b' : '#2563eb',
          fillOpacity: 0.15,
          strokeColor: isStart ? '#0f172a' : '#1d4ed8',
          strokeWeight: 2,
          labelOrigin: new googleMaps.maps.Point(0, 0)
        }
      });

      const priorityLabel = punto.prioridad === 'ALTA' 
        ? this.translate.instant('VENDEDOR.MAP.PRIORITY_ALTA') 
        : (punto.prioridad === 'MEDIA' 
            ? this.translate.instant('VENDEDOR.MAP.PRIORITY_MEDIA') 
            : this.translate.instant('VENDEDOR.MAP.PRIORITY_BAJA'));

      // Priority color mapping - fully supports all 3 levels
      const priorityColorMap: { [key: string]: { background: string; text: string; border: string } } = {
        'ALTA': { background: '#fee2e2', text: '#991b1b', border: '#fecaca' },
        'MEDIA': { background: '#fef3c7', text: '#92400e', border: '#fde68a' },
        'BAJA': { background: '#dcfce7', text: '#166534', border: '#bbf7d0' }
      };

      const priorityColors = priorityColorMap[punto.prioridad as keyof typeof priorityColorMap] || priorityColorMap['BAJA'];

      const infoContent = `
        <div style="font-family:sans-serif;font-size:13px;padding:8px;min-width:200px;line-height:1.6;border-radius:8px;">
          <strong style="font-size:14px;color:#0f172a;display:block;margin-bottom:6px;">${punto.cliente}</strong>
          <div style="margin-bottom:4px;">
            <span style="color:#64748b;font-size:12px;">${this.translate.instant('VENDEDOR.MAP.ROUTE_ORDER')}:</span>
            <span style="color:#1e293b;font-weight:600;margin-left:4px;">Stop #${index + 1}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
            <span style="color:#64748b;font-size:12px;">${this.translate.instant('VENDEDOR.MAP.PRIORITY')}:</span>
            <span style="background:${priorityColors.background};color:${priorityColors.text};padding:4px 10px;border-radius:6px;font-weight:700;font-size:12px;border:1px solid ${priorityColors.border};">
              ${priorityLabel}
            </span>
          </div>
        </div>
      `;

      const infoWindow = new googleMaps.maps.InfoWindow({
        content: infoContent
      });

      marker.addListener('click', () => {
        infoWindow.open(this.map, marker);
      });

      this.markers.push(marker);
    });
  }

  private addExistingMarkers(): void {
    this.clearMarkers();
    const googleMaps = (window as any).google;
    if (!googleMaps?.maps || !this.map) {
      return;
    }

    this.filteredActiveClientes.forEach((ubicacion) => {
      if (ubicacion.latitud == null || ubicacion.longitud == null) {
        return;
      }

      const marker = new googleMaps.maps.Marker({
        position: { lat: ubicacion.latitud, lng: ubicacion.longitud },
        map: this.map,
        title: ubicacion.nombre_negocio,
      });

      const imgHtml = ubicacion.url_foto_fachada
        ? `<img src="${ubicacion.url_foto_fachada}" alt="${ubicacion.nombre_negocio}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />`
        : '';

      const infoWindow = new googleMaps.maps.InfoWindow({
        content: `${imgHtml}<strong>${ubicacion.nombre_negocio}</strong><br>${this.translate.instant('VENDEDOR.MAP.INFO_CI_NIT')}: ${ubicacion.ci_nit}<br>${this.translate.instant('VENDEDOR.MAP.INFO_PHONE')}: ${ubicacion.celular || this.translate.instant('VENDEDOR.MAP.INFO_NOT_SPECIFIED')}<br>${this.translate.instant('VENDEDOR.MAP.INFO_FREQUENCY')}: ${ubicacion.frecuencia_visita}`,
      });

      marker.addListener('click', () => infoWindow.open(this.map, marker));
      this.markers.push(marker);
    });
  }

  private clearMarkers(): void {
    if (!this.markers?.length) {
      return;
    }
    this.markers.forEach((marker) => marker.setMap(null));
    this.markers = [];
  }
}
