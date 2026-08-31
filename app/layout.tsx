import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Commu_Parent",
  description: "Liaison école-parents : messagerie, notifications et suivi en temps réel.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.svg",
    // iOS ignore les icônes SVG pour "Ajouter à l'écran d'accueil" : il lui faut un PNG
    // dédié, sans coins arrondis ni transparence (iOS applique lui-même le masque).
    apple: "/icons/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#c96a4d"
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
      <body className="bg-paper text-ink-900 font-body antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
