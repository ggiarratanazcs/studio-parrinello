import { leggiStudio } from "@/lib/studio";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { TEMA_PREDEFINITO } from "@/lib/temi";
import { IMPAGINAZIONE_PREDEFINITA, SCRIPT_IMPAGINAZIONE } from "@/lib/impaginazione";
import { Suggerimenti } from "@/components/suggerimenti";
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

const epilogue = localFont({
  src: [
    { path: "../fonts/epilogue-latin-wght-normal.woff2", style: "normal" },
    { path: "../fonts/epilogue-latin-ext-wght-normal.woff2", style: "normal" },
  ],
  weight: "100 900",
  variable: "--font-epilogue",
  display: "swap",
});

const manrope = localFont({
  src: [
    { path: "../fonts/manrope-latin-wght-normal.woff2", style: "normal" },
    { path: "../fonts/manrope-latin-ext-wght-normal.woff2", style: "normal" },
  ],
  weight: "200 800",
  variable: "--font-manrope",
  display: "swap",
});

/** Titolo e nome dell'app dalla configurazione dello studio (Impostazioni → Studio). */
export async function generateMetadata(): Promise<Metadata> {
  const studio = await leggiStudio();
  return {
  title: {
    default: studio.nome,
    template: `%s · ${studio.nome}`,
  },
  description: `Gestione commesse · ${[studio.nome, studio.claim].filter(Boolean).join(", ")}`,
  applicationName: studio.nome,
  appleWebApp: {
    capable: true,
    title: studio.nome,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};
}

export const viewport: Viewport = {
  themeColor: "#ede8df",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      data-theme={TEMA_PREDEFINITO}
      data-impaginazione={IMPAGINAZIONE_PREDEFINITA}
      className={`${archivo.variable} ${epilogue.variable} ${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_IMPAGINAZIONE }} />
      </head>
      <body className="min-h-full">
        {children}
        <Suggerimenti />
      </body>
    </html>
  );
}
