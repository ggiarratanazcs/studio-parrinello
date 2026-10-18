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
    .order("data_apertura", { ascending: false });
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
