import { z } from "zod";
import { sql } from "../db";
import { error, type ResultadoError } from "../errores";
import { esEspecialidad, type Especialidad } from "../catalogo";

export const buscarSintomasInputSchema = z.object({
  texto: z.string().min(1),
});

export interface CandidatoSintoma {
  sintoma: string;
  especialidad: Especialidad;
  prioridad: "ALTA" | "MEDIA" | "BAJA";
  bandera_roja: boolean;
  score: number;
}

export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similitudLocal(a: string, b: string): number {
  const setA = new Set(a.split(" ").filter(Boolean));
  const setB = new Set(b.split(" ").filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  let interseccion = 0;
  for (const palabra of setA) if (setB.has(palabra)) interseccion++;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : interseccion / union;
}

interface SintomaFila {
  sintoma: string;
  sinonimos: string;
  especialidad: string;
  prioridad: "ALTA" | "MEDIA" | "BAJA";
  bandera_roja: boolean;
}

export async function buscarSintomas(
  textoCrudo: string,
): Promise<{ ok: true; candidatos: CandidatoSintoma[] } | ResultadoError> {
  const texto = normalizarTexto(textoCrudo);
  if (!texto) return error("E005");

  let candidatos: CandidatoSintoma[];

  try {
    const filas = await sql<SintomaFila & { score: number }>`
      select sintoma, sinonimos, especialidad, prioridad, bandera_roja,
             similarity(lower(sintoma || ' ' || sinonimos), ${texto}) as score
      from sintomas
      order by score desc
      limit 5
    `;
    candidatos = filas
      .filter((f) => esEspecialidad(f.especialidad))
      .map((f) => ({
        sintoma: f.sintoma,
        especialidad: f.especialidad as Especialidad,
        prioridad: f.prioridad,
        bandera_roja: f.bandera_roja,
        score: Number(f.score),
      }));
  } catch {
    // pg_trgm no disponible: similitud calculada en codigo (Jaccard de palabras).
    const todas = await sql<SintomaFila>`
      select sintoma, sinonimos, especialidad, prioridad, bandera_roja from sintomas
    `;
    candidatos = todas
      .filter((f) => esEspecialidad(f.especialidad))
      .map((f) => ({
        sintoma: f.sintoma,
        especialidad: f.especialidad as Especialidad,
        prioridad: f.prioridad,
        bandera_roja: f.bandera_roja,
        score: similitudLocal(texto, normalizarTexto(`${f.sintoma} ${f.sinonimos}`)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  return { ok: true, candidatos };
}
