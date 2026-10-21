import "server-only";
import { createClient } from "@/lib/supabase/server";
import { senzaImporti, vedeImporti } from "@/lib/permessi";
import type { Tables } from "@/lib/database.types";
import { statoCommessa } from "@/lib/dominio";
import { STATI_PREFATTIBILITA, STATI_PREVENTIVO } from "@/lib/preventivo";

/* ──────────────────────────────────────────────────────────────────────────
   Scheda anagrafica del cliente: dati, referenti, pratiche avute con lo studio
   (pre-fattibilità, preventivi, commesse) e analisi a indicatori.
   ────────────────────────────────────────────────────────────────────────── */

export type Cliente = Tables<"clienti">;
export type Referente = Tables<"clienti_referenti">;

/** Una pratica del cliente, già pronta per l'elenco. */
export type PraticaCliente = {
  id: string;
  sigla: string | null;
  titolo: string;
  data: string | null;
  importo: number | null;
  stato: string;
  statoEtichetta: string;
  colore: string;
  href: string;
  luogo: string | null;
};

/** Immobile collegato al cliente attraverso le sue pratiche. */
export type ImmobileCliente = {
  id: string;
  nome: string;
  indirizzo: string;
  /** Pratiche del cliente su questo immobile, dalla più recente */
  pratiche: { tipo: "commessa" | "preventivo" | "prefattibilita"; sigla: string | null; href: string; colore: string }[];
};

export type AnalisiCliente = {
  /** Onorari concordati delle commesse non perse né annullate */
  onorariAcquisiti: number;
  commesse: number;
  commesseInCorso: number;
  /** Preventivi diretti (esclusi gli integrativi) non più in bozza */
  preventiviEmessi: number;
  preventiviAccettati: number;
  preventiviRifiutati: number;
  preventiviInAttesa: number;
  /** Imponibile di tutti i preventivi emessi e di quelli accettati */
  valorePreventivato: number;
  valoreAccettato: number;
  prefattibilita: number;
  prefattibilitaConvertite: number;
  /** Integrativi accettati su commesse del cliente */
  integrativiAccettati: number;
  valoreIntegrativi: number;
};

export type SchedaClienteDati = {
  cliente: Cliente;
  referenti: Referente[];
  prefattibilita: PraticaCliente[];
  preventivi: PraticaCliente[];
  commesse: PraticaCliente[];
  immobili: ImmobileCliente[];
  /** Assente se l'utente non può vedere importi e analisi */
  analisi: AnalisiCliente | null;
};

const STATI_COMMESSA_PERSE = ["persa", "annullata"];

type ImmobileRiga = { id: string; denominazione: string | null; indirizzo: string; cap: string | null; comune: string; provincia: string | null } | null;
const luogo = (i: ImmobileRiga) => (i ? i.denominazione || [i.indirizzo, i.comune].filter(Boolean).join(", ") : null);

