# Auditoría Profunda - CADE File converter

## Resumen Ejecutivo

- Fecha: 12 de mayo de 2026.
- Entorno: Windows, PowerShell, Node.js v24.15.0, npm 11.12.1, Java 26.0.1.
- Estado general: CON ERRORES no bloqueantes para uso interno controlado.
- Riesgo global: medio.
- Principales conclusiones:
  - El flujo principal de conversión funciona correctamente por API para PDF individual y carpeta, tanto a JSON como a Markdown.
  - `npm run typecheck`, `npm run build`, `node --check` y `npm audit` pasan correctamente.
  - Los PDFs con imágenes generan assets con `dataUri` en JSON y Markdown embebe imágenes como `data:image/...;base64,...`.
  - Hay un problema relevante con PDFs corruptos/falsos: la API devuelve HTTP 500 con trazas internas, rutas temporales y detalles del conversor Java.
  - Para producción faltan endurecimientos: CORS restringido, healthcheck, sanitización de errores, validación real de PDF, tests automatizados y documentación de Java/límites.

## Alcance

- Qué se revisó:
  - `package.json`, scripts, dependencias y devDependencies.
  - `vite.config.ts`, `tsconfig.json`, React Router y estructura principal.
  - Backend Express en `server/index.js`.
  - Cliente API en `app/api/processFile.tsx`.
  - Componentes de conversión, preview, resultados, copia, descarga y ZIP.
  - README y documentación disponible en `docs/`.
  - Seguridad básica, rendimiento, UX, configuración y riesgos de despliegue.
- Qué no se pudo revisar completamente:
  - Interacciones reales de navegador con selector de archivos, descargas y portapapeles mediante automatización E2E. No hay Playwright, Selenium ni herramienta equivalente instalada en el proyecto.
  - Comparación con conversiones previas, porque no existen carpetas `conversion-json/` ni `conversion-markdown/` en la raíz revisada.
- Servicios disponibles:
  - Frontend `http://localhost:8100/`: disponible, HTTP 200.
  - Backend API `http://localhost:3001/api`: proceso disponible; `GET /api` devuelve 404 porque no existe ruta GET, pero los endpoints POST funcionan.
- PDFs de prueba usados:
  - `docs/PDFs_imagen_dentro_Prueba/PDF_1_Redes_basicas_imagen_dentro.pdf` - 3.188.527 bytes.
  - `docs/PDFs_imagen_dentro_Prueba/PDF_2_SQL_y_bases_de_datos_imagen_dentro.pdf` - 3.582.429 bytes.
  - `docs/PDFs_imagen_dentro_Prueba/PDF_3_Seguridad_informatica_imagen_dentro.pdf` - 4.482.334 bytes.
  - `docs/PDFs_imagen_dentro_Prueba/PDF_4_Java_hilos_basico_imagen_dentro.pdf` - 3.316.541 bytes.

## Comandos Ejecutados

| Comando | Resultado | Tiempo aproximado | Salida relevante | Observaciones |
|---|---:|---:|---|---|
| `npm ls --depth=0` | OK | 1.9 s | Dependencias instaladas sin paquetes extraneous. | Incluye React Router 7.14.0, Vite 8.0.10, Express 4.22.1, Multer 2.1.1, JSZip 3.10.1, `@opendataloader/pdf` 2.4.1. |
| `npm audit --audit-level=low` | OK | 2.2 s | `found 0 vulnerabilities` | Sin vulnerabilidades reportadas por npm audit. |
| `node --check server/index.js` | OK | 0.1 s | Sin errores de sintaxis. | Backend válido a nivel sintáctico. |
| `npm run typecheck` | OK | 4.9 s | `react-router typegen && tsc` | TypeScript pasa. |
| `npm run build` | OK | 4.2 s | React Router build y Vite build completados. | Build de cliente y servidor generado correctamente. |
| `java -version` | OK | 0.2 s | Java 26.0.1 | Java está disponible para `@opendataloader/pdf`. |
| `node -v` | OK | 0.6 s | `v24.15.0` | Entorno Node actual. |
| `npm -v` | OK | 1.2 s | `11.12.1` | Entorno npm actual. |
| `npm ls @playwright/test playwright selenium-webdriver --depth=0` | OK con observación | 2.2 s | `(empty)` | No hay framework E2E de navegador instalado. |
| `GET http://localhost:8100/` | OK | 169 ms | HTTP 200, HTML con `lang="es"`. | Frontend disponible. |
| `GET http://localhost:3001/api` | OK con observación | 8 ms | HTTP 404 `Cannot GET /api` | El backend responde, pero no hay healthcheck ni ruta GET `/api`. |
| Pruebas API con `fetch` y `FormData` desde Node | OK con hallazgos | 14.4 s | Casos positivos y negativos ejecutados. | No se crearon scripts permanentes. |
| Pruebas de PDFs falsos/corruptos con `Blob` temporal | FAIL funcional controlado parcialmente | 2.1 s | HTTP 500 con trazas internas. | Ver `FIND-01` y `FIND-02`. |

