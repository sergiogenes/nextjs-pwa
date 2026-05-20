import { useEffect, useCallback } from 'react'
import { localDb } from '@/lib/db'
import { createTaskInDB, updateTaskInDB, deleteTaskInDB } from '@/lib/actions'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'

export function useSync() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const syncTasks = useCallback(async () => {
    if (status !== 'authenticated' || !userId) return;

    const pendingTasks = await localDb.tasks
      .filter((task) => task.synced === false && task.userId === userId)
      .toArray()

    if (pendingTasks.length === 0) return;

    console.log('🔍 [Sync] Iniciando proceso de sincronización...')
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
            await localDb.tasks.add({ ...task, id: result.task.id, userId, synced: true })
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
      } catch (err) {
        console.error(`❌ Fallo sincronizando "${task.title}":`, err)
      }
    }

    if (hasChanges) {
      console.log('🔄 [Sync] Cambios subidos. Invalidando caché...');
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    }
  }, [status, userId, queryClient]);

  /**
   * EXPLICACIÓN TUTORIAL (Arquitectura Estándar PWA - Health Check Polling):
   * Implementamos un intervalo que actúa como un "vigilante" inteligente.
   * 
   * 1. Solo se activa si el navegador dice que estamos online.
   * 2. Solo hace la petición (ping) si detecta que hay tareas pendientes de subir.
   * 3. Si el servidor responde (fetch exitoso), dispara la sincronización.
   * 
   * Esto resuelve el problema del servidor caído sin requerir refresco manual.
   */
  useEffect(() => {
    if (status !== 'authenticated' || !userId) return;

    // Función de chequeo periódico
    const checkServerAndSync = async () => {
      // Si el navegador reporta offline, no gastamos batería ni red
      if (!navigator.onLine) return;

      // Verificamos si realmente hay algo que sincronizar
      const pendingCount = await localDb.tasks
        .filter(t => t.synced === false && t.userId === userId)
        .count();

      if (pendingCount > 0) {
        console.log(`📡 [HealthCheck] Detectadas ${pendingCount} tareas pendientes. Verificando servidor...`);
        try {
          const response = await fetch('/api/health');
          if (response.ok) {
            console.log('✅ [HealthCheck] Servidor disponible. Disparando sincronización automática...');
            syncTasks();
          }
        } catch {
          // El servidor sigue caído, no hacemos nada hasta el próximo ciclo
        }
      }
    };

    // Configuramos el polling cada 15 segundos
    const intervalId = setInterval(checkServerAndSync, 15000);

    // También mantenemos el evento nativo por si se apaga/enciende el Wifi
    window.addEventListener('online', syncTasks);
    
    // Ejecución inicial
    syncTasks();

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', syncTasks);
    }
  }, [status, userId, syncTasks]);

  return syncTasks;
}
