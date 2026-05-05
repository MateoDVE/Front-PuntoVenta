import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Producto } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

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

  uploadProductImage(endpoint: string, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${endpoint}`, formData);
  }

  deleteProductImage(imageUrl: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/productos/delete-image`, { imageUrl });
  }
}