## Pruebas API

| ID | Caso | Endpoint | Entrada | HTTP esperado | HTTP obtenido | Resultado | Observaciones |
|---|---|---|---|---:|---:|---|---|
| API-01 | PDF individual a JSON | `POST /api/transformfile` | `PDF_1`, `mode=json` | 200 | 200 | OK | `success=true`, `mode=json`, `results.length=1`, `data.content` existe como objeto estructurado, `kids=17`, `assets=1`, `dataUri` válido. |
| API-02 | PDF individual a Markdown | `POST /api/transformfile` | `PDF_2`, `mode=markdown` | 200 | 200 | OK | `success=true`, `mode=markdown`, Markdown no vacío, longitud aproximada 1.981.335 caracteres, contiene `![image 1](<data:image/png;base64,...>)`, `assets=1`. |
| API-03 | Carpeta a JSON | `POST /api/transformfiles` | 4 PDFs, `mode=json` | 200 | 200 | OK | `success=true`, `results.length=4`, todos los resultados correctos, cada PDF con `assets=1` y `dataUri` válido. |
| API-04 | Carpeta a Markdown | `POST /api/transformfiles` | 4 PDFs, `mode=markdown` | 200 | 200 | OK | `success=true`, `results.length=4`, textos largos entre 1.7 MB y 2.4 MB, cada PDF con imagen embebida/dataUri. |
| NEG-01 | PDF válido con `mode=xml` | `POST /api/transformfile` | `PDF_1`, `mode=xml` | 400 | 400 | OK | Error claro: `Modo de conversión no válido. Usa "json" o "markdown".` |
| NEG-02 | PDF válido sin `mode` | `POST /api/transformfile` | `PDF_1`, sin `mode` | 400 | 400 | OK | Error claro de modo inválido. |
| NEG-03 | Petición sin archivo | `POST /api/transformfile` | Sin archivo, `mode=json` | 400 | 400 | OK | Error claro: `No hay un PDF cargado para procesar.` |
| NEG-04 | Archivo no PDF `.txt` | `POST /api/transformfile` | `nota.txt`, `mode=json` | 400 | 400 | OK | Error claro: `Solo se permiten archivos PDF.` |
| NEG-05 | Más de 20 archivos | `POST /api/transformfiles` | 21 PDFs repetidos, `mode=json` | 400 | 400 | OK con observación | Se bloquea por límite, pero el mensaje es crudo/en inglés: `Too many files`. |
| NEG-06 | Batch mixto PDF + TXT | `POST /api/transformfiles` | 1 PDF + 1 TXT, `mode=json` | 400 o parcial documentado | 400 | OK con observación | Backend rechaza todo el batch por el TXT. El frontend ya filtra no-PDF, pero la API no devuelve resultados parciales para este caso. |
| EDGE-01 | PDF falso con nombre `.pdf` | `POST /api/transformfile` | Blob de texto como `fake-content.pdf`, `mode=json` | 400 controlado | 500 | FAIL | Devuelve trazas internas, ruta temporal y stack Java en la respuesta. |
| EDGE-02 | PDF vacío | `POST /api/transformfile` | Blob vacío `empty.pdf`, `mode=json` | 400 controlado | 500 | FAIL | Igual que el caso anterior: error interno del conversor expuesto al cliente. |

## Pruebas Frontend

