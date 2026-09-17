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
        <h1 className="text-xl font-bold">Detalle de la consulta</h1>
        <p className="text-sm text-tinta/70">
          {fecha(new Date(run.created_at))}
          {run.urgente && <span className="text-urgencia font-bold"> (urgencia detectada)</span>}
        </p>
      </div>
      <div className="bg-superficie rounded p-4 border-2 border-tinta/10">
        <h2 className="text-sm font-bold mb-2">Recorrido</h2>
        <Recorrido pasos={pasos} />
      </div>
      <Pasos pasos={pasos} verDetalles />
      {ultimaCotizacion?.ok && <Estimacion cotizacion={ultimaCotizacion} />}
    </main>
  );
}
