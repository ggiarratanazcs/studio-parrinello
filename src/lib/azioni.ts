"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import { propostaFasi } from "@/lib/fasi";
import { geocodifica } from "@/lib/geocodifica";

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

type ClienteSupabase = NonNullable<Awaited<ReturnType<typeof clientAutenticato>>>;

/**
 * Dopo la creazione di una pratica: se il suo immobile non è ancora sulla mappa,
 * ne cerca le coordinate dall'indirizzo e le salva. Se non lo trova, resta da posizionare a mano.
 */
async function posizionaImmobileDi(supabase: ClienteSupabase, tabella: "commesse" | "preventivi" | "prefattibilita", id: string) {
  try {
    const { data: riga } = await supabase.from(tabella).select("immobile_id").eq("id", id).maybeSingle();
    if (!riga?.immobile_id) return;
    const { data: imm } = await supabase
      .from("immobili")
      .select("id, indirizzo, cap, comune, provincia, latitudine")
      .eq("id", riga.immobile_id)
      .maybeSingle();
    if (!imm || imm.latitudine != null) return;
    const p = await geocodifica(imm);
    if (p) await supabase.from("immobili").update({ latitudine: p.lat, longitudine: p.lng }).eq("id", imm.id);
  } catch {
    // la posizione è un di più: un errore qui non deve bloccare la creazione
  }
}

/* ── Creazione ─────────────────────────────────────────────────────────── */

export async function creaCommessa(dati: Json): Promise<Esito> {
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const { data, error } = await supabase.rpc("crea_commessa", { dati });
  if (error || !data) return { ok: false, errore: "Non è stato possibile creare la commessa. Controlla i dati obbligatori e riprova." };
  await posizionaImmobileDi(supabase, "commesse", data);
  aggiornaElenchi();
  return { ok: true, id: data };
}

export async function creaPreventivo(dati: Json): Promise<Esito> {
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const { data, error } = await supabase.rpc("crea_preventivo", { dati });
  if (error || !data) return { ok: false, errore: "Non è stato possibile creare il preventivo. Controlla i dati obbligatori e riprova." };
  await posizionaImmobileDi(supabase, "preventivi", data);
  aggiornaElenchi();
  return { ok: true, id: data };
}

export async function creaPrefattibilita(dati: Json): Promise<Esito> {
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const { data, error } = await supabase.rpc("crea_prefattibilita", { dati });
  if (error || !data) return { ok: false, errore: "Non è stato possibile creare la pre-fattibilità. Controlla i dati obbligatori e riprova." };
  await posizionaImmobileDi(supabase, "prefattibilita", data);
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

/* ── Commessa operativa ────────────────────────────────────────────────── */

const STATI_COMMESSA_AMMESSI = ["attiva", "sospesa", "conclusa", "annullata"];
const STATI_FASE_AMMESSI = ["da_avviare", "in_corso", "in_revisione", "completata", "sospesa", "annullata"];
const TIPI_NOTA = ["nota", "telefonata", "riunione", "sopralluogo", "email", "decisione"];
const DATA = /^\d{4}-\d{2}-\d{2}$/;
/** Data di oggi a Siracusa (AAAA-MM-GG), indipendente dal fuso del server. */
const oggiIso = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());

function numeroO(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function dataO(v: unknown): string | null {
  return typeof v === "string" && DATA.test(v) ? v : null;
}

/** Cambia lo stato della commessa; alla chiusura registra la data, alla riapertura la toglie. */
export async function aggiornaStatoCommessa(id: string, stato: string): Promise<Esito> {
  if (!STATI_COMMESSA_AMMESSI.includes(stato)) return { ok: false, errore: "Stato non valido." };
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const chiusa = stato === "conclusa" || stato === "annullata";
  const { error } = await supabase
    .from("commesse")
    .update({ stato, data_chiusura: chiusa ? oggiIso() : null })
    .eq("id", id);
  if (error) return { ok: false, errore: "Non è stato possibile aggiornare lo stato della commessa." };
  aggiornaElenchi();
  return { ok: true, id };
}

export type DatiFase = {
  stato: string;
  responsabile_id: string | null;
  data_inizio_prev: string | null;
  data_fine_prev: string | null;
  onorario: string | number | null;
  ore_budget: string | number | null;
  avanzamento_pct: number;
  note: string | null;
};

/**
 * Aggiorna una fase. Le date effettive si registrano da sole: l'inizio quando la fase
 * passa "in corso", la fine quando è completata (che porta anche l'avanzamento al 100%).
 */
export async function aggiornaFase(id: string, dati: DatiFase): Promise<Esito> {
  if (!STATI_FASE_AMMESSI.includes(dati.stato)) return { ok: false, errore: "Stato della fase non valido." };
  const inizio = dataO(dati.data_inizio_prev);
  const fine = dataO(dati.data_fine_prev);
  if (inizio && fine && fine < inizio) return { ok: false, errore: "La fine prevista non può precedere l'inizio." };
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };

  const { data: attuale, error: errLettura } = await supabase
    .from("commesse_fasi")
    .select("stato, data_inizio_eff, data_fine_eff")
    .eq("id", id)
    .maybeSingle();
  if (errLettura || !attuale) return { ok: false, errore: "Fase non trovata." };

  const avviata = ["in_corso", "in_revisione", "completata"].includes(dati.stato);
  const completata = dati.stato === "completata";
  const avanzamento = completata ? 100 : Math.max(0, Math.min(100, Math.round(Number(dati.avanzamento_pct) || 0)));

  const { error } = await supabase
    .from("commesse_fasi")
    .update({
      stato: dati.stato,
      responsabile_id: dati.responsabile_id || null,
      data_inizio_prev: inizio,
      data_fine_prev: fine,
      onorario: numeroO(dati.onorario),
      ore_budget: numeroO(dati.ore_budget),
      avanzamento_pct: avanzamento,
      note: dati.note?.trim() || null,
      data_inizio_eff: avviata ? (attuale.data_inizio_eff ?? oggiIso()) : null,
      data_fine_eff: completata ? (attuale.data_fine_eff ?? oggiIso()) : null,
    })
    .eq("id", id);
  if (error) return { ok: false, errore: "Non è stato possibile salvare la fase." };
  aggiornaElenchi();
  return { ok: true, id };
}

