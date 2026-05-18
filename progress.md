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

### Pendiente para el Lunes (Post-Mortem):
- Analizar la causa real de los problemas con el Service Worker: ¿Fue realmente la versión de Next.js (Turbopack en v16) o un problema en la forma de registrar el Service Worker inicialmente?
