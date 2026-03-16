import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, from, tap } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  session: any;
  user: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(
    private supabaseService: SupabaseService,
    private http: HttpClient,
    private router: Router
  ) {}

  // Registro
  signUp(email: string, password: string, nombre: string, rol: string = 'VENDEDOR'): Observable<any> {
    return from(this.supabaseService.signUp(email, password, nombre, rol));
  }

  // Inicio de sesión
  signIn(email: string, password: string): Observable<any> {
    return from(this.supabaseService.signIn(email, password)).pipe(
      tap(response => {
        if (response.session) {
          localStorage.setItem('access_token', response.session.access_token);
        }
      })
    );
  }

  // Cerrar sesión
  signOut(): Observable<void> {
    return from(this.supabaseService.signOut()).pipe(
      tap(() => {
        localStorage.removeItem('access_token');
        this.router.navigate(['/login']);
      })
    );
  }

  // Verificar si está autenticado
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  // Obtener token
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  // Obtener usuario actual
  getCurrentUser(): Observable<any> {
    return this.supabaseService.currentUser;
  }
}
