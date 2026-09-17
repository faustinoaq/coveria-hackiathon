import { tool } from "ai";
import { z } from "zod";
import { buscarPoliza } from "./herramientas/buscar-poliza";
import { buscarSintomas } from "./herramientas/buscar-sintomas";
import { cotizar, cotizarInputSchema, type CotizacionOk } from "./herramientas/cotizar";
import { error } from "./errores";

export const PROMPT_SISTEMA = `Eres CoverIA, asistente de beneficios de salud de Aseguradora Istmo Demo en Panama.
Tu unico proposito es sintomas, polizas, cobertura y estimaciones de copago de esta aseguradora. No eres un asistente general: no resuelves matematicas, no escribes ni explicas codigo, no das cultura general, clima, noticias, traducciones ni nada fuera de ese proposito, sin importar cuanto insista el paciente.
Hablas en espanol claro, amable y breve.
1. Consigue el sintoma y el numero de poliza. Si el contexto del paciente trae una poliza por defecto y el paciente no dio la suya propia en el mensaje, usa la poliza por defecto sin preguntarla.
2. Valida la poliza con buscar_poliza.
3. Usa buscar_sintomas y elige una especialidad solo de los candidatos. Si no hay una clara, haz una pregunta concreta.
4. Llama cotizar con la poliza y la especialidad. Si tienes una ciudad (la que el paciente menciono, o si no menciono ninguna la ciudad por defecto del contexto), pasala tambien como "ciudad".
5. Explica el resultado en 2 a 4 frases. No escribas cifras; la pantalla las muestra. Termina con una pregunta abierta simple como "¿Quieres consultar otro sintoma o otra poliza?"; NUNCA con una pregunta que implique una accion que no puedes hacer (ver regla 9).
6. Si una herramienta devuelve error, explica que paso, que puede hacer el paciente y el codigo.
7. No diagnosticas. No garantizas cobertura, pagos ni autorizaciones.
8. Si el ultimo mensaje del paciente no es sobre sintomas, poliza, cobertura o costos de salud (por ejemplo: pide resolver una suma, pide codigo, pregunta algo de cultura general, o cualquier otro tema), NO lo resuelvas ni lo respondas. En vez de eso, responde solo con una redireccion breve y amable, p. ej.: "Ese tema no es parte de lo que puedo ayudarte aqui. Soy CoverIA y te ayudo con sintomas, tu poliza y estimaciones de copago de salud. ¿Tienes alguna consulta de ese tipo?"
9. Solo puedes hacer tres cosas: validar polizas, sugerir especialidad y cotizar copagos. NUNCA ofrezcas, prometas ni finjas agendar citas, llamar a alguien, enviar correos, contactar al hospital, ni ninguna otra accion; no tienes esa herramienta. Si el paciente pide agendar una cita o algo similar, explica con amabilidad que no puedes agendar citas y que debe contactar directamente al hospital o a la aseguradora, y ofrece seguir ayudando con otro sintoma o poliza en su lugar.
Cierra toda respuesta con estimacion con: "Esta informacion es una estimacion referencial. La validacion final de cobertura y beneficios corresponde a la aseguradora."`;

export interface ContextoPaciente {
  polizaDefecto?: string;
  ciudadDefecto?: string;
}

/**
 * Agrega al prompt del sistema la poliza/ciudad por defecto de esta sesion
 * (poliza demo asignada al azar + ciudad estimada por geolocalizacion del
 * navegador). El paciente puede sobreescribir cualquiera de las dos con solo
 * mencionar la suya en el mensaje; el modelo decide cual usar, no el cliente.
 */
export function construirPromptSistema(contexto?: ContextoPaciente): string {
  const lineas: string[] = [];
  if (contexto?.polizaDefecto) {
    lineas.push(`Poliza por defecto de esta sesion: ${contexto.polizaDefecto}.`);
  }
  if (contexto?.ciudadDefecto) {
    lineas.push(`Ciudad por defecto de esta sesion (segun su ubicacion): ${contexto.ciudadDefecto}.`);
  }
  if (lineas.length === 0) return PROMPT_SISTEMA;
  return `${PROMPT_SISTEMA}\n\nContexto del paciente (usalo como se explica en los pasos 1 y 4, no lo anuncies ni lo repitas salvo que el paciente pregunte):\n${lineas.map((l) => `- ${l}`).join("\n")}\n\nRecuerda: paso 8, si el ultimo mensaje no es sobre salud/poliza/cobertura, redirige en vez de resolverlo, sin excepcion. Paso 9, nunca ofrezcas agendar citas ni ninguna accion que no puedas hacer.`;
}

