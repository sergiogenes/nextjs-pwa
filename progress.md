# Registro de Progreso

## [2026-05-14] Configuración Inicial de Seguimiento
- Se actualizó `AGENTS.md` para incluir la regla de registro de progreso.
- Se creó el archivo `progress.md` para centralizar el historial de avances del proyecto.
- Se actualizó `AGENTS.md` para hacer obligatorias las explicaciones detalladas (enfoque tutorial) y delegar la ejecución de comandos de consola al usuario.
- Se crearon los directorios base: `src/components`, `src/lib`, `src/models` y `src/hooks`.
- Se limpiaron los archivos `src/app/page.tsx` y `src/app/globals.css` para eliminar el boilerplate inicial.
- Se configuró `public/manifest.json` con los metadatos básicos de la PWA.
- Se actualizó `src/app/layout.tsx` para incluir el enlace al manifiesto y etiquetas meta para dispositivos móviles (viewport, theme-color).
- Se instalaron las dependencias base: `mongoose`, `dexie` y `lucide-react`.

## [2026-05-15] Persistencia de Datos y Tipado Estricto
- Se configuró la conexión a MongoDB en `src/lib/mongodb.ts` utilizando el patrón Singleton y tipado estricto con `declare global`.
- Se implementó la base de datos local IndexedDB con Dexie en `src/lib/db.ts`, incluyendo la interfaz `LocalTask` con el flag `synced` para soporte offline.
- Se instalaron las dependencias necesarias: `mongoose`, `dexie` y `lucide-react`.
- Se creó el modelo de datos `Task` en MongoDB (`src/models/Task.ts`) para sincronización con la nube.
- Se implementaron Server Actions (`src/lib/actions.ts`) con tipado estricto (cero `any`) para interactuar con MongoDB.
- Se desarrolló la interfaz principal (`src/app/page.tsx`) con actualización optimista y reactividad usando `useLiveQuery` de Dexie.
- Se creó el hook `useSync` para sincronización en segundo plano, manejando inteligentemente la creación y actualización de tareas offline.
- Se realizó un downgrade a Next.js 14 para asegurar la estabilidad del entorno y la compatibilidad con Tailwind CSS v3.
- Se configuró `next-pwa` y se implementó un registro manual del Service Worker (`src/components/ServiceWorkerRegistration.tsx`), logrando la funcionalidad offline total.
- Se ajustaron configuraciones de red (`mongodb.ts`) para permitir un fallo rápido (fail-fast) sin internet.

### [2026-05-18] Autenticación, Seguridad y Resiliencia Avanzada
- Se realizó un análisis post-mortem del Service Worker, confirmando la incompatibilidad de `next-pwa` con Turbopack (v15+).
- Se optimizó el `manifest.json` y `layout.tsx` con iconos correctos y propósitos `maskable`.
- Se implementó la sincronización bidireccional completa (subida y descarga/limpieza de datos locales).
- Se desarrolló el CRUD offline completo (creación, edición y eliminación) con estrategias de "Soft Delete" local.
- **Fase de Autenticación (NextAuth.js):**
    - Se configuró NextAuth con el proveedor de credenciales y sesiones JWT.
    - Se implementó el hasheo de contraseñas usando `bcryptjs` para máxima seguridad.
    - Se creó un sistema de registro de usuarios (`/auth/signup`) y una página de login personalizada (`/auth/signin`).
    - Se vincularon todas las tareas a IDs de usuario únicos en MongoDB y Dexie.
    - Se protegió la aplicación mediante un Middleware simplificado y compatible con PWA.
- **Resiliencia PWA Avanzada:**
    - Se implementó una página de "Offline Fallback" (`/~offline`) para evitar errores de conexión del navegador.
    - Se configuró el pre-cacheo forzado de la página offline mediante `additionalManifestEntries`.
    - Se corrigió el error de build en `next-pwa` asegurando el uso de `options` en todas las reglas de `runtimeCaching`.
    - Se implementó un manejo robusto de redirecciones y recuperación de UI (Bfcache) mediante el evento `pageshow`.
    - Se configuraron estrategias de caché `StaleWhileRevalidate` para permitir que la Home y Login carguen incluso con el servidor apagado.
    - Se ajustó el Service Worker para manejar peticiones de datos RSC (`_rsc`) de Next.js.
    - **Optimización de Sesión Offline (Continuación):**
            - Se configuró `SessionProvider` con `refetchOnWindowFocus: false` y `refetchWhenOffline: false` para evitar cierres de sesión accidentales sin red.
            - Se ajustó el `middleware.ts` para ser permisivo con la sesión en micro-cortes, evitando redirecciones forzadas al login.
            - **[NUEVO] Persistencia de Sesión en Modo Avión:** Se implementó una estrategia de caché `StaleWhileRevalidate` específica para el endpoint `/api/auth/session` en el Service Worker, permitiendo que la identidad del usuario persista incluso tras recargas en modo offline.

    ## [2026-05-20] Consolidación de la Arquitectura PWA Estándar
- **Integración de TanStack Query:**
    - Configuración del `QueryClient` optimizado para modo "Offline-First" (retry: 0, refetchOnWindowFocus: false).
    - Implementación de **SSR e Hidratación** para una carga inicial instantánea (Zero-Loading-State).
    - Refactorización a una estructura híbrida de Server Components (`page.tsx`) y Client Components (`TasksView.tsx`).
