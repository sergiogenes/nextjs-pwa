import { useEffect } from 'react'
import { localDb } from '@/lib/db'
import { createTaskInDB, toggleTaskInDB } from '@/lib/actions'

export function useSync() {
  useEffect(() => {
    const syncTasks = async () => {
      console.log('🔍 Buscando tareas pendientes de sincronización...')

      // Intentamos buscar de ambas formas por si acaso: como 'false' o como '0'
      const pendingTasks = await localDb.tasks.filter((task) => task.synced === false).toArray()

      console.log(`📊 Tareas encontradas para sincronizar: ${pendingTasks.length}`)

      if (pendingTasks.length === 0) return

      for (const task of pendingTasks) {
        try {
          // Si el ID es largo (UUID) es nueva. Si es corto (ObjectId de Mongo) es actualización.
          // El ID de Mongo suele tener 24 caracteres.
          const isNewTask = !task.id || task.id.length > 24

          if (isNewTask) {
            console.log(`🚀 Intentando CREAR en la nube: "${task.title}"`)
            const result = await createTaskInDB(task.title)

            if (result.success && result.task) {
              // 1. Borramos la versión temporal
              await localDb.tasks.delete(task.id!)
              // 2. Insertamos la oficial
              await localDb.tasks.add({
                ...task,
                id: result.task.id,
                synced: true,
              })
              // 3. Si además estaba completada, avisamos
              if (task.completed) {
                await toggleTaskInDB(result.task.id, true)
              }
              console.log(`✅ Tarea "${task.title}" creada y sincronizada.`)
            }
          } else {
            console.log(`🔄 Intentando ACTUALIZAR estado en la nube: "${task.title}"`)
            const result = await toggleTaskInDB(task.id!, task.completed)
            if (result.success) {
              await localDb.tasks.update(task.id!, { synced: true })
              console.log(`✅ Estado de "${task.title}" sincronizado.`)
            }
          }
        } catch (error) {
          console.error(`❌ Fallo crítico sincronizando "${task.title}":`, error)
        }
      }
    }

    // Escuchamos el evento de volver a estar online
    window.addEventListener('online', () => {
      console.log('🌐 Conexión detectada. Esperando 2 segundos para estabilizar...')

      // Usamos setTimeout para dar tiempo al sistema operativo
      // a establecer una conexión real a internet.
      setTimeout(() => {
        console.log('🚀 Disparando sincronización tras espera de estabilidad...')
        syncTasks()
      }, 2000) // 2000 milisegundos = 2 segundos
    })

    // También disparamos el sync cada vez que cargamos la página
    syncTasks()

    return () => window.removeEventListener('online', syncTasks)
  }, [])
}
