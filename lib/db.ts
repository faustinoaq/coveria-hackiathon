import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL no esta definido");
    client = neon(url);
  }
  return client;
}

/**
 * Wrapper de `sql` con un reintento de espera corta: en el plan gratis de
 * Neon el computo se suspende tras inactividad y la primera consulta puede
 * fallar mientras se reactiva.
 */
export async function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const c = getClient();
  try {
    return (await c(strings, ...values)) as T[];
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return (await c(strings, ...values)) as T[];
  }
}
