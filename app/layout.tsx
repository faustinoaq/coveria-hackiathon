import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CoverIA",
  description:
    "CoverIA, asistente de beneficios de salud de Aseguradora Istmo Demo en Panama.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-PA" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full flex flex-col bg-sala text-tinta overflow-hidden">
        {children}
      </body>
    </html>
  );
}