| ID | Flujo | Método de prueba | Resultado | Observaciones |
|---|---|---|---|---|
| FE-01 | Carga inicial del frontend | HTTP GET a `http://localhost:8100/` | OK | HTTP 200. HTML SSR disponible con `<html lang="es">`. |
| FE-02 | Metadata del proyecto | Revisión estática `app/routes/home.tsx` y respuesta HTML | OK | Title `CADE File converter` y descripción actualizada. |
| FE-03 | Opciones de conversión | Revisión estática `OpenDataLoaderConverter-v2.tsx` | OK | Están disponibles PDF a JSON, PDF a Markdown, Directorio a JSON y Directorio a Markdown. |
| FE-04 | Filtro de archivos no PDF | Revisión estática | OK | `handleFileSelection` filtra PDFs y usa `fileSelectionNotice` para avisar omitidos. Pendiente validación visual real en navegador. |
| FE-05 | Navegación entre PDFs en preview | Revisión estática | OK | Existen `previewFileIndex`, `handlePreviewPrevious`, `handlePreviewNext`, botones Anterior/Siguiente y límites. Pendiente validación con file picker real. |
| FE-06 | Preview PDF | Revisión estática | OK | `DocumentPreview` usa `iframe` con URL temporal y `#page=1`. |
| FE-07 | Procesar después de navegar preview | Revisión estática | OK | El procesamiento usa `selectedFiles`, no solo `previewFile`, por lo que debería enviar todos los PDFs válidos. |
| FE-08 | Copiar resultado | Revisión estática | OK | Comprueba `navigator.clipboard?.writeText`, usa `try/catch` y muestra feedback por item. Pendiente prueba real de permisos del navegador. |
| FE-09 | Descargar archivo individual | Revisión estática | OK | Se crea Blob y descarga con nombre de salida/fallback. Pendiente validación real de archivo descargado. |
| FE-10 | Descargar ZIP | Revisión estática | OK con riesgo | Usa JSZip en navegador. Funcional, pero puede consumir mucha memoria con Markdown/base64 largo. |
| FE-11 | Responsive/layout | Revisión estática | OK con observación | La UI tiene contenedores con scroll y `break-all` para textos largos. Queda pendiente prueba visual real en varios viewports. |

## Hallazgos

### FIND-01 - PDFs corruptos exponen trazas internas y rutas temporales

- Severidad: Alta.
- Área: Backend / API / Seguridad / UX.
- Archivo: `server/index.js`.
- Línea aproximada: 252-254, 279-284, 296-298.
- Descripción: Al enviar un archivo con nombre `.pdf` pero contenido inválido, la API devuelve HTTP 500 con el mensaje completo del CLI de `@opendataloader/pdf`, incluyendo rutas temporales de Windows, stack trace Java y detalles internos.
- Pasos para reproducir:
  1. Enviar un Blob de texto como `fake-content.pdf` a `POST /api/transformfile`.
  2. Usar `mode=json`.
  3. Revisar la respuesta.
- Resultado esperado: HTTP 400 o 422 con mensaje genérico y seguro, por ejemplo `El PDF no se pudo leer o está dañado.`
- Resultado actual: HTTP 500 con detalles internos como `C:\Users\...\Temp\pdf_...` y stack trace Java.
- Impacto: Filtra información del servidor, empeora la UX y complica soporte. En producción no debería exponerse.
- Propuesta de solución: Sanitizar errores del conversor antes de enviarlos al frontend. Mantener el detalle solo en logs internos de desarrollo. Devolver mensajes controlados por tipo de error.
- Prioridad: Alta.

### FIND-02 - La validación de PDF no comprueba el contenido real del archivo

- Severidad: Media.
- Área: Backend / Seguridad / API.
- Archivo: `server/index.js`.
- Línea aproximada: 26-30.
- Descripción: El filtro de Multer acepta un archivo si `mimetype === 'application/pdf'` o si el nombre termina en `.pdf`. Ambos valores pueden ser falsificados por el cliente.
- Pasos para reproducir:
  1. Enviar contenido de texto con nombre `fake-content.pdf` y tipo `application/pdf`.
  2. El archivo pasa el filtro inicial.
  3. El conversor falla internamente.
- Resultado esperado: Rechazo temprano del archivo como PDF inválido.
- Resultado actual: El archivo llega al conversor y termina en error 500.
- Impacto: Aumenta errores internos, ruido operativo y riesgo de exposición de detalles.
- Propuesta de solución: Validar firma/magic bytes (`%PDF-`) y, si es posible, una lectura básica de estructura antes de llamar al conversor.
- Prioridad: Alta.

### FIND-03 - CORS está abierto a cualquier origen

