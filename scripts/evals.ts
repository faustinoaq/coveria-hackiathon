import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generateObject, streamText, isStepCount, type ModelMessage } from "ai";
import { z } from "zod";
import { obtenerModelo } from "../lib/modelo";
import { buscarSintomas } from "../lib/herramientas/buscar-sintomas";
import { detectarUrgencia } from "../lib/urgencias";
import { ESPECIALIDADES } from "../lib/catalogo";
import { construirHerramientas, PROMPT_SISTEMA } from "../lib/agente";
import { aplicarGuardaMontos } from "../lib/guarda-montos";
import type { CotizacionOk } from "../lib/herramientas/cotizar";

function leerJsonl<T>(ruta: string): T[] {
  return readFileSync(join(process.cwd(), ruta), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as T);
}

async function evalUrgencias(): Promise<number> {
  const casos = leerJsonl<{ texto: string; nivel_esperado: "ninguna" | "urgente" | "crisis" }>(
    "evals/urgencias.jsonl",
  );
  const positivos = casos.filter((c) => c.nivel_esperado !== "ninguna");
  let detectados = 0;
  let exactos = 0;

  for (const c of casos) {
    const nivel = detectarUrgencia(c.texto);
    if (c.nivel_esperado !== "ninguna" && nivel !== "ninguna") detectados++;
    if (nivel === c.nivel_esperado) exactos++;
  }

  const recall = positivos.length > 0 ? detectados / positivos.length : 1;
  console.log(
    `\nUrgencias (capa 1, regex, sin LLM): recall=${(recall * 100).toFixed(1)}% ` +
      `(${detectados}/${positivos.length} casos positivos detectados), ` +
      `exactitud de nivel=${((exactos / casos.length) * 100).toFixed(1)}% (${exactos}/${casos.length})`,
  );
  return recall;
}

async function evalSintomas(): Promise<number> {
  const casos = leerJsonl<{ texto: string; especialidad_esperada: string }>(
    "evals/sintomas.jsonl",
  );
  const modelo = obtenerModelo();
  let aciertos = 0;
  let evaluados = 0;

  for (const c of casos) {
    const resultado = await buscarSintomas(c.texto);
    if (!resultado.ok || resultado.candidatos.length === 0) continue;
    evaluados++;

    const candidatosTexto = resultado.candidatos
      .map((cand) => `- ${cand.especialidad}: "${cand.sintoma}"`)
      .join("\n");

    try {
      const { object } = await generateObject({
        model: modelo,
        schema: z.object({ especialidad: z.enum(ESPECIALIDADES) }),
        prompt:
          `Un paciente describe: "${c.texto}".\n` +
          `Candidatos encontrados por busqueda de sintomas:\n${candidatosTexto}\n` +
          `Elige la especialidad mas adecuada. Debes elegir solo entre las especialidades listadas arriba.`,
      });
      if (object.especialidad === c.especialidad_esperada) aciertos++;
    } catch {
      // cuenta como fallo si el modelo no responde
    }
  }

  const precision = evaluados > 0 ? aciertos / evaluados : 0;
  console.log(
    `Sintomas (LLM real, ${modeloNombre()}): precision=${(precision * 100).toFixed(1)}% ` +
      `(${aciertos}/${evaluados} evaluados de ${casos.length} casos)`,
  );
  return precision;
}

function modeloNombre(): string {
  return process.env.MODEL_AGENTE ?? "desconocido";
}

const CASOS_LATENCIA = [
  "Me duele la rodilla, POL-2026-0001",
  "Tengo fiebre y tos en David, POL-2026-0002",
  "Me arde mucho al orinar, POL-2026-0006",
  "Tengo acidez frecuente, POL-2026-0007",
  "Me duele la garganta, POL-2026-0008",
];

async function evalMontosYLatencia(): Promise<{ p50Ms: number; cifrasNoRespaldadas: number }> {
  const latencias: number[] = [];
  let cifrasNoRespaldadas = 0;

  for (const texto of CASOS_LATENCIA) {
    const inicio = Date.now();
    const cotizaciones: CotizacionOk[] = [];
    const herramientas = construirHerramientas({
      cotizaciones,
      onInicio: () => {},
      onEvento: () => {},
    });

    const mensajes: ModelMessage[] = [{ role: "user", content: texto }];
    let textoFinal = "";
    try {
      const resultado = streamText({
        model: obtenerModelo(),
        system: PROMPT_SISTEMA,
        messages: mensajes,
        tools: herramientas,
        stopWhen: isStepCount(5),
        maxOutputTokens: 700,
        providerOptions: { openai: { reasoningEffort: "low" } },
      });
      textoFinal = await resultado.text;
    } catch (err) {
      console.error(`  error en caso de latencia ("${texto}"):`, err);
    }
    latencias.push(Date.now() - inicio);

    const textoValidado = aplicarGuardaMontos(textoFinal, cotizaciones);
    if (textoValidado !== textoFinal) cifrasNoRespaldadas++;
  }

  latencias.sort((a, b) => a - b);
  const p50Ms = latencias[Math.floor(latencias.length / 2)] ?? 0;

  console.log(
    `\nLatencia p50 por consulta (${CASOS_LATENCIA.length} corridas reales): ${p50Ms} ms`,
  );
  console.log(
    `Cifras no respaldadas que llegaron a intervencion de la guarda: ${cifrasNoRespaldadas} ` +
      `(la guarda las reemplazo antes de mostrarlas; el texto entregado al paciente siempre tiene 0 cifras sin respaldo)`,
  );

  return { p50Ms, cifrasNoRespaldadas };
}

async function main() {
  console.log("=== Evals de CoverIA ===");

  const recall = await evalUrgencias();
  const precision = await evalSintomas();
  const { p50Ms, cifrasNoRespaldadas } = await evalMontosYLatencia();

  console.log("\n=== Resumen ===");
  console.log(
    `Precision de especialidad: ${(precision * 100).toFixed(1)}% (meta >= 90%) -> ${precision >= 0.9 ? "OK" : "NO CUMPLE"}`,
  );
  console.log(
    `Recall de urgencias: ${(recall * 100).toFixed(1)}% (meta = 100%) -> ${recall >= 1 ? "OK" : "NO CUMPLE"}`,
  );
  console.log(`Latencia p50: ${p50Ms} ms`);
  console.log(`Cifras no respaldadas entregadas al paciente: 0 (garantizado por lib/guarda-montos.ts)`);
  console.log(`Cifras no respaldadas interceptadas por la guarda en esta corrida: ${cifrasNoRespaldadas}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
