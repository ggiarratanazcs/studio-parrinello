import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";
import { senzaImporti, vedeImporti } from "@/lib/permessi";
import { getProfilo } from "@/lib/auth";

export type CommessaSintesi = Tables<"v_commesse_sintesi">;

/** Tutte le commesse con i dati di sintesi, dalla più recente. */
export async function elencoCommesse(): Promise<CommessaSintesi[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_commesse_sintesi")
    .select("*")
    .order("data_apertura", { ascending: false })
    .order("codice", { ascending: false });
  if (error) throw new Error(`Impossibile leggere le commesse: ${error.message}`);
  return senzaImporti(data ?? [], "onorario_concordato", await vedeImporti());
}

/** Fasi di tutte le commesse con le date, per il Gantt generale. */
export async function fasiPerGantt() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commesse_fasi")
    .select("id, commessa_id, nome, stato, ordine, avanzamento_pct, data_inizio_prev, data_fine_prev, data_inizio_eff, data_fine_eff")
    .order("ordine");
  if (error) throw new Error(`Impossibile leggere le fasi: ${error.message}`);
  return data ?? [];
}

export type FaseGantt = Awaited<ReturnType<typeof fasiPerGantt>>[number];

export async function elencoClienti() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clienti")
    .select("id, tipo, denominazione, comune, email, telefono")
    .order("denominazione");
  if (error) throw new Error(`Impossibile leggere i clienti: ${error.message}`);
  return data ?? [];
}

/** Immobili con posizione e pratiche collegate (per elenco e mappa). */
export async function elencoImmobili() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("immobili")
    .select(
      `id, denominazione, indirizzo, cap, comune, provincia, destinazione_uso, zona_urbanistica, latitudine, longitudine,
       commesse(id, codice, titolo, stato),
       preventivi(id, numero, stato),
       prefattibilita(id, numero, stato)`,
    )
    .order("comune");
  if (error) throw new Error(`Impossibile leggere gli immobili: ${error.message}`);
  return data ?? [];
}

export type ImmobileElenco = Awaited<ReturnType<typeof elencoImmobili>>[number];

export async function contaDocumenti() {
  const supabase = await createClient();
  const { count, error } = await supabase.from("documenti").select("id", { count: "exact", head: true });
  if (error) throw new Error(`Impossibile leggere i documenti: ${error.message}`);
  return count ?? 0;
}

/** Anagrafiche, collaboratori e catalogo fasi: servono a tutte le procedure di creazione. */
export async function datiProcedura() {
  const supabase = await createClient();
  const [clienti, immobili, profili, fasi] = await Promise.all([
    supabase.from("clienti").select("id, tipo, denominazione, comune").order("denominazione"),
    supabase.from("immobili").select("id, denominazione, indirizzo, comune").order("comune"),
    supabase.from("profili").select("id, nome, cognome, email").eq("attivo", true).order("cognome"),
    supabase.from("fasi_catalogo").select("id, codice, nome, ambito, ordine").eq("attiva", true).order("ordine"),
  ]);
  const errore = clienti.error ?? immobili.error ?? profili.error ?? fasi.error;
  if (errore) throw new Error(`Impossibile preparare la nuova commessa: ${errore.message}`);
  return {
    clienti: clienti.data ?? [],
    immobili: immobili.data ?? [],
    profili: profili.data ?? [],
    fasi: fasi.data ?? [],
  };
}

export type DatiProcedura = Awaited<ReturnType<typeof datiProcedura>>;

/** Preventivo da modificare: tutti i campi della procedura e le voci in ordine. */
export async function preventivoDaModificare(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("preventivi")
    .select(
      `id, numero, stato, titolo, oggetto, cliente_id, immobile_id, committenza, tipologia_intervento, responsabile_id,
       data_emissione, validita_giorni, metodo_calcolo, importo_lavori, percentuale_onorario,
       sconto_pct, spese_pct, cassa_pct, iva_pct, ritenuta_pct, condizioni_pagamento, note, integrativo,
       voci:preventivi_voci(fase_catalogo_id, ordine, descrizione, prezzo_unitario, ore_stimate, opzionale)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Impossibile leggere il preventivo: ${error.message}`);
  if (data?.voci) data.voci.sort((a, b) => a.ordine - b.ordine);
  return data;
}
export type PreventivoDaModificare = NonNullable<Awaited<ReturnType<typeof preventivoDaModificare>>>;

