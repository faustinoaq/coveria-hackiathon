import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import {
  crearSessionToken,
  hashPassword,
  verificarSessionToken,
  verifyPassword,
} from "../lib/auth";
import { estaBloqueado, limpiarLimite, registrarFallo, verificarLimite } from "../lib/limites";
import { sql } from "../lib/db";

beforeAll(() => {
  process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "prueba-secreta-para-tests-de-vitest";
  process.env.SESSION_HORAS = "8";
});

describe("hashPassword / verifyPassword (scrypt)", () => {
  it("verifica una contraseña correcta", async () => {
    const hash = await hashPassword("mi-clave-segura");
    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(await verifyPassword("mi-clave-segura", hash)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("mi-clave-segura");
    expect(await verifyPassword("otra-clave", hash)).toBe(false);
  });

  it("genera un salt distinto en cada llamada", async () => {
    const a = await hashPassword("misma-clave");
    const b = await hashPassword("misma-clave");
    expect(a).not.toBe(b);
  });
});

describe("sesion JWT", () => {
  it("crea y verifica un token valido", async () => {
    const token = await crearSessionToken("usuario");
    const payload = await verificarSessionToken(token);
    expect(payload?.sub).toBe("usuario");
  });

  it("rechaza un token vencido", async () => {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);
    const vencido = await new SignJWT({ sub: "usuario" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1800)
      .sign(secret);
    expect(await verificarSessionToken(vencido)).toBeNull();
  });

  it("rechaza un token con firma invalida", async () => {
    const otraFirma = new TextEncoder().encode("otro-secreto-distinto");
    const token = await new SignJWT({ sub: "usuario" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("8h")
      .sign(otraFirma);
    expect(await verificarSessionToken(token)).toBeNull();
  });
});

describe("verificarLimite: bloqueo tras intentos fallidos", () => {
  it("bloquea despues del maximo de intentos en la ventana", async () => {
    const clave = `test-login:${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const r = await verificarLimite(clave, 5, 15 * 60 * 1000);
      expect(r.permitido).toBe(true);
    }
    const bloqueado = await verificarLimite(clave, 5, 15 * 60 * 1000);
    expect(bloqueado.permitido).toBe(false);

    await sql`delete from rate_limits where clave = ${clave}`;
  });
});

describe("estaBloqueado / registrarFallo / limpiarLimite: solo los fallos cuentan", () => {
  it("no bloquea intentos exitosos repetidos (solo los fallos suman)", async () => {
    const clave = `test-login-exitos:${Date.now()}`;
    for (let i = 0; i < 10; i++) {
      expect(await estaBloqueado(clave, 5)).toBe(false);
      // un intento exitoso no registra fallo
    }
    await sql`delete from rate_limits where clave = ${clave}`;
  });

  it("bloquea tras 5 fallos y limpiarLimite reinicia el contador", async () => {
    const clave = `test-login-fallos:${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      expect(await estaBloqueado(clave, 5)).toBe(false);
      await registrarFallo(clave, 15 * 60 * 1000);
    }
    expect(await estaBloqueado(clave, 5)).toBe(true);

    await limpiarLimite(clave);
    expect(await estaBloqueado(clave, 5)).toBe(false);
  });
});
