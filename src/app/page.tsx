'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { localDb } from '@/lib/db'
import { createTaskInDB, updateTaskInDB, deleteTaskInDB, fetchTasksFromDB } from '@/lib/actions'
import { useSync } from '@/hooks/useSync'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSession, signOut } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Wifi, WifiOff, CheckCircle2, Circle, Loader2, Trash2, Edit2, Check, X, LogOut, User, RefreshCw } from 'lucide-react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient() // <--- NUEVO: Para invalidar el caché
  const [title, setTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const userId = (session?.user as any)?.id;

  // ... useQuery y useEffect de sincronización se mantienen igual ...

  // EXPLICACIÓN TUTORIAL:
  // Las Mutaciones gestionan acciones que CAMBIAN datos (POST, PUT, DELETE).
  // Usamos 'onSuccess' para invalidar el caché y que TanStack Query refresque los datos.

  // MUTACIÓN: CREAR
  const createMutation = useMutation({
    mutationFn: ({ title, tempId }: { title: string, tempId: string }) => 
      createTaskInDB(title, userId!),
    onSuccess: async (result, variables) => {
      if (result.success && result.task) {
        // Evitamos duplicados: Borramos la temporal y añadimos la real
        await localDb.tasks.delete(variables.tempId);
        await localDb.tasks.add({
          id: result.task.id,
          userId: userId!,
          title: result.task.title,
          completed: result.task.completed,
          createdAt: result.task.createdAt,
          synced: true,
        });
        queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
      }
    },
    onError: (error) => {
      // EXPLICACIÓN TUTORIAL:
      // Si la mutación falla (ej: servidor caído), silenciamos el error.
      // La tarea ya está segura en Dexie con synced: false.
      // El hook useSync se encargará de subirla más tarde.
      console.warn('📡 [Mutation] Fallo al crear en la nube, se sincronizará luego:', error);
    }
  });

  // MUTACIÓN: ACTUALIZAR (Toggle o Editar título)
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: any }) => updateTaskInDB(id, updates, userId!),
    onSuccess: (_, variables) => {
      localDb.tasks.update(variables.id, { synced: true });
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    },
    onError: (error) => {
      console.warn('📡 [Mutation] Fallo al actualizar en la nube, se sincronizará luego:', error);
    }
  });

  // MUTACIÓN: BORRAR
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTaskInDB(id, userId!),
    onSuccess: (_, id) => {
      localDb.tasks.delete(id);
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    },
    onError: (error) => {
      console.warn('📡 [Mutation] Fallo al borrar en la nube, se sincronizará luego:', error);
    }
  });

  // EXPLICACIÓN TUTORIAL:
  // Redirección de seguridad en el cliente. Si el middleware falla (ej: offline)
  // 'queryKey' identifica esta petición en el caché.
  // 'queryFn' es la función que trae los datos (nuestra Server Action).
  const { 
    data: serverData, 
    isLoading: isServerLoading, 
    isFetching,
    refetch 
  } = useQuery({
    queryKey: ['tasks', userId],
    queryFn: () => fetchTasksFromDB(userId || ''),
    enabled: !!userId, // Solo se ejecuta si hay un usuario logueado
  });

  // EXPLICACIÓN TUTORIAL:
  // Sincronización Reactiva: Cuando TanStack Query recibe datos nuevos del servidor,
  // aprovechamos para actualizar nuestra IndexedDB local.
  useEffect(() => {
    if (serverData?.success && serverData.tasks) {
      const syncCloudToLocal = async () => {
        for (const cloudTask of serverData.tasks) {
          const localTask = await localDb.tasks.get(cloudTask.id);
          // Solo actualizamos si no hay cambios locales pendientes (synced: true)
          if (!localTask || localTask.synced !== false) {
            await localDb.tasks.put({
              ...cloudTask,
              userId: userId!,
              synced: true,
            });
          }
        }
      };
      syncCloudToLocal();
    }
  }, [serverData, userId]);

  // EXPLICACIÓN TUTORIAL:
  // Redirección de seguridad en el cliente. Si el middleware falla (ej: offline)
  // y detectamos que no hay sesión, mandamos al usuario al login.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Activamos el vigilante de sincronización
  const sync = useSync()

  const handleManualRefresh = async () => {
    await sync();
    refetch();
  };

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
  ) || [] // <--- Fallback para que siempre sea un array y evitar errores de undefined

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
    if (!title.trim() || createMutation.isPending || !userId) return

    const tempId = crypto.randomUUID()
    const now = Date.now()

    // 1. Actualización Optimista Local (Dexie)
    // Siempre guardamos en local primero.
    await localDb.tasks.add({
      id: tempId,
      userId,
      title,
      completed: false,
      createdAt: now,
      synced: false,
    })

    setTitle('')

    // EXPLICACIÓN TUTORIAL:
    // Evitamos el bloqueo del botón "+":
    // Si el navegador detecta que estamos offline, NO lanzamos la mutación de TanStack Query.
    // TanStack Query intentaría reintentar y dejaría el botón en 'loading'.
    // En lugar de eso, dejamos que 'useSync' se encargue de subirla cuando vuelva el internet.
    if (navigator.onLine) {
      createMutation.mutate({ title, tempId });
    } else {
      console.log('📡 [Offline] Tarea guardada localmente. Se sincronizará al recuperar conexión.');
    }
  }

  const handleToggle = async (id: string, currentStatus: boolean) => {
    if (editingId === id) return;
    const newStatus = !currentStatus

    await localDb.tasks.update(id, {
      completed: newStatus,
      synced: false,
    })

    if (navigator.onLine) {
      updateMutation.mutate({ id, updates: { completed: newStatus } });
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
    
    if (navigator.onLine) {
      updateMutation.mutate({ id, updates: { title: editTitle } });
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // Si la tarea solo existe en local, la borramos directo
    const task = await localDb.tasks.get(id);
    const isLocalOnly = !task?.id || task.id.length > 24;

    if (isLocalOnly) {
      await localDb.tasks.delete(id);
      return;
    }

    await localDb.tasks.update(id, { 
      deleted: true, 
      synced: false 
    });

    if (navigator.onLine) {
      deleteMutation.mutate(id);
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

        <header className='mb-8 text-center relative'>
          <h1 className='text-3xl font-bold text-slate-800'>PWA Tasks</h1>
          <p className='text-slate-500'>Tutorial Next.js 14 + Offline</p>
          
          {/* INDICADOR DE SINCRONIZACIÓN */}
          <div className='absolute -right-2 top-0 flex items-center gap-2'>
            <button 
              onClick={handleManualRefresh}
              disabled={isFetching}
              className={`p-2 rounded-full transition-all ${isFetching ? 'text-blue-500 animate-spin' : 'text-slate-400 hover:bg-slate-100'}`}
              title="Sincronizar ahora"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </header>

        {/* ESTADO DE CARGA INICIAL DEL SERVIDOR */}
        {isServerLoading && tasks.length === 0 && (
          <div className="mb-6 flex items-center justify-center p-4 bg-blue-50 rounded-2xl border border-blue-100 text-blue-600 gap-3">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm font-medium">Cargando tareas desde la nube...</span>
          </div>
        )}

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
            disabled={createMutation.isPending}
          />
          <button
            type='submit'
            disabled={createMutation.isPending || !title.trim()}
            className='bg-blue-600 text-white p-3 rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 min-w-[50px] flex items-center justify-center'
          >
            {createMutation.isPending ? (
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
