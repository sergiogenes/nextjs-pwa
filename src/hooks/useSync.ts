import { useEffect, useCallback } from 'react'
import { localDb } from '@/lib/db'
import { createTaskInDB, updateTaskInDB, deleteTaskInDB } from '@/lib/actions'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'

export function useSync() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const userId = (session?.user as any)?.id;

  // EXPLICACIÓN TUTORIAL:
  // Envolvemos la lógica en useCallback para que pueda ser llamada
  // manualmente desde otros componentes (como el botón de refresco).
  const syncTasks = useCallback(async () => {
    if (status !== 'authenticated' || !userId) return;

    console.log('🔍 [Sync] Iniciando proceso de sincronización...')
    
    const pendingTasks = await localDb.tasks
      .filter((task) => task.synced === false && task.userId === userId)
      .toArray()

    if (pendingTasks.length === 0) {
      console.log('✅ [Sync] No hay tareas pendientes de subir.');
      return;
    }

    console.log(`📊 [Sync] Tareas para subir: ${pendingTasks.length}`)
    let hasChanges = false;

    for (const task of pendingTasks) {
      try {
        if (task.deleted) {
          const isLocalOnly = !task.id || task.id.length > 24
          if (isLocalOnly) {
            await localDb.tasks.delete(task.id!)
          } else {
            const result = await deleteTaskInDB(task.id!, userId)
            if (result.success) await localDb.tasks.delete(task.id!)
          }
          hasChanges = true;
          continue;
        }

        const isNewTask = !task.id || task.id.length > 24
        if (isNewTask) {
          const result = await createTaskInDB(task.title, userId)
          if (result.success && result.task) {
            await localDb.tasks.delete(task.id!)
            await localDb.tasks.add({ 
              ...task, 
              id: result.task.id, 
              userId, 
              synced: true 
            })
            hasChanges = true;
          }
        } else {
          const result = await updateTaskInDB(task.id!, { 
            title: task.title, 
            completed: task.completed 
          }, userId)
          if (result.success) {
            await localDb.tasks.update(task.id!, { synced: true })
            hasChanges = true;
          }
        }
      } catch (error) {
        console.error(`❌ Fallo sincronizando "${task.title}":`, error)
      }
    }

    if (hasChanges) {
      console.log('🔄 [Sync] Cambios subidos. Invalidando caché...');
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    }
  }, [status, userId, queryClient]);

  useEffect(() => {
    if (status !== 'authenticated' || !userId) return;

    // Ejecutamos la sincronización al inicio y cuando volvemos a estar online
    window.addEventListener('online', syncTasks);
    syncTasks();

    return () => window.removeEventListener('online', syncTasks)
  }, [status, userId, syncTasks]);

  return syncTasks; // Retornamos la función para uso manual
}
