"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => null);
      if (res.status === 429) {
        setError("Demasiados intentos. Intenta de nuevo en 15 minutos.");
      } else {
        setError(data?.mensaje ?? "Usuario o contraseña incorrectos.");
      }
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="fondo-acceso flex-1 flex items-center justify-center p-6 sm:p-8">
      <div className="tarjeta w-full max-w-sm p-8 sm:p-10">
        <Logo className="w-9 h-9 mb-5" />
        <p className="text-xs font-bold tracking-wide uppercase text-tinta/50 mb-1.5">
          Acceso para evaluadores
        </p>
        <h1 className="text-3xl font-bold mb-2">CoverIA</h1>
        <p className="text-sm text-tinta/70 mb-7 max-w-[70ch]">
          Usa las credenciales del correo de entrega.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Usuario
            <input
              className="border border-tinta/15 rounded-xl px-3.5 py-2.5 font-normal transition-shadow focus:outline-none focus:ring-2 focus:ring-linea-agente focus:ring-offset-2 focus:ring-offset-superficie"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Contraseña
            <input
              type="password"
              className="border border-tinta/15 rounded-xl px-3.5 py-2.5 font-normal transition-shadow focus:outline-none focus:ring-2 focus:ring-linea-agente focus:ring-offset-2 focus:ring-offset-superficie"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p role="alert" className="flex items-center gap-2 text-urgencia text-sm font-bold">
              <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-urgencia flex-shrink-0" />
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="bg-linea-agente text-white rounded-xl px-4 py-2.5 font-bold shadow-[0_10px_24px_-10px_rgba(47,111,222,0.65)] transition-all hover:bg-linea-agente-fuerte hover:shadow-[0_14px_28px_-10px_rgba(47,111,222,0.75)] active:translate-y-px disabled:opacity-60 disabled:shadow-none disabled:hover:bg-linea-agente"
          >
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
