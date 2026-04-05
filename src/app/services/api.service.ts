import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

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
    private authService: AuthService
  ) {}

  // ==================== USUARIOS ====================
  getMyProfile(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/auth/me`);
  }

  // ==================== VENDEDORES ====================
  getVendedores(): Observable<VendedorBackend[]> {
    return this.http.get<VendedorBackend[]>(`${this.apiUrl}/vendedores`);
  }

  createVendedor(payload: CreateVendedorPayload): Observable<VendedorBackend[]> {
    return this.http.post<VendedorBackend[]>(`${this.apiUrl}/vendedores`, payload);
  }

  updateVendedor(id: string, payload: UpdateVendedorPayload): Observable<VendedorBackend> {
    return this.http.put<VendedorBackend>(`${this.apiUrl}/vendedores/${id}`, payload);
  }

  deleteVendedor(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/vendedores/${id}`);
  }

  // ==================== PRODUCTOS ====================
  getProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/productos`);
  }

  getProductosStockBajo(umbral = 100): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/productos/stock-bajo`, {
      params: { umbral: String(umbral) }
    });
  }

  getProductoById(id: string): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/productos/${id}`);
  }

  createProducto(producto: Producto): Observable<Producto> {
    return this.http.post<Producto>(`${this.apiUrl}/productos`, producto);
  }

  updateProducto(id: string, producto: Producto): Observable<Producto> {
    return this.http.put<Producto>(`${this.apiUrl}/productos/${id}`, producto);
  }

  deleteProducto(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/productos/${id}`);
  }

  // ==================== IMÁGENES ====================
  /**
   * Sube una imagen de producto al backend
   * @param endpoint - Ruta del endpoint (ej: 'productos/upload' o 'productos/upload/123')
   * @param formData - FormData con el archivo bajo la clave 'image'
   * @returns Observable con { imageUrl: string }
   */
  uploadProductImage(endpoint: string, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${endpoint}`, formData);
  }

  /**
   * Elimina una imagen de producto
   * @param imageUrl - URL pública de la imagen a eliminar
   * @returns Observable vacío
   */
  deleteProductImage(imageUrl: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/productos/delete-image`, { imageUrl });
  }

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
}
