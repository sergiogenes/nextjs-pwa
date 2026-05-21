# Blueprint Arquitectónico: PWA Offline-First de Alto Rendimiento
## (Next.js 14 + TanStack Query + Dexie.js + NextAuth)

Este documento detalla la arquitectura de referencia para construir aplicaciones web progresivas (PWA) resilientes, capaces de operar sin conexión y sincronizarse de forma inteligente. Esta estructura fue validada en el proyecto `nextjs-pwa` y está diseñada para ser escalable a integraciones complejas (ej. CRM HubSpot).

---

## 1. Stack Tecnológico Base
*   **Framework:** Next.js 14 (App Router).
*   **Base de Datos Local (SSOT):** Dexie.js (Wrapper de IndexedDB).
*   **Base de Datos Servidor:** APIs externas (HubSpot, Salesforce) **o** Base de Datos propia (MongoDB, PostgreSQL).
    *   *Nota Arquitectónica:* El uso de una base de datos propia es **opcional** dependiendo de las necesidades del cliente:
        *   **Enfoque "DB-less" (Directo a API):** Recomendado si la PWA es solo un espejo del CRM. Las Server Actions funcionan como un puente directo (`Dexie <-> API HubSpot`). Reduce costes e infraestructura.
        *   **Enfoque con DB Intermedia:** Recomendado si la API del CRM es lenta, tiene límites de peticiones (Rate Limits) muy estrictos, o si se necesita almacenar información extra que el CRM no soporta (ej. logs, configuraciones de UI).

---

## 2. El Corazón: La Fuente Única de Verdad (SSOT)

En esta arquitectura, **la UI nunca lee directamente del servidor ni de la API externa**. La UI observa la base de datos local (Dexie). Esto garantiza latencia cero y funcionamiento offline total.

### Ejemplo de Configuración de Dexie (`src/lib/db.ts`)
```typescript
import Dexie, { Table } from 'dexie';

export interface LocalTask {
  id?: string;         // ID real del backend/CRM (UUID o número de HubSpot)
  tempId?: string;     // ID temporal único de cliente para evitar colisiones
  userId: string;      // Vinculación de sesión
  title: string;
  completed: boolean;
  deleted?: boolean;   // Soft Delete local para sincronización
  synced: boolean;     // Estado de sincronización en la nube
  syncError?: string;  // Detalle si la API del servidor rechaza el registro (ej: 400 Bad Request)
  createdAt: number;
}

export class PWAResilientDatabase extends Dexie {
  tasks!: Table<LocalTask>;

  constructor() {
    super('PWAResilientDB');
    this.version(1).stores({
      tasks: 'id, tempId, userId, synced, deleted' // Índices para búsquedas y consultas reactivas rápidas
    });
  }
}

export const localDb = new PWAResilientDatabase();
```

---

## 3. Orquestación de Sincronización (`useSync`)

El orquestador es un hook que se encarga de subir los cambios locales pendientes de forma secuencial y atómica.

### Estrategia de Sincronización
1.  **Filtro:** Obtiene registros locales donde `synced === false`.
2.  **Secuencialidad:** Procesa uno por uno en lugar de paralelizar. Esto previene colisiones de ID, inconsistencias lógicas en el servidor y cuellos de botella de Rate Limiting en APIs externas.
3.  **Resolución de IDs:** Al recibir la respuesta del servidor, borra el registro temporal si correspondía a un `tempId` y añade el definitivo, o bien actualiza el estado marcando `synced: true`.

### Solución al "Lie-Fi" y Servidor Caído (`/api/health`)
Para evitar intentos de sincronización fallidos que consuman recursos o provoquen excepciones de red, implementamos un **Health Check Polling** periódico que monitoriza un endpoint ultraligero (`/api/health`) únicamente cuando existen tareas pendientes de subida en local.

```typescript
// Polling inteligente: Solo si hay tareas locales pendientes e internet reportado
useEffect(() => {
  if (status !== 'authenticated' || !userId) return;

  const checkServerAndSync = async () => {
    if (!navigator.onLine) return; // Evita consumo innecesario

    const pendingCount = await localDb.tasks
      .filter(t => t.synced === false && t.userId === userId)
      .count();

    if (pendingCount > 0) {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          syncTasks();
        }
      } catch {
        // Servidor inalcanzable temporalmente, esperar al próximo intervalo
      }
    }
  };

  const intervalId = setInterval(checkServerAndSync, 15000); // Polling cada 15 segundos
  window.addEventListener('online', syncTasks); // Sincronización inmediata al reactivar Wifi
  syncTasks(); // Ejecución inicial

  return () => {
    clearInterval(intervalId);
    window.removeEventListener('online', syncTasks);
  }
}, [status, userId, syncTasks]);
```

