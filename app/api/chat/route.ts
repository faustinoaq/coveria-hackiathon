import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { obtenerSesion } from "@/lib/auth";
import { error } from "@/lib/errores";
import { detectarUrgencia } from "@/lib/urgencias";
import { construirHerramientas, construirPromptSistema } from "@/lib/agente";
import { obtenerModelo } from "@/lib/modelo";
import { crearRun, crearRunId, cerrarRun, registrarEvento, type TipoEvento } from "@/lib/eventos";
import { aplicarGuardaMontos } from "@/lib/guarda-montos";
import { obtenerIp, verificarLimite } from "@/lib/limites";
import type { CotizacionOk } from "@/lib/herramientas/cotizar";

export const maxDuration = 30;

const cuerpoSchema = z.object({
  messages: z.array(z.any()).min(1),
  contexto: z
    .object({
      poliza_defecto: z.string().trim().min(1).optional(),
      ciudad_defecto: z.string().trim().min(1).optional(),
    })
    .optional(),
});

function extraerTextoUsuario(mensajes: UIMessage[]): string {
  for (let i = mensajes.length - 1; i >= 0; i--) {
    const mensaje = mensajes[i];
    if (mensaje.role !== "user") continue;
    return mensaje.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ");
  }
  return "";
}

export async function POST(request: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json(error("E401"), { status: 401 });

  const ip = obtenerIp(request.headers);
  const maxConsultas = Number(process.env.MAX_CONSULTAS_POR_HORA ?? "20") || 20;
  const limite = await verificarLimite(`chat:${sesion.sub}:${ip}`, maxConsultas, 60 * 60 * 1000);
  if (!limite.permitido) {
    return NextResponse.json(error("E429"), { status: 429 });
  }

  const cuerpo = await request.json().catch(() => null);
  const parsed = cuerpoSchema.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(error("E204", "Solicitud invalida"), { status: 400 });
  }

  const mensajes = parsed.data.messages.slice(-10) as UIMessage[];
  const textoUsuario = extraerTextoUsuario(mensajes);
  const nivelUrgencia = detectarUrgencia(textoUsuario);
  const promptSistema = construirPromptSistema({
    polizaDefecto: parsed.data.contexto?.poliza_defecto,
    ciudadDefecto: parsed.data.contexto?.ciudad_defecto,
  });

  const runId = crearRunId();
  const inicioRun = Date.now();
  await crearRun(runId, nivelUrgencia !== "ninguna").catch(() => {});

  let seq = 0;
  async function registrar(
    tipo: TipoEvento,
    nombre: string,
    estado: string,
    ms?: number,
    resumen?: string,
    payload?: unknown,
  ) {
    seq += 1;
    await registrarEvento(runId, { seq, tipo, nombre, estado, ms, resumen, payload }).catch(() => {});
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({
        type: "data-urgencia",
        id: "urgencia",
        data: { nivel: nivelUrgencia, runId },
      });

      if (nivelUrgencia === "crisis") {
        await registrar("urgencia", "capa1", "crisis", 0, "pensamientos de hacerse dano");
        const lineaCrisis = process.env.CRISIS_LINE ?? "169";
        const emergencia = process.env.EMERGENCY_NUMBER ?? "911";
        const texto =
          `Percibo que estas pasando por un momento muy dificil y quiero que estes seguro. ` +
          `Por favor comunicate ahora con la Linea de Crisis ${lineaCrisis} o acude a una sala de emergencias (${emergencia}). ` +
          `No estas solo, hay personas listas para ayudarte. ` +
          `Esta informacion es una estimacion referencial. La validacion final de cobertura y beneficios corresponde a la aseguradora.`;
        writer.write({ type: "text-start", id: "t1" });
        writer.write({ type: "text-delta", id: "t1", delta: texto });
        writer.write({ type: "text-end", id: "t1" });
        await cerrarRun(runId, Date.now() - inicioRun).catch(() => {});
        return;
      }

      if (nivelUrgencia === "urgente") {
        await registrar("urgencia", "capa1", "urgente", 0, "patron de urgencia detectado en el texto");
      }

      const cotizaciones: CotizacionOk[] = [];
      const herramientas = construirHerramientas({
        cotizaciones,
        onInicio: (nombre) => {
          writer.write({
            type: "data-paso",
            id: `paso-${nombre}`,
            data: { nombre, estado: "activo" },
          });
        },
        onEvento: (evento) => {
          writer.write({
            type: "data-paso",
            id: `paso-${evento.nombre}`,
            data: {
              nombre: evento.nombre,
              estado: evento.ok ? "hecho" : "error",
              ms: evento.ms,
              resumen: evento.resumen,
              entrada: evento.entrada,
              salida: evento.salida,
            },
          });
          void registrar(
            "herramienta",
            evento.nombre,
            evento.ok ? "ok" : "error",
            evento.ms,
            evento.resumen,
            { entrada: evento.entrada, salida: evento.salida },
          );
        },
      });

      let textoFinal = "";
      try {
        const resultado = streamText({
          model: obtenerModelo(),
          system: promptSistema,
          messages: await convertToModelMessages(mensajes),
          tools: herramientas,
          stopWhen: isStepCount(5),
          maxOutputTokens: 700,
          providerOptions: {
            openai: { reasoningEffort: "low" },
          },
        });
        textoFinal = await resultado.text;
      } catch {
        await registrar("error", "llm", "error", undefined, "El modelo no respondio a tiempo");
        textoFinal =
          "No pude completar la consulta en este momento. Intenta de nuevo en unos segundos. Codigo E201.";
      }

      const textoValidado = aplicarGuardaMontos(textoFinal || FRASE_RESPALDO, cotizaciones);
      // Se guarda la respuesta de CoverIA (no el texto libre del paciente,
      // ver la nota de B.10 en lib/eventos.ts) para poder mostrarla en
      // /runs/[id] como el "chat" de la consulta.
      await registrar("llm", "respuesta", "ok", undefined, undefined, { texto: textoValidado });

      writer.write({ type: "text-start", id: "t1" });
      writer.write({ type: "text-delta", id: "t1", delta: textoValidado });
      writer.write({ type: "text-end", id: "t1" });

      const ultimaCotizacion = cotizaciones[cotizaciones.length - 1];
      if (ultimaCotizacion) {
        writer.write({ type: "data-estimacion", id: "estimacion", data: ultimaCotizacion });
      }

      await cerrarRun(runId, Date.now() - inicioRun).catch(() => {});
    },
  });

  return createUIMessageStreamResponse({ stream });
}

const FRASE_RESPALDO =
  "No encontre una respuesta clara. Cuentame de nuevo tu sintoma y tu numero de poliza. " +
  "Esta informacion es una estimacion referencial. La validacion final de cobertura y beneficios corresponde a la aseguradora.";
