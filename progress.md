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

## [2026-05-19] Integración de TanStack Query
- Instalación de dependencias: `@tanstack/react-query` y `@tanstack/react-query-devtools`.
- Creación de `src/components/ReactQueryProvider.tsx` para centralizar la configuración del `QueryClient`.
- Configuración global de reintentos (2) y revalidación en foco de ventana.
- Integración del proveedor en el `RootLayout` para disponibilidad en toda la app.
- **Implementación de `useQuery`:** Gestión centralizada de la carga de tareas desde MongoDB con sincronización reactiva hacia IndexedDB.
- **Refactorización con `useMutation`:**
    - Implementación de mutaciones para Crear, Actualizar y Borrar.
    - Estrategia de **Actualización Optimista:** La UI responde instantáneamente en local (Dexie) mientras la mutación se procesa en segundo plano.
    - Invalidación de caché automática tras mutaciones exitosas para asegurar la integridad de los datos.
    - Eliminación de estados de carga manuales (`useState`) en favor de los estados nativos de TanStack Query (`isPending`, `isFetching`).

## Pendiente:
- Mejora de la UI para mostrar estados de sincronización más detallados (ej: indicador de "Sincronizado" vs "Pendiente" por cada tarea).
- Optimización de Server Components para la carga inicial de datos.
- Pruebas de carga y estrés de la sincronización offline-online masiva.
