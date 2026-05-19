import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { fetchTasksFromDB } from "@/lib/actions";
import TasksView from "@/components/TasksView";

/**
 * EXPLICACIÓN TUTORIAL (Arquitectura Estándar PWA - SSR):
 * Este es ahora un Server Component. Es el "Cargador" de la aplicación.
 * 
 * 1. Seguridad: Verificamos la sesión directamente en el servidor. Si no hay,
 *    redireccionamos instantáneamente antes de enviar un solo byte al cliente.
 * 2. Pre-fetching: Creamos un QueryClient, traemos los datos de MongoDB y los
 *    "deshidratamos".
 * 3. Hidratación: Pasamos ese estado al componente de cliente (TasksView).
 */
export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Redirección de servidor (Mucho más rápida que en el cliente)
  if (!session) {
    redirect("/auth/signin");
  }

  const userId = (session.user as any).id;
  const queryClient = new QueryClient();

  // EXPLICACIÓN TUTORIAL:
  // Ejecutamos la petición al servidor ANTES de que el usuario vea nada.
  // Esto elimina el parpadeo de carga inicial.
  await queryClient.prefetchQuery({
    queryKey: ["tasks", userId],
    queryFn: () => fetchTasksFromDB(userId),
  });

  return (
    // EXPLICACIÓN TUTORIAL:
    // HydrationBoundary toma los datos que acabamos de traer y los inyecta
    // en el caché de TanStack Query del lado del cliente.
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TasksView />
    </HydrationBoundary>
  );
}
