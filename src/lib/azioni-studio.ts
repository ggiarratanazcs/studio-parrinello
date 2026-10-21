"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TAG_STUDIO } from "@/lib/studio";
import { RUOLI } from "@/lib/dominio";

/* ──────────────────────────────────────────────────────────────────────────
   Impostazioni dello studio (solo titolare): dati dello studio, logo, utenti.
   Le regole del database (RLS) permettono queste modifiche solo al titolare;
   qui lo si controlla anche prima, per dare un messaggio chiaro.
   ────────────────────────────────────────────────────────────────────────── */

export type Esito = { ok: true } | { ok: false; errore: string };

export type DatiStudioModulo = {
  nome: string;
  claim: string;
  indirizzo: string;
  telefono: string;
  email: string;
  sito: string;
  partita_iva: string;
};

const SOLO_TITOLARE = "Solo il titolare può modificare le impostazioni dello studio.";

async function titolare() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: p } = await supabase.from("profili").select("ruolo, attivo").eq("id", id).maybeSingle();
  if (!p || !p.attivo || p.ruolo !== "titolare") return null;
  return { supabase, id };
}

const pulito = (v: string) => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

/** Dopo ogni modifica: nome, claim e logo si aggiornano subito in tutta l'app. */
function aggiornaStudio() {
  updateTag(TAG_STUDIO);
  revalidatePath("/", "layout");
}

export async function salvaStudio(d: DatiStudioModulo): Promise<Esito> {
  const t = await titolare();
  if (!t) return { ok: false, errore: SOLO_TITOLARE };
  if (!pulito(d.nome)) return { ok: false, errore: "Il nome dello studio è necessario." };
  if (pulito(d.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return { ok: false, errore: "L'indirizzo email non sembra corretto." };
  const { error } = await t.supabase
    .from("studio")
    .update({
      nome: pulito(d.nome)!,
      claim: pulito(d.claim),
      indirizzo: pulito(d.indirizzo),
      telefono: pulito(d.telefono),
      email: pulito(d.email)?.toLowerCase() ?? null,
      sito: pulito(d.sito),
      partita_iva: pulito(d.partita_iva)?.replace(/\s+/g, "") ?? null,
    })
    .eq("id", 1);
  if (error) return { ok: false, errore: "Non è stato possibile salvare. Riprova." };
  aggiornaStudio();
  return { ok: true };
}

/**
 * Registra il logo appena caricato dal browser nello spazio "studio" (percorso `percorso`)
 * ed elimina quello precedente. Con `percorso` null rimuove il logo: torna il monogramma.
 */
export async function impostaLogo(percorso: string | null): Promise<Esito> {
  const t = await titolare();
  if (!t) return { ok: false, errore: SOLO_TITOLARE };
  if (percorso && !/^logo\/[\w.-]+$/.test(percorso)) return { ok: false, errore: "File del logo non valido." };
  const { data: prima } = await t.supabase.from("studio").select("logo_path").eq("id", 1).maybeSingle();
  const { error } = await t.supabase.from("studio").update({ logo_path: percorso }).eq("id", 1);
  if (error) return { ok: false, errore: "Non è stato possibile salvare il logo. Riprova." };
  if (prima?.logo_path && prima.logo_path !== percorso) {
    await t.supabase.storage.from("studio").remove([prima.logo_path]);
  }
  aggiornaStudio();
  return { ok: true };
}

/** Ruolo e stato (attivo o disattivato) di un utente dello studio. */
export async function aggiornaUtente(id: string, modifica: { ruolo?: string; attivo?: boolean }): Promise<Esito> {
  const t = await titolare();
  if (!t) return { ok: false, errore: SOLO_TITOLARE };
  if (modifica.ruolo !== undefined && !(modifica.ruolo in RUOLI)) return { ok: false, errore: "Ruolo non valido." };

  // Lo studio non deve mai restare senza un titolare attivo
  const perdeTitolare = (modifica.ruolo !== undefined && modifica.ruolo !== "titolare") || modifica.attivo === false;
  if (perdeTitolare) {
    const { data: persona } = await t.supabase.from("profili").select("ruolo, attivo").eq("id", id).maybeSingle();
    if (persona?.ruolo === "titolare" && persona.attivo) {
      const { count } = await t.supabase.from("profili").select("id", { count: "exact", head: true }).eq("ruolo", "titolare").eq("attivo", true);
      if ((count ?? 0) <= 1) return { ok: false, errore: "Serve almeno un titolare attivo: nomina prima un altro titolare." };
    }
  }
  if (id === t.id && modifica.attivo === false) return { ok: false, errore: "Non puoi disattivare il tuo stesso utente." };

  const { data, error } = await t.supabase.from("profili").update(modifica).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { ok: false, errore: "Non è stato possibile salvare la modifica. Riprova." };
  revalidatePath("/impostazioni");
  return { ok: true };
}
