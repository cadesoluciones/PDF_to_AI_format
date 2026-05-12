# Informe E2E y API - CADE File converter

## Resumen General
- Fecha: 2026-05-12
- Entorno: Windows, PowerShell, Node/npm del proyecto, Java 26.0.1, servicios locales ya levantados
- Servicios detectados:
  - Frontend: `http://localhost:8100/`
  - Backend API: `http://localhost:3001/api`
- Estado global: OK CON OBSERVACIONES
- PDFs utilizados:
  - `docs/PDFs_imagen_dentro/PDF_1_Redes_basicas_imagen_dentro.pdf`
  - `docs/PDFs_imagen_dentro/PDF_2_SQL_y_bases_de_datos_imagen_dentro.pdf`
  - `docs/PDFs_imagen_dentro/PDF_3_Seguridad_informatica_imagen_dentro.pdf`
  - `docs/PDFs_imagen_dentro/PDF_4_Java_hilos_basico_imagen_dentro.pdf`
- Alcance de las pruebas: comprobaciones técnicas, API real single/batch, casos negativos, validación de imágenes, verificación HTTP/SSR del frontend y revisión estática de flujos frontend.

## Servicios Detectados

| Servicio | URL | Estado | Evidencia | Observaciones |
| --- | --- | --- | --- | --- |
| Frontend | `http://localhost:8100/` | OK | HTTP 200 en 138 ms | HTML incluye `lang="es"`, `CADE File converter` y opciones de conversión. |
| Backend API | `http://localhost:3001/api` | OK | HTTP 404 en 8 ms con `Cannot GET /api` | El 404 confirma que Express responde; no existe ruta GET `/api`, comportamiento esperado. |

## Comandos Ejecutados

| Comando | Resultado | Tiempo aproximado | Observaciones |
| --- | --- | ---: | --- |
| `npm ls --depth=0` | OK | 1.56 s | Dependencias instaladas sin paquetes `extraneous`; incluye `multer@2.1.1`, `@opendataloader/pdf@2.4.1`, React Router 7.14.0 y Vite 8.0.10. |
| `node --check server/index.js` | OK | 0.10 s | Sintaxis del backend válida. |
| `npm run typecheck` | OK | 4.95 s | Ejecutó `react-router typegen && tsc` sin errores. |
| `npm run build` | OK | 4.01 s | Build client y SSR generado correctamente con React Router/Vite. |
| `java -version` | OK | 0.20 s | Java `26.0.1` disponible en PATH. |
| `npm ls @playwright/test playwright selenium-webdriver --depth=0` | OK CON OBSERVACIONES | 1.8 s | No hay Playwright/Selenium instalado; no se añadió ninguna dependencia. |

## Pruebas Backend API

| ID | Caso | Endpoint | Archivo(s) | Mode | HTTP esperado | HTTP obtenido | Resultado | Observaciones |
| --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| API-01 | PDF a JSON | `/transformfile` | `PDF_1_Redes_basicas_imagen_dentro.pdf` | `json` | 200 | 200 | OK | `success=true`, `mode=json`, `results.length=1`, `fileName=.json`, `data.content` existe y no está vacío. |
| API-02 | PDF a Markdown | `/transformfile` | `PDF_2_SQL_y_bases_de_datos_imagen_dentro.pdf` | `markdown` | 200 | 200 | OK | `success=true`, `mode=markdown`, Markdown no vacío, texto legible, sin patrón `- •`. |
| API-03 | Directorio a JSON | `/transformfiles` | 4 PDFs | `json` | 200 | 200 | OK | `results.length=4`; los 4 items tienen `success=true`, `data.content` y `assets`. |
| API-04 | Directorio a Markdown | `/transformfiles` | 4 PDFs | `markdown` | 200 | 200 | OK | `results.length=4`; los 4 items tienen Markdown no vacío e imagen embebida `data:image/...`. |

Detalles relevantes observados:
- API-01: texto JSON aproximado `10242` caracteres; `assetsCount=1`; `dataUriAssetsCount=1`.
- API-02: Markdown aproximado `1981335` caracteres; `assetsCount=1`; `markdownEmbeddedImages=1`.
- API-03: los 4 PDFs generaron `assetsCount=1` y `dataUriAssetsCount=1`.
- API-04: los 4 PDFs generaron Markdown con `markdownEmbeddedImages=1`.

## Pruebas Frontend

| ID | Flujo | Pasos realizados | Resultado | Observaciones |
| --- | --- | --- | --- | --- |
| FE-01 | Carga inicial | GET `http://localhost:8100/` | OK | HTTP 200; HTML de 63178 caracteres; contiene título, opciones y scripts de cliente. |
| FE-02 | Opciones visibles | Revisión HTTP/SSR del HTML | OK | Se detectan `PDF a JSON`, `PDF a Markdown`, `Directorio a JSON` y `Directorio a Markdown`. |
| FE-03 | Botones y estados base | Revisión HTTP/SSR y código fuente | OK | Se detectan textos de selección/procesamiento y handlers conectados en componentes. |
| FE-04 | PDF a JSON en navegador | Requiere interacción real de navegador con subida de archivo | NO EJECUTADO | No hay Playwright/Selenium instalado y no se añadieron dependencias por restricción. La API equivalente API-01 pasó correctamente. |
| FE-05 | PDF a Markdown en navegador | Requiere interacción real de navegador con subida, copiar y descarga | NO EJECUTADO | No hay herramienta de navegador disponible sin añadir dependencias. La API equivalente API-02 pasó correctamente. |
| FE-06 | Directorio a JSON en navegador | Requiere interacción real de navegador con selección de carpeta y ZIP | NO EJECUTADO | No hay herramienta de navegador disponible sin añadir dependencias. La API equivalente API-03 pasó correctamente. |
| FE-07 | Directorio a Markdown en navegador | Requiere interacción real de navegador con selección de carpeta y ZIP | NO EJECUTADO | No hay herramienta de navegador disponible sin añadir dependencias. La API equivalente API-04 pasó correctamente. |

