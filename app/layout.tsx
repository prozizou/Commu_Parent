import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commu_Parent",
  description: "Liaison école-parents : messagerie, notifications et suivi en temps réel."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-paper text-ink-900 font-body antialiased">{children}</body>
    </html>
  );
}