- Severidad: Media.
- Área: Seguridad / Config.
- Archivo: `server/index.js`.
- Línea aproximada: 16.
- Descripción: `app.use(cors())` permite peticiones desde cualquier origen.
- Pasos para reproducir: Revisar configuración del backend.
- Resultado esperado: En producción, solo permitir dominios autorizados.
- Resultado actual: Cualquier origen puede llamar a la API si conoce la URL.
- Impacto: Riesgo innecesario si la API queda accesible fuera de red interna.
- Propuesta de solución: Configurar CORS con lista blanca desde variable de entorno, por ejemplo `ALLOWED_ORIGINS`.
- Prioridad: Media.

### FIND-04 - `npm start` no arranca la API Express

- Severidad: Media.
- Área: Config / Deploy.
- Archivo: `package.json`.
- Línea aproximada: 9.
- Descripción: El script `start` ejecuta `react-router-serve ./build/server/index.js`, pero el backend Express de conversión se levanta con `npm run server` aparte.
- Pasos para reproducir:
  1. Ejecutar solo `npm run build`.
  2. Ejecutar solo `npm run start`.
  3. Intentar convertir PDFs sin arrancar `npm run server`.
- Resultado esperado: El modo producción debería documentar claramente que hay dos procesos o proveer una forma de arrancarlos.
- Resultado actual: `npm start` sirve el frontend/SSR, pero no la API de conversión.
- Impacto: Riesgo de despliegues incompletos.
- Propuesta de solución: Documentar despliegue con dos servicios o añadir configuración de proceso para frontend y backend.
- Prioridad: Media.

### FIND-05 - Uso intensivo de memoria con Multer memoryStorage, base64 y ZIP en frontend

- Severidad: Media.
- Área: Performance / Escalabilidad.
- Archivo: `server/index.js`, `app/features/conversionDisplay/conversionDisplay.tsx`.
- Línea aproximada: `server/index.js` 21-24, `conversionDisplay.tsx` 81-88.
- Descripción: Los PDFs se reciben en memoria, se convierten a resultados con imágenes base64/dataUri y el ZIP se genera en el navegador.
- Pasos para reproducir:
  1. Convertir 4 PDFs con imágenes a Markdown.
  2. Observar respuestas de 1.7 MB a 2.4 MB por archivo.
  3. Escalar mentalmente a 20 PDFs o PDFs grandes de 25 MB.
- Resultado esperado: Uso de memoria controlado y streaming/almacenamiento temporal para cargas pesadas.
- Resultado actual: Todo el flujo puede acumular PDFs, resultados base64 y ZIP en memoria.
- Impacto: Riesgo de lentitud o caídas en VM pequeña o con usuarios concurrentes.
- Propuesta de solución: Considerar almacenamiento en disco, límites por tamaño total, compresión/ZIP en backend, streaming o cola de trabajos.
- Prioridad: Media.

### FIND-06 - No hay tests automatizados ni script de lint

- Severidad: Media.
- Área: Cobertura de Pruebas / Calidad.
- Archivo: `package.json`.
- Línea aproximada: 5-10.
- Descripción: Hay scripts de build y typecheck, pero no hay `test`, `lint` ni framework E2E instalado.
- Pasos para reproducir: Revisar `package.json` y buscar archivos `test/spec`.
- Resultado esperado: Tests unitarios/API/E2E para flujos críticos.
- Resultado actual: La calidad depende de pruebas manuales y comandos técnicos.
- Impacto: Más riesgo de regresiones en carga, preview, clipboard, ZIP y errores de API.
- Propuesta de solución: Añadir Vitest/React Testing Library para lógica UI, Supertest o fetch tests para API, y Playwright para E2E de navegador.
- Prioridad: Media.

### FIND-07 - Batch mixto con TXT rechaza toda la petición en backend

- Severidad: Baja.
- Área: API / UX.
- Archivo: `server/index.js`.
- Línea aproximada: 26-33, 259.
- Descripción: Si se envía a `/transformfiles` una mezcla de PDF válido y TXT, Multer rechaza toda la petición con HTTP 400.
- Pasos para reproducir:
  1. Enviar `files` con 1 PDF válido y 1 TXT.
  2. Usar `mode=json`.
- Resultado esperado: Depende del contrato deseado. Para UX parcial, debería convertir PDFs válidos y reportar el TXT como omitido/error individual.
- Resultado actual: HTTP 400, no se procesa ningún PDF.
- Impacto: Bajo en frontend actual porque el cliente filtra no-PDF antes de enviar, pero la API es estricta.
- Propuesta de solución: Documentar el comportamiento estricto o ajustar el endpoint para aceptar parciales si se quiere robustez API.
- Prioridad: Baja.

