import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";

export default async function Home() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <p className="text-lg">CoverIA — sesion activa: {sesion.sub}</p>
    </main>
  );
}
