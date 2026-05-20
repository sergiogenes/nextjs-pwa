'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Loader2, AlertCircle, WifiOff } from 'lucide-react';
import Link from 'next/link';

/**
 * Explicación Tutorial:
 * Hemos mejorado esta página para manejar estados de red.
 * Una PWA debe informar al usuario si una acción (como el Login)
 * es imposible de realizar sin conexión a internet.
 */
export default function SignInPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const router = useRouter();

  // EXPLICACIÓN TUTORIAL:
  // Usamos el evento 'pageshow' para detectar cuando el usuario vuelve 
  // atrás (Back button o history.back()). El navegador a veces restaura
  // la página desde el 'Bfcache', manteniendo el estado 'isLoading' en true.
  // Esto asegura que el botón siempre se desbloquee al regresar.
  useEffect(() => {
    const handlePageShow = () => {
      setIsLoading(false);
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('pageshow', handlePageShow);
    
    // Sincronización inicial
    setIsOnline(navigator.onLine);
    setIsLoading(false);

    const handleOnline = () => {
      setIsOnline(true);
      setIsLoading(false);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) return; // Seguridad extra

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: username,
        password,
        redirect: false,
      });

      if (result?.error) {
        // EXPLICACIÓN TUTORIAL:
        // Si hay un fallo de red detectado por NextAuth, forzamos una navegación 
        // de documento completa. Esto garantiza que el Service Worker intercepte
        // la petición y sirva el Fallback Offline.
        if (result.error === 'FetchError' || result.error === 'Network Error') {
           window.location.href = '/~offline';
           return;
        }
        setError('Credenciales inválidas. Verifica tu email y contraseña.');
        setIsLoading(false);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      // EXPLICACIÓN TUTORIAL:
      // ERR_CONNECTION_REFUSED entra aquí. Usamos window.location.href para 
      // disparar el fallback de documento del Service Worker.
      console.error('Error de conexión:', err);
      window.location.href = '/~offline';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <LogIn className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Bienvenido de nuevo</h1>
          <p className="text-slate-500">Inicia sesión en PWA Tasks</p>
        </div>

        {/* MENSAJE DE ESTADO OFFLINE */}
        {!isOnline && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
            <WifiOff size={24} />
            <p className="text-sm font-medium">
              Estás offline. Necesitas conexión a internet para iniciar sesión.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-slate-50"
              placeholder="tu@ejemplo.com"
              required
              disabled={!isOnline || isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-slate-50"
              placeholder="Introduce tu contraseña"
              required
              disabled={!isOnline || isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm border border-red-100">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !isOnline}
            className={`w-full p-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
              isOnline 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : (
              <>
                <span>{isOnline ? 'Entrar' : 'Sin conexión'}</span>
                <LogIn size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            ¿No tienes cuenta?{' '}
            <Link href="/auth/signup" className={`font-bold hover:underline ${isOnline ? 'text-blue-600' : 'text-slate-400 pointer-events-none'}`}>
              Regístrate aquí
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-50 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold italic">
            Zona de Seguridad PWA
          </p>
        </div>
      </div>
    </div>
  );
}
