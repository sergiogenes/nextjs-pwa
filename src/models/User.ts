import mongoose, { Schema, model, models } from 'mongoose'

/**
 * Explicación Tutorial:
 * Definimos el esquema de Usuario para MongoDB.
 * Guardaremos el email como identificador único y el nombre.
 * Para este tutorial, la contraseña se guardará en texto plano por simplicidad,
 * pero en producción SIEMPRE se debe usar bcrypt o similar.
 */
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true })

const User = models.User || model('User', UserSchema)
export default User
