# Informe de Pruebas y Fallos

## Resumen General

- **Estado general del proyecto:** aplicación React Router 7 con frontend React/Vite/Tailwind y backend Express separado para conversión de PDFs mediante `@opendataloader/pdf`.
- **Fecha de análisis:** 2026-05-08.
- **Entorno utilizado:** Windows PowerShell 5.1.26100.8115, Node.js v24.15.0, npm 11.12.1.
- **Raíz analizada:** `c:\Users\ETP\OneDrive - CADE SOLUCIONES DE INGENIERIA SL\Escritorio\React\PDF_to_AI_format\PDF_to_AI_format`.
- **Resultado global:** **con errores**. El typecheck, build, auditoría npm y conversiones API básicas pasan, pero el despliegue/start de producción no levanta el backend necesario para convertir archivos. También faltan scripts de test/lint y hay riesgos técnicos relevantes en subida/procesado de PDFs.
- **Limitaciones:** `git` no está disponible en PATH, por lo que no se pudo comprobar el estado del repositorio con `git status`. No hay Playwright/Cypress ni test runner configurado para pruebas E2E de navegador.
- **Instalación de dependencias:** no se ejecutó `npm install` ni `npm ci` porque `node_modules` ya existe. Se evitó modificar masivamente dependencias/lockfile.

## Comandos Ejecutados

| Comando | Resultado | Tiempo aproximado | Observaciones |
|---|---:|---:|---|
| `Get-ChildItem -Force` | OK | 0.5 s | La carpeta inicial contiene otra carpeta `PDF_to_AI_format`; la raíz efectiva está un nivel más abajo. |
| `git status --short` | Error | 2.0 s | `git` no está disponible en PATH. |
| `rg --files -g package.json ...` | OK | 1.1 s | Localizados `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `README.md`. |
| `Get-Content package.json` | OK | 0.7 s | Scripts disponibles: `build`, `dev`, `server`, `start`, `typecheck`. No hay `test` ni `lint`. |
| `Get-Content tsconfig.json` | OK | 0.7 s | TypeScript en `strict: true`, sin `noUnusedLocals`/`noUnusedParameters`. |
| `Get-Content vite.config.ts` | OK | 0.7 s | Vite con plugin React Router y Tailwind. |
| `rg --files -g '!node_modules/**' -g '!build/**' ...` | OK | 0.7 s | Mapeo de estructura principal `app`, `server`, `docs`, `public`. |
| `node --version` | OK | 0.5 s | Node.js v24.15.0. |
| `npm --version` | OK | 1.2 s | npm 11.12.1. |
| `npm run` | OK | 1.3 s | Confirmada ausencia de scripts de lint/test. |
| `npm ls --depth=0` | OK con advertencias | 2.2 s | Dependencias instaladas; aparecen paquetes `extraneous` en `node_modules`. |
| `npm run typecheck` | OK | 5.1 s | `react-router typegen && tsc` sin errores. |
| `npm run build` | OK | 3.6 s | Build de cliente y SSR correcto. Regenera artefactos en `build/`. |
| `npm audit --audit-level=low` | OK | 2.2 s | `found 0 vulnerabilities`. |
| `npm exec tsc -- --noEmit --noUnusedLocals --noUnusedParameters` | OK | 3.1 s | Check estricto adicional ejecutado tras eliminar la variable no usada. No es parte del script oficial. |
| `Start-Process node server/index.js` | OK | 4.3 s | Backend Express levantado temporalmente en `http://localhost:3001`. |
| `POST http://localhost:3001/api/transformfile` sin archivo | OK funcional / salida no cero | 0.7 s | Respuesta esperada HTTP 400: `No hay un PDF cargado para procesar.` PowerShell marca HTTP 400 como excepción. |
| `POST http://localhost:3001/api/transformfile` con `bad.txt` | OK | 0.6 s | Respuesta esperada HTTP 400: `Solo se permiten archivos PDF.` |
| `POST http://localhost:3001/api/transformfiles` sin archivos | OK funcional / salida no cero | 0.7 s | Respuesta esperada HTTP 400: `No hay PDFs cargados para procesar.` |
| `POST /api/transformfile` con PDF mínimo y modo `markdown` | OK | 1.1 s | Respuesta HTTP 200, `hello.md`, contenido `# Hello PDF`. |
| `POST /api/transformfile` con PDF mínimo y modo `json` | OK | 1.1 s | Respuesta HTTP 200, `hello-json.json`, contenido JSON con `Hello JSON`. |
| `POST /api/transformfiles` con dos PDFs mínimos | OK | 1.3 s | Respuesta HTTP 200, 2 resultados Markdown correctos. |
| `Start-Process npm.cmd run start` | OK | 4.3 s | Frontend de producción levantado temporalmente en `http://localhost:3000`. |
| `Invoke-WebRequest http://localhost:3000/` | OK | 0.5 s | HTTP 200; HTML contiene `CADE File converter` y `Visor de PDF`. |
| `fetch http://localhost:3001/api/transformfile` con backend detenido | Error esperado | 0.6 s | `TypeError: fetch failed`; reproduce que `npm run start` no levanta backend. |
| `POST http://localhost:3000/api/transformfile` | Error esperado | 0.6 s | HTTP 404; React Router server no expone endpoints API. |
| `Stop-Process` de procesos Node temporales | OK | 0.3 s | Se cerraron los servidores temporales levantados durante la auditoría. |

