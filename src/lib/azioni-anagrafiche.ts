"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/* ──────────────────────────────────────────────────────────────────────────
   Salvataggi delle schede anagrafiche: cliente e referenti.
   La sicurezza vera è nelle policy RLS (membri dello studio; eliminare un
   referente è riservato a titolari e architetti).
   ────────────────────────────────────────────────────────────────────────── */

export type Esito = { ok: true; id: string } | { ok: false; errore: string };

const SESSIONE_SCADUTA = "La sessione è scaduta. Accedi di nuovo e riprova.";
const TIPI = ["persona_fisica", "azienda", "ente_pubblico"] as const;

export type DatiCliente = {
  tipo: (typeof TIPI)[number];
  nome: string;
  cognome: string;
  ragione_sociale: string;
  codice_fiscale: string;
  partita_iva: string;
  codice_sdi: string;
  codice_ipa: string;
  pec: string;
  email: string;
  telefono: string;
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: string;
  /** Come ha conosciuto lo studio */
  fonte: string;
  note: string;
};

export type DatiReferente = {
  nome: string;
  ruolo: string;
  email: string;
  telefono: string;
  note: string;
  principale: boolean;
};

export type PossibileDoppione = { id: string; nome: string; motivo: string; comune: string | null };

async function sessione() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const utente = data?.claims?.sub;
  return utente ? { supabase, utente } : null;
}

const pulito = (v: string | null | undefined) => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};
const maiuscolo = (v: string) => pulito(v)?.toUpperCase().replace(/\s+/g, "") ?? null;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizzaCliente(d: DatiCliente) {
  const privato = d.tipo === "persona_fisica";
  return {
    tipo: d.tipo,
    nome: privato ? pulito(d.nome) : null,
    cognome: privato ? pulito(d.cognome) : null,
    ragione_sociale: privato ? null : pulito(d.ragione_sociale),
    codice_fiscale: maiuscolo(d.codice_fiscale),
    partita_iva: maiuscolo(d.partita_iva),
    codice_sdi: d.tipo === "ente_pubblico" ? null : maiuscolo(d.codice_sdi),
    codice_ipa: d.tipo === "ente_pubblico" ? maiuscolo(d.codice_ipa) : null,
    pec: pulito(d.pec)?.toLowerCase() ?? null,
    email: pulito(d.email)?.toLowerCase() ?? null,
    telefono: pulito(d.telefono),
    indirizzo: pulito(d.indirizzo),
    cap: pulito(d.cap),
    comune: pulito(d.comune),
    provincia: maiuscolo(d.provincia),
    fonte: pulito(d.fonte),
    note: pulito(d.note),
  };
}

/** Errori di compilazione, per campo. Vuoto = tutto a posto. */
function controllaCliente(d: DatiCliente): Record<string, string> {
  const errori: Record<string, string> = {};
  if (!TIPI.includes(d.tipo)) errori.tipo = "Scegli il tipo di cliente.";
  if (d.tipo === "persona_fisica" && !pulito(d.cognome)) errori.cognome = "Scrivi almeno il cognome.";
  if (d.tipo !== "persona_fisica" && !pulito(d.ragione_sociale))
    errori.ragione_sociale = d.tipo === "ente_pubblico" ? "Scrivi il nome dell'ente." : "Scrivi la ragione sociale.";
  if (pulito(d.email) && !EMAIL.test(d.email.trim())) errori.email = "L'indirizzo email non sembra corretto.";
  if (pulito(d.pec) && !EMAIL.test(d.pec.trim())) errori.pec = "L'indirizzo PEC non sembra corretto.";
  return errori;
}

/** Crea (id = null) o aggiorna un cliente. */
export async function salvaCliente(
  id: string | null,
  dati: DatiCliente,
): Promise<Esito | { ok: false; errore: string; errori: Record<string, string> }> {
  const s = await sessione();
  if (!s) return { ok: false, errore: SESSIONE_SCADUTA };
  const errori = controllaCliente(dati);
  if (Object.keys(errori).length) return { ok: false, errore: "Controlla i campi segnati.", errori };

  const riga = normalizzaCliente(dati);
  if (id) {
    const { data, error } = await s.supabase.from("clienti").update(riga).eq("id", id).select("id").maybeSingle();
    if (error || !data) return { ok: false, errore: "Non è stato possibile salvare le modifiche. Riprova." };
  } else {
    const { data, error } = await s.supabase
      .from("clienti")
      .insert({ ...riga, created_by: s.utente })
      .select("id")
      .single();
    if (error || !data) return { ok: false, errore: "Non è stato possibile creare il cliente. Riprova." };
    id = data.id;
  }
  revalidatePath("/", "layout");
  return { ok: true, id };
}

