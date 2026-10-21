"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { geocodifica } from "@/lib/geocodifica";

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
  revalidatePath("/clienti");
  revalidatePath("/");
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
  revalidatePath("/clienti");
  revalidatePath("/");
  return { ok: true, id };
}

export async function eliminaReferente(id: string): Promise<Esito> {
  const s = await sessione();
  if (!s) return { ok: false, errore: SESSIONE_SCADUTA };
  const { data, error } = await s.supabase.from("clienti_referenti").delete().eq("id", id).select("id");
  if (error) return { ok: false, errore: "Non è stato possibile eliminare il referente. Riprova." };
  if (!data?.length) return { ok: false, errore: "Solo titolari e architetti possono eliminare un referente." };
  revalidatePath("/clienti");
  revalidatePath("/");
  return { ok: true, id };
}

/* ──────────────────────────────────────────────────────────────────────────
   Immobile e identificativi catastali
   ────────────────────────────────────────────────────────────────────────── */

export type DatiImmobile = {
  denominazione: string;
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: string;
  zona_urbanistica: string;
  strumento_urbanistico: string;
  destinazione_uso: string;
  superficie_mq: string;
  anno_costruzione: string;
  vincoli: string[];
  note: string;
};

export type DatiCatasto = {
  catasto: "fabbricati" | "terreni";
  sezione: string;
  foglio: string;
  particella: string;
  subalterno: string;
  categoria: string;
  classe: string;
  consistenza: string;
  rendita: string;
  intestatari: string;
  note: string;
};

export type PossibileDoppioneImmobile = { id: string; nome: string; indirizzo: string };

