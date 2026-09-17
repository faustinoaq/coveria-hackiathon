import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { error } from "@/lib/errores";
import { sql } from "@/lib/db";

interface PolizaAleatoria {
  numero_poliza: string;
  plan: string;
}

/**
 * Poliza de demostracion asignada a la sesion actual: una poliza ACTIVA
 * elegida al azar, mostrada en la parte superior de la app y usada como
 * numero de poliza por defecto cuando el paciente solo describe el dolor
 * sin dar su propio numero (ver PROMPT_SISTEMA en lib/agente.ts).
 */
export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json(error("E401"), { status: 401 });

  const filas = await sql<PolizaAleatoria>`
    select numero_poliza, plan from polizas where estado = 'ACTIVA' order by random() limit 1
  `;
  const fila = filas[0];
  if (!fila) {
    return NextResponse.json({ ok: false, mensaje: "No hay polizas activas" }, { status: 404 });
  }
  return NextResponse.json(fila);
}
