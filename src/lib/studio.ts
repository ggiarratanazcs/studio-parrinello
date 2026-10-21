import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Configurazione generale dello studio (Impostazioni → Studio, solo titolare):
 * nome, claim e logo mostrati in tutta l'app, dati riportati su documenti e stampe.
 * Letta una volta e tenuta in memoria; il salvataggio la aggiorna (tag "studio").
 */
export type DatiStudio = {
  nome: string;
  claim: string;
  /** Indirizzo pubblico del logo caricato; null = monogramma predefinito */
  logoUrl: string | null;
  logoPath: string | null;
  indirizzo: string;
  telefono: string;
  email: string;
  sito: string;
  partitaIva: string;
};

/** Valori di partenza, usati anche se il database non risponde. */
export const STUDIO_PREDEFINITO: DatiStudio = {
  nome: "Studio Parrinello",
  claim: "Architettura e design",
  logoUrl: null,
  logoPath: null,
  indirizzo: "Via Temistocle 2, 96100 Siracusa",
  telefono: "+39 334 748 7963",
  email: "info@studioparrinello.com",
  sito: "www.studioparrinello.com",
  partitaIva: "",
};

export const TAG_STUDIO = "studio";

export async function leggiStudio(): Promise<DatiStudio> {
  "use cache";
  cacheTag(TAG_STUDIO);
  cacheLife("max");
  // Lettura pubblica (nome, claim e logo compaiono anche nella pagina di accesso): niente cookie
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data } = await supabase.from("studio").select("*").eq("id", 1).maybeSingle();
  if (!data) return STUDIO_PREDEFINITO;
  const logoUrl = data.logo_path ? supabase.storage.from("studio").getPublicUrl(data.logo_path).data.publicUrl : null;
  return {
    nome: data.nome || STUDIO_PREDEFINITO.nome,
    claim: data.claim ?? "",
    logoUrl,
    logoPath: data.logo_path,
    indirizzo: data.indirizzo ?? "",
    telefono: data.telefono ?? "",
    email: data.email ?? "",
    sito: data.sito ?? "",
    partitaIva: data.partita_iva ?? "",
  };
}
