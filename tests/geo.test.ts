import { describe, expect, it } from "vitest";
import { CIUDADES, ciudadMasCercana } from "../lib/geo";

describe("ciudadMasCercana", () => {
  it("devuelve la misma ciudad cuando la coordenada es su propio centroide", () => {
    for (const c of CIUDADES) {
      expect(ciudadMasCercana(c.lat, c.lon)).toBe(c.ciudad);
    }
  });

  it("elige David para una coordenada cercana a David, no Ciudad de Panama", () => {
    // Aeropuerto Enrique Malek, David, Chiriqui (aprox.)
    expect(ciudadMasCercana(8.3903, -82.4335)).toBe("David");
  });

  it("elige Ciudad de Panama para una coordenada en el casco urbano capitalino", () => {
    expect(ciudadMasCercana(8.9936, -79.5197)).toBe("Ciudad de Panama");
  });

  it("siempre devuelve una de las ciudades conocidas, incluso lejos de Panama", () => {
    const resultado = ciudadMasCercana(0, 0);
    expect(CIUDADES.map((c) => c.ciudad)).toContain(resultado);
  });
});