const numero = (v: string) => {
  const t = v.trim().replace(/\./g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

function controllaImmobile(d: DatiImmobile): Record<string, string> {
  const errori: Record<string, string> = {};
  if (!pulito(d.indirizzo)) errori.indirizzo = "Scrivi indirizzo e numero civico.";
  if (!pulito(d.comune)) errori.comune = "Scegli il comune.";
  const sup = numero(d.superficie_mq);
  if (sup !== null && (Number.isNaN(sup) || sup < 0)) errori.superficie_mq = "Scrivi la superficie in metri quadri, solo numeri.";
  const anno = numero(d.anno_costruzione);
  if (anno !== null && (Number.isNaN(anno) || anno < 1000 || anno > new Date().getFullYear() + 5)) errori.anno_costruzione = "Scrivi un anno a quattro cifre.";
  return errori;
}

/** Crea (id = null) o aggiorna un immobile; se l'indirizzo è nuovo o cambiato, ne cerca la posizione sulla mappa. */
export async function salvaImmobile(
  id: string | null,
  dati: DatiImmobile,
): Promise<Esito | { ok: false; errore: string; errori: Record<string, string> }> {
  const s = await sessione();
  if (!s) return { ok: false, errore: SESSIONE_SCADUTA };
  const errori = controllaImmobile(dati);
  if (Object.keys(errori).length) return { ok: false, errore: "Controlla i campi segnati.", errori };

  const riga = {
    denominazione: pulito(dati.denominazione),
    indirizzo: pulito(dati.indirizzo)!,
    cap: pulito(dati.cap),
    comune: pulito(dati.comune)!,
    provincia: maiuscolo(dati.provincia),
    zona_urbanistica: pulito(dati.zona_urbanistica),
    strumento_urbanistico: pulito(dati.strumento_urbanistico),
    destinazione_uso: pulito(dati.destinazione_uso),
    superficie_mq: numero(dati.superficie_mq),
    anno_costruzione: numero(dati.anno_costruzione),
    vincoli: dati.vincoli.length ? dati.vincoli : null,
    note: pulito(dati.note),
  };

  let rifaiPosizione = true;
  if (id) {
    const { data: prima } = await s.supabase.from("immobili").select("indirizzo, cap, comune, latitudine").eq("id", id).maybeSingle();
    rifaiPosizione = !prima || prima.latitudine == null || prima.indirizzo !== riga.indirizzo || prima.comune !== riga.comune || prima.cap !== riga.cap;
    const { data, error } = await s.supabase.from("immobili").update(riga).eq("id", id).select("id").maybeSingle();
    if (error || !data) return { ok: false, errore: "Non è stato possibile salvare le modifiche. Riprova." };
  } else {
    const { data, error } = await s.supabase.from("immobili").insert(riga).select("id").single();
    if (error || !data) return { ok: false, errore: "Non è stato possibile creare l'immobile. Riprova." };
    id = data.id;
  }

  // La posizione è un di più: se non si trova, l'immobile resta da posizionare a mano dall'elenco
  if (rifaiPosizione) {
    try {
      const p = await geocodifica({ indirizzo: riga.indirizzo, cap: riga.cap, comune: riga.comune, provincia: riga.provincia });
      await s.supabase.from("immobili").update({ latitudine: p?.lat ?? null, longitudine: p?.lng ?? null }).eq("id", id);
    } catch {
      // nessun blocco
    }
  }
  revalidatePath("/immobili");
  revalidatePath("/");
  return { ok: true, id };
}

/** Immobili già in archivio allo stesso indirizzo nello stesso comune (solo avviso). */
export async function cercaDoppioniImmobile(dati: DatiImmobile, escludiId: string | null): Promise<PossibileDoppioneImmobile[]> {
  const s = await sessione();
  if (!s) return [];
  const indirizzo = pulito(dati.indirizzo);
  const comune = pulito(dati.comune);
  if (!indirizzo || !comune) return [];
  const { data } = await s.supabase
    .from("immobili")
    .select("id, denominazione, indirizzo, comune")
    .ilike("indirizzo", indirizzo.replace(/[%_]/g, ""))
    .ilike("comune", comune.replace(/[%_]/g, ""))
    .limit(3);
  return (data ?? [])
    .filter((i) => i.id !== escludiId)
    .map((i) => ({ id: i.id, nome: i.denominazione || i.indirizzo, indirizzo: `${i.indirizzo}, ${i.comune}` }));
}

/** Crea (id = null) o aggiorna un identificativo catastale dell'immobile. */
export async function salvaCatasto(immobileId: string, id: string | null, d: DatiCatasto): Promise<Esito> {
  const s = await sessione();
  if (!s) return { ok: false, errore: SESSIONE_SCADUTA };
  if (!pulito(d.foglio) || !pulito(d.particella)) return { ok: false, errore: "Foglio e particella sono necessari." };
  const rendita = numero(d.rendita);
  if (rendita !== null && Number.isNaN(rendita)) return { ok: false, errore: "Scrivi la rendita in euro, solo numeri." };
  const riga = {
    catasto: d.catasto === "terreni" ? "terreni" : "fabbricati",
    sezione: maiuscolo(d.sezione),
    foglio: pulito(d.foglio)!,
    particella: pulito(d.particella)!,
    subalterno: pulito(d.subalterno),
    categoria: maiuscolo(d.categoria),
    classe: pulito(d.classe),
    consistenza: pulito(d.consistenza),
    rendita,
    intestatari: pulito(d.intestatari),
    note: pulito(d.note),
  };
  if (id) {
    const { data, error } = await s.supabase.from("immobili_catasto").update(riga).eq("id", id).select("id").maybeSingle();
    if (error || !data) return { ok: false, errore: "Non è stato possibile salvare i dati catastali. Riprova." };
  } else {
    const { data, error } = await s.supabase.from("immobili_catasto").insert({ ...riga, immobile_id: immobileId }).select("id").single();
    if (error || !data) return { ok: false, errore: "Non è stato possibile aggiungere i dati catastali. Riprova." };
    id = data.id;
  }
  revalidatePath("/immobili");
  return { ok: true, id };
}

export async function eliminaCatasto(id: string): Promise<Esito> {
  const s = await sessione();
  if (!s) return { ok: false, errore: SESSIONE_SCADUTA };
  const { data, error } = await s.supabase.from("immobili_catasto").delete().eq("id", id).select("id");
  if (error) return { ok: false, errore: "Non è stato possibile eliminare i dati catastali. Riprova." };
  if (!data?.length) return { ok: false, errore: "Solo titolari e architetti possono eliminare i dati catastali." };
  revalidatePath("/immobili");
  return { ok: true, id };
}

/* ──────────────────────────────────────────────────────────────────────────
   Compilazione dalla partita IVA con VIES, il servizio gratuito della
   Commissione europea. Restituisce denominazione e indirizzo solo per le
   partite IVA abilitate alle operazioni intracomunitarie: per le altre non
   trova nulla e si compila a mano. Non fornisce PEC né codice SDI.
   ────────────────────────────────────────────────────────────────────────── */

export type DatiDaPartitaIva =
  | { ok: true; ragione_sociale: string; indirizzo: string; cap: string; comune: string; provincia: string }
  | { ok: false; errore: string };

/** Controllo formale della partita IVA italiana (11 cifre e cifra di controllo). */
function partitaIvaValida(p: string) {
  if (!/^\d{11}$/.test(p)) return false;
  let somma = 0;
  for (let i = 0; i < 10; i++) {
    let c = Number(p[i]);
    if (i % 2 === 1) {
      c *= 2;
      if (c > 9) c -= 9;
    }
    somma += c;
  }
  return (10 - (somma % 10)) % 10 === Number(p[10]);
}

/** "VIA ROMA 12" → "Via Roma 12"; lascia in maiuscolo sigle brevi come "SS" o "SNC". */
function iniziale(t: string) {
  return t
    .toLowerCase()
    .split(/(\s+|-|')/)
    .map((p) => (p.length > 0 && /\p{L}/u.test(p) ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join("")
    .replace(/\b(Ss|Sp|Sr|Snc|Sas|Srl|Spa)\b/g, (m) => m.toUpperCase());
}

export async function datiDaPartitaIva(partitaIva: string): Promise<DatiDaPartitaIva> {
  const s = await sessione();
  if (!s) return { ok: false, errore: SESSIONE_SCADUTA };
  const piva = partitaIva.replace(/\s+/g, "").replace(/^IT/i, "");
  if (!partitaIvaValida(piva)) return { ok: false, errore: "La partita IVA non è corretta: controlla le 11 cifre." };

  let risposta: { isValid?: boolean; name?: string; address?: string; userError?: string };
  try {
    const r = await fetch(`https://ec.europa.eu/taxation_customs/vies/rest-api/ms/IT/vat/${piva}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!r.ok) return { ok: false, errore: "Il servizio VIES non risponde in questo momento. Riprova tra poco o compila a mano." };
    risposta = await r.json();
  } catch {
    return { ok: false, errore: "Il servizio VIES non risponde in questo momento. Riprova tra poco o compila a mano." };
  }

  if (!risposta.isValid) {
    return {
      ok: false,
      errore:
        risposta.userError && risposta.userError !== "INVALID"
          ? "Il servizio VIES è momentaneamente non disponibile. Riprova tra poco o compila a mano."
          : "Partita IVA non presente in VIES (succede per chi non opera con l'estero): compila i dati a mano.",
    };
  }

  const nome = (risposta.name ?? "").trim();
  const righe = (risposta.address ?? "")
    .split(/\n/)
    .map((r) => r.trim())
    .filter(Boolean);
  // Ultima riga di solito: "00144 ROMA RM"
  const ultima = righe.length ? righe[righe.length - 1] : "";
  const m = ultima.match(/^(\d{5})\s+(.+?)\s+([A-Z]{2})$/i);
  const indirizzo = m ? righe.slice(0, -1).join(" ") : righe.join(" ");
  return {
    ok: true,
    ragione_sociale: nome && nome !== "---" ? nome : "",
    indirizzo: indirizzo && indirizzo !== "---" ? iniziale(indirizzo) : "",
    cap: m ? m[1] : "",
    comune: m ? iniziale(m[2]) : "",
    provincia: m ? m[3].toUpperCase() : "",
  };
}
