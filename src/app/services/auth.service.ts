import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  session: any;
  user: any;
}

export interface UserProfile {
  id_usuario: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // Inicio de sesión
  signIn(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/signin`, { email, password }).pipe(
      tap(response => {
        if (response.session) {
          localStorage.setItem('access_token', response.session.access_token);
        }
      })
    );
  }

  // Cerrar sesión
  signOut(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/signout`, {}).pipe(
      tap(() => {
        localStorage.removeItem('access_token');
        this.router.navigate(['/login']);
      })
    );
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getCurrentUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/auth/me`);
  }
}
