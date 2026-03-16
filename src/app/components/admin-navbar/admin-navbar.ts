import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';

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
export class AdminNavbar implements OnInit {
  @Output() signOut = new EventEmitter<void>();

  navItems: AdminNavItem[] = [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'Vendedores', href: '/admin/gestion-vendedores' },
    { label: 'Catalogo', href: '/admin/catalogo' },
    { label: 'Asignacion', href: '#' },
    { label: 'Monitor', href: '#' },
    { label: 'Reportes', href: '#' },
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateCurrentItem();
    this.router.events.subscribe(() => {
      this.updateCurrentItem();
    });
  }

  private updateCurrentItem(): void {
    const currentUrl = this.router.url;
    this.navItems.forEach(item => {
      item.current = item.href === currentUrl;
    });
  }

  onSignOut(): void {
    this.signOut.emit();
  }
}
