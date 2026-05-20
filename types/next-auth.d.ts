import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * EXPLICACIÓN TUTORIAL:
   * Extendemos el tipo de sesión para incluir el campo 'id'.
   * Esto elimina la necesidad de usar 'any' al acceder a session.user.id.
   */
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
  }
}

declare module "next-auth/jwt" {
  /** Extendemos el JWT para que también tenga el ID */
  interface JWT {
    id: string
  }
}
