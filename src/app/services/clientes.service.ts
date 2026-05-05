import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Cliente, ClienteBackend, CreateClientePayload } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ClientesService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getClientes(vendedorId?: string): Observable<Cliente[]> {
    let params: HttpParams | undefined = undefined;
    if (vendedorId) {
      params = new HttpParams().set('vendedorId', String(vendedorId));
    }

    return this.http.get<ClienteBackend[]>(`${this.apiUrl}/clientes`, { params }).pipe(
      map((clientes: ClienteBackend[]) => clientes.map((c: ClienteBackend) => ({
        id_cliente: c.id,
        id_vendedor_creador: c.idVendedorCreador,
        nombre_negocio: c.nombreNegocio,
        ci_nit: c.ciNit || '',
        celular: c.celular,
        latitud: c.latitud,
        longitud: c.longitud,
        url_foto_fachada: c.urlFotoFachada,
        frecuencia_visita: c.frecuenciaVisita || '',
        estado: c.estado,
        created_at: c.createdAt
      })))
    );
  }

  createCliente(payload: CreateClientePayload): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.apiUrl}/clientes`, payload);
  }

  uploadClienteImage(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/clientes/upload-photo`, formData);
  }

  deleteCliente(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/clientes/${id}`);
  }
}
