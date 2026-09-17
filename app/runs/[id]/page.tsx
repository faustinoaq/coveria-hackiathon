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

  return (
    <main className="flex-1 p-4 md:p-8 flex flex-col gap-4 max-w-3xl mx-auto w-full">
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
      <div className="tarjeta p-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-tinta/45 mb-2">
          Recorrido
        </h2>
        <Recorrido pasos={pasos} />
      </div>
      <Pasos pasos={pasos} verDetalles />
      {ultimaCotizacion?.ok && <Estimacion cotizacion={ultimaCotizacion} />}
    </main>
  );
}
