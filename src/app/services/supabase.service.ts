import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );

    // Observar cambios de autenticación
    this.currentUserSubject = new BehaviorSubject<User | null>(null);
    this.currentUser = this.currentUserSubject.asObservable();

    // Verificar sesión actual
    this.supabase.auth.getSession().then(({ data }) => {
      this.currentUserSubject.next(data.session?.user || null);
    });

    // Escuchar cambios de autenticación
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUserSubject.next(session?.user || null);
    });
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // Registro de usuario
  async signUp(email: string, password: string, nombre: string, rol: string = 'VENDEDOR') {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: nombre,
          rol: rol,
        }
      }
    });
    if (error) throw error;
    return data;
  }

  // Inicio de sesión
  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  // Cerrar sesión
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
    this.currentUserSubject.next(null);
  }

  // Obtener sesión actual
  async getSession() {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  // Obtener token de acceso
  async getAccessToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.access_token || null;
  }

  // Cliente de Supabase para operaciones de base de datos
  getClient(): SupabaseClient {
    return this.supabase;
  }
}
