export function Logo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="2" y="2" width="12.5" height="12.5" rx="4" fill="var(--color-linea-agente)" />
      <rect x="17.5" y="2" width="12.5" height="12.5" rx="4" fill="var(--color-linea-sintomas)" />
      <rect x="2" y="17.5" width="12.5" height="12.5" rx="4" fill="var(--color-linea-poliza)" />
      <rect x="17.5" y="17.5" width="12.5" height="12.5" rx="4" fill="var(--color-linea-red)" />
    </svg>
  );
}
