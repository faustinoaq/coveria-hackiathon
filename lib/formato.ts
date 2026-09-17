/** Formatea centavos enteros como moneda es-PA, p. ej. "$1,000.00". */
export function moneda(centavos: number): string {
  const negativo = centavos < 0;
  const absoluto = Math.abs(Math.round(centavos));
  const dolares = Math.floor(absoluto / 100);
  const resto = absoluto % 100;
  const dolaresConSeparador = dolares.toLocaleString("en-US");
  return `${negativo ? "-" : ""}$${dolaresConSeparador}.${String(resto).padStart(2, "0")}`;
}

/** Formatea una fecha como dd/mm/aaaa en la zona America/Panama. */
export function fecha(valor: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Panama",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(valor);
  const dia = partes.find((p) => p.type === "day")?.value ?? "??";
  const mes = partes.find((p) => p.type === "month")?.value ?? "??";
  const anio = partes.find((p) => p.type === "year")?.value ?? "????";
  return `${dia}/${mes}/${anio}`;
}

/** Fecha actual en America/Panama, con hora fijada a medianoche local. */
export function hoyPanama(): Date {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Panama",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date());
  const dia = Number(partes.find((p) => p.type === "day")?.value);
  const mes = Number(partes.find((p) => p.type === "month")?.value);
  const anio = Number(partes.find((p) => p.type === "year")?.value);
  return new Date(Date.UTC(anio, mes - 1, dia));
}
