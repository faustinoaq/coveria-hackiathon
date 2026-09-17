import { moneda } from "./formato";
import type { CotizacionOk } from "./herramientas/cotizar";

// Una sola pasada, sin solapamiento: o "$" + digitos (con o sin comas/centavos,
// admite tanto "$1,234.56" como el glue malformado "$4200") o un numero
// crudo de 3+ digitos sin "$". Una alternancia en un solo regex evita que
// una correccion ya aplicada (p. ej. "$42.00") se vuelva a tocar en una
// segunda pasada por sus propios digitos internos.
const REGEX_CIFRA = /\$\s?\d[\d,]*(?:\.\d{2})?|\d{3,}/g;

export function extraerMontos(texto: string): string[] {
  return (texto.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g) ?? []).map((m) =>
    m.replace(/\s+/g, ""),
  );
}

/** Los montos reales de la cotizacion en centavos crudos (sin formatear). */
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

export function recopilarMontosPermitidos(cotizaciones: CotizacionOk[]): Set<string> {
  const permitidos = new Set<string>();
  for (const centavos of recopilarCentavosPermitidos(cotizaciones)) {
    permitidos.add(moneda(centavos));
  }
  return permitidos;
}

export const FRASE_SIN_CIFRAS =
  "Aqui tienes tu estimacion. Revisa la tarjeta de resultados para ver los montos exactos por hospital. " +
  "Esta informacion es una estimacion referencial. La validacion final de cobertura y beneficios corresponde a la aseguradora.";

/**
 * Guarda de montos. En vez de solo bloquear una respuesta con una cifra mal
 * escrita, primero intenta CORREGIRLA: el error mas comun del modelo es
 * copiar el valor crudo en centavos del resultado de `cotizar` en vez de
 * convertirlo a dolares (escribe "6950" o incluso "$6950" en vez de
 * "$69.50" — un error de 100x). Si el numero, una vez limpiado, coincide
 * exactamente con un monto real de la cotizacion, se reemplaza en el texto
 * por el formato correcto; si no coincide con nada real (cifra hallucinada
 * o numero no monetario como un numero de poliza), se deja igual en el caso
 * crudo o, si ya traia "$", se descarta toda la respuesta por no poder
 * garantizar que sea correcta.
 *
 * Esto solo corrige DIGITOS, no numeros deletreados en palabras ("veintitres
 * mil"): un parser de numeros en palabras que ademas cubra cualquier idioma
 * al que el modelo pudiera cambiar no escala razonablemente. En su lugar el
 * paso 5 del prompt le prohibe al modelo escribir cifras del todo, en
 * digitos o en palabras; esta guarda es la red de seguridad para cuando no
 * obedece con digitos, que es ademas el caso que se puede corregir con
 * certeza en vez de solo detectar y bloquear.
 */
export function aplicarGuardaMontos(texto: string, cotizaciones: CotizacionOk[]): string {
  const centavosPermitidos = recopilarCentavosPermitidos(cotizaciones);
  const montosFormateadosPermitidos = recopilarMontosPermitidos(cotizaciones);

  let huboCifraSinRespaldo = false;
  const corregido = texto.replace(REGEX_CIFRA, (coincidencia) => {
    const limpio = coincidencia.replace(/\s+/g, "");
    const esFormatoDolar = limpio.startsWith("$");

    if (esFormatoDolar && montosFormateadosPermitidos.has(limpio)) return limpio;

    const soloDigitos = Number(limpio.replace(/\D/g, ""));
    if (centavosPermitidos.has(soloDigitos)) return moneda(soloDigitos);

    if (esFormatoDolar) huboCifraSinRespaldo = true;
    return coincidencia;
  });

  return huboCifraSinRespaldo ? FRASE_SIN_CIFRAS : corregido;
}
