import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SyncService } from '../../services/sync.service';

@Component({
  selector: 'app-vendedor-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './vendedor-navbar.html',
  styleUrls: ['./vendedor-navbar.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class VendedorNavbar implements OnInit, OnDestroy {
  idiomaActual: string = 'es';
  menuAbierto: boolean = false;
  idiomas = [
    { value: 'es', label: '🇧🇴 Español' },
    { value: 'en', label: '🇺🇸 English' },
    { value: 'qu', label: '🌿 Quechua' }
  ];

  isOffline: boolean = false;
  pendingCount: number = 0;

  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private translate: TranslateService,
    private syncService: SyncService
  ) {
    const idiomaGuardado = localStorage.getItem('idioma') || 'es';
    this.idiomaActual = idiomaGuardado;
    this.translate.use(idiomaGuardado);
  }

  ngOnInit(): void {
    this.subs.push(
      this.syncService.isOnline$.subscribe(online => { this.isOffline = !online; }),
      this.syncService.pendingCount$.subscribe(count => { this.pendingCount = count; })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get hayAlerta(): boolean {
    return this.isOffline || this.pendingCount > 0;
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