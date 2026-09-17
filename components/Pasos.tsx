"use client";

import type { DatosPaso } from "@/lib/chat-tipos";

const ETIQUETAS: Record<DatosPaso["nombre"], string> = {
  buscar_poliza: "Validar poliza",
  buscar_sintomas: "Buscar sintomas",
  cotizar: "Cotizar",
};

const COLORES: Record<DatosPaso["nombre"], string> = {
  buscar_poliza: "var(--color-linea-poliza)",
  buscar_sintomas: "var(--color-linea-sintomas)",
  cotizar: "var(--color-linea-red)",
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
    <section aria-label="Pasos de la consulta" className="tarjeta flex flex-col gap-3 p-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-tinta/45">Pasos</h2>
      <ol className="flex flex-col gap-3">
        {pasos.map((paso, i) => {
          const codigo =
            paso.estado === "error" ? (paso.salida as { codigo?: string })?.codigo : undefined;
          const color = paso.estado === "error" ? "var(--color-urgencia)" : COLORES[paso.nombre];
          return (
            <li key={i} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex items-baseline gap-2">
                  <span
                    aria-hidden
                    className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 translate-y-[-1px]"
                    style={{ background: color }}
                  />
                  <span>
                    {ETIQUETAS[paso.nombre]}
                    {paso.estado === "activo" && (
                      <span className="text-tinta/50"> · en curso</span>
                    )}
                    {codigo && <span className="text-urgencia font-bold"> ({codigo})</span>}
                  </span>
                </span>
                {paso.ms !== undefined && (
                  <span className="tabular-nums text-xs text-tinta/45 flex-shrink-0">
                    {paso.ms} ms
                  </span>
                )}
              </div>
              {verDetalles && paso.estado !== "activo" && (
                <pre className="mt-1.5 ml-3.5 bg-sala rounded-lg p-2.5 text-xs overflow-x-auto">
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
