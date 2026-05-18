'use client'

import { useState } from 'react'
import { localDb } from '@/lib/db'
import { createTaskInDB, toggleTaskInDB } from '@/lib/actions'
import { useSync } from '@/hooks/useSync'
import { useLiveQuery } from 'dexie-react-hooks' // Necesitamos este hook
import { Plus, Wifi, WifiOff, CheckCircle2, Circle, Loader2 } from 'lucide-react'

export default function Home() {
  const [title, setTitle] = useState('')
  const [isPending, setIsPending] = useState(false)

  // Activamos el vigilante de sincronización
  useSync()

  /**
   * Explicación Tutorial:
   * useLiveQuery observa nuestra tabla 'tasks' en IndexedDB.
   * Si una tarea cambia (por ejemplo, de synced: false a true),
   * la UI se actualizará sola sin refrescar la página.
   */
  const tasks = useLiveQuery(() => localDb.tasks.toArray())

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim() || isPending) return

    setIsPending(true)
    const tempId = crypto.randomUUID()
    const now = Date.now()

    try {
      const result = await createTaskInDB(title)

      if (result.success && result.task) {
        await localDb.tasks.add({
          id: result.task.id,
          title: result.task.title,
          completed: result.task.completed,
          createdAt: result.task.createdAt,
          synced: true,
        })
      } else {
        throw new Error()
      }
    } catch (error) {
      await localDb.tasks.add({
        id: tempId,
        title,
        completed: false,
        createdAt: now,
        synced: false,
      })
    } finally {
      setTitle('')
      setIsPending(false)
    }
  }

  // 1. No olvides importar la acción arriba:
  // import { createTaskInDB, toggleTaskInDB } from '@/lib/actions';

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus

    // ACTUALIZACIÓN OPTIMISTA:
    // Primero actualizamos en el dispositivo del usuario para que sea instantáneo.
    await localDb.tasks.update(id, {
      completed: newStatus,
      synced: false, // Marcamos para que el sync sepa que hubo un cambio
    })

    try {
      const result = await toggleTaskInDB(id, newStatus)
      if (result.success) {
        await localDb.tasks.update(id, { synced: true })
      }
    } catch (error) {
      console.log('Fallo al actualizar en nube, se sincronizará luego.')
    }
  }

  return (
    <main className='min-h-screen bg-slate-50 p-4 md:p-8'>
      <div className='max-w-md mx-auto'>
        <header className='mb-8 text-center'>
          <h1 className='text-3xl font-bold text-slate-800'>PWA Tasks</h1>
          <p className='text-slate-500'>Tutorial Next.js 14 + Offline</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className='flex gap-2 mb-8'
        >
          <input
            type='text'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='¿Qué hay que hacer?'
            className='flex-1 p-3 rounded-xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            disabled={isPending}
          />
          <button
            type='submit'
            disabled={isPending || !title.trim()}
            className='bg-blue-600 text-white p-3 rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 min-w-[50px] flex items-center justify-center'
          >
            {isPending ? (
              <Loader2
                className='animate-spin'
                size={24}
              />
            ) : (
              <Plus size={24} />
            )}
          </button>
        </form>

        {/* LISTADO DE TAREAS */}
        <div className='space-y-3'>
          {tasks?.map((task) => (
            <div
              key={task.id}
              onClick={() => handleToggle(task.id!, task.completed)}
              className='bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between'
            >
              <div className='flex items-center gap-3'>
                {task.completed ? (
                  <CheckCircle2 className='text-green-500' />
                ) : (
                  <Circle className='text-slate-300' />
                )}
                <span className={task.completed ? 'line-through text-slate-400' : 'text-slate-700'}>
                  {task.title}
                </span>
              </div>

              {/* Icono de Sincronización */}
              <div title={task.synced ? 'Sincronizado' : 'Pendiente'}>
                {task.synced ? (
                  <Wifi
                    size={16}
                    className='text-blue-400'
                  />
                ) : (
                  <WifiOff
                    size={16}
                    className='text-amber-500 animate-pulse'
                  />
                )}
              </div>
            </div>
          ))}

          {tasks?.length === 0 && (
            <p className='text-center text-slate-400 italic py-10'>
              No hay tareas. ¡Empieza creando una!
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
