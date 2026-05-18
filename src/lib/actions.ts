'use server' // ¡OBLIGATORIO! Esto le dice a Next.js que todo aquí corre SOLO en el servidor

import dbConnect from './mongodb'
import Task from '../models/Task'
import mongoose from 'mongoose'

/**
 * Explicación Tutorial:
 * Esta función recibe el título de una tarea, se conecta a MongoDB,
 * la guarda y devuelve una versión serializada de la tarea.
 */
export async function createTaskInDB(title: string) {
  try {
    // 1. Intentamos la conexión con los timeouts que ya pusimos
    await dbConnect()

    const newTask = await Task.create({
      title,
      completed: false,
    })

    return {
      success: true,
      task: {
        id: newTask._id.toString(),
        title: newTask.title,
        completed: newTask.completed,
        createdAt: newTask.createdAt.getTime(),
      },
    }
  } catch (error: unknown) {
    // EXPLICACIÓN TUTORIAL:
    // En TypeScript, los errores son de tipo 'unknown'. Para acceder a sus propiedades 
    // de forma segura, los tratamos como un objeto que podría tener 'code' o 'name'.
    const err = error as { code?: string; name?: string };

    if (
      err.code === 'ENOTFOUND' ||
      err.code === 'ETIMEOUT' ||
      err.name === 'MongoServerSelectionError'
    ) {
      console.warn('📡 [Server Action] Fallo de red con MongoDB. La tarea se sincronizará luego.')
      return { success: false, error: 'Servidor desconectado temporalmente' }
    }

    // Si es otro tipo de error (ej: validación de datos), lo mostramos completo
    console.error('❌ Error inesperado en MongoDB:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

/**
 * Explicación Tutorial:
 * Esta acción recibe el ID de la tarea y su nuevo estado.
 * Se encarga de buscarla en MongoDB y actualizarla.
 */
export async function toggleTaskInDB(id: string, completed: boolean) {
  try {
    await dbConnect()

    // 1. Verificamos si el ID es un ObjectId válido de MongoDB
    // Si es un UUID (como "4ab95..."), MongoDB no lo encontrará y debemos avisar
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: 'ID no válido para MongoDB' }
    }

    // 2. Usamos 'returnDocument: after' como sugiere el warning
    const updatedTask = (await Task.findByIdAndUpdate(
      id,
      { completed },
      { returnDocument: 'after', lean: true }, // 'lean' devuelve un objeto plano de JS
    )) as { _id: mongoose.Types.ObjectId; title: string; completed: boolean } | null

    if (!updatedTask) return { success: false, error: 'Tarea no encontrada' }

    // 3. Devolvemos solo lo necesario en un objeto plano
    return {
      success: true,
      task: {
        id: updatedTask._id.toString(),
        title: updatedTask.title,
        completed: updatedTask.completed,
      },
    }
  } catch (error: unknown) {
    const err = error as { code?: string; name?: string };

    if (
      err.code === 'ENOTFOUND' ||
      err.code === 'ETIMEOUT' ||
      err.name === 'MongoServerSelectionError'
    ) {
      console.warn('📡 [Server Action] Fallo de red al actualizar en MongoDB.')
      return { success: false, error: 'Servidor desconectado temporalmente' }
    }

    console.error('❌ Error al actualizar tarea en MongoDB:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}