## Pruebas Realizadas

| Área probada | Descripción | Resultado | Observaciones |
|---|---|---:|---|
| Configuración del proyecto | Revisión de `package.json`, `tsconfig.json`, `vite.config.ts`, `react-router.config.ts`, `Dockerfile`, `README.md`. | Pasa con advertencias | Proyecto identificable, pero documentación y metadata siguen siendo de plantilla. |
| Dependencias | Revisión con `npm ls --depth=0` y `npm audit`. | Pasa con advertencias | Sin vulnerabilidades reportadas; `node_modules` contiene paquetes `extraneous`; `package-lock` marca Multer 1.x como deprecated. |
| TypeScript | `npm run typecheck`. | Pasa | TypeScript estricto pasa con configuración actual. |
| Build producción | `npm run build`. | Pasa | Cliente y SSR compilan correctamente. |
| Static check extra | `tsc --noUnusedLocals --noUnusedParameters`. | Pasa | Ejecutado tras eliminar la variable no usada en `conversionDisplay.tsx`. |
| API PDF individual a Markdown | PDF mínimo generado en memoria enviado a `/api/transformfile`. | Pasa | Devuelve `hello.md` con Markdown esperado. |
| API PDF individual a JSON | PDF mínimo generado en memoria enviado a `/api/transformfile`. | Pasa | Devuelve JSON parseable con contenido del PDF. |
| API carpeta/múltiples PDFs | Dos PDFs mínimos enviados a `/api/transformfiles`. | Pasa | Devuelve dos resultados correctos. |
| Validación sin archivo | POST sin archivo a endpoints individual y múltiple. | Pasa | Devuelve HTTP 400 con JSON de error. |
| Validación tipo de archivo | Subida de `bad.txt` como archivo. | Pasa | Devuelve HTTP 400 con `Solo se permiten archivos PDF.` |
| Frontend producción | `npm run start` y GET `/`. | Pasa parcialmente | La pantalla carga, pero la API no existe en el mismo proceso. |
| Flujo producción completo | Frontend de producción sin `server/index.js`. | Falla | El endpoint `localhost:3001` no está disponible y `localhost:3000/api/transformfile` devuelve 404. |

## Fallos Encontrados

### F-001 - Backend no se levanta en producción con `npm run start`/Docker

- **Severidad:** crítica.
- **Archivo:** `package.json:5-10`, `Dockerfile:22`, `app/api/processFile.tsx:5`, `server/index.js:10`, `server/index.js:301`.
- **Descripción:** el frontend llama por defecto a `http://localhost:3001/api`, pero el script `start` y el `Dockerfile` solo arrancan `react-router-serve` en el puerto 3000. El backend Express se arranca con otro script (`npm run server`) y no forma parte del proceso de producción documentado.
- **Pasos para reproducir:**
  1. Ejecutar `npm run build`.
  2. Ejecutar `npm run start`.
  3. No ejecutar `npm run server`.
  4. Intentar convertir desde la UI o llamar a `http://localhost:3001/api/transformfile`.
  5. Alternativamente, llamar a `http://localhost:3000/api/transformfile`.
