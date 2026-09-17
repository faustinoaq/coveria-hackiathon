"use client";

import { Fragment, useState } from "react";
import { moneda } from "@/lib/formato";
import type { CotizacionOk } from "@/lib/herramientas/cotizar";

export function Estimacion({ cotizacion }: { cotizacion: CotizacionOk }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const principal = cotizacion.hospitales[0];
  if (!principal) return null;

  return (
    <section
      className="bg-superficie rounded p-4 border-2 border-tinta/10 flex flex-col gap-3"
      aria-label="Tu estimacion"
    >
      <h2 className="text-lg font-bold">Tu estimacion</h2>
      <p className="text-base max-w-[70ch]">
        Pagarias{" "}
        <strong className="tabular-nums">{moneda(principal.pago_paciente)}</strong> en{" "}
        {principal.nombre}.
      </p>
      {cotizacion.ciudad_sin_resultados && (
        <p className="text-sm text-tinta/70">
          No encontramos hospitales en esa ciudad; mostramos las mejores opciones de toda la
          red.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[480px]">
          <caption className="sr-only">
            Hospitales comparados para {cotizacion.especialidad}
          </caption>
          <thead>
            <tr className="text-left border-b-2 border-tinta/10">
              <th scope="col" className="py-1 pr-2 font-bold">
                Hospital
              </th>
              <th scope="col" className="py-1 pr-2 font-bold">
                Ciudad
              </th>
              <th scope="col" className="py-1 pr-2 font-bold">
                Rating
              </th>
              <th scope="col" className="py-1 pr-2 font-bold">
                Tarifa
              </th>
              <th scope="col" className="py-1 font-bold">
                Total a pagar
              </th>
            </tr>
          </thead>
          <tbody>
            {cotizacion.hospitales.map((h, i) => (
              <Fragment key={h.hospital_id}>
                <tr className="border-b border-tinta/10 align-top">
                  <td className="py-2 pr-2">
                    {h.nombre}
                    {i === 0 && (
                      <span className="ml-2 inline-block rounded-full bg-linea-red text-white text-xs px-2 py-0.5">
                        Mas economico
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-2">{h.ciudad}</td>
                  <td className="py-2 pr-2 tabular-nums">{h.rating.toFixed(1)}</td>
                  <td className="py-2 pr-2 tabular-nums">{moneda(h.tarifa)}</td>
                  <td className="py-2 tabular-nums font-bold">
                    {moneda(h.pago_paciente)}{" "}
                    <button
                      type="button"
                      className="underline text-xs font-normal focus:outline focus:outline-2 focus:outline-linea-agente"
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
                  <tr className="border-b border-tinta/10 bg-sala">
                    <td colSpan={5} className="py-2 px-2 text-xs">
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
        <p className="text-xs text-tinta/70">
          Limite anual informativo: {cotizacion.limite_anual_info}
        </p>
      )}
      <p className="text-xs text-tinta/70 max-w-[70ch]">
        Esta informacion es una estimacion referencial. La validacion final de cobertura y
        beneficios corresponde a la aseguradora.
      </p>
    </section>
  );
}
