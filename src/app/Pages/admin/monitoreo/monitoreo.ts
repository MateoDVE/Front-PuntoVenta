import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
  imports: [CommonModule, AdminNavbar, TranslateModule, FormsModule],
  templateUrl: './monitoreo.html',
  styleUrls: ['./monitoreo.scss'],
})
export class MonitoreoComponent implements OnInit {

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLElement>;

  vendedoresDatos: VendedorMonitorData[] = [];
  clientesMapa: ClienteMapaData[] = [];
  cargando = false;
  error = '';

  // Control de pestañas
  activeTab: 'mapa' | 'liquidaciones' = 'mapa';
  todosCierres: CierreGuardado[] = [];
  vendedoresNombresMap = new Map<string, string>();
  searchQuery = '';
  sortOrder: 'asc' | 'desc' | '' = '';

  // Modal de liquidaciones
  mostrarModalCierres = false;
  vendedorSeleccionado: VendedorMonitorData | null = null;
  cierresVendedor: CierreGuardado[] = [];
  cargandoCierres = false;
  cierreActivoDetalle: CierreGuardado | null = null;
  dineroRecibidoInput: number | null = null;
  errorLiquidar = '';
  exitoLiquidar = '';
  procesandoLiquidacion = false;

  private map: any;
  private markers: any[] = [];
  private fechaHoy = '';

