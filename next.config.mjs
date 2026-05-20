import withPWAInit from 'next-pwa'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Aquí tus configuraciones normales de Next.js
  reactStrictMode: true,
}

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/app-build-manifest\.json$/, /middleware-manifest\.json$/],
  // EXPLICACIÓN TUTORIAL:
  // Forzamos que la página offline se descargue y guarde en el caché
  // nada más instalarse el Service Worker. Sin esto, si el servidor se cae
  // y nunca visitamos la página offline, el SW no tendría nada que mostrar.
  additionalManifestEntries: [
    { url: '/~offline', revision: Date.now().toString() }
  ],
  fallbacks: {
    document: '/~offline', 
  },
  runtimeCaching: [
    {
      // EXPLICACIÓN TUTORIAL:
      // Las rutas de Auth que requieren servidor (login, logout, callback)
      // NUNCA deben cachearse. Deben ir siempre a red por seguridad.
      urlPattern: /\/api\/auth\/(signin|signout|callback|signup).*/,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'auth-api-critical',
      }
    },
    {
      // EXPLICACIÓN TUTORIAL:
      // Para que la sesión persista en modo avión, cacheamos el endpoint de session.
      // 'StaleWhileRevalidate' servirá la sesión guardada instantáneamente 
      // mientras intenta actualizarla en segundo plano si hay red.
      urlPattern: /\/api\/auth\/session/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'auth-session',
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 semana
        },
      },
    },
    {
      // Estrategia para páginas críticas: Intentar red, pero si falla o tarda, usar caché.
      // EXPLICACIÓN TUTORIAL: Mejoramos la regex para capturar la raíz (/) 
      // incluso si tiene parámetros de búsqueda (ej. ?_rsc=...)
      urlPattern: /\/(auth\/signin|~offline|(\?.*)?$)/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'pages-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      // Estrategia para los datos de Next.js (_rsc)
      urlPattern: /\/_next\/data\/.+\/.+\.json$|.*_rsc=.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-data',
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|otf)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
  ],
})

export default withPWA(nextConfig)
