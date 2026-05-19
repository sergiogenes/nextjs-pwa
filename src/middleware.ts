import { withAuth } from "next-auth/middleware"

/**
 * Explicación Tutorial:
 * Hemos simplificado el middleware. En lugar de intentar excluir 
 * archivos técnicos con expresiones regulares complejas (que suelen fallar
 * con los parámetros _rsc de Next.js), simplemente le decimos qué 
 * páginas QUEREMOS proteger.
 */
export default withAuth({
  pages: {
    signIn: "/auth/signin",
  },
})

export const config = { 
  // Solo protegemos la Home. Las carpetas auth, api, y archivos de public
  // quedan libres por defecto. Esto es mucho más seguro para el Service Worker.
  matcher: ["/"] 
};
