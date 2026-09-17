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

  const texto =
    nivel === "crisis"
      ? `Si tienes pensamientos de hacerte dano, llama ahora a la Linea de Crisis ${crisisLine} o acude a emergencias (${emergencyNumber}). No estas solo.`
      : `Esto podria ser una emergencia. Acude a la sala de emergencias mas cercana o llama al ${emergencyNumber}.`;

  return (
    <div
      role="alert"
      className="bg-urgencia text-white px-4 py-3 flex items-center gap-3 border-b-2 border-tinta/10"
    >
      <span aria-hidden className="w-3 h-3 rounded-full bg-white flex-shrink-0" />
      <p className="text-sm font-bold max-w-[70ch]">{texto}</p>
    </div>
  );
}
