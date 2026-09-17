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

export function obtenerIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "desconocida";
}
