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
      // Las rutas de Auth NUNCA deben cachearse, siempre deben ir a red.
      // Si el servidor está caído, el código de cliente manejará el error.
      urlPattern: /\/api\/auth\/.*/,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'auth-api',
      }
    },
    {
      // Estrategia para páginas críticas: Intentar red, pero si falla o tarda, usar caché.
      urlPattern: /\/(auth\/signin|~offline|$)/,
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
