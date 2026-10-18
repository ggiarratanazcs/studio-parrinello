/** Temi disponibili. Il tema attivo è applicato come data-theme sull'elemento <html>. */
export const TEMI = [
  { id: "caldo", nome: "Caldo", descrizione: "Calce, pietra di Siracusa e bronzo", disponibile: true },
  { id: "editoriale", nome: "Editoriale", descrizione: "Bianco e nero, molto spazio", disponibile: false },
  { id: "notte", nome: "Notte", descrizione: "Scuro, per lavorare la sera", disponibile: false },
] as const;

export type IdTema = (typeof TEMI)[number]["id"];
export const TEMA_PREDEFINITO: IdTema = "caldo";
