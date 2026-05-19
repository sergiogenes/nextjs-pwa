'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

/**
 * Explicación Tutorial:
 * TanStack Query necesita un 'QueryClient' para gestionar el caché y el estado
 * de todas nuestras peticiones al servidor. 
 * 
 * Lo envolvemos en un componente de cliente porque el cliente debe ser 
 * persistente durante la vida de la aplicación. Usamos un estado (useState)
 * para asegurar que el cliente solo se cree una vez.
 */
export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  // Creamos el QueryClient con configuraciones por defecto
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // EXPLICACIÓN TUTORIAL:
        // 'staleTime' define cuánto tiempo los datos se consideran "frescos".
        staleTime: 60 * 1000,
        
        // ¡CAMBIO ARQUITECTÓNICO CRÍTICO PARA PWA!
        // 1. Desactivamos los reintentos automáticos (retry: 0).
        // Si falla por red, queremos que falle rápido y limpio.
        // Nuestro hook 'useSync' se encargará de reintentar de forma segura.
        retry: 0,
        
        // 2. Desactivamos refetchOnWindowFocus.
        // Evita que TanStack intente conectar solo por cambiar de pestaña,
        // lo cual causaba redirecciones erróneas a la página offline.
        refetchOnWindowFocus: false,
        
        // 3. Desactivamos refetchOnReconnect.
        // Evitamos que TanStack dispare peticiones concurrentes cuando
        // 'useSync' también está intentando subir los cambios pendientes.
        refetchOnReconnect: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Las Devtools nos ayudan a ver qué está pasando con el caché */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
