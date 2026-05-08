# CADE File converter

Aplicacion web para convertir archivos PDF a JSON o Markdown. Incluye seleccion de documentos, vista previa del PDF, procesamiento mediante una API local y descarga de los resultados generados.

## Requisitos

- Node.js
- npm

## Instalacion

Instala las dependencias del proyecto:

```bash
npm install
```

## Desarrollo

En desarrollo, el frontend y el backend API se levantan por separado.

Frontend:

```bash
npm run dev
```

Backend API:

```bash
npm run server
```

La API local usa:

```txt
http://localhost:3001/api
```

Por defecto, el frontend llama a esa API local. Para apuntar a otra API, configura la variable:

```bash
VITE_API_URL=http://localhost:3001/api
```

## Comandos disponibles

```bash
npm run dev
```

Levanta el servidor de desarrollo del frontend.

```bash
npm run server
```

Levanta el backend Express que procesa los PDFs.

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

## Flujo basico

1. Selecciona una opcion de conversion: PDF a JSON, PDF a Markdown, carpeta a JSON o carpeta a Markdown.
2. Carga uno o varios PDFs.
3. Previsualiza el documento seleccionado.
4. Procesa la conversion.
5. Copia o descarga los resultados.
