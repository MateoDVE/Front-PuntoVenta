import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface AdminNavItem {
  label: string;
  href?: string;
  icon: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-navbar.html',
  styleUrl: './admin-navbar.scss',
})
export class AdminNavbar {
  @Output() signOut = new EventEmitter<void>();

  navItems: AdminNavItem[] = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Vendedores', href: '/admin/gestion-vendedores', icon: 'vendedores' },
    { label: 'Catalogo', href: '/admin/catalogo', icon: 'catalogo' },
    { label: 'Asignacion', href: '/admin/asignacion', icon: 'asignacion' },
    { label: 'Monitor', disabled: true, icon: 'monitor' },
    { label: 'Reportes', disabled: true, icon: 'reportes' },
  ];

  onSignOut(): void {
    this.signOut.emit();
  }
}
