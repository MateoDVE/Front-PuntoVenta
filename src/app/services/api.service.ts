import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { DatabaseService, VentaPendiente } from './database.service';

export interface ClienteBackend {
  id?: string;
  idVendedorCreador?: string;
  nombreNegocio: string;
  ciNit?: string;
  celular?: string;
  latitud?: number;
  longitud?: number;
  urlFotoFachada?: string;
  frecuenciaVisita?: string;
  estado?: string;
  createdAt?: string;
}

export interface Usuario {
  id_usuario: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  created_at: string;
}

export interface VendedorBackend {
  id_usuario: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  created_at: string;
}

export interface CreateVendedorPayload {
  nombre: string;
  email: string;
  password: string;
}

export interface UpdateVendedorPayload {
  nombre?: string;
  email?: string;
  password?: string;
  estado?: string;
}

export interface Producto {
  id_producto?: number;
  sku: string;
  id_categoria?: number;
  nombre: string;
  descripcion?: string;
  url_imagen?: string;
  precio_unidad: number;
  precio_caja: number;
  unidades_por_caja: number;
  stock_almacen_central: number;
}

export interface Cliente {
  id_cliente?: string;
  id_vendedor_creador?: string;
  nombre_negocio: string;
  ci_nit: string;
  celular?: string;
  latitud?: number;
  longitud?: number;
  url_foto_fachada?: string;
  frecuencia_visita: string;
  estado?: string;
  created_at?: string;
}

export interface CreateClientePayload {
  idVendedorCreador: string;
  nombreNegocio: string;
  ciNit: string;
  celular?: string;
  latitud?: number;
  longitud?: number;
  urlFotoFachada?: string;
  frecuenciaVisita: string;
}

export interface UpdateClientePayload {
  nombreNegocio?: string;
  ciNit?: string;
  celular?: string;
  latitud?: number;
  longitud?: number;
  urlFotoFachada?: string;
  frecuenciaVisita?: string;
  estado?: string;
}

export interface InventarioAsignacion {
  id_carga: string;
  id_vendedor: string;
  id_producto: string;
  cantidad_inicial: number;
  estado_validacion: string;
  fecha_asignacion: string;
  mensaje?: string;
}

export interface AsignarStockPayload {
  idVendedor: string;
  idProducto: string;
  cantidad: number;
}

export interface CargaInicialStockPayload {
  idProducto: string;
  cantidad: number;
}

