import { describe, expect, it } from "vitest";
import { evaluarPoliza, type PolizaRow } from "../lib/herramientas/buscar-poliza";
import { construirCotizacion } from "../lib/herramientas/cotizar";
import { cotizar } from "../lib/herramientas/cotizar";
import { buscarPoliza } from "../lib/herramientas/buscar-poliza";

const HOY = new Date(Date.UTC(2026, 8, 17));

function poliza(overrides: Partial<PolizaRow>): PolizaRow {
  return {
    numero_poliza: "POL-2026-0001",
    plan: "ORO",
    estado: "ACTIVA",
    vigente_desde: "2026-01-01",
    vigente_hasta: "2026-12-31",
    deducible_anual: 100000,
    deducible_consumido: 0,
    ...overrides,
  };
}

describe("evaluarPoliza", () => {
  it("E001: poliza inexistente", () => {
    const r = evaluarPoliza(undefined, HOY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("E001");
  });

  it("E002: poliza inactiva", () => {
    const r = evaluarPoliza(poliza({ estado: "INACTIVA" }), HOY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("E002");
  });

  it("E002: poliza vencida", () => {
    const r = evaluarPoliza(
      poliza({ vigente_desde: "2024-01-01", vigente_hasta: "2025-01-01" }),
      HOY,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("E002");
  });

  it("poliza activa y vigente calcula el deducible pendiente", () => {
    const r = evaluarPoliza(
      poliza({ deducible_anual: 50000, deducible_consumido: 20000 }),
      HOY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.deducible_pendiente).toBe(30000);
  });
});

describe("construirCotizacion", () => {
  const hospitales = [
    { hospital_id: "H1", nombre: "Hospital Uno", provincia: "Panama", ciudad: "Ciudad de Panama", rating: 4.5, tarifa: 9000 },
    { hospital_id: "H2", nombre: "Hospital Dos", provincia: "Panama", ciudad: "David", rating: 4.0, tarifa: 8500 },
  ];

  it("E003: no existe cobertura para la especialidad", () => {
    const r = construirCotizacion({
      plan: "ORO",
      especialidad: "ORTOPEDIA",
      deduciblePendiente: 0,
      cobertura: undefined,
      hospitales,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("E003");
  });

  it("E101: beneficio no cubierto por el plan", () => {
    const r = construirCotizacion({
      plan: "BRONCE",
      especialidad: "PSIQUIATRIA",
      deduciblePendiente: 0,
      cobertura: { cubierto: false, cobertura_pct: 0, copago_fijo: 0, aplica_deducible: true, limite_anual_info: null },
      hospitales,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("E101");
  });

  it("E102: no hay hospitales de la red para la especialidad", () => {
    const r = construirCotizacion({
      plan: "ORO",
      especialidad: "ORTOPEDIA",
      deduciblePendiente: 0,
      cobertura: { cubierto: true, cobertura_pct: 70, copago_fijo: 1500, aplica_deducible: true, limite_anual_info: null },
      hospitales: [],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("E102");
  });

  it("filtro de ciudad con fallback a todos cuando no hay resultados", () => {
    const r = construirCotizacion({
      plan: "ORO",
      especialidad: "ORTOPEDIA",
      deduciblePendiente: 0,
      cobertura: { cubierto: true, cobertura_pct: 70, copago_fijo: 1500, aplica_deducible: true, limite_anual_info: null },
      hospitales,
      ciudad: "Colon", // ninguno de los hospitales de prueba esta en Colon
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ciudad_sin_resultados).toBe(true);
      expect(r.hospitales.length).toBe(2);
    }
  });

  it("filtro de ciudad aplica cuando hay resultados", () => {
    const r = construirCotizacion({
      plan: "ORO",
      especialidad: "ORTOPEDIA",
      deduciblePendiente: 0,
      cobertura: { cubierto: true, cobertura_pct: 70, copago_fijo: 1500, aplica_deducible: true, limite_anual_info: null },
      hospitales,
      ciudad: "David",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ciudad_sin_resultados).toBe(false);
      expect(r.hospitales.length).toBe(1);
      expect(r.hospitales[0].hospital_id).toBe("H2");
    }
  });

  it("ordena por pago_paciente asc, rating desc, nombre asc y limita a 3", () => {
    const muchos = [
      { hospital_id: "A", nombre: "Zeta", provincia: "P", ciudad: "C", rating: 4.0, tarifa: 10000 },
      { hospital_id: "B", nombre: "Alfa", provincia: "P", ciudad: "C", rating: 4.0, tarifa: 10000 },
      { hospital_id: "C", nombre: "Beta", provincia: "P", ciudad: "C", rating: 4.9, tarifa: 5000 },
      { hospital_id: "D", nombre: "Gama", provincia: "P", ciudad: "C", rating: 4.0, tarifa: 20000 },
    ];
    const r = construirCotizacion({
      plan: "ORO",
      especialidad: "ORTOPEDIA",
      deduciblePendiente: 0,
      cobertura: { cubierto: true, cobertura_pct: 70, copago_fijo: 0, aplica_deducible: true, limite_anual_info: null },
      hospitales: muchos,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.hospitales.length).toBe(3);
      expect(r.hospitales[0].hospital_id).toBe("C"); // pago mas bajo (tarifa 5000)
      // A y B empatan en pago_paciente y rating: gana orden alfabetico (Alfa antes que Zeta)
      expect(r.hospitales[1].hospital_id).toBe("B");
    }
  });
});

describe("cotizar / buscarPoliza: casos reservados contra la base sembrada", () => {
  it("POL-2026-0001 + ORTOPEDIA reproduce el ejemplo de B.5 en HOSP-004", async () => {
    const r = await cotizar({ numero_poliza: "POL-2026-0001", especialidad: "ORTOPEDIA" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const hosp004 = r.hospitales.find((h) => h.hospital_id === "HOSP-004");
      expect(hosp004).toBeDefined();
      expect(hosp004?.tarifa).toBe(9000);
      expect(hosp004?.pago_paciente).toBe(4200);
      expect(hosp004?.pago_aseguradora).toBe(4800);
    }
  });

  it("POL-2026-0004 (inactiva) devuelve E002", async () => {
    const r = await buscarPoliza("POL-2026-0004");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("E002");
  });

  it("POL-2026-0005 (vencida) devuelve E002", async () => {
    const r = await buscarPoliza("POL-2026-0005");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("E002");
  });

  it("poliza inexistente devuelve E001", async () => {
    const r = await buscarPoliza("POL-2026-9999");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe("E001");
  });
});
