<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Proyecto: Tutorial Next.js 14 PWA con Soporte Offline

Este proyecto es un tutorial interactivo diseñado para enseñar el desarrollo de aplicaciones web progresivas (PWA) utilizando Next.js 14.

## Objetivos Educativos
1.  **Arquitectura Next.js 14:** Uso profundo de App Router, Server Components y Server Actions. (En proceso)
2.  **Autenticación en PWA:** Manejo de sesiones persistentes y seguras con NextAuth.js, incluyendo registro de usuarios y hasheo de contraseñas. (Completado)
3.  **Resiliencia de Red (Offline):** Implementación de Service Workers para caché de activos y IndexedDB para persistencia de datos local. (Completado: Lógica Offline-First)
4.  **Sincronización:** Lógica para sincronizar datos locales con MongoDB cuando se recupera la conexión. (Completado: Sincronización bidireccional)
5.  **Gestión de Estado Avanzada:** Integración de TanStack Query para optimizar la comunicación con el servidor. (Pendiente)

## Stack Tecnológico
- **Framework:** Next.js 14 (App Router).
- **Estilos:** Tailwind CSS.
- **Base de Datos:** MongoDB (vía Mongoose).
- **Autenticación:** NextAuth.js (Auth.js).
- **Estado/Caché de Datos:** TanStack Query (React Query).
- **Persistencia Local:** IndexedDB (vía Dexie.js).
- **PWA:** `next-pwa` o Service Worker manual con Workbox.

## Arquitectura Offline-First Estándar (TanStack + Dexie)
> **Nota de Estandarización:** Este proyecto sirve como la base arquitectónica y de configuración de referencia para todas las futuras aplicaciones web progresivas (PWA) de la organización. El objetivo es proporcionar una estructura resiliente, de alto rendimiento y con una sincronización impecable entre el estado local y el servidor.

Para asegurar una sincronización robusta y evitar duplicidad de datos o redirecciones erróneas, el proyecto sigue estos principios:

1.  **Fuente de Verdad Única (UI):** La interfaz de usuario (`UI`) siempre lee de la base de datos local (**Dexie.js**). Nunca espera una respuesta del servidor para actualizarse.
2.  **Configuración de TanStack Query (Modo PWA):**
    *   `retry: 0`: Las mutaciones deben fallar rápido si no hay red; la sincronización posterior es responsabilidad del orquestador.
    *   `refetchOnWindowFocus: false`: Evita peticiones accidentales y errores de red al cambiar de pestaña en modo offline.
    *   `refetchOnReconnect: false`: La revalidación tras recuperar la conexión debe ser controlada manualmente por el orquestador para evitar condiciones de carrera.
3.  **Orquestador de Sincronización (`useSync`):** Es el único componente encargado de subir cambios locales pendientes de forma secuencial. Al finalizar una tanda de sincronización, es responsable de invalidar el caché de TanStack Query para refrescar la UI con datos confirmados del servidor.
4.  **Mutaciones Silenciosas:** Las acciones del usuario (crear, editar, borrar) actualizan Dexie inmediatamente y lanzan una mutación que captura cualquier error de red sin interrumpir la experiencia del usuario.
5.  **Health Check Polling (Recuperación Automática):** Para manejar estados de "Lie-Fi" (red conectada pero servidor inaccesible), el orquestador realiza pings periódicos a un endpoint de salud (`/api/health`) únicamente cuando existen tareas locales pendientes. Esto garantiza que la sincronización se reanude automáticamente en cuanto el servidor esté disponible.

## Reglas y Convenciones
- **Explicación Mandatoria (Enfoque Tutorial):** Al ser este proyecto una capacitación, cada cambio, línea de código modificada o paso realizado por la IA debe ir acompañado de una explicación detallada del "por qué" se hace y cómo funciona. El objetivo principal es que el usuario aprenda.
- **Ejecución Manual de Comandos:** Todos los comandos de consola (instalación de dependencias, scripts, etc.) deben ser proporcionados al usuario para que los ejecute manualmente. La IA NO debe usar herramientas de ejecución de shell. Cada comando sugerido debe incluir una explicación exacta de lo que realiza en el sistema.
- **Tipado Estricto (Cero 'any'):** Uso obligatorio de TypeScript para asegurar la integridad de los datos. Queda prohibido el uso de `any`; se deben utilizar interfaces, tipos específicos o `unknown`. Si una librería externa carece de tipos, se debe crear un archivo de declaración `.d.ts` en `/types`.
- **Estándares Modernos (ES Modules):** Utilizar exclusivamente sintaxis `import`/`export`. No mezclar con `require`, especialmente en archivos de configuración.
- **Componentes:** Separación clara entre Client Components (para interactividad y hooks de PWA) y Server Components (para obtención de datos inicial y SEO).
- **Surgical Updates:** Realizar cambios mínimos y precisos en los archivos existentes.
- **Validación con Linter (Obligatorio):** El código debe cumplir estrictamente con las reglas de ESLint configuradas. No se permiten variables no utilizadas, importaciones redundantes ni violaciones de tipado. El linter es el primer filtro de calidad antes de cualquier build o test.
- **Validación con Tests (Obligatorio):** Todo cambio significativo en la lógica de negocio, sincronización o autenticación debe incluir un test automatizado (Playwright) que valide el comportamiento tanto en modo online como offline. No se considera terminada una implementación si no cuenta con su respectiva validación E2E para prevenir regresiones.
- **Registro de Progreso:** Todo avance, hito o cambio significativo debe registrarse en el archivo `progress.md`.

## Estructura de Carpetas Sugerida
- `/app`: Rutas, páginas y layouts (App Router).
- `/components`: Componentes UI reutilizables (atómicos).
- `/lib`: Configuraciones de bases de datos, utilidades de red y lógica de sincronización.
- `/models`: Esquemas de Mongoose.
- `/hooks`: Hooks personalizados para el estado offline y sincronización.
- `/public`: Manifiesto, iconos y scripts del Service Worker.
