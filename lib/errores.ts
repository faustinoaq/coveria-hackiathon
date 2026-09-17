export const ERRORES = {
  E001: "No se encontro la poliza",
  E002: "Poliza inactiva o fuera de vigencia",
  E003: "No existe cobertura definida para la especialidad",
  E005: "No fue posible identificar la especialidad",
  E101: "Beneficio no cubierto por el plan",
  E102: "No hay hospitales de la red para la especialidad",
  E201: "El modelo no respondio a tiempo",
  E203: "Error al consultar la base de datos",
  E204: "Error interno durante el calculo",
  E401: "Sesion requerida o vencida",
  E429: "Limite de consultas o de intentos de acceso alcanzado",
} as const;

export type CodigoError = keyof typeof ERRORES;

export interface ResultadoError {
  ok: false;
  codigo: CodigoError;
  mensaje: string;
}

export function error(codigo: CodigoError, mensaje?: string): ResultadoError {
  return { ok: false, codigo, mensaje: mensaje ?? ERRORES[codigo] };
}
