import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SyncService } from './services/sync.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TranslateModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend-puntoventa');

  constructor(private translate: TranslateService, _sync: SyncService) {
    translate.addLangs(['es', 'en', 'qu']);
    translate.setDefaultLang('es');
    translate.setDefaultLang('es');
    const idiomaGuardado = localStorage.getItem('idioma') || 'es';
    translate.use(idiomaGuardado);
  }
}