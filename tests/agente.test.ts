import { describe, expect, it } from "vitest";
import { construirHerramientas } from "../lib/agente";

describe("construirHerramientas: buscar_sintomas, limite de intentos", () => {
  it("devuelve E005 al tercer intento sin un candidato claro", async () => {
    const eventos: unknown[] = [];
    const herramientas = construirHerramientas({
      cotizaciones: [],
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
    const herramientas = construirHerramientas({ cotizaciones: cotizaciones as never, onEvento: () => {} });
    const opciones = { toolCallId: "t", messages: [], abortSignal: undefined } as never;

    await herramientas.cotizar.execute!(
      { numero_poliza: "POL-2026-0001", especialidad: "ORTOPEDIA", ciudad: null },
      opciones,
    );

    expect(cotizaciones.length).toBe(1);
  });
});