- **Resultado esperado:** la aplicación desplegada debe servir la UI y los endpoints necesarios para convertir PDFs, o apuntar a una API externa configurada.
- **Resultado actual:** `localhost:3001` rechaza conexión si no se ejecuta el backend aparte; `localhost:3000/api/transformfile` devuelve 404.
- **Propuesta de solución:** unificar frontend y API en un único servidor de producción, añadir un script productivo que arranque ambos procesos de forma controlada, o desplegar API y frontend como servicios separados con `VITE_API_URL` obligatorio. Actualizar Dockerfile, README, puertos expuestos y healthchecks.

### F-003 - CORS abierto sin control de origen ni rate limiting

- **Severidad:** media.
- **Archivo:** `server/index.js:15`.
- **Descripción:** `app.use(cors())` permite cualquier origen. En un servicio que acepta conversiones de PDFs, esto permite que sitios externos disparen cargas pesadas contra la API si está expuesta.
- **Pasos para reproducir:**
  1. Levantar `npm run server`.
  2. Desde cualquier origen web, enviar un POST multipart a `http://host:3001/api/transformfile`.
- **Resultado esperado:** solo orígenes permitidos pueden usar la API; debería existir rate limiting básico.
- **Resultado actual:** no hay restricción de origen ni throttling.
- **Propuesta de solución:** configurar `cors({ origin: [...] })`, añadir rate limiting, límites por IP y, si aplica, autenticación o token interno.

### F-005 - No existen scripts ni configuración de tests/lint

- **Severidad:** media.
- **Archivo:** `package.json:5-10`.
- **Descripción:** el proyecto no tiene `test`, `lint`, `format`, `coverage`, Vitest/Jest, Testing Library, Supertest, Playwright/Cypress ni configuración ESLint/Prettier propia.
- **Pasos para reproducir:**
  1. Ejecutar `npm run`.
  2. Revisar scripts disponibles.
- **Resultado esperado:** scripts mínimos de calidad automatizada para frontend, backend y API.
- **Resultado actual:** solo hay `build`, `dev`, `server`, `start`, `typecheck`.
- **Propuesta de solución:** añadir ESLint, Prettier si se desea formato consistente, Vitest/React Testing Library para componentes, Supertest para API y al menos un E2E de conversión básica.

### F-007 - Copia al portapapeles sin manejo de error ni feedback

- **Severidad:** baja.
- **Archivo:** `app/features/conversionDisplay/conversionDisplay.tsx:92-94`.
- **Descripción:** `navigator.clipboard.writeText()` se llama sin `try/catch` ni estado visual. Si el navegador bloquea permisos o el contexto no es seguro, el usuario no recibe feedback.
- **Pasos para reproducir:**
  1. Cargar un resultado convertido.
  2. Bloquear permisos de portapapeles o usar un contexto donde Clipboard API no esté disponible.
  3. Pulsar `Copiar`.
- **Resultado esperado:** mensaje claro de éxito/error.
- **Resultado actual:** posible promesa rechazada sin feedback en UI.
- **Propuesta de solución:** envolver en `try/catch`, comprobar `navigator.clipboard`, mostrar estado de copiado/error y considerar fallback.

### F-008 - Metadata y documentación siguen siendo de plantilla

- **Severidad:** baja.
- **Archivo:** `app/routes/home.tsx:7-8`, `app/root.tsx:22`, `README.md:1`.
- **Descripción:** el título y descripción HTML siguen como `New React Router App` / `Welcome to React Router!`; el documento declara `lang="en"` aunque la interfaz está en español. El README también es el template base.
- **Pasos para reproducir:**
  1. Ejecutar `npm run start`.
  2. Abrir la página y revisar `<title>`, meta description y README.
- **Resultado esperado:** metadata y documentación del producto `CADE File converter`, con idioma correcto.
- **Resultado actual:** metadata/documentación genérica de plantilla.
- **Propuesta de solución:** actualizar `meta`, `lang`, README y guía de despliegue real incluyendo backend.

### F-009 - Logs de producción exponen rutas temporales y detalles internos

- **Severidad:** baja.
- **Archivo:** `server/index.js:179-186`, `server/index.js:302`.
- **Descripción:** el backend imprime rutas de temporales, formato y archivos generados mediante `console.log`. Puede filtrar detalles internos y ensuciar logs en producción.
- **Pasos para reproducir:**
  1. Levantar `npm run server`.
  2. Convertir un PDF.
  3. Revisar logs del proceso.
