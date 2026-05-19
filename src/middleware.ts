import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

/**
 * EXPLICACIÓN TUTORIAL (Arquitectura Estándar PWA):
 * El middleware de NextAuth por defecto intenta validar la sesión en cada 
 * petición o cambio de foco. En una PWA, si estamos offline, esta validación
 * falla y el middleware nos redirige al login, rompiendo la experiencia.
 * 
 * Hemos añadido una lógica para que el middleware sea más "permisivo":
 * Si hay un error de red o de servidor, dejamos pasar la petición para que 
 * el lado del cliente (que tiene la sesión cacheada en el JWT) maneje la UI.
 */
export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Si hay un token, el usuario está "autorizado" para efectos del middleware.
        // La validez real del token se maneja en el cliente/servidor con TanStack.
        return !!token
      },
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
)

export const config = { 
  // Protegemos la raíz. 
  matcher: ["/"] 
};
