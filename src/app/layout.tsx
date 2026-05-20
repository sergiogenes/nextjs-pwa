import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import AuthProvider from '@/components/AuthProvider'
import ReactQueryProvider from '@/components/ReactQueryProvider'

export const metadata: Metadata = {
  title: 'PWA Tasks Tutorial',
  description: 'Aprendiendo PWA con Next.js 14',
  manifest: '/manifest.json',
  icons: {
    apple: '/icons/apple-touch-icon.png', // Para iPhone
    icon: '/icons/web-app-manifest-192x192.png', // Favicon estándar usando uno de los nuevos iconos
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PWA Tasks',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='es'>
      <body>
        {/* EXPLICACIÓN TUTORIAL:
            Configuramos AuthProvider (NextAuth) para que no sea agresivo.
            Desactivamos 'refetchOnWindowFocus' en su definición interna.
        */}
        <AuthProvider>
          <ReactQueryProvider>
            {children}
          </ReactQueryProvider>
          <ServiceWorkerRegistration />
        </AuthProvider>
      </body>
    </html>
  )
}
