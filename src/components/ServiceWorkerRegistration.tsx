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
    // EXPLICACIÓN TUTORIAL:
    // Eliminamos el listener de 'load' porque en Next.js el componente puede 
    // montarse después de que la página ya esté cargada, haciendo que el 
    // registro nunca se dispare. Registramos directamente en el useEffect.
    if ('serviceWorker' in navigator) {
      // Permitimos el registro en producción O si estamos en un entorno de tests
      const isProd = process.env.NODE_ENV === 'production';
      const isTest = process.env.NEXT_PUBLIC_TEST_ENV === 'true';

      if (isProd || isTest) {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('✅ Service Worker registrado con éxito: ', registration.scope);
          })
          .catch((err) => {
            console.error('❌ Fallo al registrar el Service Worker: ', err);
          });
      }
    }
  }, []);

  return null;
}
