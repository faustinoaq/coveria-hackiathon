import type { UIMessage } from "ai";
import type { NivelUrgencia } from "./urgencias";
import type { CotizacionOk } from "./herramientas/cotizar";

export interface DatosUrgencia {
  nivel: NivelUrgencia;
  runId: string;
}

export interface DatosPaso {
  nombre: "buscar_poliza" | "buscar_sintomas" | "cotizar";
  estado: "activo" | "hecho" | "error";
  ms?: number;
  resumen?: string;
  entrada?: unknown;
  salida?: unknown;
}

export type CoverIAUIMessage = UIMessage<
  never,
  {
    urgencia: DatosUrgencia;
    paso: DatosPaso;
    estimacion: CotizacionOk;
  }
>;
