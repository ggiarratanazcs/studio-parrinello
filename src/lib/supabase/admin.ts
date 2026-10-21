import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Accesso amministrativo a Supabase, solo sul server, per le operazioni riservate
 * (creare gli account degli utenti dello studio). Usa la chiave segreta impostata su Vercel
 * come SUPABASE_SECRET_KEY; senza chiave restituisce null.
 */
export function clientAmministratore() {
  const chiave = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chiave) return null;
  return createClient<Database>(SUPABASE_URL, chiave, { auth: { persistSession: false, autoRefreshToken: false } });
}
