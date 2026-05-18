'use client';

import { useEffect } from 'react';

/**
 * Explicación Tutorial:
 * Este es un componente de cliente que no renderiza nada visualmente,
 * pero se encarga de registrar el Service Worker en el navegador.
 * 
 * Lo separamos en un componente aparte porque el 'layout.tsx' principal
 * debe ser un Server Component para poder exportar los Metadatos (SEO/PWA).
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('✅ Service Worker registrado con éxito: ', registration.scope);
          })
          .catch((err) => {
            console.error('❌ Fallo al registrar el Service Worker: ', err);
          });
      });
    }
  }, []);

  return null; // No renderiza nada en la interfaz
}
