import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

interface AdminNavItem {
  label: string;
  href: string;
  current?: boolean;
}

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-navbar.html',
  styleUrl: './admin-navbar.scss',
})
export class AdminNavbar {
  @Output() signOut = new EventEmitter<void>();

  navItems: AdminNavItem[] = [
    { label: 'Dashboard', href: '#', current: true },
    { label: 'Vendedores', href: '#' },
    { label: 'Catalogo', href: '#' },
    { label: 'Asignacion', href: '#' },
    { label: 'Monitor', href: '#' },
    { label: 'Reportes', href: '#' },
  ];

  onSignOut(): void {
    this.signOut.emit();
  }
}
