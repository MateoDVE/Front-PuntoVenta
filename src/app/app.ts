import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TranslateModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend-puntoventa');

  constructor(private translate: TranslateService) {
    translate.addLangs(['es', 'en', 'qu']);
    const idiomaGuardado = localStorage.getItem('idioma') || 'es';
    translate.use(idiomaGuardado);
  }
}