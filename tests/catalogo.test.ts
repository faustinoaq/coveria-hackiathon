import { describe, expect, it } from "vitest";
import { sql } from "../lib/db";
import { NOMBRES_HOSPITALES_REALES } from "../lib/catalogo";

describe("catalogo: consistencia de datos sembrados", () => {
  it("toda especialidad de sintomas tiene cobertura en los 3 planes", async () => {
    const especialidades = await sql<{ especialidad: string }>`
      select distinct especialidad from sintomas
    `;
    expect(especialidades.length).toBeGreaterThan(0);

    for (const { especialidad } of especialidades) {
      const coberturas = await sql<{ count: string }>`
        select count(*)::int as count from coberturas where especialidad = ${especialidad}
      `;
      expect(Number(coberturas[0].count)).toBe(3);
    }
  });

  it("toda especialidad de sintomas tiene al menos 2 hospitales en red con tarifa", async () => {
    const especialidades = await sql<{ especialidad: string }>`
      select distinct especialidad from sintomas
    `;

    for (const { especialidad } of especialidades) {
      const hospitales = await sql<{ count: string }>`
        select count(*)::int as count
        from tarifas t
        join hospitales h on h.hospital_id = t.hospital_id
        where t.especialidad = ${especialidad} and h.en_red = true
      `;
      expect(Number(hospitales[0].count)).toBeGreaterThanOrEqual(2);
    }
  });

  it("no usa nombres de hospitales reales de Panama", async () => {
    const hospitales = await sql<{ nombre: string }>`select nombre from hospitales`;
    const nombresReales = new Set(NOMBRES_HOSPITALES_REALES.map((n) => n.toLowerCase()));
    for (const { nombre } of hospitales) {
      expect(nombresReales.has(nombre.toLowerCase())).toBe(false);
    }
  });
});
