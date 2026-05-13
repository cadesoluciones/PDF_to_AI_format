# CADE File Converter

Aplicacion web para convertir archivos PDF a JSON o Markdown. Permite seleccionar documentos individuales o carpetas, previsualizar PDFs, procesarlos mediante una API local y descargar o copiar los resultados generados.

## Stack

- React 19
- React Router 7
- TypeScript
- Tailwind CSS
- Express
- Multer
- OpenDataLoader PDF

## Requisitos

- Node.js 20 o superior
- npm

## Instalacion

```bash
npm install
```

## Desarrollo

En desarrollo se levantan dos procesos: el frontend y la API.

Terminal 1, frontend:

```bash
npm run dev
```

Terminal 2, backend API:

```bash
npm run server
```

URLs locales:

```txt
Frontend: http://localhost:5173
API:      http://localhost:3001/api
```

Por defecto, el frontend llama a `http://localhost:3001/api`. Para usar otra API, define:

```bash
VITE_API_URL=http://localhost:3001/api
```

## API

Endpoints principales:

```txt
POST /api/transformfile
POST /api/transformfiles
```

`/api/transformfile` procesa un PDF individual con el campo `file`.

`/api/transformfiles` procesa varios PDFs con el campo `files`.

Ambos endpoints aceptan el campo `mode` con uno de estos valores:

```txt
json
markdown
```

## Comandos

```bash
npm run dev
```

Levanta el servidor de desarrollo del frontend.

```bash
npm run server
```

Levanta la API Express en `http://localhost:3001`.

```bash
npm run typecheck
```

Genera tipos de React Router y ejecuta TypeScript.

```bash
npm run build
```

Genera el build de produccion del frontend/SSR.

```bash
npm run start
```

Sirve el build de produccion generado por React Router.

## Produccion local

Primero genera el build:

```bash
npm run build
```

Despues levanta el frontend de produccion:

```bash
npm run start
```

Para que la conversion de PDFs funcione, la API tambien debe estar levantada:

```bash
npm run server
```

## Docker

El `Dockerfile` actual construye y sirve el frontend de produccion. La API Express no queda incluida como proceso separado dentro de ese contenedor, asi que para convertir PDFs necesitas levantar la API aparte.

Construir la imagen:

```bash
docker build -t cade-file-converter .
```

Ejecutar el frontend:

```bash
docker run --rm -p 3000:3000 cade-file-converter
```

Con la API local levantada con `npm run server`, abre:

```txt
http://localhost:3000
```

## Flujo basico

1. Selecciona una opcion de conversion: PDF a JSON, PDF a Markdown, carpeta a JSON o carpeta a Markdown.
2. Carga uno o varios PDFs.
3. Previsualiza el documento seleccionado.
4. Procesa la conversion.
5. Copia o descarga los resultados.
