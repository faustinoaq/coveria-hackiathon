import { z } from "zod";
import { sql } from "../db";
import { error, type ResultadoError } from "../errores";
import { hoyPanama } from "../formato";
import type { Plan } from "../catalogo";

export const buscarPolizaInputSchema = z.object({
  numero_poliza: z
    .string()
    .regex(/^POL-\d{4}-\d{4,6}$/i, "Formato de poliza invalido"),
});

export interface PolizaOk {
  ok: true;
  plan: Plan;
  estado: string;
  vigente_hasta: string;
  deducible_anual: number;
  deducible_pendiente: number;
}

export interface PolizaRow {
  numero_poliza: string;
  plan: Plan;
  estado: string;
  vigente_desde: string;
  vigente_hasta: string;
  deducible_anual: number;
  deducible_consumido: number;
}

/** Logica pura de negocio, sin acceso a base de datos (facil de probar). */
export function evaluarPoliza(
  row: PolizaRow | undefined,
  hoy: Date,
): PolizaOk | ResultadoError {
  if (!row) return error("E001");

  const desde = new Date(`${row.vigente_desde}T00:00:00Z`);
  const hasta = new Date(`${row.vigente_hasta}T00:00:00Z`);

  if (row.estado !== "ACTIVA" || hoy < desde || hoy > hasta) {
    return error("E002");
  }

  const deduciblePendiente = Math.max(
    0,
    row.deducible_anual - row.deducible_consumido,
  );

  return {
    ok: true,
    plan: row.plan,
    estado: row.estado,
    vigente_hasta: row.vigente_hasta,
    deducible_anual: row.deducible_anual,
    deducible_pendiente: deduciblePendiente,
  };
}

export function normalizarNumeroPoliza(valor: string): string {
  return valor.trim().toUpperCase();
}

export async function buscarPoliza(
  numeroPolizaCrudo: string,
): Promise<PolizaOk | ResultadoError> {
  const numeroPoliza = normalizarNumeroPoliza(numeroPolizaCrudo);
  const parsed = buscarPolizaInputSchema.safeParse({
    numero_poliza: numeroPoliza,
  });
  if (!parsed.success) return error("E001");

  const filas = await sql<PolizaRow>`
    select numero_poliza, plan, estado,
           vigente_desde::text, vigente_hasta::text,
           deducible_anual, deducible_consumido
    from polizas
    where numero_poliza = ${numeroPoliza}
  `;

  return evaluarPoliza(filas[0], hoyPanama());
}
