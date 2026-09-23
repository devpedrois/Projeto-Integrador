import type { Metadata } from "next";
import { GateAcesso } from "@/components/layout/GateAcesso";
import "./globals.css";

export const metadata: Metadata = {
  title: "Origem",
  description: "Marketplace da economia criativa e do artesanato de Pernambuco",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <GateAcesso>{children}</GateAcesso>
      </body>
    </html>
  );
}
