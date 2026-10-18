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

/** Script eseguito prima del rendering per evitare il cambio visibile di impaginazione. */
export const SCRIPT_IMPAGINAZIONE = `try{var v=localStorage.getItem("${CHIAVE_IMPAGINAZIONE}");if(v==="materia"||v==="laterale")document.documentElement.dataset.impaginazione=v}catch(e){}`;
