/**
 * Catalogo dei permessi: aree dell'app, parti della scheda commessa e livelli.
 * Gli stessi valori di partenza sono in supabase/permessi.sql (tabella permessi_ruolo).
 */

export type RuoloConfigurabile = "architetto" | "collaboratore";
export const RUOLI_CONFIGURABILI: RuoloConfigurabile[] = ["architetto", "collaboratore"];

export type TipoScala = "area" | "ambito" | "fasi" | "parte";

export type VocePermesso = {
  chiave: string;
  etichetta: string;
  scala: TipoScala;
  nota?: string;
};

export type GruppoPermessi = { titolo: string; descrizione: string; voci: VocePermesso[] };

export const SCALE: Record<TipoScala, string[]> = {
  area: ["Nessuno", "Vede", "Modifica", "Completo"],
  ambito: ["Solo il suo team", "Tutte"],
  fasi: ["Solo le proprie", "Tutte"],
  parte: ["Nascosta", "Visibile", "Modificabile"],
};

/** Livello massimo di ogni scala (quello del titolare). */
export const MASSIMO: Record<TipoScala, number> = { area: 3, ambito: 1, fasi: 1, parte: 2 };

export const GRUPPI_PERMESSI: GruppoPermessi[] = [
  {
    titolo: "Aree dello studio",
    descrizione: "Cosa può vedere e fare ogni ruolo",
    voci: [
      { chiave: "pratiche", etichetta: "Pre-fattibilità e preventivi", scala: "area" },
      { chiave: "commesse", etichetta: "Commesse", scala: "area", nota: "Completo permette anche di cambiare stato (avviare, sospendere, concludere) e di eliminare" },
      { chiave: "ambito", etichetta: "Commesse visibili", scala: "ambito", nota: "Il team comprende il responsabile, chi ha creato la commessa e chi è assegnato a una fase" },
      { chiave: "economia", etichetta: "Importi, compensi e analisi", scala: "area", nota: "Negli elenchi di commesse e pratiche e nell'analisi del cliente" },
      { chiave: "clienti", etichetta: "Clienti", scala: "area" },
      { chiave: "immobili", etichetta: "Immobili e catasto", scala: "area" },
      { chiave: "documenti", etichetta: "Documenti", scala: "area" },
      { chiave: "impostazioni", etichetta: "Impostazioni dello studio", scala: "area", nota: "Utenti e permessi restano sempre del titolare" },
    ],
  },
  {
    titolo: "Dettaglio della commessa",
    descrizione: "Cosa compare aprendo una commessa",
    voci: [
      { chiave: "c.stato", etichetta: "Stato e apertura", scala: "parte" },
      { chiave: "c.onorario", etichetta: "Onorario concordato", scala: "parte" },
      { chiave: "c.incarico", etichetta: "Incarico (intervento, CIG, CUP, RUP)", scala: "parte" },
      { chiave: "c.importo_lavori", etichetta: "Importo lavori stimato", scala: "parte" },
      { chiave: "c.committente", etichetta: "Committente e contatti", scala: "parte" },
      { chiave: "c.immobile", etichetta: "Immobile e catasto", scala: "parte" },
      { chiave: "c.pratiche", etichetta: "Pratiche (preventivi e integrativi)", scala: "parte" },
      { chiave: "c.fasi", etichetta: "Fasi", scala: "parte" },
      { chiave: "fasi_ambito", etichetta: "Fasi visibili", scala: "fasi", nota: "Proprie: quelle di cui è responsabile o a cui è assegnato" },
      { chiave: "c.cronoprogramma", etichetta: "Cronoprogramma", scala: "parte" },
      { chiave: "c.allegati", etichetta: "Allegati", scala: "parte" },
      { chiave: "c.team", etichetta: "Team di commessa", scala: "parte" },
      { chiave: "c.diario", etichetta: "Diario", scala: "parte" },
    ],
  },
];

export const VOCI_PERMESSI: VocePermesso[] = GRUPPI_PERMESSI.flatMap((g) => g.voci);
export const CHIAVI_PERMESSI = new Set(VOCI_PERMESSI.map((v) => v.chiave));
export type ChiavePermesso = string;

/** Valori di partenza (uguali a quelli inseriti dal file SQL). */
export const PREDEFINITI: Record<RuoloConfigurabile, Record<string, number>> = {
  architetto: {
    pratiche: 2, commesse: 3, ambito: 1, economia: 1, clienti: 2, immobili: 2, documenti: 3, impostazioni: 0,
    "c.stato": 1, "c.onorario": 1, "c.incarico": 2, "c.importo_lavori": 1, "c.committente": 1, "c.immobile": 1,
    "c.pratiche": 2, "c.fasi": 2, "c.cronoprogramma": 2, "c.allegati": 2, "c.team": 2, "c.diario": 2, fasi_ambito: 1,
  },
  collaboratore: {
    pratiche: 0, commesse: 2, ambito: 0, economia: 0, clienti: 0, immobili: 0, documenti: 0, impostazioni: 0,
    "c.stato": 1, "c.onorario": 0, "c.incarico": 1, "c.importo_lavori": 0, "c.committente": 1, "c.immobile": 1,
    "c.pratiche": 0, "c.fasi": 2, "c.cronoprogramma": 1, "c.allegati": 2, "c.team": 1, "c.diario": 0, fasi_ambito: 0,
  },
};

/** Sezione dell'app (percorso) → area che ne decide la visibilità. */
export const AREA_DI_SEZIONE: Record<string, string> = {
  "/prefattibilita": "pratiche",
  "/preventivi": "pratiche",
  "/commesse": "commesse",
  "/clienti": "clienti",
  "/immobili": "immobili",
  "/documenti": "documenti",
};

/** Permessi già risolti per l'utente corrente: chiave → livello. */
export type MappaPermessi = Record<string, number>;

export function livello(p: MappaPermessi, chiave: string) {
  return p[chiave] ?? 0;
}
