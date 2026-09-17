"use client";

import type { DatosPaso } from "@/lib/chat-tipos";

type EstadoTramo = "pendiente" | "activo" | "hecho" | "error";

function estadoDe(paso: DatosPaso | undefined): EstadoTramo {
  if (!paso) return "pendiente";
  return paso.estado;
}

interface Nodo {
  id: string;
  etiqueta: string;
  x: number;
  estado: EstadoTramo;
  color: string;
}

const Y = 14;
const X = [20, 150, 280];

/**
 * Version lineal y compacta (una sola fila, 3 estaciones que corresponden
 * 1:1 a las herramientas reales: buscar_poliza, buscar_sintomas, cotizar).
 * Antes esto era un diagrama ramificado de 6 nodos en 3 filas que ocupaba
 * mucha altura y empujaba la estimacion (el numero que le importa al
 * paciente) fuera de la vista inicial.
 */
export function Recorrido({ pasos }: { pasos: DatosPaso[] }) {
  const poliza = pasos.find((p) => p.nombre === "buscar_poliza");
  const sintomas = pasos.find((p) => p.nombre === "buscar_sintomas");
  const cotizar = pasos.find((p) => p.nombre === "cotizar");

  const verde = "var(--color-linea-red)";
  const morado = "var(--color-linea-sintomas)";
  const amarillo = "var(--color-linea-poliza)";

  const nodos: Nodo[] = [
    {
      id: "poliza",
      etiqueta: "Poliza",
      x: X[0],
      estado: estadoDe(poliza),
      color: estadoDe(poliza) === "error" ? "var(--color-urgencia)" : amarillo,
    },
    {
      id: "sintomas",
      etiqueta: "Sintomas",
      x: X[1],
      estado: estadoDe(sintomas),
      color: estadoDe(sintomas) === "error" ? "var(--color-urgencia)" : morado,
    },
    {
      id: "cotizar",
      etiqueta: "Cotizar",
      x: X[2],
      estado: estadoDe(cotizar),
      color: estadoDe(cotizar) === "error" ? "var(--color-urgencia)" : verde,
    },
  ];

  function colorTramo(desde: Nodo, hasta: Nodo): string {
    if (hasta.estado === "error") return "var(--color-urgencia)";
    if (hasta.estado === "pendiente") return "#c9d3d8";
    return hasta.color;
  }

  return (
    <svg
      viewBox="0 0 300 44"
      role="img"
      aria-label="Recorrido de tu consulta: poliza, sintomas y cotizacion"
      className="w-full h-auto max-w-[360px]"
    >
      {nodos.slice(1).map((n, i) => (
        <line
          key={n.id}
          x1={nodos[i].x + 10}
          y1={Y}
          x2={n.x - 10}
          y2={Y}
          stroke={colorTramo(nodos[i], n)}
          strokeWidth={3}
        />
      ))}
      {nodos.map((n) => (
        <g key={n.id} style={n.estado !== "pendiente" ? { filter: `drop-shadow(0 2px 3px ${n.color}66)` } : undefined}>
          {n.estado === "activo" && (
            <circle cx={n.x} cy={Y} r={12} fill="none" stroke={n.color} strokeWidth={2} className="anillo-activo" />
          )}
          <circle
            cx={n.x}
            cy={Y}
            r={9}
            fill={n.estado === "pendiente" ? "var(--color-superficie)" : n.color}
            stroke={n.estado === "pendiente" ? "#c9d3d8" : n.color}
            strokeWidth={2}
          />
          <text
            x={n.x}
            y={Y + 24}
            textAnchor="middle"
            fontSize={11}
            fill="var(--color-tinta)"
            fillOpacity={n.estado === "pendiente" ? 0.45 : 1}
            fontWeight={n.estado === "pendiente" ? 500 : 700}
          >
            {n.etiqueta}
          </text>
        </g>
      ))}
    </svg>
  );
}
