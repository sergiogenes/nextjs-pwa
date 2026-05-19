import { useEffect } from 'react'
import { localDb } from '@/lib/db'
import { createTaskInDB, updateTaskInDB, deleteTaskInDB, fetchTasksFromDB } from '@/lib/actions'
import { useSession } from 'next-auth/react' // <--- NUEVO

export function useSync() {
  const { data: session, status } = useSession();
  const userId = (session?.user as any)?.id;

  useEffect(() => {
    // Si no hay sesión o todavía está cargando, no hacemos nada
    if (status !== 'authenticated' || !userId) return;

    // Función para descargar datos de la nube a local (Rehidratación)
    const downloadFromCloud = async () => {
      console.log('📡 [Sync] Intentando rehidratar datos desde la nube...')
      const result = await fetchTasksFromDB(userId); // <--- PASAMOS userId
      
      if (result.success && result.tasks) {
        console.log(`📥 [Sync] Descargadas ${result.tasks.length} tareas de MongoDB.`);
        
        const cloudIds = result.tasks.map((t: any) => t.id);

        // 1. Actualizar/Insertar lo que viene de la nube
        for (const cloudTask of result.tasks) {
          const localTask = await localDb.tasks.get(cloudTask.id);

          // Si tenemos cambios locales pendientes para esta tarea, no la tocamos
          if (localTask && localTask.synced === false) {
            console.log(`⚠️ [Sync] Saltando "${cloudTask.title}" por cambios locales.`);
            continue;
          }

          await localDb.tasks.put({
            id: cloudTask.id,
            userId, // Importante guardar el dueño
            title: cloudTask.title,
            completed: cloudTask.completed,
            synced: true,
            createdAt: cloudTask.createdAt
          });
        }

        // 2. LIMPIEZA: Borrar en local lo que ya no existe en la nube para este usuario
        const allLocalTasks = await localDb.tasks.filter(t => t.userId === userId && t.synced === true).toArray();
        for (const localT of allLocalTasks) {
          if (!cloudIds.includes(localT.id)) {
            console.log(`🗑️ [Sync] Borrando tarea local "${localT.title}" porque ya no existe en Atlas.`);
            await localDb.tasks.delete(localT.id!);
          }
        }

        console.log('✅ [Sync] IndexedDB sincronizado perfectamente.');
      }
    };

    const syncTasks = async () => {
      console.log('🔍 Buscando tareas pendientes de subir...')
      
      const pendingTasks = await localDb.tasks.filter((task) => task.synced === false && task.userId === userId).toArray()

      if (pendingTasks.length === 0) return;

      console.log(`📊 Tareas para subir: ${pendingTasks.length}`)

      for (const task of pendingTasks) {
        try {
          if (task.deleted) {
            console.log(`🗑️ Intentando ELIMINAR en la nube: "${task.title}"`)
            const isLocalOnly = !task.id || task.id.length > 24
            
            if (isLocalOnly) {
              await localDb.tasks.delete(task.id!)
            } else {
              const result = await deleteTaskInDB(task.id!, userId)
              if (result.success) {
                await localDb.tasks.delete(task.id!)
              }
            }
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
                synced: true,
              })
            }
          } else {
            const result = await updateTaskInDB(task.id!, { 
              title: task.title, 
              completed: task.completed 
            }, userId)
            if (result.success) {
              await localDb.tasks.update(task.id!, { synced: true })
            }
          }
        } catch (error) {
          console.error(`❌ Fallo sincronizando "${task.title}":`, error)
        }
      }
    }

    const runFullSync = async () => {
      await syncTasks();
      await downloadFromCloud();
    };

    window.addEventListener('online', runFullSync);
    runFullSync();

    return () => window.removeEventListener('online', runFullSync)
  }, [status, userId]); // El hook re-actúa si cambia la sesión
}
