import { randomUUID } from "node:crypto";
import { sql } from "./db";

export type TipoEvento = "llm" | "herramienta" | "subpaso" | "urgencia" | "error";

export interface EventoRegistro {
  seq: number;
  tipo: TipoEvento;
  nombre: string;
  estado: string;
  ms?: number;
  resumen?: string;
  payload?: unknown;
}

export function crearRunId(): string {
  return randomUUID();
}

export async function crearRun(runId: string, urgente: boolean): Promise<void> {
  await sql`insert into runs (run_id, urgente) values (${runId}, ${urgente})`;
}

export async function cerrarRun(runId: string, totalMs: number): Promise<void> {
  await sql`update runs set total_ms = ${totalMs} where run_id = ${runId}`;
}

/**
 * `payload` nunca debe contener texto libre del paciente (ver B.10):
 * el llamador es responsable de omitir campos como el sintoma crudo.
 */
export async function registrarEvento(
  runId: string,
  evento: EventoRegistro,
): Promise<void> {
  await sql`
    insert into run_events (run_id, seq, tipo, nombre, estado, ms, resumen, payload)
    values (
      ${runId}, ${evento.seq}, ${evento.tipo}, ${evento.nombre}, ${evento.estado},
      ${evento.ms ?? null}, ${evento.resumen ?? null},
      ${evento.payload !== undefined ? JSON.stringify(evento.payload) : null}
    )
  `;
}

export interface RunEventoFila {
  seq: number;
  tipo: TipoEvento;
  nombre: string;
  estado: string;
  ms: number | null;
  resumen: string | null;
  payload: unknown;
}

export async function obtenerRun(runId: string) {
  const runs = await sql<{ run_id: string; created_at: string; urgente: boolean; total_ms: number | null }>`
    select run_id, created_at::text, urgente, total_ms from runs where run_id = ${runId}
  `;
  if (!runs[0]) return null;

  const eventos = await sql<RunEventoFila>`
    select seq, tipo, nombre, estado, ms, resumen, payload
    from run_events
    where run_id = ${runId}
    order by seq asc
  `;

  return { ...runs[0], eventos };
}
