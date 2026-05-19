'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { localDb } from '@/lib/db'
import { createTaskInDB, updateTaskInDB, deleteTaskInDB } from '@/lib/actions'
import { useSync } from '@/hooks/useSync'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSession, signOut } from 'next-auth/react'
import { Plus, Wifi, WifiOff, CheckCircle2, Circle, Loader2, Trash2, Edit2, Check, X, LogOut, User } from 'lucide-react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const userId = (session?.user as any)?.id;

  // EXPLICACIÓN TUTORIAL:
  // Redirección de seguridad en el cliente. Si el middleware falla (ej: offline)
  // y detectamos que no hay sesión, mandamos al usuario al login.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Activamos el vigilante de sincronización
  useSync()

  // EXPLICACIÓN TUTORIAL:
  // Mejoramos el logout para que, si el servidor está caído, 
  // al menos intentemos redirigir al usuario o mostrar un aviso,
  // en lugar de dejar que la app se rompa.
  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/auth/signin' });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Si falla por red (servidor apagado), forzamos la ida a offline
      window.location.href = '/~offline';
    }
  };

  // EXPLICACIÓN TUTORIAL:
  // useLiveQuery debe estar siempre en el nivel superior del componente.
  // Filtramos por userId para asegurar que cada usuario vea solo sus tareas locales.
  const tasks = useLiveQuery(() => 
    localDb.tasks
      .filter(task => !task.deleted && task.userId === userId)
      .toArray(),
    [userId]
  )

  // Mientras verifica la sesión, mostramos pantalla de carga
  if (status === 'loading') {
    return (
      <div className='min-h-screen flex items-center justify-center bg-slate-50'>
        <div className='flex flex-col items-center gap-4'>
          <Loader2 className='animate-spin text-blue-600' size={48} />
          <p className='text-slate-500 font-medium'>Verificando sesión...</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim() || isPending || !userId) return

    setIsPending(true)
    const tempId = crypto.randomUUID()
    const now = Date.now()

    try {
      const result = await createTaskInDB(title, userId)

      if (result.success && result.task) {
        await localDb.tasks.add({
          id: result.task.id,
          userId,
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
        userId,
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

  const handleToggle = async (id: string, currentStatus: boolean) => {
    if (editingId === id) return;
    const newStatus = !currentStatus

    await localDb.tasks.update(id, {
      completed: newStatus,
      synced: false,
    })

    try {
      const result = await updateTaskInDB(id, { completed: newStatus }, userId)
      if (result.success) {
        await localDb.tasks.update(id, { synced: true })
      }
    } catch (error) {
      console.log('Fallo al actualizar en nube, se sincronizará luego.')
    }
  }

  const startEditing = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  }

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  }

  const saveEdit = async (id: string) => {
    if (!editTitle.trim()) return;

    await localDb.tasks.update(id, {
      title: editTitle,
      synced: false
    });

    setEditingId(null);

    try {
      const result = await updateTaskInDB(id, { title: editTitle }, userId);
      if (result.success) {
        await localDb.tasks.update(id, { synced: true });
      }
    } catch (error) {
      console.log('Fallo edit en nube, se sincronizará luego.');
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await localDb.tasks.update(id, { 
      deleted: true, 
      synced: false 
    });

    try {
      const result = await deleteTaskInDB(id, userId);
      if (result.success) {
        await localDb.tasks.delete(id);
      }
    } catch (error) {
      console.log('📡 [Delete] Fallo en la nube, se borrará cuando vuelva el internet.');
    }
  }

  return (
    <main className='min-h-screen bg-slate-50 p-4 md:p-8'>
      <div className='max-w-md mx-auto'>
        {/* BARRA DE USUARIO */}
        <div className='flex items-center justify-between mb-8 bg-white p-3 rounded-2xl shadow-sm border border-slate-100'>
          <div className='flex items-center gap-2'>
            <div className='bg-blue-100 p-2 rounded-full text-blue-600'>
              <User size={20} />
            </div>
            <span className='text-sm font-medium text-slate-700'>
              {session?.user?.name || 'Usuario'}
            </span>
          </div>
          <button 
            onClick={handleSignOut}
            className='flex items-center gap-1 text-sm text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors font-medium'
          >
            <LogOut size={18} />
            <span>Salir</span>
          </button>
        </div>

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
              <Loader2 className='animate-spin' size={24} />
            ) : (
              <Plus size={24} />
            )}
          </button>
        </form>

        <div className='space-y-3'>
          {tasks?.map((task) => (
            <div
              key={task.id}
              onClick={() => handleToggle(task.id!, task.completed)}
              className='bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group'
            >
              <div className='flex items-center gap-3 flex-1'>
                {task.completed ? (
                  <CheckCircle2 className='text-green-500 flex-shrink-0' />
                ) : (
                  <Circle className='text-slate-300 flex-shrink-0' />
                )}
                
                {editingId === task.id ? (
                  <div className='flex items-center gap-2 flex-1' onClick={e => e.stopPropagation()}>
                    <input
                      type='text'
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className='flex-1 p-1 border-b-2 border-blue-500 focus:outline-none'
                      autoFocus
                    />
                    <button onClick={() => saveEdit(task.id!)} className='text-green-500 p-1'>
                      <Check size={20} />
                    </button>
                    <button onClick={cancelEditing} className='text-red-400 p-1'>
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <span className={task.completed ? 'line-through text-slate-400' : 'text-slate-700'}>
                    {task.title}
                  </span>
                )}
              </div>

              <div className='flex items-center gap-1'>
                {editingId !== task.id && (
                  <button
                    onClick={(e) => startEditing(e, task.id!, task.title)}
                    className='p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all'
                    title='Editar tarea'
                  >
                    <Edit2 size={18} />
                  </button>
                )}

                <div title={task.synced ? 'Sincronizado' : 'Pendiente'}>
                  {task.synced ? (
                    <Wifi size={16} className='text-blue-400' />
                  ) : (
                    <WifiOff size={16} className='text-amber-500 animate-pulse' />
                  )}
                </div>

                <button
                  onClick={(e) => handleDelete(e, task.id!)}
                  className='p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all'
                  title='Eliminar tarea'
                >
                  <Trash2 size={18} />
                </button>
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
