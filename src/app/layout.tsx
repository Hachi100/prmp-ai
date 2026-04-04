import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRMP-Pro — Plateforme IA de Passation des Marches Publics",
  description:
    "Copilote IA pour la PRMP — Automatisation du cycle de passation et d'execution des marches publics au Benin",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
