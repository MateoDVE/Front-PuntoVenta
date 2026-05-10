import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import {
  ApiService,
  Cliente,
  CierreGuardado,
  VentaResumenResponse,
} from '../../../services/api.service';
import { ClientesService } from '../../../services/clientes.service';
import { VendedoresService } from '../../../services/vendedores.service';
import { environment } from '../../../../environments/environment';

interface VendedorMonitorData {
  id: string;
  nombre: string;
  email: string;
  estadoDisplay: string;
  stock: number;
  ventas: number;
  ingresos: number;
}

interface ClienteMapaData extends Cliente {
  vendedorNombre: string;
  atendidoHoy: boolean;
}

@Component({
  selector: 'app-monitoreo',
  standalone: true,
  imports: [CommonModule, AdminNavbar],
  templateUrl: './monitoreo.html',
  styleUrls: ['./monitoreo.scss'],
})
export class MonitoreoComponent implements OnInit {

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLElement>;

  vendedoresDatos: VendedorMonitorData[] = [];
  clientesMapa: ClienteMapaData[] = [];
  cargando = false;
  error = '';

  private map: any;
  private markers: any[] = [];
  private fechaHoy = '';

  constructor(
    private apiService: ApiService,
    private clientesService: ClientesService,
    private vendedoresService: VendedoresService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.fechaHoy = this.getFechaHoy();
    this.cargar();
  }

  // ── Carga principal ───────────────────────────────────────────────────────

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.limpiarMapa();

