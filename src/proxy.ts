import type { NextRequest } from "next/server";
import { aggiornaSessione } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return aggiornaSessione(request);
}

export const config = {
  matcher: [
    // Esclude file statici, icone, manifest e immagini
    "/((?!_next/static|_next/image|brand/|dati/|icon|apple-icon|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)",
  ],
};
