# Sistema de Punto de Venta - Frontend

## Descripción

Aplicación web para la gestión del punto de venta. Incluye autenticación, panel administrativo completo y experiencia de vendedor en campo, con soporte para tres idiomas: Español, Inglés y Quechua.

**Módulos del panel administrativo:**
- Dashboard con métricas globales, stock y alertas de inventario bajo
- Gestión de vendedores (CRUD completo)
- Catálogo de productos con carga y eliminación de imágenes en Supabase Storage
- Asignación de stock del almacén central a transportes de vendedores
- Gestión de clientes: visualización y edición de clientes registrados por cada vendedor
- Monitor en tiempo real: estado de vendedores (en ruta / jornada cerrada), mapa de Google Maps con pins de clientes, detalle de atención del día y vendedor asignado
- Reportes y análisis: KPIs de ventas e ingresos, 4 gráficos interactivos (Chart.js) y reporte de discrepancias de inventario por vendedor

**Módulos del vendedor:**
- Dashboard con resumen de stock, ventas e ingresos del día, estado de cargas asignadas y confirmación de salida
- Mapa (Google Maps): visualización y registro de clientes con ubicación GPS, foto de fachada y datos de contacto
- Proceso de venta: búsqueda de productos, carrito con descuento y registro de venta con soporte offline (IndexedDB)
- Cierre de jornada: conciliación financiera (dinero esperado vs. contado) y conciliación de inventario por producto

## Tecnologías

**Frontend:**
- Angular 20
- TypeScript
- SCSS

**Librerías principales:**
- `@angular/common`
- `@angular/core`
- `@angular/forms`
- `@angular/router`
- `@angular/platform-browser`
- `@ngx-translate/core` — traducción en tiempo de ejecución
- `dexie` — IndexedDB para ventas pendientes en modo offline
- `rxjs`
- `zone.js`

**APIs y librerías externas (CDN):**
- Google Maps JavaScript API — mapas de clientes en Mapa y Monitor
- Chart.js 4 — gráficos de reportes y análisis