### FIND-08 - README no documenta Java ni límites operativos

- Severidad: Baja.
- Área: Docs.
- Archivo: `README.md`.
- Línea aproximada: 5-8, 70-76.
- Descripción: El README indica Node.js y npm, pero no menciona Java como requisito de conversión ni límites de 20 archivos/25 MB.
- Pasos para reproducir: Revisar sección de requisitos del README.
- Resultado esperado: Documentar Java, `VITE_API_URL`, frontend/backend separados, límites y producción.
- Resultado actual: Java y límites están mejor explicados en `docs/final-implementation-manual.md`, pero no en el README.
- Impacto: Onboarding incompleto y posibles errores al arrancar backend en máquinas nuevas.
- Propuesta de solución: Ampliar README con Java, límites, despliegue y troubleshooting básico.
- Prioridad: Baja.

### FIND-09 - No existe endpoint de healthcheck

- Severidad: Baja.
- Área: API / Operaciones.
- Archivo: `server/index.js`.
- Línea aproximada: no existe ruta.
- Descripción: `GET /api` responde 404. Para monitorización no hay endpoint claro tipo `/api/health`.
- Pasos para reproducir: Abrir `http://localhost:3001/api`.
- Resultado esperado: Endpoint de salud con HTTP 200 y datos mínimos.
- Resultado actual: HTTP 404 `Cannot GET /api`.
- Impacto: Dificulta checks de VM, balanceador, Docker, uptime o monitorización.
- Propuesta de solución: Añadir `GET /api/health` con estado, versión y entorno sin datos sensibles.
- Prioridad: Baja.

### FIND-10 - Mensajes de Multer salen crudos y en inglés

- Severidad: Baja.
- Área: API / UX.
- Archivo: `server/index.js`.
- Línea aproximada: 303-305.
- Descripción: Al superar el límite de archivos, la respuesta es `Too many files`.
- Pasos para reproducir:
  1. Enviar 21 archivos a `/api/transformfiles`.
  2. Revisar error.
- Resultado esperado: Mensaje localizado y claro, por ejemplo `Solo se permiten hasta 20 PDFs por petición.`
- Resultado actual: `Too many files`.
- Impacto: UX inconsistente para usuario final.
- Propuesta de solución: Mapear `multer.MulterError` por código (`LIMIT_FILE_COUNT`, `LIMIT_FILE_SIZE`) a mensajes propios.
- Prioridad: Baja.

## Riesgos Técnicos

1. Errores internos del conversor expuestos al frontend en PDFs corruptos o falsos.
2. CORS abierto si la API se despliega fuera de entorno controlado.
3. Alto uso de memoria por PDFs en memoria, assets base64 y ZIP generado en cliente.
4. Falta de tests automatizados para flujos críticos de archivo, descarga, ZIP y clipboard.
5. Producción con dos servicios separados sin script único ni guía fuerte de operación.
6. Dependencia de Java externa al ecosistema npm.
7. Falta de healthcheck para monitorización.
8. Mensajes de error técnicos o en inglés en algunos límites de subida.

## Mejoras Recomendadas

### 1. Corto plazo

1. Sanitizar errores del conversor antes de responder al cliente.
2. Validar firma real de PDF antes de convertir.
3. Mapear errores de Multer a mensajes claros en español.
4. Añadir `GET /api/health`.
5. Actualizar README con Java, límites, despliegue frontend/backend y troubleshooting.

### 2. Medio plazo

1. Restringir CORS mediante variables de entorno.
2. Añadir tests API para positivos, negativos, PDFs corruptos y límites.
3. Añadir tests unitarios de selección de archivos, aviso de omitidos y navegación de preview.
4. Añadir Playwright para E2E de carga, conversión, descarga, ZIP y clipboard.
5. Revisar estrategia de payloads base64 grandes.

### 3. Largo plazo

1. Procesamiento con cola de trabajos si habrá concurrencia real.
2. Almacenamiento temporal/streaming en lugar de memoria para PDFs grandes.
3. Generación de ZIP en backend o descarga por lotes más eficiente.
4. Observabilidad: logs estructurados, métricas de tiempo por conversión, errores por tipo y consumo de memoria.
5. Autenticación o restricción de red si se usa en empresa con datos sensibles.

## Seguridad