- **Estandarización de Arquitectura (AGENTS.md):**
    - Se definió formalmente el patrón "Offline-First con Orquestador" para futuros proyectos.
    - Establecimiento de Dexie como única fuente de verdad para la UI.
- **Sincronización Autónoma y Resiliente:**
    - Refactorización de `useSync` con protección contra ejecuciones concurrentes y sincronización secuencial.
    - Implementación de **Health Check Polling** (`/api/health`) para recuperación automática tras caídas del servidorbackend (solución al problema del Lie-Fi).
    - Eliminación de duplicidad de datos mediante el manejo coordinado de IDs temporales (Dexie) y reales (MongoDB) en mutaciones.
- Creación del documento `ARCH_BLUEPRINT.md` detallando la arquitectura escalable (incluyendo consideraciones para integraciones sin DB intermedia, como CRMs tipo HubSpot).
- Se analizó el comportamiento del Logout offline (redirección a `/~offline`) y se decidió mantenerlo por seguridad.
- **Implementación de Testing E2E con Playwright:**
- Configuración de Playwright para simulación de estados de red (Offline/Online).
- Desarrollo de un "Super-Test" de resiliencia que valida el flujo CRUD completo (Creación, Edición y Borrado) en modo offline y su posterior sincronización.
- **[NUEVO] Test de Persistencia de Sesión:** Creación de un test específico (`session-persistence.spec.ts`) para validar que la identidad del usuario se mantiene tras recargas en modo avión.
- **[NUEVO] Automatización de Calidad:** Se modificó la estrategia de testing continuo. Se separó el Linting (`prebuild`) de las pruebas E2E. Las pruebas con Playwright ahora se ejecutan en el script `postbuild` levantando un servidor de producción (`npm run start`), garantizando que características nativas de PWA como el Service Worker y el Offline Fallback sean testeadas en el entorno correcto.
- **[NUEVO] Refactorización de Tipado y Limpieza (Lint):** Se eliminaron todos los usos de `any` en la lógica de autenticación y sincronización, se eliminaron variables no utilizadas y se configuraron archivos de declaración de tipos (`.d.ts`) para NextAuth, garantizando un build libre de advertencias y errores.
- **[NUEVO] Robustez PWA y Testing:** 
    - Se optimizó `ServiceWorkerRegistration.tsx` eliminando el bloqueo del evento `load` para asegurar el registro en SPAs.
    - Se incrementaron los timeouts de Playwright y se añadió lógica de espera explícita para el Service Worker en los tests de persistencia.
- **[NUEVO] Pipeline de CI/CD (GitHub Actions):** 
    - Implementación de un flujo de integración continua que ejecuta Linter, Build y Tests E2E en una máquina virtual de Ubuntu.
    - Configuración de un servicio de MongoDB real dentro del pipeline para validación de datos fidedigna.
    - Optimización del script `postbuild` para omitir tests en Vercel, garantizando despliegues rápidos mientras se mantiene la seguridad en los Pull Requests.
    - **[NUEVO] Enfoque en Chromium:** Se optimizó Playwright y el workflow de GitHub para ejecutar tests exclusivamente en Chromium, reduciendo el tiempo de ejecución a un tercio sin comprometer la validación principal del negocio.
    - **[NUEVO] Robustez en CI (GitHub Actions):** Se implementó una lógica de "Auto-Registro Silencioso" en los tests de Playwright. Esto permite que los tests funcionen correctamente en entornos de CI donde la base de datos MongoDB está inicialmente vacía, registrando al usuario de prueba automáticamente si el primer intento de login falla.
    - **[NUEVO] Aislamiento de Entorno de Test:** Se creó el archivo `.env.test` y se configuró `playwright.config.ts` para cargarlo automáticamente. Se añadió la dependencia `dotenv` para permitir la carga de variables de entorno personalizadas en los tests.
    - **[NUEVO] Sincronización de Sesión Post-Login:** Se reemplazó la navegación del cliente (`router.push`) por una navegación de documento completa (`window.location.href`) en el proceso de inicio de sesión. Esto garantiza que el Service Worker y los proveedores de contexto (NextAuth, React Query) se sincronicen correctamente con la nueva cookie de sesión, evitando estados de UI vacíos tras el login.
- Optimización de la configuración de tests para ejecución secuencial (`workers: 1`), evitando colisiones en la base de datos local (IndexedDB).
- **Consultoría Arquitectónica para CRM (HubSpot):**
    - Análisis de viabilidad de WebSockets vs Webhooks en HubSpot.
    - Definición de estrategias para la protección de cuotas de API (Rate Limiting) mediante el uso de Dexie como buffer local.

## [2026-05-21] Migración a Antigravity CLI y Estructura Agnóstica
- Se migró el entorno de desarrollo y reglas de la IA de Gemini CLI a Antigravity CLI.
- Se unificaron y simplificaron las reglas generales del framework y las convenciones del tutorial PWA en un único punto de entrada: `AGENTS.md`.
- Se eliminó el archivo de configuración redundante `GEMINI.md`.
- Se creó el directorio `docs/plans/` para conservar copias de los planes de implementación e historial de migración en el repositorio.

## Pendiente:
- Mejora estética de los indicadores de sincronización (iconos de nubes, estados de carga).
- Documentación de despliegue final.

- Mejora estética de los indicadores de sincronización por cada tarea.
- Pruebas de carga y estrés de la sincronización offline-online masiva.
- Preparación de la documentación de despliegue final.
