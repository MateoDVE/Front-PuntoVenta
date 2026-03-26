import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-iniciarsesion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './iniciarsesion.html',
  styleUrl: './iniciarsesion.scss',
})
export class Iniciarsesion {
  loginForm: FormGroup;
  errorMessage: string = '';
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
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
            this.router.navigate(['/admin/dashboard']);
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
}
