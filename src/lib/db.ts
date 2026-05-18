import Dexie, { Table } from 'dexie';

/**
 * Explicación Tutorial:
 * Definimos la interfaz 'LocalTask'. Esta representa cómo se guardarán las tareas
 * en el navegador del usuario. 
 * 
 * El campo 'synced' es vital: 
 * - Si es 'false', significa que el usuario creó/modificó la tarea sin internet y 
 *   aún no se ha guardado en MongoDB.
 * - Si es 'true', los datos locales están al día con el servidor.
 */
export interface LocalTask {
  id?: string;
  title: string;
  completed: boolean;
  synced: boolean; 
  createdAt: number;
}

/**
 * Creamos la clase de nuestra base de datos extendiendo Dexie.
 * Esto nos da acceso a todos los métodos de base de datos local.
 */
export class MyLocalDatabase extends Dexie {
  // 'tasks' es el nombre de nuestra tabla local
  tasks!: Table<LocalTask, string>;

  constructor() {
    // 'PWATutorialDB' es el nombre que aparecerá en las herramientas de desarrollador del navegador
    super('PWATutorialDB');
    
    // Definimos el esquema. Solo indexamos los campos por los que queramos filtrar.
    this.version(1).stores({
      tasks: 'id, title, completed, synced, createdAt'
    });
  }
}

// Exportamos una instancia única para que toda la app use la misma conexión
export const localDb = new MyLocalDatabase();
