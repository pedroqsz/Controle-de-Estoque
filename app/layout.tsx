import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controle de Estoque",
  description: "Controle simples de produtos e quantidades em estoque",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
