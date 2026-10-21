import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";
import { statoCommessa } from "@/lib/dominio";
import { STATI_PREFATTIBILITA, STATI_PREVENTIVO } from "@/lib/preventivo";

/* ──────────────────────────────────────────────────────────────────────────
   Schede anagrafiche: cliente (con referenti e rapporti con lo studio).
   ────────────────────────────────────────────────────────────────────────── */

export type Cliente = Tables<"clienti">;
export type Referente = Tables<"clienti_referenti">;

export type Rapporto = {
  id: string;
  tipo: "commessa" | "preventivo" | "prefattibilita";
  sigla: string | null;
  titolo: string;
  stato: string;
  colore: string;
  href: string;
};

export type ImmobileSeguito = { id: string; nome: string; indirizzo: string };

export type SchedaClienteDati = {
  cliente: Cliente;
  referenti: Referente[];
  rapporti: Rapporto[];
  immobili: ImmobileSeguito[];
  sintesi: { onorariAcquisiti: number; preventiviAccettati: number; preventiviChiusi: number; commesse: number };
};

const STATI_COMMESSA_PERSE = ["persa", "annullata"];

type ImmobileRiga = { id: string; denominazione: string | null; indirizzo: string; comune: string } | null;

export async function leggiCliente(id: string): Promise<SchedaClienteDati | null> {
  const supabase = await createClient();
  const immobile = "immobile:immobili(id, denominazione, indirizzo, comune)";
  const [cliente, referenti, commesse, preventivi, prefattibilita] = await Promise.all([
    supabase.from("clienti").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("clienti_referenti")
      .select("*")
      .eq("cliente_id", id)
      .order("principale", { ascending: false })
      .order("nome"),
    supabase
      .from("commesse")
      .select(`id, codice, titolo, stato, onorario_concordato, data_apertura, ${immobile}`)
      .eq("cliente_id", id)
      .order("data_apertura", { ascending: false }),
    supabase
      .from("preventivi")
      .select(`id, numero, titolo, oggetto, stato, integrativo, data_emissione, ${immobile}`)
      .eq("cliente_id", id)
      .order("data_emissione", { ascending: false }),
    supabase
      .from("prefattibilita")
      .select(`id, numero, titolo, stato, created_at, ${immobile}`)
      .eq("cliente_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (cliente.error) throw new Error(`Impossibile leggere il cliente: ${cliente.error.message}`);
  if (!cliente.data) return null;
  for (const r of [referenti, commesse, preventivi, prefattibilita]) {
    if (r.error) throw new Error(`Impossibile leggere la scheda del cliente: ${r.error.message}`);
  }

  const rapporti: Rapporto[] = [];
  const immobili = new Map<string, ImmobileSeguito>();
  const segnaImmobile = (i: ImmobileRiga) => {
    if (i && !immobili.has(i.id)) {
      immobili.set(i.id, { id: i.id, nome: i.denominazione || i.indirizzo, indirizzo: [i.indirizzo, i.comune].filter(Boolean).join(", ") });
    }
  };

  for (const c of commesse.data ?? []) {
    const s = statoCommessa(c.stato);
    rapporti.push({ id: c.id, tipo: "commessa", sigla: c.codice, titolo: c.titolo, stato: s.etichetta, colore: s.colore, href: `/commesse/${c.id}` });
    segnaImmobile(c.immobile);
  }
  for (const p of preventivi.data ?? []) {
    const s = STATI_PREVENTIVO[p.stato] ?? { etichetta: p.stato, colore: "var(--tenue)" };
    rapporti.push({
      id: p.id,
      tipo: "preventivo",
      sigla: p.numero,
      titolo: (p.titolo ?? p.oggetto ?? "Preventivo") + (p.integrativo ? " (integrativo)" : ""),
      stato: s.etichetta,
      colore: s.colore,
      href: `/preventivi/${p.id}`,
    });
    segnaImmobile(p.immobile);
  }
  for (const p of prefattibilita.data ?? []) {
    const s = STATI_PREFATTIBILITA[p.stato] ?? { etichetta: p.stato, colore: "var(--tenue)" };
    rapporti.push({ id: p.id, tipo: "prefattibilita", sigla: p.numero, titolo: p.titolo ?? "Pre-fattibilità", stato: s.etichetta, colore: s.colore, href: `/prefattibilita/${p.id}` });
    segnaImmobile(p.immobile);
  }

  const commesseValide = (commesse.data ?? []).filter((c) => !STATI_COMMESSA_PERSE.includes(c.stato));
  const preventiviDiretti = (preventivi.data ?? []).filter((p) => !p.integrativo);
  return {
    cliente: cliente.data,
    referenti: referenti.data ?? [],
    rapporti,
    immobili: [...immobili.values()],
    sintesi: {
      onorariAcquisiti: commesseValide.reduce((s, c) => s + (c.onorario_concordato ?? 0), 0),
      preventiviAccettati: preventiviDiretti.filter((p) => p.stato === "accettato").length,
      preventiviChiusi: preventiviDiretti.filter((p) => ["accettato", "rifiutato"].includes(p.stato)).length,
      commesse: commesseValide.length,
    },
  };
}
