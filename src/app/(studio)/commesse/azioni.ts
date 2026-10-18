"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

export type EsitoCreazione = { ok: true; id: string } | { ok: false; errore: string };

/**
 * Crea committente (se nuovo), immobile (se nuovo), commessa e fasi in un'unica
 * transazione tramite la funzione di database crea_commessa.
 */
export async function creaCommessa(dati: Json): Promise<EsitoCreazione> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { ok: false, errore: "La sessione è scaduta. Accedi di nuovo e riprova." };

  const { data, error } = await supabase.rpc("crea_commessa", { dati });
  if (error || !data) {
    return {
      ok: false,
      errore: "Non è stato possibile creare la commessa. Controlla i dati obbligatori e riprova.",
    };
  }

  revalidatePath("/commesse");
  revalidatePath("/");
  return { ok: true, id: data };
}
