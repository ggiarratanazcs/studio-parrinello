/** Dati e risposte dell'assistente dello studio (condivisi tra server e interfaccia). */

export type IndiceAssistente = {
  utente: string;
  studio: string;
  clienti: {
    id: string;
    nome: string;
    persona: boolean;
    telefono: string | null;
    email: string | null;
    comune: string | null;
    referenti: { nome: string; ruolo: string | null; telefono: string | null; email: string | null }[];
  }[];
  commesse: {
    id: string;
    codice: string | null;
    titolo: string;
    stato: string;
    clienteId: string;
    cliente: string | null;
    immobile: string | null;
  }[];
  immobili: { id: string; nome: string; indirizzo: string }[];
  /** Fasi non concluse con una data di fine prevista */
  fasi: { id: string; nome: string; stato: string; fine: string; avanzamento: number; commessaId: string; commessa: string }[];
};

export type DocumentoTrovato = { id: string; nome: string; provenienza: string; data: string; storagePath: string; foto: boolean };

export type Scheda =
  | {
      tipo: "telefono";
      titolo: string;
      sottotitolo?: string;
      numeri: { etichetta: string; numero: string }[];
      href?: string;
    }
  | {
      tipo: "mail";
      a: string;
      destinatario: string;
      oggetto: string;
      corpo: string;
      href?: string;
    }
  | {
      tipo: "voce";
      icona: "commessa" | "cliente" | "immobile" | "fase";
      titolo: string;
      sottotitolo?: string;
      href: string;
      /** Testo evidenziato a destra (es. una data in ritardo) */
      nota?: string;
      allarme?: boolean;
    };

/** Risposta dell'interprete: testo, schede azione e, se serve, una ricerca di file da fare sul server. */
export type Risposta = {
  testo: string;
  schede: Scheda[];
  cercaDocumenti?: string;
};
