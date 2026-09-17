"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CoverIAUIMessage, DatosPaso, DatosUrgencia } from "@/lib/chat-tipos";
import type { CotizacionOk } from "@/lib/herramientas/cotizar";
import { AvisoUrgencia } from "./AvisoUrgencia";
import { Recorrido } from "./Recorrido";
import { Pasos } from "./Pasos";
import { Estimacion } from "./Estimacion";

const CHIPS = [
  "Me duele la rodilla, POL-2026-0001",
  "Tengo fiebre y tos en David, POL-2026-0002",
  "Dolor fuerte en el pecho, POL-2026-0003",
];

export function AppShell({
  emergencyNumber,
  crisisLine,
}: {
  emergencyNumber: string;
  crisisLine: string;
}) {
  const router = useRouter();
  const [verDetalles, setVerDetalles] = useState(false);
  const [tab, setTab] = useState<"conversacion" | "recorrido">("conversacion");
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, setMessages, error } = useChat<CoverIAUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const ultimoMensaje = messages[messages.length - 1];

  const urgencia = useMemo<DatosUrgencia | null>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const parte = messages[i].parts.find((p) => p.type === "data-urgencia");
      if (parte && parte.type === "data-urgencia") return parte.data;
    }
    return null;
  }, [messages]);

  const pasos = useMemo<DatosPaso[]>(() => {
    if (!ultimoMensaje) return [];
    return ultimoMensaje.parts
      .filter((p): p is Extract<typeof p, { type: "data-paso" }> => p.type === "data-paso")
      .map((p) => p.data);
  }, [ultimoMensaje]);

  const estimacion = useMemo<CotizacionOk | null>(() => {
    if (!ultimoMensaje) return null;
    const partes = ultimoMensaje.parts.filter(
      (p): p is Extract<typeof p, { type: "data-estimacion" }> => p.type === "data-estimacion",
    );
    return partes.length > 0 ? partes[partes.length - 1].data : null;
  }, [ultimoMensaje]);

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function enviar(texto: string) {
    if (!texto.trim() || status !== "ready") return;
    sendMessage({ text: texto });
    setInput("");
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    enviar(input);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b-2 border-tinta/10 bg-superficie">
        <h1 className="text-xl font-bold">CoverIA</h1>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={verDetalles}
              onChange={(e) => setVerDetalles(e.target.checked)}
            />
            Ver detalles tecnicos
          </label>
          <button
            type="button"
            onClick={cerrarSesion}
            className="underline focus:outline focus:outline-2 focus:outline-linea-agente"
          >
            Salir
          </button>
        </div>
      </header>

      {urgencia && urgencia.nivel !== "ninguna" && (
        <AvisoUrgencia
          nivel={urgencia.nivel}
          emergencyNumber={emergencyNumber}
          crisisLine={crisisLine}
        />
      )}

      <div className="md:hidden flex border-b-2 border-tinta/10 bg-superficie">
        <button
          type="button"
          className={`flex-1 py-2 text-sm font-bold ${tab === "conversacion" ? "border-b-2 border-linea-agente" : "text-tinta/60"}`}
          onClick={() => setTab("conversacion")}
        >
          Conversacion
        </button>
        <button
          type="button"
          className={`flex-1 py-2 text-sm font-bold ${tab === "recorrido" ? "border-b-2 border-linea-agente" : "text-tinta/60"}`}
          onClick={() => setTab("recorrido")}
        >
          Recorrido
        </button>
      </div>

      <div className="flex-1 min-h-0 grid md:grid-cols-2 gap-4 p-4 overflow-y-auto md:overflow-hidden">
        <section
          className={`flex flex-col min-h-0 gap-3 ${tab === "recorrido" ? "hidden md:flex" : "flex"}`}
          aria-label="Conversacion"
        >
          <div className="flex-1 min-h-0 md:overflow-y-auto flex flex-col gap-3 bg-superficie rounded p-4 border-2 border-tinta/10">
            {messages.length === 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-tinta/70 max-w-[70ch]">
                  Cuentanos que sientes y tu numero de poliza.
                </p>
                <div className="flex flex-wrap gap-2">
                  {CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => enviar(chip)}
                      className="text-xs rounded-full border-2 border-linea-agente text-linea-agente px-3 py-1 focus:outline focus:outline-2 focus:outline-linea-agente"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded p-3 text-sm ${
                  m.role === "user"
                    ? "self-end bg-linea-agente text-white"
                    : "self-start bg-sala"
                }`}
              >
                {m.parts
                  .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
                  .map((p, i) => (
                    <p key={i} className="whitespace-pre-wrap">
                      {p.text}
                    </p>
                  ))}
              </div>
            ))}
            {(status === "submitted" || status === "streaming") && (
              <p className="text-xs text-tinta/60">CoverIA esta trabajando...</p>
            )}
            {error && (
              <p role="alert" className="text-xs text-urgencia font-bold">
                Algo salio mal. Intenta de nuevo.
              </p>
            )}
          </div>
          <form onSubmit={onSubmit} className="flex gap-2">
            <label className="sr-only" htmlFor="mensaje">
              Describe tu sintoma
            </label>
            <input
              id="mensaje"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe tu sintoma"
              className="flex-1 border-2 border-tinta/20 rounded px-3 py-2 focus:outline focus:outline-2 focus:outline-linea-agente"
              disabled={status !== "ready"}
            />
            <button
              type="submit"
              disabled={status !== "ready"}
              className="bg-linea-agente text-white rounded px-4 py-2 font-bold disabled:opacity-60"
            >
              Consultar
            </button>
          </form>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="self-start text-xs underline text-tinta/70"
            >
              Nueva consulta
            </button>
          )}
        </section>

        <section
          className={`flex flex-col min-h-0 gap-4 md:overflow-y-auto ${tab === "conversacion" ? "hidden md:flex" : "flex"}`}
          aria-label="Recorrido de tu consulta"
        >
          <div className="bg-superficie rounded p-4 border-2 border-tinta/10">
            <h2 className="text-sm font-bold mb-2">Recorrido de tu consulta</h2>
            <Recorrido pasos={pasos} />
          </div>
          <Pasos pasos={pasos} verDetalles={verDetalles} />
          {estimacion && estimacion.ok && (
            <div className="flex flex-col gap-2">
              <Estimacion cotizacion={estimacion} />
              {urgencia?.runId && (
                <Link
                  href={`/runs/${urgencia.runId}`}
                  className="text-xs underline text-tinta/70 self-start"
                >
                  Ver el detalle de esta consulta
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
