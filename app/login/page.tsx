"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-sm bg-superficie rounded p-8 border-2 border-tinta/10">
        <h1 className="text-2xl font-bold mb-2">CoverIA</h1>
        <p className="text-sm mb-6 max-w-[70ch]">
          Acceso para evaluadores. Usa las credenciales del correo de entrega.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Usuario
            <input
              className="border-2 border-tinta/20 rounded px-3 py-2 focus:outline focus:outline-2 focus:outline-linea-agente"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Contraseña
            <input
              type="password"
              className="border-2 border-tinta/20 rounded px-3 py-2 focus:outline focus:outline-2 focus:outline-linea-agente"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p role="alert" className="text-urgencia text-sm font-bold">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="bg-linea-agente text-white rounded px-4 py-2 font-bold disabled:opacity-60"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
