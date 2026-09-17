import type { Metadata } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "CoverIA",
  description:
    "CoverIA, asistente de beneficios de salud de Aseguradora Istmo Demo en Panama.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-PA" className={`${atkinson.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-sala text-tinta">
        {children}
      </body>
    </html>
  );
}
