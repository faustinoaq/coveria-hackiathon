import { describe, expect, it } from "vitest";
import { construirHerramientas, construirPromptSistema, PROMPT_SISTEMA } from "../lib/agente";

describe("construirPromptSistema: poliza/ciudad por defecto", () => {
  it("devuelve el prompt base sin contexto", () => {
    expect(construirPromptSistema()).toBe(PROMPT_SISTEMA);
    expect(construirPromptSistema({})).toBe(PROMPT_SISTEMA);
  });

  it("agrega la poliza y ciudad por defecto cuando se proveen", () => {
    const prompt = construirPromptSistema({
      polizaDefecto: "POL-2026-0009",
      ciudadDefecto: "David",
    });
    expect(prompt.startsWith(PROMPT_SISTEMA)).toBe(true);
    expect(prompt).toContain("POL-2026-0009");
    expect(prompt).toContain("David");
  });

  it("agrega solo la poliza si no hay ciudad por defecto", () => {
    const prompt = construirPromptSistema({ polizaDefecto: "POL-2026-0009" });
    expect(prompt).toContain("POL-2026-0009");
    expect(prompt).not.toContain("Ciudad por defecto");
  });
});

describe("construirHerramientas: buscar_sintomas, limite de intentos", () => {
  it("devuelve E005 al tercer intento sin un candidato claro", async () => {
    const eventos: unknown[] = [];
    const herramientas = construirHerramientas({
      cotizaciones: [],
      onInicio: () => {},
      onEvento: (e) => eventos.push(e),
    });

    const opciones = { toolCallId: "t", messages: [], abortSignal: undefined } as never;
    const texto = "zzzzz qqqqq xxxxx wwwww";

    const r1 = await herramientas.buscar_sintomas.execute!({ texto }, opciones);
    const r2 = await herramientas.buscar_sintomas.execute!({ texto }, opciones);
    const r3 = await herramientas.buscar_sintomas.execute!({ texto }, opciones);

    expect((r1 as { ok: boolean }).ok).toBe(true);
    expect((r2 as { ok: boolean }).ok).toBe(true);
    expect((r3 as { ok: boolean; codigo?: string }).codigo).toBe("E005");
    expect(eventos.length).toBe(3);
  });
});

describe("construirHerramientas: cotizar acumula en contexto.cotizaciones", () => {
  it("agrega la cotizacion exitosa al arreglo compartido", async () => {
    const cotizaciones: unknown[] = [];
    const herramientas = construirHerramientas({ cotizaciones: cotizaciones as never, onInicio: () => {}, onEvento: () => {} });
    const opciones = { toolCallId: "t", messages: [], abortSignal: undefined } as never;

    await herramientas.cotizar.execute!(
      { numero_poliza: "POL-2026-0001", especialidad: "ORTOPEDIA", ciudad: null },
      opciones,
    );

    expect(cotizaciones.length).toBe(1);
  });
});
