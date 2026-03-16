# Sistema de Punto de Venta - Frontend

## Descripcion

Aplicacion web para la gestion del punto de venta. Incluye autenticacion, panel administrativo y modulo de catalogo para registrar, editar y visualizar productos con carga de imagenes.

## Tecnologias

**Frontend:**
- Angular 20
- TypeScript
- SCSS

**Librerias principales:**
- @angular/common
- @angular/core
- @angular/forms
- @angular/router
- @angular/platform-browser
- rxjs
- zone.js
- @supabase/supabase-js

**Base de datos (consumida via API):**
- Supabase PostgreSQL (a traves del backend NestJS)
- Supabase Storage (imagenes de productos, gestionado por backend)

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

5. Scripts utiles:

```bash
npm run build
npm run watch
npm run test
```
