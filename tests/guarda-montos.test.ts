import { describe, expect, it } from "vitest";
import {
  aplicarGuardaMontos,
  extraerNumerosEnPalabras,
  FRASE_SIN_CIFRAS,
} from "../lib/guarda-montos";
import type { CotizacionOk } from "../lib/herramientas/cotizar";

const cotizacion: CotizacionOk = {
  ok: true,
  especialidad: "ORTOPEDIA",
  plan: "ORO",
  cobertura_pct: 70,
  copago_fijo: 1500,
  deducible_pendiente: 0,
  limite_anual_info: null,
  ciudad_sin_resultados: false,
  hospitales: [
    {
      hospital_id: "HOSP-004",
      nombre: "Clinica Altos del Rio",
      provincia: "Panama",
      ciudad: "Ciudad de Panama",
      rating: 4.3,
      tarifa: 9000,
      deducible_aplicado: 0,
      coaseguro_paciente: 2700,
      copago: 1500,
      pago_paciente: 4200,
      pago_aseguradora: 4800,
    },
  ],
  pasos: ["cobertura", "red", "calculo"],
};

describe("aplicarGuardaMontos", () => {
  it("deja pasar texto sin cifras", () => {
    const texto = "Tu estimacion esta lista, revisa la tarjeta de resultados.";
    expect(aplicarGuardaMontos(texto, [cotizacion])).toBe(texto);
  });

  it("deja pasar cifras respaldadas por una cotizacion real", () => {
    const texto = "Pagarias $42.00 en Clinica Altos del Rio.";
    expect(aplicarGuardaMontos(texto, [cotizacion])).toBe(texto);
  });

  it("reemplaza el texto si aparece una cifra no respaldada", () => {
    const texto = "Pagarias $999.99 en total.";
    expect(aplicarGuardaMontos(texto, [cotizacion])).toBe(FRASE_SIN_CIFRAS);
  });

  it("reemplaza el texto si hay cifras pero no hay cotizaciones", () => {
    const texto = "El copago es de $15.00.";
    expect(aplicarGuardaMontos(texto, [])).toBe(FRASE_SIN_CIFRAS);
  });

  it("reemplaza el texto si el modelo copia el centavo crudo sin formatear (bug real reportado)", () => {
    const texto = "El pago del paciente es 4200 y el de la aseguradora es 4800.";
    expect(aplicarGuardaMontos(texto, [cotizacion])).toBe(FRASE_SIN_CIFRAS);
  });

  it("deja pasar numeros de 1-2 digitos que no son montos (p. ej. porcentajes)", () => {
    const texto = "La cobertura es del 70 por ciento.";
    expect(aplicarGuardaMontos(texto, [cotizacion])).toBe(texto);
  });

  it("reemplaza el texto si el modelo deletrea el centavo crudo en palabras (bug reportado)", () => {
    const texto = "El pago del paciente es cuatro mil doscientos y el de la aseguradora es cuatro mil ochocientos.";
    expect(aplicarGuardaMontos(texto, [cotizacion])).toBe(FRASE_SIN_CIFRAS);
  });

  it("deja pasar conteos chicos deletreados que no son montos", () => {
    const texto = "Hay tres hospitales en la red y la cobertura es del setenta por ciento.";
    expect(aplicarGuardaMontos(texto, [cotizacion])).toBe(texto);
  });
});

describe("extraerNumerosEnPalabras", () => {
  it("interpreta numeros compuestos en espanol", () => {
    expect(extraerNumerosEnPalabras("veintitres mil")).toEqual([23000]);
    expect(extraerNumerosEnPalabras("seis mil novecientos cincuenta")).toEqual([6950]);
    expect(extraerNumerosEnPalabras("dos mil quinientos")).toEqual([2500]);
    expect(extraerNumerosEnPalabras("mil")).toEqual([1000]);
    expect(extraerNumerosEnPalabras("cien")).toEqual([100]);
  });

  it("ignora texto sin numeros", () => {
    expect(extraerNumerosEnPalabras("hola, como estas hoy")).toEqual([]);
  });
});
