import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  access_token?: string;
  token_type?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: any;
  session?: {
    access_token?: string;
    [key: string]: any;
  };
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
  private readonly userStorageKey = 'user_profile';
  private readonly roleStorageKey = 'user_role';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // Inicio de sesión
  signIn(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/signin`, { email, password }).pipe(
      tap(response => {
        const token = response?.session?.access_token || response?.access_token;
        if (token) {
          localStorage.setItem('access_token', token);
        } else {
          console.warn('No se encontró token en la respuesta de signin:', response);
        }

        const user = response?.user;
        if (user) {
          localStorage.setItem(this.userStorageKey, JSON.stringify(user));
        }

        const loginRole = this.extractRoleFromLoginResponse(response);
        if (loginRole) {
          localStorage.setItem(this.roleStorageKey, loginRole);
        }
      })
    );
  }

  // Cerrar sesión
  signOut(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/signout`, {}).pipe(
      catchError((error) => {
        console.warn('Falló /auth/signout, se cerrará sesión localmente:', error);
        return of(void 0);
      }),
      tap(() => {
        this.clearLocalSession();
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

  getStoredUser(): UserProfile | null {
    const rawUser = localStorage.getItem(this.userStorageKey);
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as UserProfile;
    } catch {
      localStorage.removeItem(this.userStorageKey);
      return null;
    }
  }

  persistCurrentUser(user: UserProfile): void {
    localStorage.setItem(this.userStorageKey, JSON.stringify(user));

    const userRole = this.extractRoleFromSource(user);
    if (userRole) {
      localStorage.setItem(this.roleStorageKey, userRole);
    }
  }

  getStoredRole(): string {
    const rawRole = localStorage.getItem(this.roleStorageKey);
    if (rawRole) {
      return this.normalizeRole(rawRole);
    }

    const user = this.getStoredUser();
    return this.extractRoleFromSource(user);
  }

  extractRoleFromLoginResponse(response: LoginResponse | any): string {
    const roleFromResponse = this.extractRoleFromSource(response);
    if (roleFromResponse) {
      return roleFromResponse;
    }

    const accessToken = response?.session?.access_token || response?.access_token;
    if (!accessToken) {
      return '';
    }

    const tokenPayload = this.parseJwtPayload(accessToken);
    return this.extractRoleFromSource(tokenPayload);
  }

  normalizeRole(role: string | null | undefined): string {
    return (role ?? '').trim().toLowerCase();
  }

  getDashboardRouteByRole(role: string | null | undefined): string {
    const normalizedRole = this.normalizeRole(role);

    if (normalizedRole === 'vendedor') {
      return '/vendedor/dashboard';
    }

    if (normalizedRole === 'admin' || normalizedRole === 'administrador') {
      return '/admin/dashboard';
    }

    return '/login';
  }

  private extractRoleFromSource(source: any): string {
    if (!source) {
      return '';
    }

    const candidates = [
      source?.rol,
      source?.role,
      source?.user?.rol,
      source?.user?.role,
      source?.user?.user_metadata?.rol,
      source?.user?.user_metadata?.role,
      source?.session?.user?.rol,
      source?.session?.user?.role,
      source?.session?.user?.user_metadata?.rol,
      source?.session?.user?.user_metadata?.role,
      source?.user_metadata?.rol,
      source?.user_metadata?.role,
      source?.app_metadata?.rol,
      source?.app_metadata?.role,
    ];

    for (const candidate of candidates) {
      const normalizedCandidate = this.normalizeRole(candidate);
      if (normalizedCandidate && normalizedCandidate !== 'authenticated') {
        return normalizedCandidate;
      }
    }

    return '';
  }

  private parseJwtPayload(token: string): any {
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) {
        return null;
      }

      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  private clearLocalSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem(this.userStorageKey);
    localStorage.removeItem(this.roleStorageKey);
    this.router.navigate(['/login']);
  }
}