- **Resultado esperado:** logging estructurado por nivel, sin rutas internas salvo modo debug.
- **Resultado actual:** logs directos en consola.
- **Propuesta de solución:** usar un logger con niveles, ocultar rutas por defecto y activar trazas solo en desarrollo.

### F-010 - Dependencia Multer 1.x deprecada

- **Severidad:** baja.
- **Archivo:** `package.json:17`, `package-lock.json:3743`.
- **Descripción:** `package-lock.json` indica que Multer 1.x está deprecado y recomienda migrar a 2.x. `npm audit` no reportó vulnerabilidades actuales, pero es deuda técnica en un punto sensible de subida de archivos.
- **Pasos para reproducir:**
  1. Revisar `package-lock.json`.
  2. Buscar el campo `deprecated` de Multer.
- **Resultado esperado:** dependencia mantenida en versión actual.
- **Resultado actual:** se usa `multer` 1.x LTS.
- **Propuesta de solución:** planificar migración a Multer 2.x o alternativa mantenida, validando límites y comportamiento multipart.

## Riesgos Técnicos

- El flujo principal depende de dos procesos separados (`react-router-serve` y `server/index.js`) sin orquestación productiva.
- `VITE_API_URL` es opcional; si falta, el cliente queda apuntando a `localhost:3001`, que en navegador de usuario final suele ser la máquina del usuario, no el servidor.
- No hay CI ni pruebas automatizadas, por lo que regresiones de conversión, descarga ZIP o UI podrían entrar sin detección.
- No hay validación de firma/magic bytes PDF; se acepta un archivo por `mimetype` o por extensión `.pdf`.
- `node_modules` contiene paquetes `extraneous`; no se pudo verificar con `git` si el lockfile/instalación están limpios.
- La selección de carpeta usa atributos no estándar (`webkitdirectory`, `directory`), por lo que la compatibilidad entre navegadores puede variar.
- El backend no expone healthcheck ni métricas básicas.
- La documentación de despliegue no refleja que el backend debe levantarse aparte.

## Mejoras Recomendadas

1. Corregir el despliegue: definir arquitectura de producción para UI + API y actualizar `Dockerfile`, scripts y README.
2. Añadir tests automatizados: API con Supertest, componentes con Vitest/Testing Library y un E2E mínimo de conversión.
3. Añadir ESLint y activar `noUnusedLocals`/`noUnusedParameters` o un script equivalente.
4. Endurecer subida de archivos: magic bytes, timeouts, rate limiting y CORS por whitelist.
5. Migrar o revisar Multer 1.x y validar compatibilidad con una alternativa mantenida.
6. Añadir feedback de portapapeles y errores de descarga/copia en frontend.
7. Actualizar metadata, `lang`, README y guía real de despliegue.
8. Sustituir `console.log` por logger configurable.

## Cobertura de Pruebas

- **Tests existentes:** no se encontraron tests unitarios, integración ni E2E configurados en scripts o carpetas del proyecto.
- **Cobertura actual estimada:** sin cobertura automatizada medible.
- **Pruebas manuales ejecutadas en esta auditoría:** build, typecheck, auditoría npm, endpoints API positivos/negativos, SSR de producción y escenario producción sin backend.
- **Tests que faltan añadir:**
  - Unit tests de `getOutputText`, `getFallbackFileName`, validaciones de modo y helpers de backend.
  - Tests de API para `/api/transformfile` y `/api/transformfiles`: éxito, sin archivo, archivo inválido, modo inválido, exceso de tamaño y exceso de cantidad.
  - Tests de componentes para selección de opción, filtrado de PDFs, estados de error/loading y botones de descarga/copia.
  - E2E mínimo que levante UI + API y convierta un PDF fixture a Markdown/JSON.
  - Test de despliegue o smoke test Docker que verifique UI y backend disponibles.

## Conclusión

El proyecto compila y las conversiones básicas funcionan cuando el backend Express se ejecuta manualmente junto al frontend. Sin embargo, el estado no es apto para producción sin cambios: el `start`/Docker actual deja fuera el backend, por lo que el flujo principal de conversión falla en un despliegue estándar. Además, la ausencia de tests/lint y los riesgos de CORS/subida de archivos hacen que el proyecto necesite endurecimiento antes de usarlo con PDFs reales o usuarios externos.

Próximos pasos recomendados: corregir primero la arquitectura de despliegue UI+API, añadir pruebas de API del flujo de conversión y después abordar límites de recursos y seguridad básica.