---

## 4. Diseño de Interfaz de Usuario Reactiva y Responsiva (UI)

La UI debe reflejar fielmente la sincronización sin degradar la experiencia de usuario.

### Mapeo Dinámico de Estados en UI
Para mostrar badges estéticos (como nubes animadas) diferenciando el estado exacto del registro, cruzamos la información local con la cola del orquestador:

```typescript
const isSyncingInQueue = syncingTaskIds.includes(task.id!);
const isCreating = createMutation.isPending && createMutation.variables?.tempId === task.id;
const isUpdating = updateMutation.isPending && updateMutation.variables?.id === task.id;
const isDeleting = deleteMutation.isPending && deleteMutation.variables === task.id;
const isTaskSyncing = isSyncingInQueue || isCreating || isUpdating || isDeleting;
```

### Visualización y Responsividad:
* **Escritorio/Tablet:** Mostrar icono + texto descriptivo ("Sincronizado", "Local", "Sincronizando").
* **Móviles (hidden md:inline):** Ocultar los textos y pintar únicamente los iconos representativos (`Cloud`, `CloudOff`, `CloudUpload` animado) para no congestionar la vista móvil.

---

## 5. Integración con TanStack Query (Modo PWA)

React Query se usa para la **hidratación inicial** (SSR) y para manejar el caché de lectura, pero con configuraciones específicas para no interferir con el modo offline.

### Configuración del Provider
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,                   // Fallar rápido offline para no colgar la UI con llamadas infinitas
      refetchOnWindowFocus: false, // Evitar peticiones accidentales al cambiar de pestaña offline
      refetchOnReconnect: false,   // La revalidación de conexión la maneja manualmente el orquestador
      staleTime: Infinity,        // Confiar en los datos de Dexie hasta que el orquestador actualice e invalide el caché
    },
  },
});
```

---

## 6. Autenticación Resiliente (NextAuth) y Seguridad

En una PWA, el sistema de autenticación debe ser "permisivo" con los cortes de red y persistente en modo avión, resguardando siempre la seguridad del lado del servidor.

### A. Middleware Tolerante a Desconexiones (`src/middleware.ts`)
Para evitar que NextAuth expulse al usuario redirigiéndolo al login al perder la conexión, se debe permitir el paso a nivel de red validando únicamente la presencia del token:

```typescript
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Pasa el filtro de red si existe sesión previa
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
)
```

### B. Optimización del Provider (`src/components/AuthProvider.tsx`)
```typescript
<SessionProvider 
  refetchOnWindowFocus={false} 
  refetchWhenOffline={false} // Evita intentos fallidos de re-verificación de sesión sin conexión
>
  {children}
