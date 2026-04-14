import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-iniciarsesion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './iniciarsesion.html',
  styleUrls: ['./iniciarsesion.scss'],
})
export class Iniciarsesion {
  loginForm: FormGroup;
  errorMessage: string = '';
  loading: boolean = false;
  idiomaActual: string = 'es';
  menuAbierto: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    const idiomaGuardado = localStorage.getItem('idioma') || 'es';
    this.idiomaActual = idiomaGuardado;
    this.translate.use(idiomaGuardado);
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      
      const { email, password } = this.loginForm.value;
      
      this.authService.signIn(email, password).subscribe({
        next: (response) => {
          console.log('Inicio de sesión exitoso', response);
          this.loading = false;
          if (this.authService.isAuthenticated()) {
            const loginRole = this.authService.extractRoleFromLoginResponse(response);
            const targetRoute = this.authService.getDashboardRouteByRole(loginRole);

            if (targetRoute === '/login') {
              this.errorMessage = 'No se pudo determinar el rol del usuario.';
              return;
            }

            this.router.navigate([targetRoute]);
          } else {
            this.errorMessage = 'No se pudo obtener el token de sesión, intente nuevamente.';
          }
        },
        error: (error) => {
          console.error('Error al iniciar sesión', error);
          this.errorMessage = error.message || 'Usuario o contraseña incorrectos';
          this.loading = false;
        }
      });
    }
  }

  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  cambiarIdioma(idioma: string): void {
    this.idiomaActual = idioma;
    this.translate.use(idioma);
    localStorage.setItem('idioma', idioma);
    this.menuAbierto = false;
  }
}
