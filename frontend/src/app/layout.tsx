import type { Metadata } from "next";
import { Figtree, Playfair_Display } from "next/font/google";
import { GateAcesso } from "@/components/layout/GateAcesso";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-figtree",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Origem",
  description: "Marketplace da economia criativa e do artesanato de Pernambuco",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${figtree.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-surface-page font-sans text-fg-body antialiased">
        <GateAcesso>{children}</GateAcesso>
      </body>
    </html>
  );
}
