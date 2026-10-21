import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Chiave segreta letta da Vercel, ripulita da spazi, a capo e virgolette
 * che a volte restano incollando il valore (e che bloccano la richiesta).
 */
function chiaveSegreta() {
  const grezza = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  // Le chiavi non contengono mai spazi: si tolgono anche quelli interni (a capo, tabulazioni)
  return grezza.trim().replace(/^SUPABASE_SECRET_KEY\s*=\s*/, "").replace(/["'\s]/g, "");
}

/** Controllo leggero sulla forma della chiave (mai il valore): per messaggi chiari. */
export function formaChiave(): "assente" | "segreta" | "service_role" | "pubblica" | "sconosciuta" {
  const c = chiaveSegreta();
  if (!c) return "assente";
  if (c.startsWith("sb_secret_")) return "segreta";
  if (c.startsWith("sb_publishable_")) return "pubblica";
  if (c.startsWith("eyJ")) return "service_role";
  return "sconosciuta";
}

/**
 * Accesso amministrativo a Supabase, solo sul server, per le operazioni riservate
 * (creare gli account degli utenti dello studio). Usa la chiave segreta impostata su Vercel
 * come SUPABASE_SECRET_KEY; senza chiave restituisce null.
 */
export function clientAmministratore() {
  const chiave = chiaveSegreta();
  if (!chiave) return null;
  return createClient<Database>(SUPABASE_URL, chiave, { auth: { persistSession: false, autoRefreshToken: false } });
}
