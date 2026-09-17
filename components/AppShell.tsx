"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CoverIAUIMessage, DatosPaso, DatosUrgencia } from "@/lib/chat-tipos";
import type { CotizacionOk } from "@/lib/herramientas/cotizar";
import { ciudadMasCercana } from "@/lib/geo";
import { agregarHistorial, listarHistorial, type ConsultaHistorial } from "@/lib/historial-local";
import { Logo } from "./Logo";
import { AvisoUrgencia } from "./AvisoUrgencia";
import { Recorrido } from "./Recorrido";
import { Pasos } from "./Pasos";
import { Estimacion, EstimacionMini } from "./Estimacion";
import { Historial } from "./Historial";

/**
 * El transporte del AI SDK guarda el cuerpo de la respuesta HTTP fallida en
 * `error.message` (ver createUIApiCallError en ai/dist/index.js); nuestras
 * rutas siempre devuelven JSON `{ ok:false, codigo, mensaje }`, asi que se
 * puede mostrar un mensaje especifico (p. ej. limite de consultas) en vez
 * del generico "algo salio mal".
 */
function mensajeError(error: Error | undefined): string | null {
  if (!error) return null;
  try {
    const cuerpo = JSON.parse(error.message) as { mensaje?: string };
    if (cuerpo?.mensaje) return cuerpo.mensaje;
  } catch {
    // no era JSON: error de red, timeout, etc.
  }
  return "Algo salio mal. Intenta de nuevo en unos segundos.";
}

const CHIPS = [
  "Me duele la rodilla",
  "Tengo fiebre y tos en Colon, POL-2026-0002",
  "Dolor fuerte en el pecho",
];

