# Registro de Progreso

## [2026-05-14] Configuración Inicial de Seguimiento
- Se actualizó `GEMINI.md` para incluir la regla de registro de progreso.
- Se creó el archivo `progress.md` para centralizar el historial de avances del proyecto.
- Se actualizó `GEMINI.md` para hacer obligatorias las explicaciones detalladas (enfoque tutorial) y delegar la ejecución de comandos de consola al usuario.
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
    - **Optimización de Sesión Offline:**
        - Se configuró `SessionProvider` con `refetchOnWindowFocus: false` y `refetchWhenOffline: false` para evitar cierres de sesión accidentales sin red.
        - Se ajustó el `middleware.ts` para ser permisivo con la sesión en micro-cortes, evitando redirecciones forzadas al login.

## [2026-05-19] Consolidación de la Arquitectura PWA Estándar
- **Integración de TanStack Query:**
    - Configuración del `QueryClient` optimizado para modo "Offline-First" (retry: 0, refetchOnWindowFocus: false).
    - Implementación de **SSR e Hidratación** para una carga inicial instantánea (Zero-Loading-State).
    - Refactorización a una estructura híbrida de Server Components (`page.tsx`) y Client Components (`TasksView.tsx`).
- **Estandarización de Arquitectura (GEMINI.md):**
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
    - Optimización de la configuración de tests para ejecución secuencial (`workers: 1`), evitando colisiones en la base de datos local (IndexedDB).
- **Consultoría Arquitectónica para CRM (HubSpot):**
    - Análisis de viabilidad de WebSockets vs Webhooks en HubSpot.
    - Definición de estrategias para la protección de cuotas de API (Rate Limiting) mediante el uso de Dexie como buffer local.

## Pendiente:
- Mejora estética de los indicadores de sincronización (iconos de nubes, estados de carga).
- Documentación de despliegue final.

- Mejora estética de los indicadores de sincronización por cada tarea.
- Pruebas de carga y estrés de la sincronización offline-online masiva.
- Preparación de la documentación de despliegue final.
