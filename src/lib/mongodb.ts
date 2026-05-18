import mongoose from 'mongoose'

/**
 * Explicación Tutorial:
 * Definimos una interfaz para el objeto global. Esto le dice a TypeScript
 * que, dentro del objeto 'global', existe una propiedad opcional llamada 'mongoose'
 * que contiene nuestra conexión y la promesa.
 */
interface GlobalMongoose {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Extendemos el objeto global de Node para que TypeScript reconozca nuestra propiedad personalizada
declare global {
  // eslint-disable-next-line no-var
  var mongoose: GlobalMongoose | undefined
}

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Por favor, define la variable de entorno MONGODB_URI dentro de .env.local')
}

/**
 * Ahora usamos 'global.mongoose' en lugar de '(global as any).mongoose'.
 * TypeScript ya sabe qué tipo de datos esperar gracias a la declaración global de arriba.
 */
let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function dbConnect() {
  // Si ya tenemos una conexión establecida en la caché global, la devolvemos
  if (cached!.conn) {
    return cached!.conn
  }

  // Si no hay una promesa de conexión en curso, iniciamos una nueva
  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 5000, // Si en 5 segundos no conecta, que falle
      serverSelectionTimeoutMS: 5000, // Si no encuentra el servidor rápido, que falle
    }

    cached!.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      console.log('✅ Conexión a MongoDB establecida')
      return mongooseInstance
    })
  }

  try {
    // Esperamos a que la promesa de conexión se resuelva
    cached!.conn = await cached!.promise
  } catch (e) {
    // Si la conexión falla, limpiamos la promesa para permitir reintentos
    cached!.promise = null
    throw e
  }

  return cached!.conn
}

export default dbConnect
