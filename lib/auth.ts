import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

// Formato `scrypt:N:r:p:sal:hash` (base64url). El spec sugiere `$` como
// separador, pero el loader de variables de entorno de Next.js (`@next/env`)
// interpola `$nombre` dentro de los archivos `.env*` (ver `dotenv-expand`),
// lo que corrompe un valor con `$` seguido de digitos/base64 en `next dev`
// y `next build` locales. Se usa `:` para evitar ese conflicto de forma
// permanente; ver PROGRESS.md.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt.toString("base64url")}:${derived.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  const salt = Buffer.from(saltB64, "base64url");
  const expected = Buffer.from(hashB64, "base64url");
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }
  const derived = scryptSync(password, salt, expected.length, { N, r, p });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

const COOKIE_NAME = "coveria_session";

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no esta definido");
  return new TextEncoder().encode(secret);
}

function getSessionHoras(): number {
  const raw = process.env.SESSION_HORAS;
  const horas = raw ? Number(raw) : 8;
  return Number.isFinite(horas) && horas > 0 ? horas : 8;
}

export interface SessionPayload {
  sub: string;
}

export async function crearSessionToken(usuario: string): Promise<string> {
  const horas = getSessionHoras();
  return new SignJWT({ sub: usuario })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${horas}h`)
    .sign(getSessionSecret());
}

export async function verificarSessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string") return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export async function obtenerSesion(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarSessionToken(token);
}

export { COOKIE_NAME };
