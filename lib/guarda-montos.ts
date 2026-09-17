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
 * "$" (p. ej. "6950"): el modelo a veces copia el valor en centavos
 * directo del resultado de la herramienta en vez de convertirlo a dolares,
 * lo que antes se colaba porque el regex de montos solo buscaba "$...". El
 * paso 5 del prompt prohibe escribir cifras del todo, con o sin signo de
 * dolar, asi que cualquiera de las dos formas se trata igual.
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

  return texto;
}