**Base de datos (consumida vía API):**
- Supabase PostgreSQL (a través del backend Spring Boot)
- Supabase Storage (imágenes de productos y clientes)

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
  apiUrl: 'http://localhost:3000',
  googleMapsKey: 'TU_API_KEY_DE_GOOGLE_MAPS'
};
```

> La clave de Google Maps se usa en los componentes `mapa` (vendedor) y `monitoreo` (admin). Se carga dinámicamente mediante inyección de script en el DOM, igual que el script de Chart.js en el módulo de reportes.

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

## Soporte offline

El módulo de venta utiliza **Dexie** (wrapper de IndexedDB) para almacenar ventas cuando no hay conexión con el servidor. Al recuperar la conexión, las ventas pendientes se sincronizan automáticamente usando el endpoint `/ventas/sincronizar` (lote con idempotencia). La clave de idempotencia es `idTransaccionLocal`, generado en el cliente con `crypto.randomUUID()`.

Archivo principal:

- `src/app/services/database.service.ts` — define la tabla `ventasPendientes` en IndexedDB.

## Traducción a idiomas

### Nuevas mejoras implementadas

- Traducción completa en el frontend para tres idiomas: `es`, `en` y `qu`.
- Selector de idioma en el navbar administrativo y en el navbar vendedor.
- Traducción de todas las vistas: login, dashboard administrativo, catálogo, asignación, gestión de vendedores, gestión de clientes, monitor en tiempo real, reportes y análisis, dashboard vendedor, mapa, proceso de venta y cierre de jornada.
- Persistencia de idioma usando `localStorage` con la clave `idioma`.
- Traducción de textos estáticos, botones, mensajes de validación, estados y labels de gráficos en todas las vistas.
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
- `src/app/Pages/admin/gestion-clientes/gestion-clientes.ts`
  - Traduce la tabla de clientes por vendedor, modal de edición, acciones de activación/desactivación y mensajes de error.
- `src/app/Pages/admin/monitoreo/monitoreo.ts`
  - Traduce el monitor en tiempo real: tarjetas de vendedores, estados (activo, en ruta, jornada cerrada), leyenda del mapa y mensajes de carga/error.
- `src/app/Pages/admin/reportes/reportes.ts`
  - Traduce las KPI cards, títulos de gráficos, labels de datasets de Chart.js (Ventas, Ingresos, Stock), categorías de productos, sección de discrepancias y mensajes de error.
- `src/app/Pages/vendedor/dashboard-vendedor/dashboard-vendedor.ts`
  - Traduce el dashboard del vendedor, estados, botones y mensajes.
- `src/app/Pages/vendedor/mapa/mapa.ts`
  - Traduce la página de mapa, registro de cliente y mensajes de error.
- `src/app/Pages/vendedor/venta-vendedor/venta-vendedor.ts`
  - Traduce el proceso de venta, carrito, botones de acción, estados y confirmaciones.
- `src/app/Pages/vendedor/cierre-vendedor/cierre-vendedor.ts`
  - Traduce el cierre de jornada, resumen financiero, conciliación de inventario y modal de confirmación.
- `public/assets/i18n/es.json`
- `public/assets/i18n/en.json`
- `public/assets/i18n/qu.json`
  - Contienen todas las claves y valores de traducción para cada idioma.

#### Estrategia de implementación

1. Se carga el idioma guardado en `localStorage` en cada componente relevante.
2. `TranslateService.use(idioma)` cambia rápidamente las etiquetas visibles.
3. Se usan pipes `{{ 'KEY' | translate }}` en plantillas HTML.
4. Para textos dinámicos, mensajes de error y labels de Chart.js se usa `this.translate.instant('KEY')` en TypeScript.
5. El selector de idioma actualiza `localStorage` y cierra el menú de opciones.
6. Esta estructura permite que la app sea escalable, facilitando la adición de idiomas como el Aymara en el futuro sin tocar el código fuente.

#### Estructura de las claves de traducción

```
ADMIN
├── NAVBAR          — enlaces del panel administrativo
├── DASHBOARD       — métricas, alertas, productos y vendedores
├── CATALOG         — formulario, validaciones y acciones del catálogo
├── ASIGNACION      — flujo de asignación de stock
├── GESTION         — gestión de vendedores
├── CLIENTES        — gestión de clientes por vendedor
├── MONITOR         — monitor en tiempo real y mapa
└── REPORTES        — KPIs, gráficos y discrepancias de inventario

VENDEDOR
├── NAVBAR          — menú de navegación del vendedor
├── DASHBOARD       — resumen diario del vendedor
├── MAP             — mapa y registro de clientes
├── VENTA           — proceso de venta y carrito
└── CIERRE          — cierre de jornada y conciliación

LOGIN               — formulario e inicio de sesión
STATUS              — estados globales reutilizables
```

#### Cómo extender la traducción

1. Abrir el archivo `public/assets/i18n/<idioma>.json`.
2. Añadir la nueva clave en la sección correcta, por ejemplo:

```json
"ADMIN": {
  "NUEVA_SECCION": {
    "TITLE": "...",
    "SUBTITLE": "..."
  }
}
```

3. Repetir la misma clave en los otros idiomas (`es`, `en`, `qu`) con su valor correspondiente.
4. En la plantilla, usar `{{ 'ADMIN.NUEVA_SECCION.TITLE' | translate }}`.
5. En TypeScript, usar `this.translate.instant('ADMIN.NUEVA_SECCION.TITLE')` para obtener el texto (p.ej. en labels de gráficos o mensajes de error).

#### Recomendaciones para futuros avances

- Mantener un patrón consistente de nombres de claves: `SECCION.SUBSECCION.TEXTO`.
- Siempre actualizar los tres archivos de idioma cuando se agrega una nueva etiqueta.
- Evitar textos duros en las plantillas y en el código.
- Usar `TranslateModule` en componentes nuevos que necesiten traducción.
- Si se agrega un cuarto idioma, simplemente crear `public/assets/i18n/<nuevo>.json` y agregarlo al selector de idioma en el navbar correspondiente.
