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
    - Se configuraron estrategias de caché `StaleWhileRevalidate` para permitir que la Home cargue incluso con el servidor apagado.
    - Se ajustó el Service Worker para manejar peticiones de datos RSC (`_rsc`) de Next.js.

## Pendiente:
- Instalación e integración de TanStack Query (React Query) para optimizar estados de carga y revalidación de datos de servidor.
- Mejora de la UI para mostrar estados de sincronización más detallados.
- Optimización de Server Components para la carga inicial de datos.
