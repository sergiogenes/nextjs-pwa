'use server'

import dbConnect from './mongodb'
import Task from '../models/Task'
import User from '../models/User'
import bcrypt from 'bcryptjs' // <--- NUEVO

export interface UserRegistrationData {
  name?: string;
  email?: string;
  password?: string;
}

export async function registerUser(userData: UserRegistrationData) {
  try {
    await dbConnect();
    const { name, email, password } = userData;
    if (!email || !password) return { success: false, error: 'Faltan datos' };
    
    const existingUser = await User.findOne({ email });
    if (existingUser) return { success: false, error: 'El email ya está registrado' };

    // EXPLICACIÓN TUTORIAL:
    // Nunca guardamos la contraseña tal cual. Generamos un "salt" (aleatoriedad)
    // y creamos un hash. 10 es el número estándar de rondas de seguridad.
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({ name, email, password: hashedPassword }); // Guardamos el hash
    return { success: true };
  } catch (err) {
    console.error('Error en registro:', err);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * EXPLICACIÓN TUTORIAL:
 * Ahora todas las funciones de base de datos requieren el 'userId'.
 * Esto asegura que un usuario no pueda manipular tareas de otros.
 */

export async function createTaskInDB(title: string, userId: string) {
  try {
    await dbConnect();
    const newTask = await Task.create({ title, userId, completed: false });
    return {
      success: true,
      task: {
        id: newTask._id.toString(),
        title: newTask.title,
        completed: newTask.completed,
        createdAt: newTask.createdAt.getTime(),
      },
    }
  } catch (err) {
    console.error('Error al crear tarea:', err);
    return { success: false, error: 'Error al crear tarea' }
  }
}

export async function updateTaskInDB(id: string, updates: Partial<{ title: string, completed: boolean }>, userId: string) {
  try {
    await dbConnect();
    // Filtramos por ID de tarea Y por ID de usuario por seguridad
    const updatedTask = await Task.findOneAndUpdate(
      { _id: id, userId }, 
      { $set: updates },
      { returnDocument: 'after', lean: true }
    );
    if (!updatedTask) return { success: false, error: 'Tarea no encontrada' };
    return { success: true };
  } catch (err) {
    console.error('Error al actualizar tarea:', err);
    return { success: false, error: 'Error al actualizar' };
  }
}

export async function deleteTaskInDB(id: string, userId: string) {
  try {
    await dbConnect();
    const result = await Task.findOneAndDelete({ _id: id, userId });
    if (!result) return { success: false, error: 'No autorizado' };
    return { success: true };
  } catch (err) {
    console.error('Error al eliminar tarea:', err);
    return { success: false, error: 'Error al eliminar' };
  }
}

interface TaskDoc {
  _id: { toString: () => string };
  title: string;
  completed: boolean;
  createdAt: Date | number;
}

export async function fetchTasksFromDB(userId: string) {
  try {
    await dbConnect();
    // IMPORTANTÍSIMO: Solo traemos las tareas del usuario logueado
    const tasks = (await Task.find({ userId }).sort({ createdAt: -1 }).lean()) as unknown as TaskDoc[];
    return {
      success: true,
      tasks: tasks.map((t) => ({
        id: t._id.toString(),
        title: t.title,
        completed: t.completed ?? false,
        createdAt: t.createdAt instanceof Date ? t.createdAt.getTime() : Date.now(),
      }))
    };
  } catch (err) {
    console.error('Error al obtener tareas:', err);
    return { success: false, error: 'Error al obtener tareas' };
  }
}
