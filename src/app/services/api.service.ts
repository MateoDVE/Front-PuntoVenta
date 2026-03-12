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
}
