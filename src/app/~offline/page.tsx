'use client';

import { WifiOff, RotateCw } from 'lucide-react';
import Link from 'next/link';

/**
 * Explicación Tutorial:
 * Esta página es especial. 'next-pwa' la busca para mostrarla
 * cuando no hay conexión de red Y el recurso solicitado no está en el caché.
 * Evita el famoso error "ERR_CONNECTION_REFUSED" del navegador.
 * 
 * Usamos 'use client' porque el botón de reintento necesita JavaScript (interactividad).
 */
export default function OfflinePage() {
  // EXPLICACIÓN TUTORIAL:
  // El botón de reintento ahora es más inteligente. Si venimos de un error
  // en el login, 'window.location.reload()' simplemente recargaría la página
  // de offline. Al usar 'window.history.back()', intentamos volver a la página
  // donde el usuario estaba intentando realizar la acción.
  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="text-amber-600" size={40} />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Ups, parece que no hay respuesta
        </h1>
        <p className="text-slate-500 mb-8">
          No podemos conectar con el servidor en este momento. Puede que estés sin internet o que nuestro servidor esté descansando.
        </p>

        <div className="space-y-4">
          <button 
            onClick={handleRetry}
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-all"
          >
            <RotateCw size={20} />
            Reintentar ahora
          </button>
          
          <Link 
            href="/"
            className="block text-sm text-slate-400 hover:text-blue-600 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