## Pruebas Negativas

| ID | Caso | Resultado esperado | Resultado actual | Estado | Observaciones |
| --- | --- | --- | --- | --- | --- |
| NEG-01 | PDF válido con `mode=xml` | HTTP 400 y error claro | HTTP 400, `success=false`, `Modo de conversión no válido. Usa "json" o "markdown".` | OK | No hay conversión silenciosa. |
| NEG-02 | PDF válido sin `mode` | HTTP 400 y error claro | HTTP 400, `success=false`, `Modo de conversión no válido. Usa "json" o "markdown".` | OK | Valida ausencia de modo. |
| NEG-03 | Petición sin archivo | HTTP 400 y error claro | HTTP 400, `success=false`, `No hay un PDF cargado para procesar.` | OK | Controlado en endpoint single. |
| NEG-04 | Archivo no PDF | HTTP 400 y error claro | HTTP 400, `success=false`, `Solo se permiten archivos PDF.` | OK | Se usó Blob temporal en memoria; no se creó archivo permanente. |
| NEG-05 | Más de 20 archivos | Error de límite | HTTP 400, `success=false`, `Too many files` | OK | Se enviaron 21 repeticiones del PDF en memoria/FormData. |
| NEG-06 | Batch con PDFs válidos y archivo no PDF | Comportamiento controlado documentado | HTTP 400, `success=false`, `Solo se permiten archivos PDF.` | OK CON OBSERVACIONES | Multer rechaza todo el batch antes del endpoint; no hay resultados parciales para los PDFs válidos. |

## Validación de Imágenes

- Assets extraídos: Sí, todos los PDFs probados generaron `assetsCount=1` en JSON y Markdown.
- Presencia de dataUri: Sí, `dataUriAssetsCount=1` para cada PDF en JSON.
- Formato `data:image/...;base64,...`: Sí, los assets detectados empiezan por `data:image/` y contienen `;base64,`.
- Markdown con imágenes embebidas: Sí, los 4 PDFs en Markdown tuvieron `markdownEmbeddedImages=1`.
- PDFs sin imágenes detectadas o con fallback: No se detectaron PDFs sin imagen durante esta batería.
- Problemas detectados: No se detectó el patrón de listas mal formateadas `- •` en Markdown.

## Comparación con Conversiones Previas

No se encontraron carpetas `conversion-json/` ni `conversion-markdown/` en la raíz del proyecto, por lo que no se ejecutó comparación contra conversiones previas.

| Elemento | Resultado |
| --- | --- |
| `conversion-json/` | No existe |
| `conversion-markdown/` | No existe |
| Comparación byte a byte | No ejecutada |
| Comparación general | No ejecutada por ausencia de carpetas previas |

## Fallos Encontrados

No se han detectado fallos bloqueantes durante las pruebas ejecutadas.

### BUG-01 - Batch mixto con archivo no PDF rechaza toda la petición
- Severidad: Baja
- Archivo o flujo afectado: Backend API, `POST /api/transformfiles`
- Descripción: Al enviar PDFs válidos junto a un archivo no PDF, Multer rechaza toda la petición antes de que el endpoint pueda generar resultados parciales.
- Pasos para reproducir: Enviar a `/api/transformfiles` dos PDFs válidos y un `.txt` con `mode=json`.
- Resultado esperado: Si se busca tolerancia parcial, los PDFs válidos deberían procesarse y el archivo inválido debería aparecer como error individual.
- Resultado actual: HTTP 400 con `Solo se permiten archivos PDF.` y sin `results`.
- Evidencia: Prueba `NEG-06`.
- Propuesta de solución: Mantener el comportamiento actual si se desea validación estricta; si se quiere tolerancia parcial, mover la validación de tipo al endpoint batch y registrar errores por archivo.

## Riesgos Pendientes

- No se ejecutaron flujos frontend reales de subida, copia y descarga en navegador porque no hay Playwright/Selenium instalado y no se podían añadir dependencias.
- Las descargas de archivo y ZIP se verificaron por revisión de código y por respuesta API, no por inspección real del archivo descargado desde navegador.
- El frontend respondió correctamente por HTTP/SSR, pero la interacción con selector de carpeta requiere validación manual o automatización futura.
- El batch mixto con no PDF tiene comportamiento estricto: rechaza toda la petición. Está controlado, pero no conserva resultados válidos parciales.
- No existían carpetas `conversion-json/` ni `conversion-markdown/` para comparación con conversiones previas.

## Conclusión

El estado general del proyecto es OK CON OBSERVACIONES. Las comprobaciones técnicas pasan, Java está disponible, el backend responde correctamente y las conversiones reales de los 4 PDFs con imágenes funcionan en JSON y Markdown tanto en single como en batch.

El conversor está listo desde el punto de vista de API y build/typecheck. El principal punto pendiente es ejecutar una prueba manual o automatizada de navegador para confirmar subida de archivos, copiado, descargas individuales y ZIP desde la interfaz. No se han detectado fallos bloqueantes; el único comportamiento a decidir es si el batch debe rechazar estrictamente archivos no PDF o permitir resultados parciales.
