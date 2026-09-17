import { describe, expect, it } from "vitest";
import { detectarUrgencia } from "../lib/urgencias";

describe("detectarUrgencia: frases positivas", () => {
  const casos: Array<[string, "urgente" | "crisis"]> = [
    ["Dolor fuerte en el pecho, POL-2026-0003", "urgente"],
    ["Tengo un dolor en el pecho que se me va al brazo", "urgente"],
    ["No puedo respirar bien desde hace una hora", "urgente"],
    ["Me ahogo, no me entra el aire", "urgente"],
    ["Se desmayo en la casa y no reacciona", "urgente"],
    ["Perdio el conocimiento hace unos minutos", "urgente"],
    ["Tiene un sangrado abundante en la pierna", "urgente"],
    ["Se le durmio un lado del cuerpo y la cara se le cayo", "urgente"],
    ["Le esta dando una convulsion ahora mismo", "urgente"],
    ["Tengo pensamientos de hacerme dano", "crisis"],
    ["Ya no quiero seguir viviendo", "crisis"],
    ["Siento ganas de morirme", "crisis"],
  ];

  for (const [texto, esperado] of casos) {
    it(`"${texto}" -> ${esperado}`, () => {
      expect(detectarUrgencia(texto)).toBe(esperado);
    });
  }
});

describe("detectarUrgencia: frases negativas", () => {
  const casos = [
    "Me duele la rodilla, POL-2026-0001",
    "Tengo fiebre y tos en David, POL-2026-0002",
    "Quiero un chequeo general de rutina",
    "Me duele un poco el pecho del gimnasio de ayer",
    "Tengo picazon en la piel desde hace dias",
    "Necesito control prenatal",
  ];

  for (const texto of casos) {
    it(`"${texto}" -> ninguna`, () => {
      expect(detectarUrgencia(texto)).toBe("ninguna");
    });
  }
});
