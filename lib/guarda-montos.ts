import { moneda } from "./formato";
import type { CotizacionOk } from "./herramientas/cotizar";

const REGEX_MONTO = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g;

export function extraerMontos(texto: string): string[] {
  return (texto.match(REGEX_MONTO) ?? []).map((m) => m.replace(/\s+/g, ""));
}

export function recopilarMontosPermitidos(cotizaciones: CotizacionOk[]): Set<string> {
  const permitidos = new Set<string>();
  const agregar = (centavos: number) => permitidos.add(moneda(centavos));

  for (const c of cotizaciones) {
    agregar(c.copago_fijo);
    agregar(c.deducible_pendiente);
    for (const h of c.hospitales) {
      agregar(h.tarifa);
      agregar(h.deducible_aplicado);
      agregar(h.coaseguro_paciente);
      agregar(h.copago);
      agregar(h.pago_paciente);
      agregar(h.pago_aseguradora);
    }
  }
  return permitidos;
}

export const FRASE_SIN_CIFRAS =
  "Aqui tienes tu estimacion. Revisa la tarjeta de resultados para ver los montos exactos por hospital. " +
  "Esta informacion es una estimacion referencial. La validacion final de cobertura y beneficios corresponde a la aseguradora.";

/**
 * Guarda de montos: toda cifra en el texto del agente debe existir en las
 * salidas de `cotizar`. Si alguna cifra no esta respaldada, se reemplaza
 * todo el texto por una frase plantilla (la tarjeta de estimacion sigue
 * mostrando los montos reales calculados en codigo).
 */
export function aplicarGuardaMontos(texto: string, cotizaciones: CotizacionOk[]): string {
  const montosEncontrados = extraerMontos(texto);
  if (montosEncontrados.length === 0) return texto;

  const permitidos = recopilarMontosPermitidos(cotizaciones);
  const todosRespaldados = montosEncontrados.every((m) => permitidos.has(m));

  return todosRespaldados ? texto : FRASE_SIN_CIFRAS;
}
