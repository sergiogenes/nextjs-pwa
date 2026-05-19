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

export interface LocalData {
  id?: string;        // ID real del CRM (ej. HubSpot 'vid' o 'dealid')
  tempId?: string;    // ID temporal (UUID) generado en el cliente para colisiones offline
  content: string;    // O un objeto con los campos del CRM
  synced: 0 | 1;      // Flag: ¿Ya está en el CRM?
  deleted: 0 | 1;     // Marcado para borrar en la próxima sincronización
  updatedAt: number;
}

export class MyDatabase extends Dexie {
  data!: Table<LocalData>;

  constructor() {
    super('MyAppDB');
    this.version(1).stores({
      data: '++tempId, id, synced, deleted' // Índices para búsqueda rápida
    });
  }
}
```

---

## 3. Orquestación de Sincronización (`useSync`)

El orquestador es un hook que se encarga de subir los cambios locales pendientes de forma secuencial y atómica.

### Estrategia de Sincronización
1.  **Filtro:** Obtiene registros locales donde `synced === 0`.
2.  **Secuencialidad:** Procesa uno por uno para mantener la integridad (importante en CRMs como HubSpot).
3.  **Resolución de IDs:** Al recibir la respuesta del servidor, actualiza el `tempId` por el `id` real y marca `synced: 1`.

### Solución al "Lie-Fi" y Servidor Caído (`/api/health`)
Para evitar intentos de sincronización fallidos que consuman batería o den errores, implementamos un **Health Check Polling**.

```typescript
// En useSync.ts
const checkServerHealth = async () => {
  try {
    const res = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
};

// Polling inteligente: Solo si hay tareas locales pendientes
useEffect(() => {
  if (hasPendingChanges) {
    const interval = setInterval(async () => {
      const isOnline = await checkServerHealth();
      if (isOnline) sync(); 
    }, 5000);
    return () => clearInterval(interval);
  }
}, [hasPendingChanges]);
```

---

## 4. Integración con TanStack Query (Modo PWA)

React Query se usa para la **hidratación inicial** (SSR) y para manejar el caché de lectura, pero con configuraciones específicas para no interferir con el modo offline.

### Configuración del Provider
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0, // Fallar rápido offline para no bloquear la UI
      refetchOnWindowFocus: false, 
      refetchOnReconnect: false, // El orquestador maneja la reconexión
      staleTime: Infinity, // Confiar en los datos de Dexie hasta que el orquestador diga lo contrario
    },
  },
});
```

---

## 5. Autenticación Resiliente (NextAuth)

En una PWA, el sistema de autenticación debe ser "permisivo" con los cortes de red para no expulsar al usuario innecesariamente.

### Optimización del Provider (`src/components/AuthProvider.tsx`)
```typescript
<SessionProvider 
  refetchOnWindowFocus={false} 
  refetchWhenOffline={false} // Evita intentos de validación fallidos sin red
>
  {children}
</SessionProvider>
```

### Middleware Permisivo (`src/middleware.ts`)
El middleware debe permitir el acceso a la app incluso si el servidor no puede validar el token en ese instante (confiando en el JWT local).
```typescript
export default withAuth(
  function middleware(req) { return NextResponse.next() },
  {
    callbacks: {
      authorized: ({ token }) => !!token // Si hay token local, se permite el acceso
    }
  }
)
```

---

## 6. Registro Robusto y Manejo de UI

### Recuperación de UI (Bfcache)
Cuando el usuario vuelve atrás en el navegador, este puede restaurar la página desde el caché (Bfcache) manteniendo estados de "Cargando". Usar el evento `pageshow` para limpiar la UI:
```typescript
window.addEventListener('pageshow', (event) => {
  setIsLoading(false); // Desbloquea botones de login, etc.
});
```

### Registro Manual del Service Worker
Recomendado para evitar problemas de hidratación en Next.js App Router (ver `src/components/ServiceWorkerRegistration.tsx`).

---

## 7. Estrategias del Service Worker (`next.config.mjs`)

El SW debe estar configurado para ser el "paracaídas" de la aplicación.

```javascript
runtimeCaching: [
  {
    // Manejo de datos de Next.js (RSC)
    urlPattern: /\/_next\/data\/.+\/.+\.json$|.*_rsc=.*/i,
    handler: 'StaleWhileRevalidate',
    options: { cacheName: 'next-data' }
  },
  {
    // Cache de páginas críticas (Home, Login)
    urlPattern: /\/($|auth\/signin)/,
    handler: 'StaleWhileRevalidate',
    options: { cacheName: 'pages-cache' }
  }
]
```

---

## 6. Consideraciones para CRM (HubSpot)

Al migrar esta arquitectura a un CRM:
1.  **Mapeo de Campos:** La base de datos local debe reflejar los esquemas de HubSpot (Contacts, Deals, etc.).
2.  **Rate Limiting:** El orquestador de sincronización debe respetar los límites de la API de HubSpot (ej. 10 peticiones por segundo).
3.  **Conflictos de Edición:** Usar `updatedAt` para determinar si un cambio local es más reciente que el del servidor (Last Write Wins) o avisar al usuario.

---

## 7. Flujo de Trabajo Estándar
1.  **Usuario realiza acción:** Se guarda en Dexie inmediatamente (`synced: 0`).
2.  **UI se actualiza:** Reactivity vía `useLiveQuery`.
3.  **Orquestador detecta cambio:** 
    *   ¿Hay red? Sincroniza.
    *   ¿No hay red? Espera y hace ping a `/api/health`.
4.  **Sincronización exitosa:** Se marca `synced: 1` y se invalida el caché de React Query para refrescar datos globales.
