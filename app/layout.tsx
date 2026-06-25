import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DialogProvider } from "@/components/DialogContext";

export const metadata: Metadata = {
  title: "EngCar",
  description: "Totem de recepção para controle de veículos corporativos",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EngCar",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#F8FAFC",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <DialogProvider>
          {children}
        </DialogProvider>
      </body>
    </html>
  );
}
