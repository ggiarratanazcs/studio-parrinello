"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import { propostaFasi } from "@/lib/fasi";

export type Esito = { ok: true; id: string } | { ok: false; errore: string };

const SESSIONE_SCADUTA = "La sessione è scaduta. Accedi di nuovo e riprova.";

async function clientAutenticato() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ? supabase : null;
}

function aggiornaElenchi() {
  revalidatePath("/", "layout");
}

/* ── Creazione ─────────────────────────────────────────────────────────── */

export async function creaCommessa(dati: Json): Promise<Esito> {
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const { data, error } = await supabase.rpc("crea_commessa", { dati });
  if (error || !data) return { ok: false, errore: "Non è stato possibile creare la commessa. Controlla i dati obbligatori e riprova." };
  aggiornaElenchi();
  return { ok: true, id: data };
}

export async function creaPreventivo(dati: Json): Promise<Esito> {
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const { data, error } = await supabase.rpc("crea_preventivo", { dati });
  if (error || !data) return { ok: false, errore: "Non è stato possibile creare il preventivo. Controlla i dati obbligatori e riprova." };
  aggiornaElenchi();
  return { ok: true, id: data };
}

export async function creaPrefattibilita(dati: Json): Promise<Esito> {
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const { data, error } = await supabase.rpc("crea_prefattibilita", { dati });
  if (error || !data) return { ok: false, errore: "Non è stato possibile creare la pre-fattibilità. Controlla i dati obbligatori e riprova." };
  aggiornaElenchi();
  return { ok: true, id: data };
}

/* ── Stato ─────────────────────────────────────────────────────────────── */

const STATI_PREVENTIVO = ["bozza", "inviato", "accettato", "rifiutato", "superato"];
const STATI_PREFATTIBILITA = ["in_corso", "consegnata", "archiviata"];

export async function aggiornaStatoPreventivo(id: string, stato: string): Promise<Esito> {
  if (!STATI_PREVENTIVO.includes(stato)) return { ok: false, errore: "Stato non valido." };
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const oggi = new Date().toISOString().slice(0, 10);
  const extra = stato === "inviato" ? { data_invio: oggi } : stato === "accettato" || stato === "rifiutato" ? { data_esito: oggi } : {};
  const { error } = await supabase.from("preventivi").update({ stato, ...extra }).eq("id", id);
  if (error) return { ok: false, errore: "Non è stato possibile aggiornare lo stato." };
  aggiornaElenchi();
  return { ok: true, id };
}

export async function aggiornaStatoPrefattibilita(id: string, stato: string): Promise<Esito> {
  if (!STATI_PREFATTIBILITA.includes(stato)) return { ok: false, errore: "Stato non valido." };
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const { error } = await supabase.from("prefattibilita").update({ stato }).eq("id", id);
  if (error) return { ok: false, errore: "Non è stato possibile aggiornare lo stato." };
  aggiornaElenchi();
  return { ok: true, id };
}

/* ── Conversione in commessa ───────────────────────────────────────────── */

/**
 * Trasforma un preventivo o una pre-fattibilità in commessa. Le fasi vengono dalle
 * voci del preventivo collegate al catalogo; se mancano, si usa la proposta standard
 * per committenza e tipologia.
 */
export async function convertiInCommessa(origine: "preventivo" | "prefattibilita", id: string): Promise<Esito> {
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };

  const { data: sorgente } =
    origine === "preventivo"
      ? await supabase.from("preventivi").select("committenza, tipologia_intervento").eq("id", id).maybeSingle()
      : await supabase.from("prefattibilita").select("committenza, tipologia_intervento").eq("id", id).maybeSingle();
  if (!sorgente) return { ok: false, errore: "Documento non trovato." };

  const codici = propostaFasi(sorgente.committenza, sorgente.tipologia_intervento);
  const { data: catalogo } = await supabase.from("fasi_catalogo").select("id, codice, nome, ordine").in("codice", codici).order("ordine");
  const fasi = (catalogo ?? []).map((f) => ({ fase_catalogo_id: f.id, codice: f.codice, nome: f.nome }));

  const { data, error } = await supabase.rpc("converti_in_commessa", { p_origine: origine, p_id: id, p_fasi: fasi });
  if (error || !data) {
    return {
      ok: false,
      errore: error?.message.includes("già trasformat")
        ? "Questo documento è già stato trasformato in commessa."
        : "Non è stato possibile creare la commessa. Riprova.",
    };
  }
  aggiornaElenchi();
  return { ok: true, id: data };
}
