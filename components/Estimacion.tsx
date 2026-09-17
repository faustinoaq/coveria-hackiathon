"use client";

import { Fragment, useState } from "react";
import { moneda } from "@/lib/formato";
import type { CotizacionOk } from "@/lib/herramientas/cotizar";

export function Estimacion({ cotizacion }: { cotizacion: CotizacionOk }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const principal = cotizacion.hospitales[0];
  if (!principal) return null;

  return (
    <section className="tarjeta flex flex-col gap-5 p-5 sm:p-6" aria-label="Tu estimacion">
      <div>
        <p className="text-xs font-bold tracking-wide uppercase text-tinta/45 mb-1.5">
          Tu estimacion
        </p>
        <p className="text-4xl sm:text-5xl font-bold tabular-nums text-linea-agente-fuerte leading-none">
          {moneda(principal.pago_paciente)}
        </p>
        <p className="text-sm text-tinta/70 mt-2">
          en <span className="font-bold text-tinta">{principal.nombre}</span>
        </p>
      </div>
      {cotizacion.ciudad_sin_resultados && (
        <p className="text-sm text-tinta/70 -mt-2">
          No encontramos hospitales en esa ciudad; mostramos las mejores opciones de toda la
          red.
        </p>
      )}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm border-collapse min-w-[480px]">
          <caption className="sr-only">
            Hospitales comparados para {cotizacion.especialidad}
          </caption>
          <thead>
            <tr className="text-left">
              <th scope="col" className="py-1.5 px-1 font-bold text-xs uppercase tracking-wide text-tinta/45">
                Hospital
              </th>
              <th scope="col" className="py-1.5 px-1 font-bold text-xs uppercase tracking-wide text-tinta/45">
                Ciudad
              </th>
              <th scope="col" className="py-1.5 px-1 font-bold text-xs uppercase tracking-wide text-tinta/45">
                Rating
              </th>
              <th scope="col" className="py-1.5 px-1 font-bold text-xs uppercase tracking-wide text-tinta/45">
                Tarifa
              </th>
              <th scope="col" className="py-1.5 px-1 font-bold text-xs uppercase tracking-wide text-tinta/45">
                Total a pagar
              </th>
            </tr>
          </thead>
          <tbody>
            {cotizacion.hospitales.map((h, i) => (
              <Fragment key={h.hospital_id}>
                <tr
                  className={`align-top border-t border-tinta/8 ${i === 0 ? "bg-linea-agente/5" : ""}`}
                >
                  <td
                    className={`py-2.5 px-1 ${i === 0 ? "border-l-2 border-linea-agente pl-2.5 font-bold" : ""}`}
                  >
                    {h.nombre}
                    {i === 0 && (
                      <span className="ml-2 inline-block rounded-full bg-linea-agente/15 text-linea-agente-fuerte text-xs font-bold px-2 py-0.5 align-middle">
                        Mas economico
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-1 text-tinta/70">{h.ciudad}</td>
                  <td className="py-2.5 px-1 tabular-nums text-tinta/70">{h.rating.toFixed(1)}</td>
                  <td className="py-2.5 px-1 tabular-nums text-tinta/70">{moneda(h.tarifa)}</td>
                  <td className="py-2.5 px-1 tabular-nums font-bold">
                    {moneda(h.pago_paciente)}{" "}
                    <button
                      type="button"
                      className="underline decoration-tinta/25 underline-offset-2 text-xs font-normal text-tinta/60 transition-colors hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linea-agente focus-visible:ring-offset-2 rounded"
                      onClick={() =>
                        setAbierto(abierto === h.hospital_id ? null : h.hospital_id)
                      }
                      aria-expanded={abierto === h.hospital_id}
                    >
                      {abierto === h.hospital_id ? "ocultar" : "desglose"}
                    </button>
                  </td>
                </tr>
                {abierto === h.hospital_id && (
                  <tr className="bg-sala">
                    <td colSpan={5} className="py-2 px-2.5 text-xs text-tinta/70">
                      Deducible aplicado {moneda(h.deducible_aplicado)} + coaseguro{" "}
                      {moneda(h.coaseguro_paciente)} + copago {moneda(h.copago)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {cotizacion.limite_anual_info && (
        <p className="text-xs text-tinta/60">
          Limite anual informativo: {cotizacion.limite_anual_info}
        </p>
      )}
      <p className="text-xs text-tinta/60 max-w-[70ch] pt-3 border-t border-tinta/8">
        Esta informacion es una estimacion referencial. La validacion final de cobertura y
        beneficios corresponde a la aseguradora.
      </p>
    </section>
  );
}
