import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
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
              this.errorMessage = this.translate.instant('LOGIN.ERROR_ROLE_UNDETERMINED');
              return;
            }

            this.router.navigate([targetRoute]);
          } else {
            this.errorMessage = this.translate.instant('LOGIN.ERROR_TOKEN_MISSING');
          }
        },
        error: (error) => {
          console.error('Error al iniciar sesión', error);
          this.errorMessage = this.getLoginErrorMessage(error);
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

  private getLoginErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        return this.translate.instant('LOGIN.ERROR_INVALID_CREDENTIALS');
      }

      if (error.status === 0) {
        return this.translate.instant('LOGIN.ERROR_CONNECTION');
      }
    }

    return this.translate.instant('LOGIN.ERROR_GENERIC');
  }
}
