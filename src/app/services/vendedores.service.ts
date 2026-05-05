import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { VendedorBackend, CreateVendedorPayload, UpdateVendedorPayload } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class VendedoresService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getVendedores(): Observable<VendedorBackend[]> {
    return this.http.get<VendedorBackend[]>(`${this.apiUrl}/vendedores`).pipe(
      map((vendedores) => vendedores.map((v) => ({
        ...v,
        rol: v.rol || 'VENDEDOR',
      })))
    );
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
}
