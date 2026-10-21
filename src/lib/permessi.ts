import "server-only";
import { cache } from "react";
import { getProfilo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  AREA_DI_SEZIONE,
  MASSIMO,
  PREDEFINITI,
  VOCI_PERMESSI,
  type MappaPermessi,
  type RuoloConfigurabile,
} from "@/lib/permessi-catalogo";

export type PermessiCorrenti = {
  ruolo: string;
  titolare: boolean;
  mappa: MappaPermessi;
  /** Livello per una chiave (0 se assente). */
  liv: (chiave: string) => number;
};

function tutto(): MappaPermessi {
  return Object.fromEntries(VOCI_PERMESSI.map((v) => [v.chiave, MASSIMO[v.scala]]));
}

/**
 * Permessi dell'utente collegato, una sola lettura per richiesta:
 * eccezioni personali sopra i valori del ruolo; il titolare ha sempre tutto.
 * Le stesse regole sono applicate dal database (funzione permesso()).
 */
export const getPermessi = cache(async (): Promise<PermessiCorrenti> => {
  const profilo = await getProfilo();
  const crea = (mappa: MappaPermessi): PermessiCorrenti => ({
    ruolo: profilo.ruolo,
    titolare: profilo.ruolo === "titolare",
    mappa,
    liv: (c) => mappa[c] ?? 0,
  });
  if (profilo.ruolo === "titolare") return crea(tutto());

  const supabase = await createClient();
  const [ruolo, personali] = await Promise.all([
    supabase.from("permessi_ruolo").select("chiave, livello").eq("ruolo", profilo.ruolo),
    supabase.from("permessi_utente").select("chiave, livello").eq("profilo_id", profilo.id),
  ]);
  // Prima dell'aggiornamento del database valgono i valori di partenza
  const mappa: MappaPermessi = { ...(PREDEFINITI[profilo.ruolo as RuoloConfigurabile] ?? {}) };
  for (const r of ruolo.data ?? []) mappa[r.chiave] = r.livello;
  for (const r of personali.data ?? []) mappa[r.chiave] = r.livello;
  return crea(mappa);
});

/** Sezioni che l'utente non può aprire e voci di "Crea" che non può usare. */
export async function sezioniNascoste() {
  const p = await getPermessi();
  const nascoste = Object.entries(AREA_DI_SEZIONE).filter(([, area]) => p.liv(area) < 1).map(([href]) => href);
  const senzaCrea = [
    p.liv("pratiche") < 2 ? ["/nuova/prefattibilita", "/nuova/preventivo"] : [],
    p.liv("commesse") < 2 ? ["/nuova/commessa"] : [],
    p.liv("clienti") < 2 ? ["/clienti/nuovo"] : [],
    p.liv("immobili") < 2 ? ["/immobili/nuovo"] : [],
  ].flat();
  return { nascoste, senzaCrea };
}

/** L'utente può vedere importi, compensi e analisi economiche fuori dalla scheda commessa. */
export async function vedeImporti() {
  return (await getPermessi()).liv("economia") >= 1;
}

/** Toglie l'importo dalle righe quando l'utente non lo può vedere. */
export function senzaImporti<T extends object>(righe: T[], campo: keyof T, visibili: boolean): T[] {
  return visibili ? righe : righe.map((r) => ({ ...r, [campo]: null }));
}
