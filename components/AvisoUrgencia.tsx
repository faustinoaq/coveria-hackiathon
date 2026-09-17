import type { NivelUrgencia } from "@/lib/urgencias";

export function AvisoUrgencia({
  nivel,
  emergencyNumber,
  crisisLine,
}: {
  nivel: NivelUrgencia;
  emergencyNumber: string;
  crisisLine: string;
}) {
  if (nivel === "ninguna") return null;

  // Sin deteccion de idioma en este componente (no depende del LLM a
  // proposito, para que se muestre de inmediato); se muestra en espanol e
  // ingles siempre, igual que el mensaje de crisis del backend.
  const texto =
    nivel === "crisis"
      ? `Si tienes pensamientos de hacerte dano, llama ahora a la Linea de Crisis ${crisisLine} o acude a emergencias (${emergencyNumber}). No estas solo. If you are having thoughts of harming yourself, call the Crisis Line ${crisisLine} now or go to emergency services (${emergencyNumber}). You are not alone.`
      : `Esto podria ser una emergencia. Acude a la sala de emergencias mas cercana o llama al ${emergencyNumber}. This could be an emergency. Go to the nearest emergency room or call ${emergencyNumber}.`;

  return (
    <div
      role="alert"
      className="relative z-0 bg-urgencia text-white px-4 py-3.5 flex items-center gap-3 shadow-[0_10px_24px_-14px_rgba(214,40,57,0.65)]"
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="w-5 h-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 2 1 17h18L10 2Z" />
        <path d="M10 8v4" />
        <circle cx="10" cy="14.5" r="0.5" fill="currentColor" />
      </svg>
      <p className="text-sm font-bold max-w-[70ch]">{texto}</p>
    </div>
  );
}
