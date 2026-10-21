import type { MetadataRoute } from "next";
import { leggiStudio } from "@/lib/studio";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const studio = await leggiStudio();
  return {
    name: `${studio.nome} — Commesse`,
    short_name: studio.nome,
    description: `Gestione commesse · ${studio.nome}`,
    lang: "it",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ede8df",
    theme_color: "#ede8df",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