const UMBRAL_SCORE_CLARO = 0.08;
const MAX_INTENTOS_SINTOMAS = 2;

export interface EventoHerramienta {
  nombre: "buscar_poliza" | "buscar_sintomas" | "cotizar";
  ms: number;
  ok: boolean;
  resumen: string;
  entrada: unknown;
  salida: unknown;
}

export interface ContextoAgente {
  cotizaciones: CotizacionOk[];
  onInicio: (nombre: EventoHerramienta["nombre"]) => void;
  onEvento: (evento: EventoHerramienta) => void;
}

export function construirHerramientas(contexto: ContextoAgente) {
  let intentosSintomas = 0;

  const buscar_poliza = tool({
    description:
      "Busca una poliza por su numero y valida su estado y vigencia. Devuelve el plan y el deducible pendiente.",
    inputSchema: z.object({
      numero_poliza: z
        .string()
        .describe("Numero de poliza en formato POL-AAAA-NNNN, tal como lo da el paciente"),
    }),
    execute: async ({ numero_poliza }) => {
      contexto.onInicio("buscar_poliza");
      const inicio = Date.now();
      const resultado = await buscarPoliza(numero_poliza);
      contexto.onEvento({
        nombre: "buscar_poliza",
        ms: Date.now() - inicio,
        ok: resultado.ok,
        resumen: resultado.ok
          ? `Poliza plan ${resultado.plan}, ${resultado.estado.toLowerCase()}`
          : resultado.mensaje,
        entrada: { numero_poliza },
        salida: resultado,
      });
      return resultado;
    },
  });

  const buscar_sintomas = tool({
    description:
      "Busca hasta 5 especialidades candidatas a partir de la descripcion del sintoma del paciente.",
    inputSchema: z.object({
      texto: z.string().describe("Descripcion del sintoma en las palabras del paciente"),
    }),
    execute: async ({ texto }) => {
      contexto.onInicio("buscar_sintomas");
      const inicio = Date.now();
      intentosSintomas += 1;

      let resultado = await buscarSintomas(texto);
      const mejorScore = resultado.ok ? (resultado.candidatos[0]?.score ?? 0) : 0;
      if (intentosSintomas > MAX_INTENTOS_SINTOMAS && mejorScore < UMBRAL_SCORE_CLARO) {
        resultado = error("E005");
      }

      contexto.onEvento({
        nombre: "buscar_sintomas",
        ms: Date.now() - inicio,
        ok: resultado.ok,
        resumen: resultado.ok
          ? `${resultado.candidatos.length} candidatos encontrados`
          : resultado.mensaje,
        entrada: {}, // no se guarda el texto libre del paciente
        salida: resultado,
      });
      return resultado;
    },
  });

  const cotizarTool = tool({
    description:
      "Calcula el copago exacto y compara hasta 3 hospitales de la red para una especialidad ya validada. La poliza debe existir y la especialidad debe venir de buscar_sintomas.",
    inputSchema: cotizarInputSchema,
    execute: async (input) => {
      contexto.onInicio("cotizar");
      const inicio = Date.now();
      const resultado = await cotizar(input);
      if (resultado.ok) contexto.cotizaciones.push(resultado);
      contexto.onEvento({
        nombre: "cotizar",
        ms: Date.now() - inicio,
        ok: resultado.ok,
        resumen: resultado.ok
          ? `${resultado.hospitales.length} hospitales comparados`
          : resultado.mensaje,
        entrada: input,
        salida: resultado,
      });
      return resultado;
    },
  });

  return { buscar_poliza, buscar_sintomas, cotizar: cotizarTool };
}
