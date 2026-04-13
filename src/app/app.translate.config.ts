import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { importProvidersFrom, Provider } from '@angular/core';

export function createTranslateLoader(http: HttpClient) {
  // traduccion
  return new (TranslateHttpLoader as any)(http, './assets/i18n/', '.json');
}

export function provideTranslation(): any {
  return importProvidersFrom(
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      },
      defaultLanguage: 'es'
    })
  );
}