/** Etichette leggibili per i valori salvati nel database. */

export const STATI_COMMESSA = {
  contatto: { etichetta: "Primo contatto", colore: "var(--stato-contatto)" },
  prefattibilita: { etichetta: "Pre-fattibilità", colore: "var(--stato-prefattibilita)" },
  preventivo: { etichetta: "Preventivo", colore: "var(--stato-preventivo)" },
  attiva: { etichetta: "In corso", colore: "var(--stato-attiva)" },
  sospesa: { etichetta: "Sospesa", colore: "var(--stato-sospesa)" },
  conclusa: { etichetta: "Conclusa", colore: "var(--stato-conclusa)" },
  persa: { etichetta: "Non acquisita", colore: "var(--stato-contatto)" },
  annullata: { etichetta: "Annullata", colore: "var(--stato-contatto)" },
} as const;

export type StatoCommessa = keyof typeof STATI_COMMESSA;

export function statoCommessa(stato: string | null | undefined) {
  return STATI_COMMESSA[(stato ?? "contatto") as StatoCommessa] ?? STATI_COMMESSA.contatto;
}

export const TIPOLOGIE_INTERVENTO: Record<string, string> = {
  nuova_costruzione: "Nuova costruzione",
  ristrutturazione: "Ristrutturazione",
  restauro: "Restauro",
  manutenzione_straordinaria: "Manutenzione straordinaria",
  interni_design: "Interni e design",
  urbano: "Progetto urbano",
  industriale: "Industriale",
  efficientamento: "Efficientamento energetico",
  altro: "Altro",
};

export const RUOLI: Record<string, string> = {
  titolare: "Titolare",
  architetto: "Architetto",
  collaboratore: "Collaboratore",
  amministrazione: "Amministrazione",
};

export const STATI_FASE: Record<string, string> = {
  da_avviare: "Da avviare",
  in_corso: "In corso",
  in_revisione: "In revisione",
  completata: "Completata",
  sospesa: "Sospesa",
  annullata: "Annullata",
};

export const AMBITI: Record<string, string> = {
  residenziale: "Residenziale",
  ricettivo: "Ricettivo",
  commerciale: "Commerciale",
  industriale: "Industriale",
  urbano: "Urbano",
  pubblico: "Edificio pubblico",
  altro: "Altro",
};

export const TIPI_CLIENTE: Record<string, string> = {
  persona_fisica: "Privato",
  azienda: "Azienda",
  ente_pubblico: "Ente pubblico",
};

export const VINCOLI = [
  "Paesaggistico",
  "Storico-architettonico",
  "Archeologico",
  "Idrogeologico",
  "PAI (rischio idraulico/frana)",
  "Sismico",
  "Fascia di rispetto",
  "Demanio marittimo",
  "Area protetta / Natura 2000",
];

export const PARERI_ENTI = [
  "Soprintendenza BB.CC.AA.",
  "Genio Civile",
  "ASP",
  "Vigili del Fuoco",
  "Capitaneria / Demanio",
  "Ente parco / riserva",
  "Commissione edilizia",
];

export const TITOLI_EDILIZI: Record<string, string> = {
  edilizia_libera: "Edilizia libera",
  CILA: "CILA",
  CILAS: "CILA Superbonus (CILAS)",
  SCIA: "SCIA",
  SCIA_alternativa_PdC: "SCIA alternativa al PdC",
  PdC: "Permesso di Costruire",
  autorizzazione_paesaggistica: "Autorizzazione paesaggistica",
  altro: "Altro",
};

export const ESITI_PREFATTIBILITA: Record<string, string> = {
  fattibile: "Fattibile",
  fattibile_con_condizioni: "Fattibile con condizioni",
  da_approfondire: "Da approfondire",
  non_fattibile: "Non fattibile",
};