/**
 * Clienti già in archivio che potrebbero essere lo stesso: stesso codice fiscale,
 * stessa partita IVA o stesso nome. Serve solo ad avvisare, non blocca il salvataggio.
 */
export async function cercaDoppioniCliente(dati: DatiCliente, escludiId: string | null): Promise<PossibileDoppione[]> {
  const s = await sessione();
  if (!s) return [];
  const r = normalizzaCliente(dati);
  const nome = r.ragione_sociale ?? [r.cognome, r.nome].filter(Boolean).join(" ");

  const ricerche: { motivo: string; q: PromiseLike<{ data: { id: string; denominazione: string | null; comune: string | null }[] | null }> }[] = [];
  const campi = "id, denominazione, comune";
  if (r.codice_fiscale) ricerche.push({ motivo: "stesso codice fiscale", q: s.supabase.from("clienti").select(campi).eq("codice_fiscale", r.codice_fiscale).limit(3) });
  if (r.partita_iva) ricerche.push({ motivo: "stessa partita IVA", q: s.supabase.from("clienti").select(campi).eq("partita_iva", r.partita_iva).limit(3) });
  if (nome) ricerche.push({ motivo: "stesso nome", q: s.supabase.from("clienti").select(campi).ilike("denominazione", nome).limit(3) });

  const trovati = new Map<string, PossibileDoppione>();
  const risultati = await Promise.all(ricerche.map((x) => x.q));
  risultati.forEach((ris, i) => {
    for (const c of ris.data ?? []) {
      if (c.id === escludiId || trovati.has(c.id)) continue;
      trovati.set(c.id, { id: c.id, nome: c.denominazione ?? "Senza nome", motivo: ricerche[i].motivo, comune: c.comune });
    }
  });
  return [...trovati.values()];
}

/** Crea (id = null) o aggiorna un referente del cliente. */
export async function salvaReferente(clienteId: string, id: string | null, dati: DatiReferente): Promise<Esito> {
  const s = await sessione();
  if (!s) return { ok: false, errore: SESSIONE_SCADUTA };
  if (!pulito(dati.nome)) return { ok: false, errore: "Scrivi il nome del referente." };
  if (pulito(dati.email) && !EMAIL.test(dati.email.trim())) return { ok: false, errore: "L'indirizzo email non sembra corretto." };

  // Un solo referente principale per cliente
  if (dati.principale) {
    let q = s.supabase.from("clienti_referenti").update({ principale: false }).eq("cliente_id", clienteId);
    if (id) q = q.neq("id", id);
    await q;
  }

  const riga = {
    nome: pulito(dati.nome)!,
    ruolo: pulito(dati.ruolo),
    email: pulito(dati.email)?.toLowerCase() ?? null,
    telefono: pulito(dati.telefono),
    note: pulito(dati.note),
    principale: dati.principale,
  };
  if (id) {
    const { data, error } = await s.supabase.from("clienti_referenti").update(riga).eq("id", id).select("id").maybeSingle();
    if (error || !data) return { ok: false, errore: "Non è stato possibile salvare il referente. Riprova." };
  } else {
    const { data, error } = await s.supabase
      .from("clienti_referenti")
      .insert({ ...riga, cliente_id: clienteId })
      .select("id")
      .single();
    if (error || !data) return { ok: false, errore: "Non è stato possibile aggiungere il referente. Riprova." };
    id = data.id;
  }
  revalidatePath("/", "layout");
  return { ok: true, id };
}

export async function eliminaReferente(id: string): Promise<Esito> {
  const s = await sessione();
  if (!s) return { ok: false, errore: SESSIONE_SCADUTA };
  const { data, error } = await s.supabase.from("clienti_referenti").delete().eq("id", id).select("id");
  if (error) return { ok: false, errore: "Non è stato possibile eliminare il referente. Riprova." };
  if (!data?.length) return { ok: false, errore: "Solo titolari e architetti possono eliminare un referente." };
  revalidatePath("/", "layout");
  return { ok: true, id };
}
