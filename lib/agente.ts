import { tool } from "ai";
import { z } from "zod";
import { buscarPoliza } from "./herramientas/buscar-poliza";
import { buscarSintomas } from "./herramientas/buscar-sintomas";
import { cotizar, cotizarInputSchema, type CotizacionOk } from "./herramientas/cotizar";
import { error } from "./errores";

export const PROMPT_SISTEMA = `Eres CoverIA, asistente de beneficios de salud de Aseguradora Istmo Demo en Panama.
Hablas en espanol claro, amable y breve.
1. Consigue el sintoma y el numero de poliza.
2. Valida la poliza con buscar_poliza.
3. Usa buscar_sintomas y elige una especialidad solo de los candidatos. Si no hay una clara, haz una pregunta concreta.
4. Llama cotizar con la poliza y la especialidad.
5. Explica el resultado en 2 a 4 frases. No escribas cifras; la pantalla las muestra.
6. Si una herramienta devuelve error, explica que paso, que puede hacer el paciente y el codigo.
7. No diagnosticas. No garantizas cobertura, pagos ni autorizaciones.
8. Si la consulta no es sobre beneficios de salud, redirige con amabilidad.
Cierra toda respuesta con estimacion con: "Esta informacion es una estimacion referencial. La validacion final de cobertura y beneficios corresponde a la aseguradora."`;

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
