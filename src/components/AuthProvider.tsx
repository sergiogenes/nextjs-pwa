'use client';

import { SessionProvider } from 'next-auth/react';

/**
 * Explicación Tutorial:
 * NextAuth provee un <SessionProvider> que utiliza React Context para
 * compartir la información del usuario logueado con toda la app.
 * 
 * Como React Context solo funciona en el lado del cliente (Navegador),
 * tenemos que crear este componente intermediario con 'use client'
 * para poder envolver nuestra aplicación en el layout principal (que es de servidor).
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
