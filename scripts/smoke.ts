import { config } from "dotenv";
config({ path: ".env.local" });

const BASE_URL = (process.env.SMOKE_URL || "https://coveria-hackiathon.vercel.app").replace(
  /\/$/,
  "",
);
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

let pasados = 0;
let fallidos = 0;
const fallos: string[] = [];

function afirmar(condicion: boolean, mensaje: string) {
  if (condicion) {
    pasados++;
    console.log(`OK   ${mensaje}`);
  } else {
    fallidos++;
    fallos.push(mensaje);
    console.log(`FAIL ${mensaje}`);
  }
}

function extraerCookie(res: Response): string | null {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  return setCookie.split(";")[0];
}

interface EventoStream {
  type: string;
  data?: unknown;
  delta?: string;
}

async function leerEventosChat(res: Response): Promise<{ texto: string; partes: EventoStream[] }> {
  const cuerpo = await res.text();
  const partes: EventoStream[] = [];
  let texto = "";
  for (const linea of cuerpo.split("\n")) {
    if (!linea.startsWith("data: ")) continue;
    const payload = linea.slice(6).trim();
    if (payload === "[DONE]" || payload === "") continue;
    try {
      const evento = JSON.parse(payload) as EventoStream;
      partes.push(evento);
      if (evento.type === "text-delta" && typeof evento.delta === "string") {
        texto += evento.delta;
      }
    } catch {
      // ignora lineas que no son JSON valido
    }
  }
  return { texto, partes };
}

interface CotizacionData {
  especialidad: string;
  hospitales: Array<{ tarifa: number; pago_paciente: number; pago_aseguradora: number }>;
}

async function chat(cookie: string, texto: string, id: string) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      messages: [{ id, role: "user", parts: [{ type: "text", text: texto }] }],
    }),
  });
  const { partes } = await leerEventosChat(res);
  return { res, partes };
}

async function main() {
  if (!ADMIN_USER || !ADMIN_PASSWORD) {
    console.error("ADMIN_USER y ADMIN_PASSWORD deben estar definidos para correr el smoke test.");
    process.exit(1);
  }

  console.log(`Smoke tests contra: ${BASE_URL}\n`);

  // 1. GET /login -> 200
  const r1 = await fetch(`${BASE_URL}/login`);
  afirmar(r1.status === 200, "1. GET /login -> 200");

  // 2. GET / sin cookie -> redireccion a /login
  const r2 = await fetch(`${BASE_URL}/`, { redirect: "manual" });
  afirmar(r2.status >= 300 && r2.status < 400, "2. GET / sin cookie -> redireccion a /login");

  // 3. POST /api/chat sin cookie -> 401
  const r3 = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [] }),
  });
  afirmar(r3.status === 401, "3. POST /api/chat sin cookie -> 401");

  // 4. Login con contraseña incorrecta -> 401 con mensaje generico
  const r4 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario: ADMIN_USER, password: "clave-incorrecta-de-prueba" }),
  });
  const j4 = await r4.json().catch(() => null);
  afirmar(
    r4.status === 401 && j4?.mensaje === "Usuario o contraseña incorrectos.",
    "4. Login con contraseña incorrecta -> 401 con mensaje generico",
  );

  // 5. Login correcto -> 200 y cookie coveria_session
  const r5 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario: ADMIN_USER, password: ADMIN_PASSWORD }),
  });
  const cookie = extraerCookie(r5);
  afirmar(
    r5.status === 200 && !!cookie && cookie.startsWith("coveria_session="),
    "5. Login correcto -> 200 y cookie coveria_session",
  );

  if (!cookie) {
    resumenYSalida();
    return;
  }

  // 6. Chat: sintoma tipico -> estimacion ORTOPEDIA, 3 hospitales o menos
  const { res: r6, partes: partes6 } = await chat(
    cookie,
    "Me duele la rodilla, POL-2026-0001",
    "m1",
  );
  const estimacion6 = partes6.find((p) => p.type === "data-estimacion")?.data as
    | CotizacionData
    | undefined;
  afirmar(
    r6.status === 200 &&
      estimacion6?.especialidad === "ORTOPEDIA" &&
      (estimacion6?.hospitales.length ?? 0) > 0 &&
      (estimacion6?.hospitales.length ?? 0) <= 3,
    "6. Chat rodilla -> estimacion ORTOPEDIA con 3 hospitales o menos",
  );

  // 9. pago_paciente + pago_aseguradora == tarifa en cada hospital de la respuesta 6
  const hospitales6 = estimacion6?.hospitales ?? [];
  const sumaConsistente =
    hospitales6.length > 0 &&
    hospitales6.every((h) => h.pago_paciente + h.pago_aseguradora === h.tarifa);
  afirmar(sumaConsistente, "9. pago_paciente + pago_aseguradora == tarifa en cada hospital");

  // 7. Chat: poliza inactiva -> error E002
  const { res: r7, partes: partes7 } = await chat(cookie, "Tengo fiebre, POL-2026-0004", "m2");
  const pasoPoliza7 = partes7.findLast(
    (p) => p.type === "data-paso" && (p.data as { nombre?: string })?.nombre === "buscar_poliza",
  )?.data as { salida?: { codigo?: string } } | undefined;
  afirmar(
    r7.status === 200 && pasoPoliza7?.salida?.codigo === "E002",
    "7. Chat poliza inactiva -> error E002",
  );

  // 8. Chat: dolor de pecho -> bandera de urgencia activa
  const { res: r8, partes: partes8 } = await chat(
    cookie,
    "Dolor fuerte en el pecho, POL-2026-0003",
    "m3",
  );
  const urgencia8 = partes8.find((p) => p.type === "data-urgencia")?.data as
    | { nivel?: string }
    | undefined;
  afirmar(
    r8.status === 200 && urgencia8?.nivel === "urgente",
    "8. Chat dolor de pecho -> bandera de urgencia activa",
  );

  // 10. Logout -> cookie eliminada
  const r10 = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  const cookieLogout = (r10.headers.get("set-cookie") ?? "").toLowerCase();
  const eliminada =
    cookieLogout.includes("max-age=0") || cookieLogout.includes("expires=thu, 01 jan 1970");
  afirmar(r10.status === 200 && eliminada, "10. Logout -> cookie eliminada");

  resumenYSalida();
}

function resumenYSalida() {
  console.log(`\n${pasados} pasados, ${fallidos} fallidos`);
  if (fallidos > 0) {
    console.log("Fallos:", fallos.join("; "));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
