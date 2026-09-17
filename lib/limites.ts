import { sql } from "./db";

export interface LimiteResultado {
  permitido: boolean;
}

/**
 * Ventana fija respaldada por `rate_limits`: incrementa el contador de
 * `clave` y lo compara contra `maximo`. Si la ventana anterior expiro, la
 * reinicia.
 */
export async function verificarLimite(
  clave: string,
  maximo: number,
  ventanaMs: number,
): Promise<LimiteResultado> {
  const ahora = new Date();
  const filas = await sql<{ conteo: number; expira: string }>`
    select conteo, expira from rate_limits where clave = ${clave}
  `;
  const fila = filas[0];

  if (!fila || new Date(fila.expira) <= ahora) {
    const expira = new Date(ahora.getTime() + ventanaMs);
    await sql`
      insert into rate_limits (clave, conteo, expira)
      values (${clave}, 1, ${expira.toISOString()})
      on conflict (clave) do update set conteo = 1, expira = excluded.expira
    `;
    return { permitido: true };
  }

  if (fila.conteo >= maximo) {
    return { permitido: false };
  }

  await sql`update rate_limits set conteo = conteo + 1 where clave = ${clave}`;
  return { permitido: true };
}

/**
 * Solo lectura: indica si `clave` ya alcanzo `maximo` dentro de la ventana
 * vigente, sin incrementar el contador. Para bloqueos por fuerza bruta,
 * donde solo los intentos fallidos deben contar (a diferencia de
 * `verificarLimite`, pensado para cuotas de uso donde toda llamada cuenta).
 */
export async function estaBloqueado(clave: string, maximo: number): Promise<boolean> {
  const filas = await sql<{ conteo: number; expira: string }>`
    select conteo, expira from rate_limits where clave = ${clave}
  `;
  const fila = filas[0];
  if (!fila || new Date(fila.expira) <= new Date()) return false;
  return fila.conteo >= maximo;
}

/** Registra un intento fallido, reiniciando la ventana si ya expiro. */
export async function registrarFallo(clave: string, ventanaMs: number): Promise<void> {
  const ahora = new Date();
  const filas = await sql<{ conteo: number; expira: string }>`
    select conteo, expira from rate_limits where clave = ${clave}
  `;
  const fila = filas[0];

  if (!fila || new Date(fila.expira) <= ahora) {
    const expira = new Date(ahora.getTime() + ventanaMs);
    await sql`
      insert into rate_limits (clave, conteo, expira)
      values (${clave}, 1, ${expira.toISOString()})
      on conflict (clave) do update set conteo = 1, expira = excluded.expira
    `;
    return;
  }

  await sql`update rate_limits set conteo = conteo + 1 where clave = ${clave}`;
}

/** Limpia los intentos fallidos registrados (p. ej. tras un login exitoso). */
export async function limpiarLimite(clave: string): Promise<void> {
  await sql`delete from rate_limits where clave = ${clave}`;
}

export function obtenerIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "desconocida";
}
