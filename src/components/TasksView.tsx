'use client'

import { useState, useEffect } from 'react'
import { localDb } from '@/lib/db'
import { createTaskInDB, updateTaskInDB, deleteTaskInDB, fetchTasksFromDB } from '@/lib/actions'
import { useSync } from '@/hooks/useSync'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSession, signOut } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle2, Circle, Loader2, Trash2, Edit2, Check, X, LogOut, User, RefreshCw, Cloud, CloudOff, CloudUpload } from 'lucide-react'

/**
 * EXPLICACIÓN TUTORIAL (Arquitectura Estándar PWA):
 * Este es el componente de vista principal. Recibe la sesión del servidor
 * y se encarga de toda la interactividad. 
 * 
 * Gracias a la hidratación de TanStack Query, el hook useQuery encontrará
 * los datos ya listos en el caché, eliminando el parpadeo inicial.
 */
export default function TasksView() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const userId = session?.user?.id;

  // MUTACIÓN: CREAR
  const createMutation = useMutation({
    mutationFn: ({ title }: { title: string, tempId: string }) => 
      createTaskInDB(title, userId!),
    onSuccess: async (result, variables) => {
      if (result.success && result.task) {
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
      console.warn('📡 [Mutation] Fallo al crear en la nube, se sincronizará luego:', error);
    }
  });

  // MUTACIÓN: ACTUALIZAR
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Partial<{ title: string, completed: boolean }> }) => updateTaskInDB(id, updates, userId!),
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
  // useQuery ahora carga los datos deshidratados del servidor.
  // No habrá estado 'isLoading' en la primera carga online.
  const { 
    data: serverData, 
    isLoading: isServerLoading, 
    isFetching,
    refetch 
  } = useQuery({
    queryKey: ['tasks', userId],
    queryFn: () => fetchTasksFromDB(userId || ''),
    enabled: !!userId,
  });

  // Sincronización Reactiva de Servidor a Local
  useEffect(() => {
    if (serverData?.success && serverData.tasks) {
      const syncCloudToLocal = async () => {
        for (const cloudTask of serverData.tasks) {
          const localTask = await localDb.tasks.get(cloudTask.id);
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

  // Activamos el vigilante de sincronización y obtenemos tareas en proceso
  const { syncTasks: sync, syncingTaskIds } = useSync()

  const handleManualRefresh = async () => {
    await sync();
    refetch();
  };

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/auth/signin' });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      window.location.href = '/~offline';
    }
  };

  const tasks = useLiveQuery(() => 
    localDb.tasks
      .filter(task => !task.deleted && task.userId === userId)
      .toArray(),
    [userId]
  ) || []

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim() || createMutation.isPending || !userId) return

    const tempId = crypto.randomUUID()
    const now = Date.now()

    await localDb.tasks.add({
      id: tempId,
      userId,
      title,
      completed: false,
      createdAt: now,
      synced: false,
    })

    setTitle('')

    if (navigator.onLine) {
      createMutation.mutate({ title, tempId });
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
          {tasks?.map((task) => {
            const isSyncingInQueue = syncingTaskIds.includes(task.id!);
            const isCreating = createMutation.isPending && createMutation.variables?.tempId === task.id;
            const isUpdating = updateMutation.isPending && updateMutation.variables?.id === task.id;
            const isDeleting = deleteMutation.isPending && deleteMutation.variables === task.id;
            const isTaskSyncing = isSyncingInQueue || isCreating || isUpdating || isDeleting;

            return (
              <div
                key={task.id}
                onClick={() => handleToggle(task.id!, task.completed)}
                className='bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-slate-200 transition-all duration-300'
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

                <button
                  onClick={(e) => handleDelete(e, task.id!)}
                  className='p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all'
                  title='Eliminar tarea'
                >
                  <Trash2 size={18} />
                </button>

                <div className="flex items-center">
                  {isTaskSyncing ? (
                    <div 
                      className="flex items-center gap-1.5 text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-full text-xs font-semibold border border-blue-100 transition-all duration-300 animate-pulse"
                      title="Sincronizando con la nube..."
                    >
                      <CloudUpload size={14} className="animate-bounce" />
                      <span className="hidden md:inline">Sincronizando</span>
                    </div>
                  ) : !task.synced ? (
                    <div 
                      className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-semibold border border-amber-100 transition-all duration-300"
                      title={navigator.onLine ? "Pendiente de sincronizar" : "Guardado localmente (Offline)"}
                    >
                      <CloudOff size={14} className="text-amber-500" />
                      <span className="hidden md:inline">
                        {navigator.onLine ? "Pendiente" : "Local"}
                      </span>
                    </div>
                  ) : (
                    <div 
                      className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold border border-emerald-100 transition-all duration-300 hover:scale-105"
                      title="Sincronizado con MongoDB"
                    >
                      <Cloud size={14} className="text-emerald-500" />
                      <span className="hidden md:inline">Sincronizado</span>
                    </div>
                  )}
                </div>
              </div>
              </div>
            );
          })}

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
