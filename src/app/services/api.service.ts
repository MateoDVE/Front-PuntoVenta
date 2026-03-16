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

  // ==================== PRODUCTOS ====================
  getProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/productos`);
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
}
