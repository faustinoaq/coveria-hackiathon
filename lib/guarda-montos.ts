import { moneda } from "./formato";
import type { CotizacionOk } from "./herramientas/cotizar";

const REGEX_MONTO = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g;

export function extraerMontos(texto: string): string[] {
  return (texto.match(REGEX_MONTO) ?? []).map((m) => m.replace(/\s+/g, ""));
}

export function recopilarMontosPermitidos(cotizaciones: CotizacionOk[]): Set<string> {
  const permitidos = new Set<string>();
  for (const centavos of recopilarCentavosPermitidos(cotizaciones)) {
    permitidos.add(moneda(centavos));
  }
  return permitidos;
}

/** Los mismos montos que `recopilarMontosPermitidos`, pero en centavos crudos (sin formatear). */
export function recopilarCentavosPermitidos(cotizaciones: CotizacionOk[]): Set<number> {
  const centavos = new Set<number>();
  for (const c of cotizaciones) {
    centavos.add(c.copago_fijo);
    centavos.add(c.deducible_pendiente);
    for (const h of c.hospitales) {
      centavos.add(h.tarifa);
      centavos.add(h.deducible_aplicado);
      centavos.add(h.coaseguro_paciente);
      centavos.add(h.copago);
      centavos.add(h.pago_paciente);
      centavos.add(h.pago_aseguradora);
    }
  }
  return centavos;
}

const REGEX_NUMERO_CRUDO = /\d{3,}/g;

const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiun: 21, veintiuno: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27,
  veintiocho: 28, veintinueve: 29,
};

const DECENAS: Record<string, number> = {
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};

const CENTENAS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400,
  quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
};

const PALABRAS_NUMERICAS = new Set([
  ...Object.keys(UNIDADES),
  ...Object.keys(DECENAS),
  ...Object.keys(CENTENAS),
  "mil",
]);

function quitarAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Interpreta una corrida de palabras numericas en espanol (0 a 999,999) como entero. */
function parsearNumeroPalabras(palabras: string[]): number | null {
  let total = 0;
  let bloque = 0;
  let usado = false;

  for (const palabra of palabras) {
    if (palabra === "y") continue;
    if (palabra === "mil") {
      total += (bloque === 0 ? 1 : bloque) * 1000;
      bloque = 0;
      usado = true;
      continue;
    }
    if (palabra in CENTENAS) {
      bloque += CENTENAS[palabra];
    } else if (palabra in DECENAS) {
      bloque += DECENAS[palabra];
    } else if (palabra in UNIDADES) {
      bloque += UNIDADES[palabra];
    } else {
      return null;
    }
    usado = true;
  }

  return usado ? total + bloque : null;
}

/**
 * Encuentra numeros escritos en palabras dentro de un texto libre (p. ej.
 * "veintitres mil" -> 23000). El modelo a veces spelling-eatea el valor en
 * centavos en vez de escribir el digito, lo que el regex de numeros crudos
 * no puede atrapar.
 */
export function extraerNumerosEnPalabras(texto: string): number[] {
  const palabras = quitarAcentos(texto.toLowerCase())
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const numeros: number[] = [];
  let corrida: string[] = [];

  const cerrarCorrida = () => {
    if (corrida.length > 0) {
      const valor = parsearNumeroPalabras(corrida);
      if (valor !== null) numeros.push(valor);
      corrida = [];
    }
  };

  for (let i = 0; i < palabras.length; i++) {
    const palabra = palabras[i];
    const esConectorValido =
      palabra === "y" && corrida.length > 0 && PALABRAS_NUMERICAS.has(palabras[i + 1] ?? "");
    if (PALABRAS_NUMERICAS.has(palabra) || esConectorValido) {
      corrida.push(palabra);
    } else {
      cerrarCorrida();
    }
  }
  cerrarCorrida();

  return numeros;
}

// Umbral para evitar falsos positivos con numeros pequenos que aparecen por
// razones no monetarias ("tres hospitales", "setenta por ciento"): ningun
// monto real en esta app baja de este rango.
const UMBRAL_MONTO_PALABRAS = 100;

export const FRASE_SIN_CIFRAS =
  "Aqui tienes tu estimacion. Revisa la tarjeta de resultados para ver los montos exactos por hospital. " +
  "Esta informacion es una estimacion referencial. La validacion final de cobertura y beneficios corresponde a la aseguradora.";

/**
 * Guarda de montos: toda cifra en el texto del agente debe existir en las
 * salidas de `cotizar`. Si alguna cifra no esta respaldada, se reemplaza
 * todo el texto por una frase plantilla (la tarjeta de estimacion sigue
 * mostrando los montos reales calculados en codigo).
 *
 * Ademas de las cifras formateadas ("$69.50"), se revisan numeros crudos sin
 * "$" (p. ej. "6950") y numeros escritos en palabras (p. ej. "veintitres
 * mil"): el modelo a veces copia el valor en centavos directo del resultado
 * de la herramienta, con o sin convertirlo a dolares, o lo deletrea en vez
 * de escribir el digito ("seis mil novecientos cincuenta" en vez de
 * "$69.50" — una diferencia de 100x que el paciente no deberia ver). El
 * paso 5 del prompt prohibe escribir cifras del todo, en cualquier forma.
 */
export function aplicarGuardaMontos(texto: string, cotizaciones: CotizacionOk[]): string {
  const montosEncontrados = extraerMontos(texto);
  if (montosEncontrados.length > 0) {
    const permitidos = recopilarMontosPermitidos(cotizaciones);
    if (!montosEncontrados.every((m) => permitidos.has(m))) return FRASE_SIN_CIFRAS;
  }

  const centavosPermitidos = recopilarCentavosPermitidos(cotizaciones);

  const numerosCrudos = (texto.match(REGEX_NUMERO_CRUDO) ?? []).map(Number);
  if (numerosCrudos.some((n) => centavosPermitidos.has(n))) return FRASE_SIN_CIFRAS;

  const numerosEnPalabras = extraerNumerosEnPalabras(texto);
  if (
    numerosEnPalabras.some(
      (n) => n >= UMBRAL_MONTO_PALABRAS && centavosPermitidos.has(n),
    )
  ) {
    return FRASE_SIN_CIFRAS;
  }

  return texto;
}
