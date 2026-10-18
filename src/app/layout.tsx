import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { TEMA_PREDEFINITO } from "@/lib/temi";
import "./globals.css";

const archivo = localFont({
  src: [
    { path: "../fonts/archivo-latin-standard-normal.woff2", style: "normal" },
    { path: "../fonts/archivo-latin-ext-standard-normal.woff2", style: "normal" },
  ],
  weight: "100 900",
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Studio Parrinello",
    template: "%s · Studio Parrinello",
  },
  description: "Gestione commesse dello Studio Parrinello, architettura e design a Siracusa.",
  applicationName: "Studio Parrinello",
  appleWebApp: {
    capable: true,
    title: "Parrinello",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ede8df",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" data-theme={TEMA_PREDEFINITO} className={`${archivo.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
