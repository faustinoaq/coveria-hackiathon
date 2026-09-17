import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verificarSessionToken } from "./lib/auth";
import { error } from "./lib/errores";

const PUBLICO = ["/login", "/api/auth/login", "/api/auth/logout", "/api/mcp"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLICO.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const sesion = token ? await verificarSessionToken(token) : null;

  if (sesion) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(error("E401"), { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

// NOTA: a pesar de que el archivo se llama `proxy.ts` y la funcion se llama
// `proxy` (convencion de Next.js 16), la version instalada (16.3.5) sigue
// leyendo la configuracion del matcher desde un export llamado `config`
// (no `proxyConfig`). Un `proxyConfig` no tiene efecto: Next.js lo ignora en
// silencio y aplica el comportamiento por defecto (correr en todas las
// rutas), lo que hacia que `/_next/static/*` tambien pasara por este
// archivo y terminara redirigido a `/login`. Ver
// node_modules/next/dist/build/analysis/get-page-static-info.js
// (`extractExportedConstValue(ast, 'config')`).
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|api/auth|api/mcp).*)",
  ],
};
