import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { buscarPoliza } from "@/lib/herramientas/buscar-poliza";
import { buscarSintomas } from "@/lib/herramientas/buscar-sintomas";
import { cotizar, cotizarInputSchema } from "@/lib/herramientas/cotizar";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "buscar_poliza",
      {
        title: "Buscar poliza",
        description:
          "Busca una poliza de Aseguradora Istmo Demo por su numero y valida su estado y vigencia.",
        inputSchema: z.object({
          numero_poliza: z.string().describe("Formato POL-AAAA-NNNN"),
        }),
      },
      async ({ numero_poliza }) => {
        const resultado = await buscarPoliza(numero_poliza);
        return { content: [{ type: "text", text: JSON.stringify(resultado) }] };
      },
    );

    server.registerTool(
      "buscar_sintomas",
      {
        title: "Buscar sintomas",
        description:
          "Busca hasta 5 especialidades candidatas a partir de la descripcion de un sintoma.",
        inputSchema: z.object({
          texto: z.string().describe("Descripcion del sintoma en palabras del paciente"),
        }),
      },
      async ({ texto }) => {
        const resultado = await buscarSintomas(texto);
        return { content: [{ type: "text", text: JSON.stringify(resultado) }] };
      },
    );

    server.registerTool(
      "cotizar",
      {
        title: "Cotizar",
        description:
          "Calcula el copago exacto y compara hasta 3 hospitales de la red para una poliza y especialidad ya validadas.",
        inputSchema: cotizarInputSchema,
      },
      async (input) => {
        const resultado = await cotizar(input);
        return { content: [{ type: "text", text: JSON.stringify(resultado) }] };
      },
    );
  },
  { serverInfo: { name: "coveria", version: "1.0.0" } },
);

const handlerConAuth = withMcpAuth(
  handler,
  async (_req, bearerToken) => {
    const esperado = process.env.MCP_TOKEN;
    if (!esperado || !bearerToken || bearerToken !== esperado) return undefined;
    return { token: bearerToken, clientId: "coveria-mcp-client", scopes: [] };
  },
  { required: true },
);

export { handlerConAuth as GET, handlerConAuth as POST };