/** Pre-fattibilità da modificare: tutti i campi della procedura. */
export async function prefattibilitaDaModificare(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prefattibilita")
    .select(
      `id, numero, stato, titolo, cliente_id, immobile_id, committenza, tipologia_intervento, responsabile_id,
       strumento_urbanistico, zona_urbanistica, indici_parametri, vincoli, vincoli_note, accesso_atti_richiesto,
       stato_legittimo_verificato, difformita_rilevate, difformita_descrizione, sanatoria_necessaria, titolo_edilizio,
       pareri_enti, superficie_intervento_mq, costo_parametrico_mq, durata_stimata_mesi, onorario, esito, sintesi, data_redazione`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Impossibile leggere la pre-fattibilità: ${error.message}`);
  return data;
}
export type PrefattibilitaDaModificare = NonNullable<Awaited<ReturnType<typeof prefattibilitaDaModificare>>>;

/** Scheda completa di una commessa. Restituisce null se non esiste o non è visibile. */
export async function leggiCommessa(id: string) {
  const supabase = await createClient();
  const [risposta, profili, catalogo] = await Promise.all([
    supabase
      .from("commesse")
      .select(
        `*,
         cliente:clienti(*),
         immobile:immobili(*, catasto:immobili_catasto(*)),
         responsabile:profili!commesse_responsabile_id_fkey(nome, cognome),
         fasi:commesse_fasi(*, responsabile:profili(id, nome, cognome, iniziali)),
         team:commesse_team(profilo_id, ruolo_commessa, profilo:profili(id, nome, cognome, iniziali, qualifica)),
         diario:commesse_diario(id, tipo, testo, data_evento, autore:profili(nome, cognome, iniziali)),
         documenti(id, fase_id, categoria, titolo, nome_file, mime_type, dimensione_byte, storage_path, created_at),
         preventivi(id, numero, titolo, stato, data_emissione, imponibile, integrativo, prefattibilita_id),
         prefattibilita(id, numero, titolo, stato, esito, onorario, data_redazione)`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("profili").select("id, nome, cognome, iniziali, qualifica").eq("attivo", true).order("cognome"),
    supabase.from("fasi_catalogo").select("id, codice, nome, ambito, ordine").eq("attiva", true).order("ordine"),
  ]);
  const { data: commessa, error } = risposta;
  if (error) throw new Error(`Impossibile leggere la commessa: ${error.message}`);
  if (!commessa) return null;
  commessa.fasi?.sort((a, b) => a.ordine - b.ordine);
  commessa.diario?.sort((a, b) => b.data_evento.localeCompare(a.data_evento));
  commessa.documenti?.sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Persone assegnate alle fasi (oltre al responsabile); vuoto finché il database non è aggiornato
  const idFasi = (commessa.fasi ?? []).map((f) => f.id);
  const [assegnati, io] = await Promise.all([
    idFasi.length ? supabase.from("commesse_fasi_persone").select("fase_id, profilo_id").in("fase_id", idFasi) : Promise.resolve({ data: [], error: null }),
    getProfilo(),
  ]);
  const personeFasi: Record<string, string[]> = {};
  for (const r of assegnati.error ? [] : (assegnati.data ?? [])) (personeFasi[r.fase_id] ??= []).push(r.profilo_id);

  return {
    ...commessa,
    profiliStudio: profili.data ?? [],
    catalogoFasi: catalogo.data ?? [],
    personeFasi,
    /** Il database permette di assegnare persone alle fasi (file supabase/collaboratori.sql) */
    assegnazioniAttive: !assegnati.error,
    ioId: io.id,
  };
}

export type Commessa = NonNullable<Awaited<ReturnType<typeof leggiCommessa>>>;

export type Pratica = Tables<"v_pratiche">;

/** Preventivi o pre-fattibilità, dal più recente. */
export async function elencoPratiche(tipo: "preventivo" | "prefattibilita"): Promise<Pratica[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_pratiche")
    .select("*")
    .eq("tipo", tipo)
    .order("data", { ascending: false })
    .order("numero", { ascending: false });
  if (error) throw new Error(`Impossibile leggere l'elenco: ${error.message}`);
  return senzaImporti(data ?? [], "importo", await vedeImporti());
}

export async function leggiPreventivo(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("preventivi")
    .select(
      `*,
       cliente:clienti(id, tipo, denominazione, email, telefono, pec, codice_fiscale, partita_iva, indirizzo, cap, comune, provincia, codice_sdi, codice_ipa),
       immobile:immobili(id, denominazione, indirizzo, comune),
       responsabile:profili!preventivi_responsabile_id_fkey(nome, cognome, qualifica),
       voci:preventivi_voci(*),
       commessa:commesse(id, codice),
       origine:prefattibilita!preventivi_prefattibilita_id_fkey(id, numero)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Impossibile leggere il preventivo: ${error.message}`);
  data?.voci?.sort((a, b) => a.ordine - b.ordine);
  return data;
}

export async function leggiPrefattibilita(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prefattibilita")
    .select(
      `*,
       cliente:clienti(id, tipo, denominazione, email, telefono),
       immobile:immobili(id, denominazione, indirizzo, comune, zona_urbanistica),
       responsabile:profili!prefattibilita_responsabile_id_fkey(nome, cognome),
       commessa:commesse(id, codice),
       preventivo:preventivi!prefattibilita_preventivo_fk(id, numero)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Impossibile leggere la pre-fattibilità: ${error.message}`);
  return data;
}

/** Dati minimi di una commessa per precompilare un preventivo integrativo. */
export async function commessaPerIntegrativo(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("commesse")
    .select("id, codice, titolo, cliente_id, immobile_id, committenza, tipologia_intervento, responsabile_id, importo_lavori_stimato, descrizione")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/* ── Le mie commesse (home del collaboratore) ─────────────────────────── */

export type FaseMia = { id: string; codice: string | null; nome: string; stato: string; avanzamento: number; fine: string | null };
export type CommessaMia = {
  id: string;
  codice: string | null;
  titolo: string;
  stato: string;
  luogo: string | null;
  fasi: FaseMia[];
  /** Nel team della commessa (anche senza fasi assegnate) */
  team: boolean;
};

/**
 * Commesse in cui l'utente è coinvolto: nel team, responsabile della commessa,
 * responsabile o assegnato di una fase. Prima quelle aperte, poi le concluse.
 */
export async function mieCommesse(io: string): Promise<CommessaMia[]> {
  const supabase = await createClient();
  const [team, responsabile, fasiResp, assegnate] = await Promise.all([
    supabase.from("commesse_team").select("commessa_id").eq("profilo_id", io),
    supabase.from("commesse").select("id").eq("responsabile_id", io),
    supabase.from("commesse_fasi").select("id").eq("responsabile_id", io),
    supabase.from("commesse_fasi_persone").select("fase_id").eq("profilo_id", io),
  ]);
  const idFasi = [...new Set([...(fasiResp.data ?? []).map((f) => f.id), ...(assegnate.error ? [] : (assegnate.data ?? [])).map((f) => f.fase_id)])];
  const { data: fasi } = idFasi.length
    ? await supabase.from("commesse_fasi").select("id, commessa_id, codice, nome, stato, avanzamento_pct, data_fine_prev, ordine").in("id", idFasi).order("ordine")
    : { data: [] };
  const nelTeam = new Set((team.data ?? []).map((t) => t.commessa_id));
  const ids = [...new Set([...nelTeam, ...(responsabile.data ?? []).map((c) => c.id), ...(fasi ?? []).map((f) => f.commessa_id)])];
  if (!ids.length) return [];

  const { data: commesse, error } = await supabase
    .from("commesse")
    .select("id, codice, titolo, stato, data_apertura, immobile:immobili(denominazione, indirizzo, comune)")
    .in("id", ids)
    .not("stato", "in", "(annullata,persa)")
    .order("data_apertura", { ascending: false });
  if (error) throw new Error(`Impossibile leggere le tue commesse: ${error.message}`);

  return (commesse ?? [])
    .map((c) => ({
      id: c.id,
      codice: c.codice,
      titolo: c.titolo,
      stato: c.stato,
      luogo: c.immobile ? c.immobile.denominazione || [c.immobile.indirizzo, c.immobile.comune].filter(Boolean).join(", ") : null,
      team: nelTeam.has(c.id),
      fasi: (fasi ?? [])
        .filter((f) => f.commessa_id === c.id)
        .map((f) => ({ id: f.id, codice: f.codice, nome: f.nome, stato: f.stato, avanzamento: f.avanzamento_pct, fine: f.data_fine_prev })),
    }))
    .sort((a, b) => Number(a.stato === "conclusa") - Number(b.stato === "conclusa"));
}