interface PolizaDefecto {
  numero_poliza: string;
  plan: string;
}

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
  const [polizaDefecto, setPolizaDefecto] = useState<PolizaDefecto | null>(null);
  const [ciudadDefecto, setCiudadDefecto] = useState<string | null>(null);
  const [historial, setHistorial] = useState<ConsultaHistorial[]>([]);
  const mensajesRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages, error } = useChat<CoverIAUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  // Evento (boton "usar otra poliza de prueba"): setState directo aqui es
  // seguro, se dispara desde un click, no desde el cuerpo de un efecto.
  const cargarPolizaAleatoria = useCallback(async () => {
    try {
      const res = await fetch("/api/poliza-aleatoria");
      if (!res.ok) return;
      const data = (await res.json()) as PolizaDefecto;
      setPolizaDefecto(data);
    } catch {
      // sin poliza de demo disponible; el paciente igual puede escribir la suya
    }
  }, []);

  // Carga inicial al montar: se sincroniza con la respuesta de fetch() en un
  // callback (patron recomendado por React para fetching en efectos), no
  // invocando una funcion que hace setState en el cuerpo sincronico del
  // efecto.
  useEffect(() => {
    let cancelado = false;
    fetch("/api/poliza-aleatoria")
      .then((res) => (res.ok ? (res.json() as Promise<PolizaDefecto>) : null))
      .then((data) => {
        if (data && !cancelado) setPolizaDefecto(data);
      })
      .catch(() => {
        // sin poliza de demo disponible; el paciente igual puede escribir la suya
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setCiudadDefecto(ciudadMasCercana(posicion.coords.latitude, posicion.coords.longitude));
      },
      () => {
        // permiso denegado o ubicacion no disponible: se sigue sin ciudad por
        // defecto, el paciente puede mencionar una ciudad en el chat
      },
      { timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  }, []);

  const ultimoMensaje = messages[messages.length - 1];

  // Autoscroll: sigue el fondo del panel de mensajes cada vez que llega
  // texto nuevo (incluido el streaming caracter a caracter mientras
  // status === "streaming"). No es setState, es sincronizar el scrollTop
  // del DOM con el contenido de React, por eso no aplica la regla
  // react-hooks/set-state-in-effect usada mas abajo.
  useEffect(() => {
    const el = mensajesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

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

  // Lectura inicial de localStorage: se difiere a un microtask (patron
  // "callback", igual que la respuesta de fetch() o de geolocation mas
  // abajo) para no llamar a setState de forma sincronica en el cuerpo del
  // efecto.
  useEffect(() => {
    let cancelado = false;
    queueMicrotask(() => {
      if (!cancelado) setHistorial(listarHistorial());
    });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    const runId = urgencia?.runId;
    const principal = estimacion?.ok ? estimacion.hospitales[0] : undefined;
    if (!runId || !estimacion?.ok || !principal) return;
    let cancelado = false;
    queueMicrotask(() => {
      if (cancelado) return;
      const actualizado = agregarHistorial({
        runId,
        fechaIso: new Date().toISOString(),
        especialidad: estimacion.especialidad,
        hospital: principal.nombre,
        pagoPaciente: principal.pago_paciente,
      });
      setHistorial(actualizado);
    });
    return () => {
      cancelado = true;
    };
  }, [estimacion, urgencia?.runId]);

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function enviar(texto: string) {
    if (!texto.trim() || status !== "ready") return;
    sendMessage(
      { text: texto },
      {
        body: {
          contexto: {
            poliza_defecto: polizaDefecto?.numero_poliza,
            ciudad_defecto: ciudadDefecto ?? undefined,
          },
        },
      },
    );
    setInput("");
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    enviar(input);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-superficie shadow-[0_1px_0_rgba(22,56,74,0.08),0_10px_24px_-20px_rgba(22,56,74,0.35)]">
        <div className="flex items-center gap-2">
          <Logo className="w-6 h-6" />
          <h1 className="text-lg font-bold tracking-tight">CoverIA</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2 text-tinta/70">
            <input
              type="checkbox"
              checked={verDetalles}
              onChange={(e) => setVerDetalles(e.target.checked)}
              className="accent-linea-agente"
            />
            Ver detalles tecnicos
          </label>
          <button
            type="button"
            onClick={cerrarSesion}
            className="text-tinta/70 underline decoration-tinta/25 underline-offset-2 transition-colors hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linea-agente focus-visible:ring-offset-2 rounded"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-xs bg-linea-agente/5 text-tinta/70">
        <span>
          Poliza de prueba:{" "}
          <strong className="font-bold text-tinta tabular-nums">
            {polizaDefecto?.numero_poliza ?? "asignando..."}
          </strong>
          {polizaDefecto && ` · Plan ${polizaDefecto.plan}`}
        </span>
        {ciudadDefecto && (
          <span>
            Ubicacion detectada: <strong className="font-bold text-tinta">{ciudadDefecto}</strong>
          </span>
        )}
        <button
          type="button"
          onClick={cargarPolizaAleatoria}
          className="underline decoration-tinta/25 underline-offset-2 transition-colors hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linea-agente focus-visible:ring-offset-2 rounded"
        >
          usar otra poliza de prueba
        </button>
      </div>

      {urgencia && urgencia.nivel !== "ninguna" && (
        <AvisoUrgencia
          nivel={urgencia.nivel}
          emergencyNumber={emergencyNumber}
          crisisLine={crisisLine}
        />
      )}

      <div className="md:hidden flex gap-1 p-1.5 bg-superficie">
        <button
          type="button"
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tab === "conversacion" ? "bg-linea-agente/10 text-linea-agente-fuerte" : "text-tinta/50"}`}
          onClick={() => setTab("conversacion")}
        >
          Conversacion
        </button>
        <button
          type="button"
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tab === "recorrido" ? "bg-linea-agente/10 text-linea-agente-fuerte" : "text-tinta/50"}`}
          onClick={() => setTab("recorrido")}
        >
          Detalles
        </button>
      </div>

      <div className="flex-1 min-h-0 grid md:grid-cols-2 gap-4 p-4 overflow-hidden">
        <section
          className={`flex flex-col min-h-0 gap-3 ${tab === "recorrido" ? "hidden md:flex" : "flex"}`}
          aria-label="Conversacion"
        >
          <div ref={mensajesRef} className="tarjeta flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 p-4">
            {messages.length === 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-tinta/70 max-w-[70ch]">
                  Cuentanos que sientes. Si no dices tu numero de poliza ni tu ciudad, usamos la
                  poliza de prueba y tu ubicacion de arriba; tambien puedes escribir las tuyas.
                </p>
                <div className="flex flex-wrap gap-2">
                  {CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => enviar(chip)}
                      className="text-xs rounded-full border border-linea-agente/30 bg-linea-agente/5 text-linea-agente-fuerte px-3 py-1.5 font-bold transition-colors hover:bg-linea-agente/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linea-agente focus-visible:ring-offset-2"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => {
              const textos = m.parts.filter(
                (p): p is Extract<typeof p, { type: "text" }> => p.type === "text",
              );
              const estimacionMsg = m.parts.find(
                (p): p is Extract<typeof p, { type: "data-estimacion" }> =>
                  p.type === "data-estimacion",
              );
              return (
                <div key={m.id} className="flex flex-col gap-2">
                  {textos.length > 0 && (
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        m.role === "user"
                          ? "self-end bg-linea-agente text-white"
                          : "self-start bg-sala shadow-[inset_0_0_0_1px_rgba(22,56,74,0.06)]"
                      }`}
                    >
                      {textos.map((p, i) => (
                        <p key={i} className="whitespace-pre-wrap">
                          {p.text}
                        </p>
                      ))}
                    </div>
                  )}
                  {estimacionMsg && (
                    <div className="self-start w-full max-w-[85%]">
                      <EstimacionMini
                        cotizacion={estimacionMsg.data}
                        onVerDetalle={() => setTab("recorrido")}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {(status === "submitted" || status === "streaming") && (
              <p className="flex items-center gap-1.5 text-xs text-tinta/60 self-start">
                <span aria-hidden className="flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-linea-agente animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-1 rounded-full bg-linea-agente animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-1 rounded-full bg-linea-agente animate-bounce" />
                </span>
                CoverIA esta trabajando...
              </p>
            )}
            {error && (
              <p role="alert" className="text-xs text-urgencia font-bold">
                {mensajeError(error)}
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
              className="flex-1 border border-tinta/15 bg-superficie rounded-xl px-3.5 py-2.5 transition-shadow focus:outline-none focus:ring-2 focus:ring-linea-agente focus:ring-offset-2 focus:ring-offset-sala disabled:opacity-60"
              disabled={status !== "ready"}
            />
            <button
              type="submit"
              disabled={status !== "ready"}
              className="bg-linea-agente text-white rounded-xl px-4 py-2.5 font-bold shadow-[0_10px_24px_-10px_rgba(47,111,222,0.65)] transition-all hover:bg-linea-agente-fuerte active:translate-y-px disabled:opacity-60 disabled:shadow-none"
            >
              Consultar
            </button>
          </form>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="self-start flex items-center gap-1.5 text-xs font-bold text-tinta bg-superficie border border-tinta/15 rounded-full pl-2.5 pr-3.5 py-1.5 shadow-tarjeta transition-colors hover:bg-sala focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linea-agente focus-visible:ring-offset-2"
            >
              <span aria-hidden className="text-sm leading-none">+</span>
              Nueva consulta
            </button>
          )}
        </section>

        <section
          className={`flex flex-col min-h-0 gap-4 overflow-y-auto ${tab === "conversacion" ? "hidden md:flex" : "flex"}`}
          aria-label="Detalles de tu consulta"
        >
          {estimacion && estimacion.ok && (
            <div className="flex flex-col gap-2">
              <Estimacion cotizacion={estimacion} />
              {urgencia?.runId && (
                <Link
                  href={`/runs/${urgencia.runId}`}
                  className="text-xs text-tinta/60 underline decoration-tinta/25 underline-offset-2 self-start transition-colors hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linea-agente focus-visible:ring-offset-2 rounded"
                >
                  Ver el detalle de esta consulta
                </Link>
              )}
            </div>
          )}
          <div className="tarjeta p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-tinta/45 mb-3">
              Recorrido de tu consulta
            </h2>
            <Recorrido pasos={pasos} />
          </div>
          <Pasos pasos={pasos} verDetalles={verDetalles} />
          <Historial items={historial} />
        </section>
      </div>
    </div>
  );
}