    this.vendedoresService.getVendedores().pipe(
      switchMap(vendedores => {
        if (vendedores.length === 0) {
          return of({ vendedoresDatos: [] as VendedorMonitorData[], clientesMapa: [] as ClienteMapaData[] });
        }

        const vendedorNombreMap = new Map(vendedores.map(v => [v.id_usuario, v.nombre]));

        const perVendedor$ = forkJoin(
          vendedores.map(v =>
            forkJoin({
              inventario: this.apiService.getInventarioVendedor(v.id_usuario).pipe(
                catchError(() => of([])),
              ),
              cierreJornada: this.apiService.getCierreJornada(v.id_usuario, this.fechaHoy).pipe(
                catchError(() => of(null)),
              ),
              cierresHistorial: this.apiService.getCierresVendedor(v.id_usuario).pipe(
                catchError(() => of([] as CierreGuardado[])),
              ),
              clientes: this.clientesService.getClientes(v.id_usuario).pipe(
                catchError(() => of([] as Cliente[])),
              ),
            }).pipe(
              map(({ inventario, cierreJornada, cierresHistorial, clientes }) => {
                const stock = inventario
                  .filter((inv: any) => inv.estado_validacion === 'VALIDADO')
                  .reduce((sum: number, inv: any) => sum + inv.cantidad_inicial, 0);

                const ventas = cierreJornada?.resumenFinanciero?.ventasRealizadas ?? 0;
                const ingresos = cierreJornada?.resumenFinanciero?.totalEfectivo ?? 0;

                const jornadaCerradaHoy = (cierresHistorial as CierreGuardado[]).some(
                  c => c.fecha === this.fechaHoy,
                );

                const estadoDisplay = jornadaCerradaHoy
                  ? 'JORNADA CERRADA'
                  : (v.estado?.toUpperCase() ?? 'ACTIVO');

                return {
                  vendedor: { id: v.id_usuario, nombre: v.nombre, email: v.email, estadoDisplay, stock, ventas, ingresos } as VendedorMonitorData,
                  clientes: clientes as Cliente[],
                };
              }),
            ),
          ),
        );

        const atendidosHoy$ = this.apiService.getVentas().pipe(
          map((ventas: VentaResumenResponse[]) =>
            new Set(
              ventas
                .filter(v => v.fechaHora?.startsWith(this.fechaHoy))
                .map(v => String(v.idCliente)),
            ),
          ),
          catchError(() => of(new Set<string>())),
        );

        return forkJoin({ perVendedor: perVendedor$, atendidos: atendidosHoy$ }).pipe(
          map(({ perVendedor, atendidos }) => {
            const vendedoresDatos = perVendedor.map(r => r.vendedor);

            const vistas = new Set<string>();
            const clientesMapa: ClienteMapaData[] = [];
            for (const r of perVendedor) {
              for (const c of r.clientes) {
                if (c.latitud != null && c.longitud != null && c.id_cliente && !vistas.has(c.id_cliente)) {
                  vistas.add(c.id_cliente);
                  clientesMapa.push({
                    ...c,
                    vendedorNombre: vendedorNombreMap.get(c.id_vendedor_creador ?? '') ?? 'Sin asignar',
                    atendidoHoy: atendidos.has(c.id_cliente),
                  });
                }
              }
            }

            return { vendedoresDatos, clientesMapa };
          }),
        );
      }),
      catchError(() => {
        this.error = 'No se pudieron cargar los datos. Verifica la conexión con el servidor.';
        return of({ vendedoresDatos: [] as VendedorMonitorData[], clientesMapa: [] as ClienteMapaData[] });
      }),
    ).subscribe(({ vendedoresDatos, clientesMapa }) => {
      this.vendedoresDatos = vendedoresDatos;
      this.clientesMapa = clientesMapa;
      this.cargando = false;
      this.cdr.detectChanges();
      this.inicializarMapa();
    });
  }

  // ── Getters calculados ────────────────────────────────────────────────────

  get totalIngresos(): number {
    return this.vendedoresDatos.reduce((s, v) => s + v.ingresos, 0);
  }

  get vendedoresEnRuta(): number {
    return this.vendedoresDatos.filter(v => this.esEnRuta(v.estadoDisplay)).length;
  }

  getInitials(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  esEnRuta(estado: string): boolean {
    return estado.toUpperCase().includes('RUTA');
  }

  esCerrado(estado: string): boolean {
    return estado.toUpperCase().includes('CERRADA');
  }

  // ── Google Maps ───────────────────────────────────────────────────────────

  private async inicializarMapa(): Promise<void> {
    if (!this.mapContainer?.nativeElement) return;
    try {
      await this.cargarScriptGoogleMaps();
      this.initMap();
    } catch {
      // El mapa no carga: se muestra el contenedor vacío
    }
  }

  private cargarScriptGoogleMaps(): Promise<void> {
    if ((window as any).google?.maps) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const existing = document.getElementById('google-maps-script');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject());
        return;
      }
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  }

  private initMap(): void {
    const gm = (window as any).google?.maps;
    if (!gm || !this.mapContainer?.nativeElement) return;

    this.map = new gm.Map(this.mapContainer.nativeElement, {
      center: { lat: -17.3935, lng: -66.157 },
      zoom: 13,
      streetViewControl: false,
      mapTypeControl: false,
    });

    this.addClienteMarkers();
  }

  private addClienteMarkers(): void {
    this.limpiarMapa();
    const gm = (window as any).google?.maps;
    if (!gm || !this.map) return;

    this.clientesMapa.forEach(cliente => {
      if (cliente.latitud == null || cliente.longitud == null) return;

      const esActivo = cliente.estado?.toUpperCase() === 'ACTIVO';

      let pinColor: string;
      if (!esActivo) {
        pinColor = '#9ca3af';
      } else if (cliente.atendidoHoy) {
        pinColor = '#22c55e';
      } else {
        pinColor = '#3b82f6';
      }

      const marker = new gm.Marker({
        position: { lat: cliente.latitud, lng: cliente.longitud },
        map: this.map,
        title: cliente.nombre_negocio,
        icon: {
          path: gm.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: pinColor,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      const imgHtml = cliente.url_foto_fachada
        ? `<img src="${cliente.url_foto_fachada}" alt="${cliente.nombre_negocio}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />`
        : '';

      const estadoColor = esActivo ? '#15803d' : '#6b7280';
      const estadoLabel = esActivo ? 'Activo' : 'Inactivo';
      const atendidoColor = cliente.atendidoHoy ? '#15803d' : '#d97706';
      const atendidoLabel = cliente.atendidoHoy ? '✓ Atendido hoy' : '⏳ Pendiente';

      const infoWindow = new gm.InfoWindow({
        content: `
          <div style="font-family:sans-serif;font-size:13px;min-width:180px;max-width:230px;line-height:1.7">
            ${imgHtml}
            <strong style="font-size:14px">${cliente.nombre_negocio}</strong><br>
            <span style="color:#6b7280">CI/NIT:</span> ${cliente.ci_nit}<br>
            ${cliente.celular ? `<span style="color:#6b7280">Tel:</span> ${cliente.celular}<br>` : ''}
            <span style="color:#6b7280">Visita:</span> ${cliente.frecuencia_visita}<br>
            <span style="color:#6b7280">Vendedor:</span> ${cliente.vendedorNombre}<br>
            <span style="color:${estadoColor};font-weight:600">${estadoLabel}</span>
            &nbsp;·&nbsp;
            <span style="color:${atendidoColor};font-weight:700">${atendidoLabel}</span>
          </div>`,
      });

      marker.addListener('click', () => infoWindow.open(this.map, marker));
      this.markers.push(marker);
    });
  }

  private limpiarMapa(): void {
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  private getFechaHoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  onSignOut(): void {
    this.router.navigate(['/login']);
  }
}
