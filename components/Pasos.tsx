"use client";

import type { DatosPaso } from "@/lib/chat-tipos";

const ETIQUETAS: Record<DatosPaso["nombre"], string> = {
  buscar_poliza: "Validar poliza",
  buscar_sintomas: "Buscar sintomas",
  cotizar: "Cotizar",
};

export function Pasos({
  pasos,
  verDetalles,
}: {
  pasos: DatosPaso[];
  verDetalles: boolean;
}) {
  if (pasos.length === 0) return null;

  return (
    <section aria-label="Pasos de la consulta" className="flex flex-col gap-2">
      <h2 className="text-sm font-bold">Pasos</h2>
      <ol className="flex flex-col gap-2">
        {pasos.map((paso, i) => {
          const codigo =
            paso.estado === "error" ? (paso.salida as { codigo?: string })?.codigo : undefined;
          return (
            <li key={i} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span>
                  {i + 1} {ETIQUETAS[paso.nombre]}
                  {paso.estado === "activo" && (
                    <span className="text-tinta/60"> (en curso)</span>
                  )}
                  {codigo && <span className="text-urgencia font-bold"> ({codigo})</span>}
                </span>
                {paso.ms !== undefined && (
                  <span className="tabular-nums text-tinta/70 flex-shrink-0">{paso.ms} ms</span>
                )}
              </div>
              {verDetalles && paso.estado !== "activo" && (
                <pre className="mt-1 bg-sala rounded p-2 text-xs overflow-x-auto">
                  {JSON.stringify({ entrada: paso.entrada, salida: paso.salida }, null, 2)}
                </pre>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
