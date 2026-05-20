'use client';

import { SessionProvider } from 'next-auth/react';

/**
 * EXPLICACIÓN TUTORIAL (Arquitectura Estándar PWA):
 * Configuramos el <SessionProvider> para ser resiliente al modo offline.
 * 
 * Por defecto, NextAuth intenta revalidar la sesión cada vez que el usuario
 * vuelve a la pestaña (refetchOnWindowFocus). En una PWA, si estás offline,
 * esto causa una petición fallida que puede forzar un logout innecesario.
 * 
 * Al desactivar estas opciones, la app confía en el token JWT guardado en 
 * la cookie local mientras no haya red.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider 
      refetchOnWindowFocus={false} 
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  );
}