export async function leggiCliente(id: string): Promise<SchedaClienteDati | null> {
  const supabase = await createClient();
  const immobile = "immobile:immobili(id, denominazione, indirizzo, cap, comune, provincia)";
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
      .select(`id, numero, titolo, oggetto, stato, integrativo, imponibile, data_emissione, ${immobile}`)
      .eq("cliente_id", id)
      .order("data_emissione", { ascending: false }),
    supabase
      .from("prefattibilita")
      .select(`id, numero, titolo, stato, onorario, data_redazione, created_at, preventivo_id, commessa_id, ${immobile}`)
      .eq("cliente_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (cliente.error) throw new Error(`Impossibile leggere il cliente: ${cliente.error.message}`);
  if (!cliente.data) return null;
  for (const r of [referenti, commesse, preventivi, prefattibilita]) {
    if (r.error) throw new Error(`Impossibile leggere la scheda del cliente: ${r.error.message}`);
  }
  const righeCommesse = commesse.data ?? [];
  const righePreventivi = preventivi.data ?? [];
  const righePf = prefattibilita.data ?? [];

  const elencoCommesse: PraticaCliente[] = righeCommesse.map((c) => {
    const s = statoCommessa(c.stato);
    return {
      id: c.id,
      sigla: c.codice,
      titolo: c.titolo,
      data: c.data_apertura,
      importo: c.onorario_concordato,
      stato: c.stato,
      statoEtichetta: s.etichetta,
      colore: s.colore,
      href: `/commesse/${c.id}`,
      luogo: luogo(c.immobile),
    };
  });

  const elencoPreventivi: PraticaCliente[] = righePreventivi.map((p) => {
    const s = STATI_PREVENTIVO[p.stato] ?? { etichetta: p.stato, colore: "var(--tenue)" };
    return {
      id: p.id,
      sigla: p.numero,
      titolo: (p.titolo ?? p.oggetto ?? "Preventivo") + (p.integrativo ? " · integrativo" : ""),
      data: p.data_emissione,
      importo: p.imponibile,
      stato: p.stato,
      statoEtichetta: s.etichetta,
      colore: s.colore,
      href: `/preventivi/${p.id}`,
      luogo: luogo(p.immobile),
    };
  });

  const elencoPf: PraticaCliente[] = righePf.map((p) => {
    const s = STATI_PREFATTIBILITA[p.stato] ?? { etichetta: p.stato, colore: "var(--tenue)" };
    return {
      id: p.id,
      sigla: p.numero,
      titolo: p.titolo ?? "Pre-fattibilità",
      data: p.data_redazione ?? p.created_at,
      importo: p.onorario,
      stato: p.stato,
      statoEtichetta: s.etichetta,
      colore: s.colore,
      href: `/prefattibilita/${p.id}`,
      luogo: luogo(p.immobile),
    };
  });

  // Immobili toccati dalle pratiche del cliente, ciascuno con le sue pratiche
  const immobili = new Map<string, ImmobileCliente>();
  const segna = (i: ImmobileRiga, pratica: ImmobileCliente["pratiche"][number]) => {
    if (!i) return;
    let voce = immobili.get(i.id);
    if (!voce) {
      voce = {
        id: i.id,
        nome: i.denominazione || i.indirizzo,
        indirizzo: [i.indirizzo, [i.cap, i.comune, i.provincia ? `(${i.provincia})` : null].filter(Boolean).join(" ")].filter(Boolean).join(", "),
        pratiche: [],
      };
      immobili.set(i.id, voce);
    }
    voce.pratiche.push(pratica);
  };
  righeCommesse.forEach((c, k) => segna(c.immobile, { tipo: "commessa", sigla: c.codice, href: elencoCommesse[k].href, colore: elencoCommesse[k].colore }));
  righePreventivi.forEach((p, k) => segna(p.immobile, { tipo: "preventivo", sigla: p.numero, href: elencoPreventivi[k].href, colore: elencoPreventivi[k].colore }));
  righePf.forEach((p, k) => segna(p.immobile, { tipo: "prefattibilita", sigla: p.numero, href: elencoPf[k].href, colore: elencoPf[k].colore }));

  const commesseValide = righeCommesse.filter((c) => !STATI_COMMESSA_PERSE.includes(c.stato));
  const diretti = righePreventivi.filter((p) => !p.integrativo && p.stato !== "bozza");
  const integrativi = righePreventivi.filter((p) => p.integrativo && p.stato === "accettato");
  const somma = (xs: { imponibile: number | null }[]) => xs.reduce((s, p) => s + (p.imponibile ?? 0), 0);

  const importi = await vedeImporti();
  return {
    cliente: cliente.data,
    referenti: referenti.data ?? [],
    prefattibilita: senzaImporti(elencoPf, "importo", importi),
    preventivi: senzaImporti(elencoPreventivi, "importo", importi),
    commesse: senzaImporti(elencoCommesse, "importo", importi),
    immobili: [...immobili.values()],
    analisi: !importi ? null : {
      onorariAcquisiti: commesseValide.reduce((s, c) => s + (c.onorario_concordato ?? 0), 0),
      commesse: commesseValide.length,
      commesseInCorso: righeCommesse.filter((c) => c.stato === "attiva").length,
      preventiviEmessi: diretti.length,
      preventiviAccettati: diretti.filter((p) => p.stato === "accettato").length,
      preventiviRifiutati: diretti.filter((p) => p.stato === "rifiutato").length,
      preventiviInAttesa: diretti.filter((p) => p.stato === "inviato").length,
      valorePreventivato: somma(diretti),
      valoreAccettato: somma(diretti.filter((p) => p.stato === "accettato")),
      prefattibilita: righePf.length,
      prefattibilitaConvertite: righePf.filter((p) => p.preventivo_id || p.commessa_id || p.stato === "convertita").length,
      integrativiAccettati: integrativi.length,
      valoreIntegrativi: somma(integrativi),
    },
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   Scheda anagrafica dell'immobile: dati, identificativi catastali, pratiche
   svolte sull'immobile, committenti e documenti archiviati sulle sue commesse.
   ────────────────────────────────────────────────────────────────────────── */

export type Immobile = Tables<"immobili">;
export type Catasto = Tables<"immobili_catasto">;

export type CommittenteImmobile = { id: string; nome: string; tipo: string; pratiche: number };
export type DocumentoImmobile = { id: string; titolo: string; categoria: string; data: string; commessa: { id: string; codice: string | null; titolo: string } };

export type SchedaImmobileDati = {
  immobile: Immobile;
  catasto: Catasto[];
  prefattibilita: PraticaCliente[];
  preventivi: PraticaCliente[];
  commesse: PraticaCliente[];
  committenti: CommittenteImmobile[];
  documenti: DocumentoImmobile[];
  totaleDocumenti: number;
};

export async function leggiImmobile(id: string): Promise<SchedaImmobileDati | null> {
  const supabase = await createClient();
  const cliente = "cliente:clienti(id, denominazione, tipo)";
  const [immobile, catasto, commesse, preventivi, prefattibilita] = await Promise.all([
    supabase.from("immobili").select("*").eq("id", id).maybeSingle(),
    supabase.from("immobili_catasto").select("*").eq("immobile_id", id).order("catasto").order("foglio").order("particella"),
    supabase
      .from("commesse")
      .select(`id, codice, titolo, stato, onorario_concordato, data_apertura, ${cliente}`)
      .eq("immobile_id", id)
      .order("data_apertura", { ascending: false }),
    supabase
      .from("preventivi")
      .select(`id, numero, titolo, oggetto, stato, integrativo, imponibile, data_emissione, ${cliente}`)
      .eq("immobile_id", id)
      .order("data_emissione", { ascending: false }),
    supabase
      .from("prefattibilita")
      .select(`id, numero, titolo, stato, onorario, data_redazione, created_at, ${cliente}`)
      .eq("immobile_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (immobile.error) throw new Error(`Impossibile leggere l'immobile: ${immobile.error.message}`);
  if (!immobile.data) return null;
  for (const r of [catasto, commesse, preventivi, prefattibilita]) {
    if (r.error) throw new Error(`Impossibile leggere la scheda dell'immobile: ${r.error.message}`);
  }

  const committenti = new Map<string, CommittenteImmobile>();
  const segna = (c: { id: string; denominazione: string | null; tipo: string } | null) => {
    if (!c) return;
    const voce = committenti.get(c.id) ?? { id: c.id, nome: c.denominazione ?? "Senza nome", tipo: c.tipo, pratiche: 0 };
    voce.pratiche += 1;
    committenti.set(c.id, voce);
  };

  const elencoCommesse: PraticaCliente[] = (commesse.data ?? []).map((c) => {
    segna(c.cliente);
    const s = statoCommessa(c.stato);
    return { id: c.id, sigla: c.codice, titolo: c.titolo, data: c.data_apertura, importo: c.onorario_concordato, stato: c.stato, statoEtichetta: s.etichetta, colore: s.colore, href: `/commesse/${c.id}`, luogo: c.cliente?.denominazione ?? null };
  });
  const elencoPreventivi: PraticaCliente[] = (preventivi.data ?? []).map((p) => {
    segna(p.cliente);
    const s = STATI_PREVENTIVO[p.stato] ?? { etichetta: p.stato, colore: "var(--tenue)" };
    return {
      id: p.id,
      sigla: p.numero,
      titolo: (p.titolo ?? p.oggetto ?? "Preventivo") + (p.integrativo ? " · integrativo" : ""),
      data: p.data_emissione,
      importo: p.imponibile,
      stato: p.stato,
      statoEtichetta: s.etichetta,
      colore: s.colore,
      href: `/preventivi/${p.id}`,
      luogo: p.cliente?.denominazione ?? null,
    };
  });
  const elencoPf: PraticaCliente[] = (prefattibilita.data ?? []).map((p) => {
    segna(p.cliente);
    const s = STATI_PREFATTIBILITA[p.stato] ?? { etichetta: p.stato, colore: "var(--tenue)" };
    return { id: p.id, sigla: p.numero, titolo: p.titolo ?? "Pre-fattibilità", data: p.data_redazione ?? p.created_at, importo: p.onorario, stato: p.stato, statoEtichetta: s.etichetta, colore: s.colore, href: `/prefattibilita/${p.id}`, luogo: p.cliente?.denominazione ?? null };
  });

  // Documenti archiviati sulle commesse di questo immobile (i più recenti)
  const idCommesse = (commesse.data ?? []).map((c) => c.id);
  let documenti: DocumentoImmobile[] = [];
  let totaleDocumenti = 0;
  if (idCommesse.length) {
    const { data, count, error } = await supabase
      .from("documenti")
      .select("id, titolo, categoria, created_at, commessa:commesse(id, codice, titolo)", { count: "exact" })
      .in("commessa_id", idCommesse)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw new Error(`Impossibile leggere i documenti dell'immobile: ${error.message}`);
    totaleDocumenti = count ?? 0;
    documenti = (data ?? [])
      .filter((d) => d.commessa)
      .map((d) => ({ id: d.id, titolo: d.titolo, categoria: d.categoria, data: d.created_at, commessa: { id: d.commessa!.id, codice: d.commessa!.codice, titolo: d.commessa!.titolo } }));
  }

  const importi = await vedeImporti();
  return {
    immobile: immobile.data,
    catasto: catasto.data ?? [],
    prefattibilita: senzaImporti(elencoPf, "importo", importi),
    preventivi: senzaImporti(elencoPreventivi, "importo", importi),
    commesse: senzaImporti(elencoCommesse, "importo", importi),
    committenti: [...committenti.values()].sort((a, b) => b.pratiche - a.pratiche),
    documenti,
    totaleDocumenti,
  };
}