/**
 * Servicio para interactuar con la API del backend
 * Todos los endpoints requieren autenticación (el interceptor agrega el token automáticamente)
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private db: DatabaseService
  ) {}

  // ==================== USUARIOS ====================
  getMyProfile(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/auth/me`);
  }
  // (Clientes/Productos/Vendedores moved to dedicated services)

  // ==================== INVENTARIO ====================
  asignarStock(payload: AsignarStockPayload): Observable<InventarioAsignacion> {
    return this.http.post<InventarioAsignacion>(`${this.apiUrl}/inventario/asignar`, payload);
  }

  getInventarioVendedor(idVendedor: string): Observable<InventarioAsignacion[]> {
    return this.http.get<InventarioAsignacion[]>(`${this.apiUrl}/inventario/vendedor/${idVendedor}`);
  }

  validarAsignacionAdmin(idCarga: string): Observable<InventarioAsignacion> {
    return this.http.patch<InventarioAsignacion>(`${this.apiUrl}/inventario/validar-admin/${idCarga}`, {});
  }

  confirmarSalidaVendedor(idCarga: string): Observable<InventarioAsignacion> {
    return this.http.patch<InventarioAsignacion>(`${this.apiUrl}/inventario/confirmar-salida/${idCarga}`, {});
  }

  cargarStockInicial(payload: CargaInicialStockPayload): Observable<{ id_producto: string; stock_almacen_central: number; mensaje: string }> {
    return this.http.post<{ id_producto: string; stock_almacen_central: number; mensaje: string }>(
      `${this.apiUrl}/inventario/stock-inicial`,
      payload
    );
  }

  // ==================== VENTAS ====================
  crearVentaRaw(payload: CrearVentaRequest): Observable<VentaResponse> {
    return this.http.post<VentaResponse>(`${this.apiUrl}/ventas`, payload);
  }

  crearVenta(payload: CrearVentaRequest): Observable<VentaResponse> {
    const id = payload.idTransaccionLocal ?? crypto.randomUUID();
    const fullPayload: CrearVentaRequest = { ...payload, idTransaccionLocal: id };

    return this.crearVentaRaw(fullPayload).pipe(
      catchError(err => {
        if (err.status === 0) {
          const pending: VentaPendiente = {
            idTransaccionLocal: id,
            idCliente: fullPayload.idCliente,
            idVendedor: fullPayload.idVendedor,
            descuento: fullPayload.descuento,
            items: fullPayload.items,
            _savedAt: Date.now()
          };
          return from(this.db.ventasPendientes.put(pending)).pipe(
            map(() => ({
              idVenta: id,
              idCliente: fullPayload.idCliente,
              idVendedor: fullPayload.idVendedor,
              fechaHora: new Date().toISOString(),
              subtotal: 0,
              descuento: fullPayload.descuento,
              totalEfectivo: 0,
              estado: 'PENDIENTE_SYNC',
              detalles: []
            } as VentaResponse))
          );
        }
        return throwError(() => err);
      })
    );
  }

  getCierreJornada(idVendedor: string, fecha: string): Observable<CierreJornadaResponse> {
    return this.http.get<CierreJornadaResponse>(`${this.apiUrl}/ventas/cierre-jornada`, {
      params: { idVendedor, fecha }
    });
  }

  confirmarCierreJornada(idVendedor: string, fecha: string, dineroContado: number): Observable<ConfirmarCierreResponse> {
    return this.http.post<ConfirmarCierreResponse>(`${this.apiUrl}/ventas/confirmar-cierre`, {
      idVendedor,
      fecha,
      dineroContado
    });
  }

  // ==================== CRUD CIERRES ====================
  registrarCierre(payload: RegistrarCierrePayload): Observable<CierreGuardado> {
    return this.http.post<CierreGuardado>(`${this.apiUrl}/cierres`, payload);
  }

  getCierresVendedor(idVendedor: string): Observable<CierreGuardado[]> {
    return this.http.get<CierreGuardado[]>(`${this.apiUrl}/cierres/vendedor/${idVendedor}`);
  }
}

// ==================== INTERFACES VENTAS ====================
export interface ItemVentaRequest {
  idProducto: string;
  cantidad: number;
  tipoUnidad: string;
}

export interface CrearVentaRequest {
  idTransaccionLocal?: string;
  idCliente: number;
  idVendedor: string;
  descuento: number;
  items: ItemVentaRequest[];
}

export interface DetalleVentaResponse {
  idDetalle: string;
  idProducto: string;
  cantidad: number;
  tipoUnidad: string;
  precioUnitario: number;
  subtotal: number;
}

export interface VentaResponse {
  idVenta: string;
  idCliente: number;
  idVendedor: string;
  fechaHora: string;
  subtotal: number;
  descuento: number;
  totalEfectivo: number;
  estado: string;
  detalles: DetalleVentaResponse[];
}

// ==================== INTERFACES CIERRE DE JORNADA ====================
export interface DetalleVentaCierre {
  idVenta: string;
  fechaHora: string;
  subtotal: number;
  descuento: number;
  totalEfectivo: number;
  estado: string;
}

export interface ResumenFinancieroCierre {
  ventasRealizadas: number;
  totalEfectivo: number;
  totalDescuentos: number;
  detalleVentas: DetalleVentaCierre[];
}

export interface DetalleProductoConciliacion {
  idProducto: string;
  nombre: string;
  stockInicial: number;
  vendido: number;
  esperado: number;
  actual: number;
}

export interface ConciliacionInventario {
  stockInicialTotal: number;
  vendidosTotal: number;
  stockFinalTotal: number;
  estadoConciliacion: string;
  detalleProductos: DetalleProductoConciliacion[];
}

export interface CierreJornadaResponse {
  idVendedor: string;
  fecha: string;
  resumenFinanciero: ResumenFinancieroCierre;
  conciliacionInventario: ConciliacionInventario;
}

export interface ConfirmarCierreResponse {
  dineroEsperado: number;
  dineroContado: number;
  diferencia: number;
  estadoConciliacion: string;
}

// ==================== INTERFACES CRUD CIERRES ====================
export interface RegistrarCierrePayload {
  idVendedor: string;
  fecha: string;
  ventasRealizadas: number;
  totalEfectivo: number;
  totalDescuentos: number;
  stockInicialTotal: number;
  vendidosTotal: number;
  stockFinalTotal: number;
  estadoInventario: string;
  dineroEsperado: number;
  dineroContado: number;
  diferencia: number;
  estadoEfectivo: string;
}

export interface CierreGuardado {
  id_cierre: string;
  id_vendedor: string;
  fecha: string;
  ventas_realizadas: number;
  total_efectivo: number;
  total_descuentos: number;
  stock_inicial_total: number;
  vendidos_total: number;
  stock_final_total: number;
  estado_inventario: string;
  dinero_esperado: number;
  dinero_contado: number;
  diferencia: number;
  estado_efectivo: string;
  estado: string;
  created_at: string;
}
