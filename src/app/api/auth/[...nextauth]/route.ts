import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs"; // <--- NUEVO

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Cuenta de Usuario",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "tu@ejemplo.com" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        await dbConnect();
        const user = await User.findOne({ email: credentials.email });

        if (!user) return null;

        // EXPLICACIÓN TUTORIAL:
        // Usamos bcrypt.compare para verificar si la contraseña introducida
        // coincide con el hash indescifrable que tenemos en la base de datos.
        const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);

        if (isPasswordCorrect) {
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
          };
        }
        return null;
      }
    })
  ],
  callbacks: {
    // EXPLICACIÓN TUTORIAL:
    // Los callbacks nos permiten inyectar el ID del usuario en el token y la sesión
    // para que podamos usarlo luego en las Server Actions.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
});

// En Next.js 14 (App Router), necesitamos exportar el handler como GET y POST
// para que la misma ruta maneje tanto las peticiones de ver la página de login
// como las peticiones de enviar el formulario.
export { handler as GET, handler as POST };