  constructor(
    private apiService: ApiService,
    private clientesService: ClientesService,
    private vendedoresService: VendedoresService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
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
          return of({ vendedoresDatos: [] as VendedorMonitorData[], clientesMapa: [] as ClienteMapaData[], todosCierres: [] as CierreGuardado[] });
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
                  .filter((inv: any) => inv.estado_validacion === 'VALIDADO' && inv.fecha_asignacion && String(inv.fecha_asignacion).substring(0, 10) === this.fechaHoy)
                  .reduce((sum: number, inv: any) => sum + (inv.cantidad_actual ?? 0), 0);

                const ventas = cierreJornada?.resumenFinanciero?.ventasRealizadas ?? 0;
                const ingresos = cierreJornada?.resumenFinanciero?.totalEfectivo ?? 0;

                const todayCierre = (cierresHistorial as CierreGuardado[]).find(
                  c => c.fecha === this.fechaHoy,
                );

                let estadoDisplay = 'ACTIVO';
                if (todayCierre) {
                  estadoDisplay = todayCierre.estado === 'LIQUIDADA' ? 'LIQUIDADA' : 'JORNADA_CERRADA';
                } else if (v.estado?.toUpperCase() === 'EN RUTA') {
                  estadoDisplay = 'EN_RUTA';
                }

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

        const allCierres$ = this.apiService.getAllCierres().pipe(
          catchError(() => of([] as CierreGuardado[])),
        );

        return forkJoin({ perVendedor: perVendedor$, atendidos: atendidosHoy$, todosCierres: allCierres$ }).pipe(
          map(({ perVendedor, atendidos, todosCierres }) => {
            const vendedoresDatos = perVendedor.map(r => r.vendedor);
            
            // Guardar mapeo de nombres de vendedores
            this.vendedoresNombresMap = vendedorNombreMap;

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

            return { vendedoresDatos, clientesMapa, todosCierres };
          }),
        );
      }),
      catchError(() => {
        this.error = this.translate.instant('ADMIN.MONITOR.ERROR.LOAD_FAILED');
        return of({ vendedoresDatos: [] as VendedorMonitorData[], clientesMapa: [] as ClienteMapaData[], todosCierres: [] as CierreGuardado[] });
      }),
    ).subscribe(({ vendedoresDatos, clientesMapa, todosCierres }) => {
      this.vendedoresDatos = vendedoresDatos;
      this.clientesMapa = clientesMapa;
      this.todosCierres = todosCierres || [];
      this.cargando = false;
      this.cdr.detectChanges();
      this.inicializarMapa();
    });
  }

  selectTab(tab: 'mapa' | 'liquidaciones'): void {
    this.activeTab = tab;
    if (tab === 'mapa') {
      setTimeout(() => this.inicializarMapa(), 100);
    }
  }

  getVendedorNombre(idVendedor: string): string {
    return this.vendedoresNombresMap.get(idVendedor) || 'Vendedor Desconocido';
  }

  // ── Getters calculados ────────────────────────────────────────────────────

  get totalIngresos(): number {
    return this.vendedoresDatosFiltrados.reduce((s, v) => s + v.ingresos, 0);
  }

  get vendedoresEnRuta(): number {
    return this.vendedoresDatosFiltrados.filter(v => this.esEnRuta(v.estadoDisplay)).length;
  }

  get vendedoresDatosFiltrados(): VendedorMonitorData[] {
    let list = [...this.vendedoresDatos];

    // 1. Filtrar por buscador (nombre del vendedor)
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase().trim();
      list = list.filter(v => v.nombre.toLowerCase().includes(query));
    }

    // 2. Ordenar por ingresos/ventas
    if (this.sortOrder === 'asc') {
      list.sort((a, b) => a.ingresos - b.ingresos);
    } else if (this.sortOrder === 'desc') {
      list.sort((a, b) => b.ingresos - a.ingresos);
    }

    return list;
  }

  get cierresFiltrados(): CierreGuardado[] {
    let list = [...this.todosCierres];

    // 1. Filtrar por buscador (nombre del vendedor)
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase().trim();
      list = list.filter(c => {
        const vNombre = this.getVendedorNombre(c.id_vendedor).toLowerCase();
        return vNombre.includes(query);
      });
    }

    // 2. Ordenar por monto de ventas (total_efectivo)
    if (this.sortOrder === 'asc') {
      list.sort((a, b) => (a.total_efectivo || 0) - (b.total_efectivo || 0));
    } else if (this.sortOrder === 'desc') {
      list.sort((a, b) => (b.total_efectivo || 0) - (a.total_efectivo || 0));
    }

    return list;
  }

  onSearchOrSortChange(): void {
    if (this.activeTab === 'mapa') {
      this.addClienteMarkers();
    }
  }

  getInitials(nombre: string): string {
    if (!nombre || typeof nombre !== 'string') return '';
    return nombre.split(' ').slice(0, 2).map(n => n ? n[0] : '').join('').toUpperCase();
  }

  getEstadoLabel(estado: string): string {
    const keys: Record<string, string> = {
      ACTIVO: 'ADMIN.MONITOR.STATUS.ACTIVE',
      'EN_RUTA': 'ADMIN.MONITOR.STATUS.EN_ROUTE',
      'JORNADA_CERRADA': 'ADMIN.MONITOR.STATUS.CLOSED',
      'LIQUIDADA': 'ADMIN.MONITOR.STATUS.LIQUIDATED',
    };
    return this.translate.instant(keys[estado] ?? estado);
  }

  esEnRuta(estado: string): boolean {
    return estado === 'EN_RUTA';
  }

  esCerrado(estado: string): boolean {
    return estado === 'JORNADA_CERRADA';
  }

  esLiquidada(estado: string): boolean {
    return estado === 'LIQUIDADA';
  }

  esActivo(estado: string): boolean {
    return estado === 'ACTIVO';
  }

  // ── Métodos para Liquidación de Cierres ────────────────────────────────────

  abrirModalCierres(vendedor: VendedorMonitorData): void {
    this.vendedorSeleccionado = vendedor;
    this.mostrarModalCierres = true;
    this.cargandoCierres = true;
    this.cierreActivoDetalle = null;
    this.errorLiquidar = '';
    this.exitoLiquidar = '';

    this.apiService.getCierresVendedor(vendedor.id).subscribe({
      next: (cierres) => {
        this.cierresVendedor = cierres;
        this.cargandoCierres = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorLiquidar = 'No se pudieron cargar los cierres del vendedor.';
        this.cargandoCierres = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirModalLiquidacionDirecta(cierre: CierreGuardado): void {
    const vNombre = this.getVendedorNombre(cierre.id_vendedor);
    this.vendedorSeleccionado = {
      id: cierre.id_vendedor,
      nombre: vNombre,
      email: '',
      estadoDisplay: '',
      stock: 0,
      ventas: 0,
      ingresos: 0
    };
    this.mostrarModalCierres = true;
    this.cargandoCierres = false;
    this.cierresVendedor = [cierre];
    this.cierreActivoDetalle = cierre;
    this.dineroRecibidoInput = cierre.dinero_contado;
    this.errorLiquidar = '';
    this.exitoLiquidar = '';
    this.cdr.detectChanges();
  }

  cerrarModalCierres(): void {
    this.mostrarModalCierres = false;
    this.vendedorSeleccionado = null;
    this.cierresVendedor = [];
    this.cierreActivoDetalle = null;
    this.dineroRecibidoInput = null;
    this.errorLiquidar = '';
    this.exitoLiquidar = '';
  }

  seleccionarCierre(cierre: CierreGuardado): void {
    this.cierreActivoDetalle = cierre;
    this.dineroRecibidoInput = cierre.dinero_contado; // pre-rellena con lo declarado por el vendedor
    this.errorLiquidar = '';
    this.exitoLiquidar = '';
  }

  volverAListado(): void {
    this.cierreActivoDetalle = null;
    this.dineroRecibidoInput = null;
    this.errorLiquidar = '';
    this.exitoLiquidar = '';
  }

  registrarLiquidacion(): void {
    if (!this.cierreActivoDetalle || this.dineroRecibidoInput === null || this.dineroRecibidoInput < 0) {
      this.errorLiquidar = 'Ingresa un monto de efectivo recibido válido.';
      return;
    }

    this.procesandoLiquidacion = true;
    this.errorLiquidar = '';
    this.exitoLiquidar = '';

    this.apiService.liquidarJornada(this.cierreActivoDetalle.id_cierre, this.dineroRecibidoInput).subscribe({
      next: (liquidado) => {
        this.exitoLiquidar = 'Jornada liquidada correctamente.';
        this.cierreActivoDetalle = liquidado;
        
        // Actualizar el cierre en la lista local
        const index = this.cierresVendedor.findIndex(c => c.id_cierre === liquidado.id_cierre);
        if (index !== -1) {
          this.cierresVendedor[index] = liquidado;
        }

        // Recargar el estado principal de monitoreo para actualizar badges en las tarjetas
        this.cargar();
        this.procesandoLiquidacion = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorLiquidar = err?.error?.message || 'Error al liquidar la jornada.';
        this.procesandoLiquidacion = false;
        this.cdr.detectChanges();
      }
    });
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

    let list = [...this.clientesMapa];
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase().trim();
      list = list.filter(cliente =>
        cliente.vendedorNombre.toLowerCase().includes(query)
      );
    }

    list.forEach(cliente => {
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
