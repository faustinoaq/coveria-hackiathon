"use client";

import type { DatosPaso } from "@/lib/chat-tipos";

type EstadoTramo = "pendiente" | "activo" | "hecho" | "error";

function estadoDe(paso: DatosPaso | undefined): EstadoTramo {
  if (!paso) return "pendiente";
  return paso.estado;
}

function colorTramo(estado: EstadoTramo, colorBase: string): string {
  if (estado === "pendiente") return "#c9d3d8";
  if (estado === "error") return "var(--color-urgencia)";
  return colorBase;
}

interface Nodo {
  id: string;
  etiqueta: string;
  x: number;
  y: number;
  estado: EstadoTramo;
  color: string;
}

export function Recorrido({ pasos }: { pasos: DatosPaso[] }) {
  const poliza = pasos.find((p) => p.nombre === "buscar_poliza");
  const sintomas = pasos.find((p) => p.nombre === "buscar_sintomas");
  const cotizar = pasos.find((p) => p.nombre === "cotizar");

  const estadoPoliza = estadoDe(poliza);
  const estadoSintomas = estadoDe(sintomas);
  const estadoCotizar = estadoDe(cotizar);

  const azul = "var(--color-linea-agente)";
  const morado = "var(--color-linea-sintomas)";
  const amarillo = "var(--color-linea-poliza)";
  const verde = "var(--color-linea-red)";

  const nodos: Nodo[] = [
    { id: "agente", etiqueta: "CoverIA", x: 60, y: 40, estado: "hecho", color: azul },
    {
      id: "poliza",
      etiqueta: "Poliza",
      x: 300,
      y: 40,
      estado: estadoPoliza,
      color: estadoPoliza === "error" ? "var(--color-urgencia)" : amarillo,
    },
    {
      id: "sintomas",
      etiqueta: "Sintomas",
      x: 60,
      y: 130,
      estado: estadoSintomas,
      color: estadoSintomas === "error" ? "var(--color-urgencia)" : morado,
    },
    {
      id: "cobertura",
      etiqueta: "Cobertura",
      x: 180,
      y: 195,
      estado: estadoCotizar,
      color: estadoCotizar === "error" ? "var(--color-urgencia)" : verde,
    },
    {
      id: "red",
      etiqueta: "Red",
      x: 260,
      y: 195,
      estado: estadoCotizar,
      color: estadoCotizar === "error" ? "var(--color-urgencia)" : verde,
    },
    {
      id: "calculo",
      etiqueta: "Calculo",
      x: 340,
      y: 195,
      estado: estadoCotizar,
      color: estadoCotizar === "error" ? "var(--color-urgencia)" : verde,
    },
  ];

  return (
    <svg
      viewBox="0 0 400 230"
      role="img"
      aria-label="Recorrido de tu consulta a traves de las herramientas de CoverIA"
      className="w-full h-auto"
    >
      {/* tramos */}
      <line x1={72} y1={40} x2={288} y2={40} stroke={colorTramo(estadoPoliza, azul)} strokeWidth={3} />
      <line
        x1={60}
        y1={52}
        x2={60}
        y2={118}
        stroke={colorTramo(estadoSintomas, morado)}
        strokeWidth={3}
      />
      <line
        x1={72}
        y1={140}
        x2={168}
        y2={188}
        stroke={colorTramo(estadoCotizar, verde)}
        strokeWidth={3}
      />
      <line x1={192} y1={195} x2={248} y2={195} stroke={colorTramo(estadoCotizar, verde)} strokeWidth={3} />
      <line x1={272} y1={195} x2={328} y2={195} stroke={colorTramo(estadoCotizar, verde)} strokeWidth={3} />

      {nodos.map((n) => (
        <g key={n.id}>
          {n.estado === "activo" && (
            <circle
              cx={n.x}
              cy={n.y}
              r={14}
              fill="none"
              stroke={n.color}
              strokeWidth={2}
              className="anillo-activo"
            />
          )}
          <circle
            cx={n.x}
            cy={n.y}
            r={12}
            fill={n.estado === "pendiente" ? "var(--color-superficie)" : n.color}
            stroke={n.estado === "pendiente" ? "#c9d3d8" : n.color}
            strokeWidth={2}
          />
          <text
            x={n.x}
            y={n.y + 26}
            textAnchor="middle"
            fontSize={12}
            fill="var(--color-tinta)"
            fontWeight={n.estado === "pendiente" ? 400 : 700}
          >
            {n.etiqueta}
          </text>
        </g>
      ))}
    </svg>
  );
}
