/**
 * Impaginazioni disponibili. La scelta è salvata nel browser (localStorage) e applicata
 * come attributo data-impaginazione sull'elemento <html> prima che la pagina compaia.
 */
export const IMPAGINAZIONI = [
  {
    id: "laterale",
    nome: "Barra laterale",
    descrizione: "Sezioni nella colonna a sinistra, elenchi in tabella",
  },
  {
    id: "materia",
    nome: "Materia",
    descrizione: "Sezioni in alto, elenchi su piani di pietra con l'avanzamento delle fasi",
  },
] as const;

export type IdImpaginazione = (typeof IMPAGINAZIONI)[number]["id"];

export const IMPAGINAZIONE_PREDEFINITA: IdImpaginazione = "laterale";
export const CHIAVE_IMPAGINAZIONE = "sp-impaginazione";

export const CHIAVE_BARRA = "sp-barra";

/** Script eseguito prima del rendering: applica impaginazione e stato della barra senza sfarfallio. */
export const SCRIPT_IMPAGINAZIONE = `try{var d=document.documentElement,v=localStorage.getItem("${CHIAVE_IMPAGINAZIONE}");if(v==="materia"||v==="laterale")d.dataset.impaginazione=v;if(localStorage.getItem("${CHIAVE_BARRA}")==="chiusa")d.dataset.barra="chiusa"}catch(e){}`;
