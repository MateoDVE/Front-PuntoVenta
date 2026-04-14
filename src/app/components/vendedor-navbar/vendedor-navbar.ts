import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-vendedor-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './vendedor-navbar.html',
  styleUrls: ['./vendedor-navbar.scss']
})
export class VendedorNavbar {
  idiomaActual: string = 'es';
  menuAbierto: boolean = false;
  idiomas = [
    { value: 'es', label: '🇧🇴 Español' },
    { value: 'en', label: '🇺🇸 English' },
    { value: 'qu', label: '🌿 Quechua' }
  ];

  constructor(private authService: AuthService, private translate: TranslateService) {
    const idiomaGuardado = localStorage.getItem('idioma') || 'es';
    this.idiomaActual = idiomaGuardado;
    this.translate.use(idiomaGuardado);
  }

  get idiomaLabel(): string {
    const idioma = this.idiomas.find((item) => item.value === this.idiomaActual);
    return idioma ? idioma.label : '🌐 Idioma';
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

  cerrarSesion(): void {
    this.authService.signOut().subscribe();
  }
}