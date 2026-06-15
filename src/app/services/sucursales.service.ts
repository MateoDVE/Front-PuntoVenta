import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Sucursal {
  id?: string;
  nombre: string;
  latitud: number;
  longitud: number;
  esPrincipal: boolean;
  fechaCreacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SucursalesService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSucursales(): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>(`${this.apiUrl}/sucursales`);
  }

  crearSucursal(payload: Sucursal): Observable<Sucursal> {
    return this.http.post<Sucursal>(`${this.apiUrl}/sucursales`, payload);
  }

  actualizarSucursal(id: string, payload: Partial<Sucursal>): Observable<Sucursal> {
    return this.http.put<Sucursal>(`${this.apiUrl}/sucursales/${id}`, payload);
  }

  eliminarSucursal(id: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/sucursales/${id}`);
  }
}
