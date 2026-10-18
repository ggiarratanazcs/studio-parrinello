import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

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
  return data ?? [];
}

export async function elencoClienti() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clienti")
    .select("id, tipo, denominazione, comune, email, telefono")
    .order("denominazione");
  if (error) throw new Error(`Impossibile leggere i clienti: ${error.message}`);
  return data ?? [];
}

export async function elencoImmobili() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("immobili")
    .select("id, denominazione, indirizzo, comune, destinazione_uso, zona_urbanistica")
    .order("comune");
  if (error) throw new Error(`Impossibile leggere gli immobili: ${error.message}`);
  return data ?? [];
}

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

/** Scheda completa di una commessa. Restituisce null se non esiste o non è visibile. */
export async function leggiCommessa(id: string) {
  const supabase = await createClient();
  const { data: commessa, error } = await supabase
    .from("commesse")
    .select(
      `*,
       cliente:clienti(*),
       immobile:immobili(*, catasto:immobili_catasto(*)),
       responsabile:profili!commesse_responsabile_id_fkey(nome, cognome),
       fasi:commesse_fasi(*),
       preventivi(id, numero),
       prefattibilita(id, numero)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Impossibile leggere la commessa: ${error.message}`);
  if (!commessa) return null;
  commessa.fasi?.sort((a, b) => a.ordine - b.ordine);
  return commessa;
}

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
  return data ?? [];
}

export async function leggiPreventivo(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("preventivi")
    .select(
      `*,
       cliente:clienti(id, tipo, denominazione, email, telefono, pec),
       immobile:immobili(id, denominazione, indirizzo, comune),
       responsabile:profili!preventivi_responsabile_id_fkey(nome, cognome),
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
