import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { VendedorNavbar } from '../../../components/vendedor-navbar/vendedor-navbar';
import { ApiService, Cliente as ApiCliente, CreateClientePayload } from '../../../services/api.service';
import { AuthService, UserProfile } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

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
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadUserAndClientes();
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
    this.apiService.getClientes(this.currentUserId).subscribe({
      next: (clientes) => {
        this.ubicaciones = clientes;
        this.loading = false;
        if (this.map) {
          this.addExistingMarkers();
        }
      },
      error: (err) => {
        console.error('Error al cargar clientes:', err);
        this.error = this.translate.instant('VENDEDOR.MAP.CLIENT_LOAD_ERROR');
        this.loading = false;
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

  openNuevoClienteModal(): void {
    this.clienteFormError = '';
    this.celularError = '';
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
      center: { lat: -17.3935, lng: -66.1570 },
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

      this.apiService.uploadClienteImage(formData).subscribe({
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

    if (this.newCliente.latitud == null || this.newCliente.longitud == null) {
      this.clienteFormError = this.translate.instant('VENDEDOR.MAP.CLIENT_FORM_LOCATION_REQUIRED');
      return;
    }

    this.clienteFormError = '';

    const uploadPromise = this.archivoFotoCliente ? this.subirFotoCliente() : Promise.resolve();
    uploadPromise.then(() => {
      this.apiService.createCliente(this.newCliente).subscribe({
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

    const center = { lat: -17.3935, lng: -66.1570 };
    this.map = new googleMaps.maps.Map(this.mapContainer.nativeElement, {
      center,
      zoom: 13,
      streetViewControl: false,
      mapTypeControl: false,
    });

    this.addExistingMarkers();
  }

  private addExistingMarkers(): void {
    this.clearMarkers();
    const googleMaps = (window as any).google;
    if (!googleMaps?.maps || !this.map) {
      return;
    }

    this.ubicaciones.forEach((ubicacion) => {
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
