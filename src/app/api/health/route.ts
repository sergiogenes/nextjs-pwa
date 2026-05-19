import { NextResponse } from 'next/server';

/**
 * EXPLICACIÓN TUTORIAL (Arquitectura Estándar PWA - Health Check):
 * Este es un endpoint extremadamente ligero. No consulta bases de datos
 * ni hace cálculos. Su único propósito es devolver un 200 OK para que 
 * los clientes (la PWA) sepan que el servidor web está encendido y 
 * respondiendo peticiones.
 * 
 * Es vital para resolver el problema del "Lie-Fi" (Wifi conectado pero 
 * sin internet real o servidor caído).
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: Date.now() });
}
