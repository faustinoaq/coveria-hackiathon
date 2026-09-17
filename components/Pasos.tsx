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

export function Pasos({ pasos }: { pasos: DatosPaso[] }) {
  if (pasos.length === 0) return null;

  const conDetalle = pasos.filter((p) => p.estado !== "activo");

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
            </li>
          );
        })}
      </ol>
      {conDetalle.length > 0 && (
        <details className="pt-1 -mb-1">
          <summary className="text-xs font-bold uppercase tracking-wide text-tinta/45 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linea-agente rounded">
            Datos tecnicos
          </summary>
          <div className="flex flex-col gap-2 mt-2">
            {conDetalle.map((paso, i) => (
              <div key={i}>
                <p className="text-xs font-bold text-tinta/50 mb-1">{ETIQUETAS[paso.nombre]}</p>
                <pre className="bg-sala rounded-lg p-2.5 text-xs overflow-x-auto">
                  {JSON.stringify({ entrada: paso.entrada, salida: paso.salida }, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