</SessionProvider>
```

### C. Encriptación Segura de Contraseñas (`bcryptjs`)
Las credenciales del usuario siempre deben almacenarse con un algoritmo de hasheo con salting de una vía, tanto en el registro como en el login:

* **Hasheo durante el Registro:**
  Generamos un hash criptográfico con 10 rondas de seguridad antes de persistir el registro en el servidor:
  ```typescript
  import bcrypt from 'bcryptjs';

  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hashedPassword });
  ```

* **Comparación durante la Autenticación:**
  Al verificar el inicio de sesión, comparamos la contraseña ingresada en texto plano contra el hash almacenado mediante la función nativa de comparación segura de `bcryptjs`:
  ```typescript
  import bcrypt from 'bcryptjs';

  // Dentro de authorize() de NextAuth Credentials Provider
  const isValid = await bcrypt.compare(credentials.password, user.password);
  if (!isValid) throw new Error('Contraseña incorrecta');
  ```

### D. Persistencia Offline de Sesión
Para evitar cierres de sesión del usuario al recargar la página en modo avión, el Service Worker intercepta y cachea el endpoint de NextAuth:
* **Endpoint:** `/api/auth/session`
* **Estrategia:** `StaleWhileRevalidate`
* **Resultado:** Sirve la última sesión válida de forma instantánea.

---

## 7. Integración con CRMs Externos (Caso de Estudio: HubSpot)

Cuando la PWA se comunica con un CRM como HubSpot de forma offline-online directa, deben aplicarse los siguientes patrones:

### A. Control de Rate Limiting (Rate Limit Buffer)
Las APIs de HubSpot tienen límites estrictos de peticiones (ej. de 10 a 150 requests por segundo).
* **Solución:** El orquestador de `useSync` procesa la cola local de Dexie secuencialmente mediante bucles `for...of` usando esperas programadas (ej. 100ms de retraso entre llamadas si el volumen es grande) en lugar de un `Promise.all` masivo.

### B. Jerarquía de Creación y Dependencias de Claves
En un CRM es común crear un Contacto y asociarlo a una Empresa y a una Tarea. Offline, el usuario puede crear todo a la vez.
* **Patrón de Sincronización en Cascada:**
  1. La cola sube primero las **Empresas** offline y obtiene sus IDs reales de HubSpot.
  2. Sustituye las referencias de empresa temporales por los IDs reales en los **Contactos** de Dexie.
  3. Sube los **Contactos** y obtiene sus IDs reales de HubSpot.
  4. Actualiza las **Tareas** asociadas con los IDs reales de contactos y empresas.
  5. Sube las **Tareas** y asocia las relaciones.

### C. Clasificación de Errores de API (Filtrado de Bloqueos)
No todos los errores del servidor son transitorios (red caída).
* **Errores Transitorios (503 Service Unavailable, 429 Too Many Requests, Red caída):** El orquestador aborta la cola y la mantiene intacta para reintentar más tarde.
* **Errores de Lógica / Permanentes (400 Bad Request, 409 Conflict - ej: contacto ya existe con ese email):** La API de HubSpot los rechazará siempre. Reintentar bloquearía la cola infinitamente.
  * **Acción:** Capturar el error, marcar en Dexie `synced: true` (para sacarlo de la cola activa) pero asignar la propiedad `syncError: "Email duplicado en HubSpot"`. La UI debe pintar una alerta visual en este elemento para permitir al usuario corregir el dato localmente y volver a disparar el cambio.

---

## 8. Estrategias del Service Worker (`next.config.mjs`)

El SW actúa como caché de fallback para los recursos estáticos y de datos de Next.js.

```javascript
runtimeCaching: [
  {
    // Las llamadas críticas de login y registro NUNCA deben cachearse por seguridad
    urlPattern: /\/api\/auth\/(signin|signout|callback|signup).*/,
    handler: 'NetworkOnly',
    options: { cacheName: 'auth-api-critical' }
  },
  {
    // Persistencia de Sesión (Crítico para Offline)
    urlPattern: /\/api\/auth\/session/,
    handler: 'StaleWhileRevalidate',
    options: { 
      cacheName: 'auth-session',
      expiration: { maxEntries: 1, maxAgeSeconds: 7 * 24 * 60 * 60 } // Máximo 1 entrada activa
    }
  },
  {
    // Manejo de datos de Next.js (RSC)
    urlPattern: /\/_next\/data\/.+\/.+\.json$|.*_rsc=.*/i,
    handler: 'StaleWhileRevalidate',
    options: { cacheName: 'next-data' }
  },
  {
    // Cache de páginas críticas (Home, Login, Offline Fallback)
    urlPattern: /\/(auth\/signin|~offline|(\?.*)?$)/,
    handler: 'StaleWhileRevalidate',
    options: { cacheName: 'pages-cache' }
  }
]
```

### Lógica del Offline Fallback (`src/app/~offline/page.tsx`)
Para evitar recargas infinitas e inútiles en la página offline, se debe usar el historial del navegador:
```typescript
const handleRetry = () => {
  if (typeof window !== 'undefined') {
    if (window.history.length > 1) {
      window.history.back(); // Intenta regresar a la vista donde ocurrió la acción
    } else {
      window.location.href = '/';
    }
  }
};
```

---

## 9. Cultura de Calidad y Resiliencia (Testing de Estrés)

Toda modificación en la lógica offline-online o autenticación debe validarse mediante una suite automatizada (Playwright).

* **Aislamiento en Bases de Datos:** En tests automatizados masivos, inicializar cada prueba con un usuario con correo dinámico único (ej. `test-bulk-[timestamp]@example.com`). Esto previene que ejecuciones previas contaminen MongoDB o alteren los conteos en pantalla.
* **Validación de Lie-Fi:** Ejecutar pruebas de corte de red intermitente (`context.setOffline(true/false)`) a mitad de cola para verificar que la aplicación no duplica registros tras recuperar la conexión.
* **Aserciones Resilientes:** Usar expresiones regulares en los textos de verificación de la UI (`page.getByTitle(/sincronizado/i)`) para tolerar cambios visuales o de copywriting sin romper la suite de integración.
* **Higiene:** Es obligatorio limpiar el estado local (`IndexedDB`, `Cookies`, `LocalStorage`) en el setup de cada caso de prueba.

---
*Este documento es dinámico y constituye el estándar de desarrollo de PWA de la organización.*
