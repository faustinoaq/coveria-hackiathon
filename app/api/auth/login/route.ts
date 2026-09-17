import { NextResponse } from "next/server";
import { z } from "zod";
import { COOKIE_NAME, crearSessionToken, verifyPassword } from "@/lib/auth";
import { error } from "@/lib/errores";
import { obtenerIp, verificarLimite } from "@/lib/limites";

const RETRASO_FALLO_MS = 300;
const VENTANA_BLOQUEO_MS = 15 * 60 * 1000;

const cuerpoSchema = z.object({
  usuario: z.string().min(1),
  password: z.string().min(1),
});

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const ip = obtenerIp(request.headers);
  const maxIntentos = Number(process.env.MAX_INTENTOS_LOGIN ?? "5") || 5;

  const limite = await verificarLimite(`login:${ip}`, maxIntentos, VENTANA_BLOQUEO_MS);
  if (!limite.permitido) {
    return NextResponse.json(
      error("E429", "Demasiados intentos. Intenta de nuevo en 15 minutos."),
      { status: 429 },
    );
  }

  const cuerpo = await request.json().catch(() => null);
  const parsed = cuerpoSchema.safeParse(cuerpo);
  if (!parsed.success) {
    await esperar(RETRASO_FALLO_MS);
    return NextResponse.json(
      error("E401", "Usuario o contraseña incorrectos."),
      { status: 401 },
    );
  }

  const { usuario, password } = parsed.data;
  const adminUser = process.env.ADMIN_USER ?? "";
  const adminHash = process.env.ADMIN_PASSWORD_HASH ?? "";

  const usuarioValido = usuario === adminUser;
  const passwordValido = adminHash ? await verifyPassword(password, adminHash) : false;

  if (!usuarioValido || !passwordValido) {
    await esperar(RETRASO_FALLO_MS);
    return NextResponse.json(
      error("E401", "Usuario o contraseña incorrectos."),
      { status: 401 },
    );
  }

  const token = await crearSessionToken(usuario);
  const horas = Number(process.env.SESSION_HORAS ?? "8") || 8;

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: horas * 60 * 60,
  });
  return response;
}
