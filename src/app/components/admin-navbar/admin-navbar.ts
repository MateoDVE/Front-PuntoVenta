import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import {  RouterLink } from '@angular/router';

interface AdminNavItem {
  label: string;
  href: string;
  current?: boolean;
}

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-navbar.html',
  styleUrl: './admin-navbar.scss',
})
export class AdminNavbar {
  @Output() signOut = new EventEmitter<void>();

   navItems: AdminNavItem[] = [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'Vendedores', href: 'admin/gestion-vendedores' },
    { label: 'Catalogo', href: '/admin/catalogo' },
    { label: 'Asignacion', href: '/admin/asignacion' },
    { label: 'Monitor', href: '/admin/monitor' },
    { label: 'Reportes', href: '/admin/reportes' },
  ];

  onSignOut(): void {
    this.signOut.emit();
  }
}
