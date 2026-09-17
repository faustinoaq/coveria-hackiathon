"use client";

import Link from "next/link";
import { moneda } from "@/lib/formato";
import type { ConsultaHistorial } from "@/lib/historial-local";

export function Historial({ items }: { items: ConsultaHistorial[] }) {
  if (items.length === 0) return null;

  return (
    <section className="tarjeta p-4 flex flex-col gap-2" aria-label="Historial de consultas">
      <h2 className="text-xs font-bold uppercase tracking-wide text-tinta/45">
        Consultas recientes (en este navegador)
      </h2>
      <ul className="flex flex-col">
        {items.map((c) => (
          <li key={c.runId}>
            <Link
              href={`/runs/${c.runId}`}
              className="flex items-center justify-between gap-3 text-sm py-2 px-2 -mx-2 rounded-lg transition-colors hover:bg-sala focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linea-agente"
            >
              <span className="text-tinta/70 truncate">
                {c.especialidad.replaceAll("_", " ").toLowerCase()} · {c.hospital}
              </span>
              <span className="tabular-nums font-bold flex-shrink-0">
                {moneda(c.pagoPaciente)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
