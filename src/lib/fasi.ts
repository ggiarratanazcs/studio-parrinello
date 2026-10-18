/**
 * Fasi prestazionali proposte in automatico per una nuova commessa,
 * in base al tipo di committenza e alla tipologia di intervento.
 * I codici fanno riferimento al catalogo (tabella fasi_catalogo).
 */

const BASE_PRIVATA = ["PREF", "RIL", "CONC", "DEF", "AUT", "ESE", "DL", "FINE"];
const BASE_PUBBLICA = ["PREF", "RIL", "PFTE", "ESE", "CSP", "DL", "CSE", "CONT", "COLL"];

const AGGIUNTE_PER_TIPOLOGIA: Record<string, string[]> = {
  nuova_costruzione: ["STR", "IMP", "REN"],
  ristrutturazione: ["IMP"],
  restauro: ["STR"],
  manutenzione_straordinaria: [],
  interni_design: ["INT", "REN"],
  urbano: ["REN"],
  industriale: ["STR", "IMP"],
  efficientamento: ["ENE", "IMP"],
  altro: [],
};

/** Fasi che per certe tipologie non servono di norma. */
const ESCLUSE_PER_TIPOLOGIA: Record<string, string[]> = {
  interni_design: ["DEF", "FINE"],
  manutenzione_straordinaria: ["CONC", "DEF"],
};

export function propostaFasi(committenza: string, tipologia: string | null): string[] {
  const base = committenza === "pubblica" ? BASE_PUBBLICA : BASE_PRIVATA;
  const aggiunte = tipologia ? AGGIUNTE_PER_TIPOLOGIA[tipologia] ?? [] : [];
  const escluse = tipologia ? ESCLUSE_PER_TIPOLOGIA[tipologia] ?? [] : [];
  return [...new Set([...base, ...aggiunte])].filter((c) => !escluse.includes(c));
}