/** Aggiunge una fase dal catalogo (o personalizzata con un nome) in fondo all'elenco. */
export async function aggiungiFase(commessaId: string, scelta: { catalogoId?: string; nome?: string }): Promise<Esito> {
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };

  let fase: { fase_catalogo_id: string | null; codice: string | null; nome: string };
  if (scelta.catalogoId) {
    const { data } = await supabase.from("fasi_catalogo").select("id, codice, nome").eq("id", scelta.catalogoId).maybeSingle();
    if (!data) return { ok: false, errore: "Fase del catalogo non trovata." };
    fase = { fase_catalogo_id: data.id, codice: data.codice, nome: data.nome };
  } else {
    const nome = scelta.nome?.trim();
    if (!nome) return { ok: false, errore: "Scrivi il nome della fase." };
    fase = { fase_catalogo_id: null, codice: null, nome };
  }

  const { data: ultime } = await supabase
    .from("commesse_fasi")
    .select("ordine")
    .eq("commessa_id", commessaId)
    .order("ordine", { ascending: false })
    .limit(1);
  const ordine = (ultime?.[0]?.ordine ?? 0) + 10;

  const { data, error } = await supabase
    .from("commesse_fasi")
    .insert({ commessa_id: commessaId, ...fase, ordine })
    .select("id")
    .single();
  if (error || !data) return { ok: false, errore: "Non è stato possibile aggiungere la fase." };
  aggiornaElenchi();
  return { ok: true, id: data.id };
}

export async function eliminaFase(id: string): Promise<Esito> {
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const { data, error } = await supabase.from("commesse_fasi").delete().eq("id", id).select("id");
  if (error) return { ok: false, errore: "Non è stato possibile eliminare la fase." };
  if (!data?.length) return { ok: false, errore: "Solo titolari e architetti possono eliminare le fasi." };
  aggiornaElenchi();
  return { ok: true, id };
}

/** Sposta una fase di un posto in su o in giù scambiando l'ordine con la vicina. */
export async function spostaFase(id: string, verso: "su" | "giu"): Promise<Esito> {
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const { data: fase } = await supabase.from("commesse_fasi").select("id, commessa_id, ordine").eq("id", id).maybeSingle();
  if (!fase) return { ok: false, errore: "Fase non trovata." };
  const { data: tutte } = await supabase.from("commesse_fasi").select("id, ordine").eq("commessa_id", fase.commessa_id).order("ordine");
  const elenco = tutte ?? [];
  const i = elenco.findIndex((f) => f.id === id);
  const j = verso === "su" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= elenco.length) return { ok: true, id };
  // Rinumera per evitare ordini uguali, poi scambia
  const nuovi = elenco.map((f, k) => ({ id: f.id, ordine: (k + 1) * 10 }));
  [nuovi[i].ordine, nuovi[j].ordine] = [nuovi[j].ordine, nuovi[i].ordine];
  for (const f of nuovi) {
    const { error } = await supabase.from("commesse_fasi").update({ ordine: f.ordine }).eq("id", f.id);
    if (error) return { ok: false, errore: "Non è stato possibile riordinare le fasi." };
  }
  aggiornaElenchi();
  return { ok: true, id };
}

/* ── Team ── */

