# Sistema de Punto de Venta - Frontend

## Descripción

Aplicación web para la gestión del punto de venta. Incluye autenticación, panel administrativo, módulo de catálogo y experiencia de vendedor, con soporte para tres idiomas: Español, Inglés y Quechua.

## Tecnologías

**Frontend:**
- Angular 20
- TypeScript
- SCSS

**Librerías principales:**
- @angular/common
- @angular/core
- @angular/forms
- @angular/router
- @angular/platform-browser
- @ngx-translate/core
- rxjs
- zone.js

**Base de datos (consumida vía API):**
- Supabase PostgreSQL (a través del backend NestJS)
- Supabase Storage (imágenes de productos, gestionado por backend)

## Equipo

- Maria Alejandra Loayza Claure
- Jorge Alejandro Rosales Gutierrez
- Mateo Daniel Vargas Estrada
- Andrews Jimmy Zelada Cespedes
- David Hassan Lopez Olivares

## Configuraciones

1. Instalar dependencias:

```bash
npm install
```

2. Verificar ambiente en `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};
```

3. Levantar servidor de desarrollo:

```bash
npm start
```

4. Acceso local:

```text
http://localhost:4200
```

5. Scripts útiles:

```bash
npm run build
npm run watch
npm run test
```

## Traducción a idiomas

### Nuevas mejoras implementadas

- Traducción completa en el frontend para tres idiomas: `es`, `en` y `qu`.
- Selector de idioma en el navbar administrativo y en el navbar vendedor.
- Traducción de vistas clave: login, dashboard administrativo, catálogo, asignación, gestión de vendedores, dashboard vendedor y mapa.
- Persistencia de idioma usando `localStorage` con la clave `idioma`.
- Traducción de textos estáticos, botones, mensajes de validación y estados en todas las vistas traducidas.
- Uso de `@ngx-translate/core` para cambiar idioma en tiempo de ejecución.

### Arquitectura de traducción

#### Módulos y archivos clave

- `src/app/app.ts`
- `src/app/app.translate.config.ts`
  - Configura la inicialización de `@ngx-translate/core`, la carga de archivos JSON y el idioma predeterminado.
- `src/app/components/admin-navbar/admin-navbar.ts`
  - Traduce los enlaces y controla el selector de idioma del panel administrativo.
- `src/app/components/vendedor-navbar/vendedor-navbar.ts`
  - Traduce el menú de navegación del vendedor e incorpora el selector de idioma en el flujo de vendedor.
- `src/app/components/producto-card/producto-card.ts`
  - Traduce etiquetas y descripciones dinámicas en las tarjetas de producto del catálogo.
- `src/app/Pages/iniciarsesion/iniciarsesion.ts`
  - Traduce el formulario de inicio de sesión, validaciones y mensajes asociados.
- `src/app/Pages/admin/dashboboard-admin/dashboboard-admin.ts`
  - Traduce dashboard administrativo, métricas, secciones y mensajes de estado.
- `src/app/Pages/admin/catalogo/catalogo.ts`
  - Traduce validaciones, errores y acciones del módulo de catálogo.
- `src/app/Pages/admin/asignacion/asignacion.ts`
  - Traduce el flujo de asignación, formularios, alertas y confirmaciones administrativas.
- `src/app/Pages/admin/gestion-vendedores/gestion-vendedores.ts`
  - Traduce la gestión de vendedores, estadísticas y botones de acciones.
- `src/app/Pages/vendedor/dashboard-vendedor/dashboard-vendedor.ts`
  - Traduce el dashboard del vendedor, estados, botones y mensajes.
- `src/app/Pages/vendedor/mapa/mapa.ts`
  - Traduce la página de mapa, registro de cliente y mensajes de error.
- `public/assets/i18n/es.json`
- `public/assets/i18n/en.json`
- `public/assets/i18n/qu.json`
  - Contienen todas las claves y valores de traducción para cada idioma.

#### Estrategia de implementación

1. Se carga el idioma guardado en `localStorage` en cada componente relevante.
2. `TranslateService.use(idioma)` cambia rápidamente las etiquetas visibles.
3. Se usan pipes `{{ 'KEY' | translate }}` en plantillas HTML.
4. Para textos dinámicos y mensajes de error se usa `this.translate.instant('KEY')` en TypeScript.
5. El selector de idioma actualiza `localStorage` y cierra el menú de opciones.
6. Esta estructura permite que la app sea escalable, facilitando la adición de idiomas como el Aymara en el futuro sin tocar el código fuente

#### Estructura de las claves de traducción

- Valores generales y comunes se almacenan en cada archivo JSON bajo llaves como `VENDEDOR`, `ADMIN`, `LOGIN`, `CATALOGO`, etc.
- La adición de nuevas secciones es simple: 1) crear clave en los archivos de idioma, 2) usar `translate` en la plantilla o en código, 3) agregar texto en las demás traducciones.

#### Cómo extender la traducción

1. Abrir el archivo `public/assets/i18n/<idioma>.json`.
2. Añadir la nueva clave en la sección correcta, por ejemplo:

```json
"VENDEDOR": {
  "MAP": {
    "TITLE": "..."
  }
}
```

3. Repetir la misma clave en los otros idiomas (`es`, `en`, `qu`) con su valor correspondiente.
4. En la plantilla, usar `{{ 'VENDEDOR.MAP.TITLE' | translate }}`.
5. En TypeScript, usar `this.translate.instant('VENDEDOR.MAP.TITLE')` para obtener el texto.

#### Recomendaciones para futuros avances

- Mantener un patrón consistente de nombres de claves: `SECCION.SUBSECCION.TEXTO`.
- Siempre actualizar los tres archivos de idioma cuando se agrega una nueva etiqueta.
- Evitar textos duros en las plantillas y en el código.
- Usar `TranslateModule` en componentes nuevos que necesiten traducción.
- Si se agrega un cuarto idioma, simplemente crear `public/assets/i18n/<nuevo>.json` y agregarlo al selector de idioma.
