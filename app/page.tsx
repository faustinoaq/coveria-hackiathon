import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function Home() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  return (
    <AppShell
      emergencyNumber={process.env.EMERGENCY_NUMBER ?? "911"}
      crisisLine={process.env.CRISIS_LINE ?? "169"}
    />
  );
}
