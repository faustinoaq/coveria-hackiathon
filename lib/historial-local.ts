export interface ConsultaHistorial {
  runId: string;
  fechaIso: string;
  especialidad: string;
  hospital: string;
  pagoPaciente: number;
}

const CLAVE = "coveria:historial";
const MAX_ITEMS = 15;

/** Historial de consultas guardado solo en este navegador (sin llamadas al backend). */
export function listarHistorial(): ConsultaHistorial[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLAVE);
    if (!raw) return [];
    const datos = JSON.parse(raw);
    return Array.isArray(datos) ? (datos as ConsultaHistorial[]) : [];
  } catch {
    return [];
  }
}

export function agregarHistorial(item: ConsultaHistorial): ConsultaHistorial[] {
  if (typeof window === "undefined") return [];
  try {
    const sinDuplicado = listarHistorial().filter((c) => c.runId !== item.runId);
    const actualizado = [item, ...sinDuplicado].slice(0, MAX_ITEMS);
    window.localStorage.setItem(CLAVE, JSON.stringify(actualizado));
    return actualizado;
  } catch {
    return listarHistorial();
  }
}
