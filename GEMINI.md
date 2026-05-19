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

## Reglas y Convenciones
- **Explicación Mandatoria (Enfoque Tutorial):** Al ser este proyecto una capacitación, cada cambio, línea de código modificada o paso realizado por la IA debe ir acompañado de una explicación detallada del "por qué" se hace y cómo funciona. El objetivo principal es que el usuario aprenda.
- **Ejecución Manual de Comandos:** Todos los comandos de consola (instalación de dependencias, scripts, etc.) deben ser proporcionados al usuario para que los ejecute manualmente. La IA NO debe usar herramientas de ejecución de shell. Cada comando sugerido debe incluir una explicación exacta de lo que realiza en el sistema.
- **Tipado Estricto (Cero 'any'):** Uso obligatorio de TypeScript para asegurar la integridad de los datos. Queda prohibido el uso de `any`; se deben utilizar interfaces, tipos específicos o `unknown`. Si una librería externa carece de tipos, se debe crear un archivo de declaración `.d.ts` en `/types`.
- **Estándares Modernos (ES Modules):** Utilizar exclusivamente sintaxis `import`/`export`. No mezclar con `require`, especialmente en archivos de configuración.
- **Componentes:** Separación clara entre Client Components (para interactividad y hooks de PWA) y Server Components (para obtención de datos inicial y SEO).
- **Surgical Updates:** Realizar cambios mínimos y precisos en los archivos existentes.
- **Registro de Progreso:** Todo avance, hito o cambio significativo debe registrarse en el archivo `progress.md`.

## Estructura de Carpetas Sugerida
- `/app`: Rutas, páginas y layouts (App Router).
- `/components`: Componentes UI reutilizables (atómicos).
- `/lib`: Configuraciones de bases de datos, utilidades de red y lógica de sincronización.
- `/models`: Esquemas de Mongoose.
- `/hooks`: Hooks personalizados para el estado offline y sincronización.
- `/public`: Manifiesto, iconos y scripts del Service Worker.
