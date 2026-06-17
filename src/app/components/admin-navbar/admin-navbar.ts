import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface AdminNavItem {
  labelKey: string;
  href?: string;
  current?: boolean;
  disabled?: boolean;
  icon: string;
}

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './admin-navbar.html',
  styleUrls: ['./admin-navbar.scss'],
})
export class AdminNavbar {
  @Output() signOut = new EventEmitter<void>();

  navItems: AdminNavItem[] = [
    { labelKey: 'ADMIN.NAVBAR.DASHBOARD', href: '/admin/dashboard', icon: 'dashboard' },
    { labelKey: 'ADMIN.NAVBAR.VENDEDORES', href: '/admin/gestion-vendedores', icon: 'vendedores' },
    { labelKey: 'ADMIN.NAVBAR.CATALOGO', href: '/admin/catalogo', icon: 'catalogo' },
    { labelKey: 'ADMIN.NAVBAR.ASIGNACION', href: '/admin/asignacion', icon: 'asignacion' },
    { labelKey: 'ADMIN.NAVBAR.PEDIDOS', href: '/admin/pedidos', icon: 'pedidos' },
    { labelKey: 'ADMIN.NAVBAR.CLIENTES', href: '/admin/gestion-clientes', icon: 'clientes' },
    { labelKey: 'ADMIN.NAVBAR.MONITOR', href: '/admin/monitoreo', icon: 'monitor' },
    { labelKey: 'ADMIN.NAVBAR.REPORTES', href: '/admin/reportes', icon: 'reportes' },
  ];

  idiomaActual: string = 'es';
  menuAbierto: boolean = false;
  idiomas = [
    { value: 'es', label: '🇧🇴 Español' },
    { value: 'en', label: '🇺🇸 English' },
    { value: 'qu', label: '🌿 Quechua' }
  ];

  constructor(private translate: TranslateService) {
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

  onSignOut(): void {
    this.signOut.emit();
  }
}