export async function aggiungiMembro(commessaId: string, profiloId: string, ruolo: string): Promise<Esito> {
  if (!profiloId) return { ok: false, errore: "Scegli una persona." };
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const { error } = await supabase
    .from("commesse_team")
    .upsert({ commessa_id: commessaId, profilo_id: profiloId, ruolo_commessa: ruolo.trim() || null });
  if (error) return { ok: false, errore: "Non è stato possibile aggiungere la persona al team." };
  aggiornaElenchi();
  return { ok: true, id: profiloId };
}

export async function rimuoviMembro(commessaId: string, profiloId: string): Promise<Esito> {
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const { data, error } = await supabase
    .from("commesse_team")
    .delete()
    .eq("commessa_id", commessaId)
    .eq("profilo_id", profiloId)
    .select("profilo_id");
  if (error) return { ok: false, errore: "Non è stato possibile togliere la persona dal team." };
  if (!data?.length) return { ok: false, errore: "Solo titolari e architetti possono modificare il team." };
  aggiornaElenchi();
  return { ok: true, id: profiloId };
}

/* ── Diario ── */

export async function aggiungiNota(commessaId: string, dati: { tipo: string; testo: string; data: string }): Promise<Esito> {
  if (!TIPI_NOTA.includes(dati.tipo)) return { ok: false, errore: "Tipo di nota non valido." };
  const testo = dati.testo.trim();
  if (!testo) return { ok: false, errore: "Scrivi il testo della nota." };
  const giorno = dataO(dati.data) ?? oggiIso();
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  // Se la data è oggi si registra anche l'ora; per date passate vale mezzogiorno
  const quando = giorno === oggiIso() ? new Date().toISOString() : `${giorno}T12:00:00Z`;
  const { data, error } = await supabase
    .from("commesse_diario")
    .insert({ commessa_id: commessaId, tipo: dati.tipo, testo, data_evento: quando })
    .select("id")
    .single();
  if (error || !data) return { ok: false, errore: "Non è stato possibile salvare la nota." };
  aggiornaElenchi();
  return { ok: true, id: data.id };
}

export async function eliminaNota(id: string): Promise<Esito> {
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const { data, error } = await supabase.from("commesse_diario").delete().eq("id", id).select("id");
  if (error) return { ok: false, errore: "Non è stato possibile eliminare la nota." };
  if (!data?.length) return { ok: false, errore: "Solo titolari e architetti possono eliminare le note." };
  aggiornaElenchi();
  return { ok: true, id };
}

/* ── Immobili ── */

/** Salva (o toglie, con null) la posizione dell'immobile sulla mappa. */
export async function posizionaImmobile(id: string, posizione: { lat: number; lng: number } | null): Promise<Esito> {
  if (posizione && (Math.abs(posizione.lat) > 90 || Math.abs(posizione.lng) > 180)) return { ok: false, errore: "Posizione non valida." };
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const { error } = await supabase
    .from("immobili")
    .update({
      latitudine: posizione ? Number(posizione.lat.toFixed(6)) : null,
      longitudine: posizione ? Number(posizione.lng.toFixed(6)) : null,
    })
    .eq("id", id);
  if (error) return { ok: false, errore: "Non è stato possibile salvare la posizione." };
  aggiornaElenchi();
  return { ok: true, id };
}

/**
 * Posiziona in automatico gli immobili che non sono ancora sulla mappa (al massimo 10 per volta,
 * per rispettare i limiti del servizio di ricerca). Restituisce quanti sono stati trovati.
 */
export async function posizionaImmobiliMancanti(): Promise<{ ok: true; trovati: number; restanti: number } | { ok: false; errore: string }> {
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const { data: mancanti, error } = await supabase
    .from("immobili")
    .select("id, indirizzo, cap, comune, provincia")
    .is("latitudine", null)
    .limit(10);
  if (error) return { ok: false, errore: "Non è stato possibile leggere gli immobili." };
  let trovati = 0;
  for (const imm of mancanti ?? []) {
    const p = await geocodifica(imm);
    if (p) {
      const { error: e } = await supabase.from("immobili").update({ latitudine: p.lat, longitudine: p.lng }).eq("id", imm.id);
      if (!e) trovati++;
    }
    await new Promise((r) => setTimeout(r, 1100));
  }
  const { count } = await supabase.from("immobili").select("id", { count: "exact", head: true }).is("latitudine", null);
  aggiornaElenchi();
  return { ok: true, trovati, restanti: count ?? 0 };
}

/** Accetta un preventivo integrativo: aumenta l'onorario della commessa e ne aggiunge le voci come fasi. */
export async function accettaIntegrativo(id: string): Promise<Esito> {
  const supabase = await clientAutenticato();
  if (!supabase) return { ok: false, errore: SESSIONE_SCADUTA };
  const { data, error } = await supabase.rpc("accetta_integrativo", { p_id: id });
  if (error || !data) {
    return { ok: false, errore: error?.message.includes("già accettato") ? "Il preventivo è già stato accettato." : "Non è stato possibile accettare il preventivo." };
  }
  aggiornaElenchi();
  return { ok: true, id: data };
}
