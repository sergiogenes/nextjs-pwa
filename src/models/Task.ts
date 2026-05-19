import mongoose, { Schema, model, models } from 'mongoose';

/**
 * Explicación Tutorial:
 * El esquema (Schema) es el "plano" de nuestra colección en MongoDB.
 * Aunque en el cliente usamos 'LocalTask', aquí en el servidor definimos 
 * las reglas de validación de los datos que llegarán a la nube.
 */
const TaskSchema = new Schema({
  userId: {
    type: String,
    required: [true, 'El usuario es obligatorio'],
  },
  title: {
    type: String,
    required: [true, 'El título es obligatorio'],
    trim: true, // Elimina espacios en blanco al inicio y final
  },
  completed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  // timestamps: true añadiría automáticamente 'createdAt' y 'updatedAt' manejados por Mongoose.
  // Aquí lo dejamos explícito por consistencia con el modelo local.
  versionKey: false // Quita el campo __v que añade Mongoose por defecto
});

/**
 * ¡Importante en Next.js (Hot Reloading)!
 * Durante el desarrollo, Next.js vuelve a compilar los archivos cuando guardas.
 * Si intentamos definir el modelo 'Task' dos veces, MongoDB dará error.
 * Por eso primero verificamos si ya existe en 'models.Task'.
 */
const Task = models.Task || model('Task', TaskSchema);

export default Task;
