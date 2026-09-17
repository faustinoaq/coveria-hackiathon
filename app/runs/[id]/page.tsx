import { notFound } from "next/navigation";
import { obtenerRun } from "@/lib/eventos";
import { Recorrido } from "@/components/Recorrido";
import { Pasos } from "@/components/Pasos";
import { Estimacion } from "@/components/Estimacion";
import { fecha } from "@/lib/formato";
import type { DatosPaso } from "@/lib/chat-tipos";
import type { CotizacionOk } from "@/lib/herramientas/cotizar";

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await obtenerRun(id);
  if (!run) notFound();

  const pasos: DatosPaso[] = run.eventos
    .filter((e) => e.tipo === "herramienta")
    .map((e) => {
      const payload = e.payload as { entrada?: unknown; salida?: unknown } | null;
      return {
        nombre: e.nombre as DatosPaso["nombre"],
        estado: e.estado === "ok" ? "hecho" : "error",
        ms: e.ms ?? undefined,
        resumen: e.resumen ?? undefined,
        entrada: payload?.entrada,
        salida: payload?.salida,
      };
    });

  const ultimaCotizacion = pasos
    .filter((p) => p.nombre === "cotizar" && p.estado === "hecho")
    .map((p) => p.salida as CotizacionOk)
    .pop();

  // Respuesta de CoverIA guardada en el turno (no el texto libre del
  // paciente, ver la nota de B.10 en lib/eventos.ts).
  const respuesta = run.eventos
    .filter((e) => e.tipo === "llm" && e.nombre === "respuesta")
    .map((e) => (e.payload as { texto?: string } | null)?.texto)
    .find((t): t is string => Boolean(t));

  return (
    <main className="flex-1 p-4 md:p-8 flex flex-col gap-4 max-w-3xl mx-auto w-full overflow-y-auto">
      <div>
        <p className="text-xs font-bold tracking-wide uppercase text-tinta/45 mb-1">
          Detalle de la consulta
        </p>
        <h1 className="text-2xl font-bold mb-1">{fecha(new Date(run.created_at))}</h1>
        {run.urgente && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-urgencia">
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-urgencia" />
            Urgencia detectada
          </span>
        )}
      </div>

      {ultimaCotizacion?.ok && <Estimacion cotizacion={ultimaCotizacion} />}

      {respuesta && (
        <section className="tarjeta p-4" aria-label="Respuesta de CoverIA">
          <h2 className="text-xs font-bold uppercase tracking-wide text-tinta/45 mb-2">
            Respuesta de CoverIA
          </h2>
          <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm bg-sala shadow-[inset_0_0_0_1px_rgba(22,56,74,0.06)] whitespace-pre-wrap">
            {respuesta}
          </div>
        </section>
      )}

      <details className="tarjeta p-4 group">
        <summary className="text-xs font-bold uppercase tracking-wide text-tinta/45 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linea-agente rounded">
          Datos tecnicos
        </summary>
        <div className="flex flex-col gap-4 mt-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-tinta/45 mb-2">
              Recorrido
            </h3>
            <Recorrido pasos={pasos} />
          </div>
          <Pasos pasos={pasos} verDetalles />
        </div>
      </details>
    </main>
  );
}