- Estado actual:
  - Hay límites de tamaño por archivo: 25 MB.
  - Hay límite de cantidad: 20 archivos por petición múltiple.
  - Se filtran archivos no PDF por mimetype/nombre.
  - Logs informativos están parcialmente limitados por entorno.
  - `npm audit` no reporta vulnerabilidades.
- Riesgos:
  - CORS abierto.
  - Validación PDF falsificable.
  - Errores 500 con rutas y stack trace Java en respuesta.
  - No hay autenticación ni rate limiting.
- Recomendaciones:
  - Sanitizar errores.
  - Validar firma `%PDF-`.
  - Restringir CORS.
  - Añadir rate limiting si la API queda expuesta.
  - Evitar devolver detalles internos del CLI.

## Rendimiento

- Estado actual:
  - Batch se procesa de forma secuencial, lo que reduce presión simultánea de CPU/memoria.
  - Multer usa `memoryStorage`.
  - Markdown con imágenes puede generar respuestas de varios MB por archivo.
  - ZIP se genera en el navegador con JSZip.
- Riesgos:
  - 20 PDFs de 25 MB pueden ser demasiado para una VM pequeña.
  - Base64 aumenta tamaño de payload.
  - El navegador puede sufrir al mostrar/copiar/zipear resultados largos.
- Recomendaciones:
  - Medir memoria real en VM objetivo.
  - Añadir límite de tamaño total por petición.
  - Considerar disco temporal o streaming.
  - Considerar ZIP en backend o descarga individual por archivo procesado.

## UX

- Estado actual:
  - Las opciones de conversión están claras.
  - La preview permite navegar entre PDFs en modo carpeta.
  - El frontend avisa si omite archivos no PDF.
  - El botón Copiar tiene feedback de éxito/error.
  - Los resultados largos tienen scroll y protección visual.
- Problemas:
  - Algunos errores de backend son técnicos o en inglés.
  - No se validó con navegador automatizado la descarga real, clipboard ni file picker.
  - Los resultados Markdown con base64 son muy largos y pueden ser pesados visualmente.
- Recomendaciones:
  - Usar mensajes finales más humanos para límites y PDFs dañados.
  - Añadir tests E2E visuales.
  - Considerar vista compacta de assets/base64 o descarga directa sin mostrar todo el base64.

## Documentación

- Estado actual:
  - README describe proyecto, desarrollo, API local y scripts.
  - `docs/final-implementation-manual.md` contiene explicación amplia de arquitectura, Java y límites.
- Desactualizaciones o huecos:
  - README no incluye Java como requisito.
  - README no documenta límite de 20 PDFs ni 25 MB.
  - README no explica claramente despliegue productivo con frontend y backend separados.
  - No hay guía corta de resolución de errores de PDFs dañados.
- Recomendaciones:
  - Llevar requisitos críticos del manual al README.
  - Añadir sección de producción.
  - Añadir sección de límites y errores frecuentes.

## Cobertura de Pruebas

- Tests existentes:
  - No se encontraron archivos `test/spec` ni scripts `test`/`lint`.
  - No hay Playwright, Selenium ni framework E2E instalado.
- Tests faltantes:
  - API positiva/negativa automatizada.
  - API para PDFs corruptos, vacíos y con extensión falsificada.
  - Unit tests de filtrado de archivos y navegación de preview.
  - Tests de clipboard con fallback.
  - Tests de descarga individual y ZIP.
  - Tests responsive y layout con base64 largo.
- Casos recomendados:
  - PDF válido a JSON y Markdown.
  - Carpeta de 4 PDFs a JSON y Markdown.
  - TXT, PDF vacío, PDF corrupto y archivo con extensión `.pdf` falsificada.
  - Más de 20 archivos.
  - Cambio de modo después de cargar archivos.
  - Quitar documento y volver a cargar.
  - Fallo simulado de Clipboard API.

## Conclusión

El proyecto está funcional para uso interno controlado: build, typecheck, dependencias y conversiones principales pasan. La API convierte correctamente PDFs con texto e imágenes, tanto individualmente como por carpeta, y el frontend contiene las piezas necesarias para preview, navegación, aviso de omitidos, copia, descarga y ZIP.

No lo consideraría listo para producción abierta sin corregir primero los errores de exposición de trazas internas, la validación real de PDFs, CORS, mensajes de Multer y documentación operativa. El siguiente paso recomendado es cerrar `FIND-01` y `FIND-02`, porque son los hallazgos con más impacto real en seguridad, soporte y estabilidad.
