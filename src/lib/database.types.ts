// Tipi generati dallo schema Supabase (progetto "commesse").
// Rigenerare dopo ogni migrazione.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      clienti: {
        Row: {
          cap: string | null
          codice_fiscale: string | null
          codice_ipa: string | null
          codice_sdi: string | null
          cognome: string | null
          comune: string | null
          created_at: string
          created_by: string | null
          denominazione: string | null
          email: string | null
          fonte: string | null
          id: string
          indirizzo: string | null
          nome: string | null
          note: string | null
          partita_iva: string | null
          pec: string | null
          provincia: string | null
          ragione_sociale: string | null
          telefono: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          cap?: string | null
          codice_fiscale?: string | null
          codice_ipa?: string | null
          codice_sdi?: string | null
          cognome?: string | null
          comune?: string | null
          created_at?: string
          created_by?: string | null
          denominazione?: string | null
          email?: string | null
          fonte?: string | null
          id?: string
          indirizzo?: string | null
          nome?: string | null
          note?: string | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          ragione_sociale?: string | null
          telefono?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          cap?: string | null
          codice_fiscale?: string | null
          codice_ipa?: string | null
          codice_sdi?: string | null
          cognome?: string | null
          comune?: string | null
          created_at?: string
          created_by?: string | null
          denominazione?: string | null
          email?: string | null
          fonte?: string | null
          id?: string
          indirizzo?: string | null
          nome?: string | null
          note?: string | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          ragione_sociale?: string | null
          telefono?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      clienti_referenti: {
        Row: {
          cliente_id: string
          created_at: string
          email: string | null
          id: string
          nome: string
          note: string | null
          principale: boolean
          ruolo: string | null
          telefono: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          note?: string | null
          principale?: boolean
          ruolo?: string | null
          telefono?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          note?: string | null
          principale?: boolean
          ruolo?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      commesse: {
        Row: {
          ambito: string | null
          cig: string | null
          cliente_id: string
          codice: string | null
          committenza: string
          copertina_path: string | null
          created_at: string
          created_by: string | null
          cup: string | null
          data_apertura: string
          data_chiusura: string | null
          data_fine_prevista: string | null
          data_incarico: string | null
          descrizione: string | null
          determina_incarico: string | null
          id: string
          immobile_id: string | null
          importo_lavori_stimato: number | null
          onorario_concordato: number | null
          responsabile_id: string | null
          rup_nome: string | null
          stato: string
          tag: string[] | null
          tipologia_intervento: string | null
          titolo: string
          updated_at: string
        }
        Insert: {
          ambito?: string | null
          cig?: string | null
          cliente_id: string
          codice?: string | null
          committenza?: string
          copertina_path?: string | null
          created_at?: string
          created_by?: string | null
          cup?: string | null
          data_apertura?: string
          data_chiusura?: string | null
          data_fine_prevista?: string | null
          data_incarico?: string | null
          descrizione?: string | null
          determina_incarico?: string | null
          id?: string
          immobile_id?: string | null
          importo_lavori_stimato?: number | null
          onorario_concordato?: number | null
          responsabile_id?: string | null
          rup_nome?: string | null
          stato?: string
          tag?: string[] | null
          tipologia_intervento?: string | null
          titolo: string
          updated_at?: string
        }
        Update: {
          ambito?: string | null
          cig?: string | null
          cliente_id?: string
          codice?: string | null
          committenza?: string
          copertina_path?: string | null
          created_at?: string
          created_by?: string | null
          cup?: string | null
          data_apertura?: string
          data_chiusura?: string | null
          data_fine_prevista?: string | null
          data_incarico?: string | null
          descrizione?: string | null
          determina_incarico?: string | null
          id?: string
          immobile_id?: string | null
          importo_lavori_stimato?: number | null
          onorario_concordato?: number | null
          responsabile_id?: string | null
          rup_nome?: string | null
          stato?: string
          tag?: string[] | null
          tipologia_intervento?: string | null
          titolo?: string
          updated_at?: string
        }
        Relationships: []
      }
      commesse_contatori: {
        Row: { anno: number; ultimo: number }
        Insert: { anno: number; ultimo?: number }
        Update: { anno?: number; ultimo?: number }
        Relationships: []
      }
      commesse_diario: {
        Row: {
          autore_id: string | null
          commessa_id: string
          created_at: string
          data_evento: string
          id: string
          testo: string
          tipo: string
        }
        Insert: {
          autore_id?: string | null
          commessa_id: string
          created_at?: string
          data_evento?: string
          id?: string
          testo: string
          tipo?: string
        }
        Update: {
          autore_id?: string | null
          commessa_id?: string
          created_at?: string
          data_evento?: string
          id?: string
          testo?: string
          tipo?: string
        }
        Relationships: []
      }
      commesse_fasi: {
        Row: {
          avanzamento_pct: number
          codice: string | null
          commessa_id: string
          created_at: string
          data_fine_eff: string | null
          data_fine_prev: string | null
          data_inizio_eff: string | null
          data_inizio_prev: string | null
          fase_catalogo_id: string | null
          id: string
          nome: string
          note: string | null
          onorario: number | null
          ordine: number
          ore_budget: number | null
          responsabile_id: string | null
          stato: string
          updated_at: string
        }
        Insert: {
          avanzamento_pct?: number
          codice?: string | null
          commessa_id: string
          created_at?: string
          data_fine_eff?: string | null
          data_fine_prev?: string | null
          data_inizio_eff?: string | null
          data_inizio_prev?: string | null
          fase_catalogo_id?: string | null
          id?: string
          nome: string
          note?: string | null
          onorario?: number | null
          ordine?: number
          ore_budget?: number | null
          responsabile_id?: string | null
          stato?: string
          updated_at?: string
        }
        Update: {
          avanzamento_pct?: number
          codice?: string | null
          commessa_id?: string
          created_at?: string
          data_fine_eff?: string | null
          data_fine_prev?: string | null
          data_inizio_eff?: string | null
          data_inizio_prev?: string | null
          fase_catalogo_id?: string | null
          id?: string
          nome?: string
          note?: string | null
          onorario?: number | null
          ordine?: number
          ore_budget?: number | null
          responsabile_id?: string | null
          stato?: string
          updated_at?: string
        }
        Relationships: []
      }
      commesse_team: {
        Row: { commessa_id: string; profilo_id: string; ruolo_commessa: string | null }
        Insert: { commessa_id: string; profilo_id: string; ruolo_commessa?: string | null }
        Update: { commessa_id?: string; profilo_id?: string; ruolo_commessa?: string | null }
        Relationships: []
      }
      documenti: {
        Row: {
          caricato_da: string | null
          categoria: string
          commessa_id: string
          created_at: string
          descrizione: string | null
          dimensione_byte: number | null
          fase_id: string | null
          id: string
          latitudine: number | null
          longitudine: number | null
          mime_type: string | null
          nome_file: string
          scattata_il: string | null
          storage_path: string
          tag: string[] | null
          titolo: string
        }
        Insert: {
          caricato_da?: string | null
          categoria?: string
          commessa_id: string
          created_at?: string
          descrizione?: string | null
          dimensione_byte?: number | null
          fase_id?: string | null
          id?: string
          latitudine?: number | null
          longitudine?: number | null
          mime_type?: string | null
          nome_file: string
          scattata_il?: string | null
          storage_path: string
          tag?: string[] | null
          titolo: string
        }
        Update: {
          caricato_da?: string | null
          categoria?: string
          commessa_id?: string
          created_at?: string
          descrizione?: string | null
          dimensione_byte?: number | null
          fase_id?: string | null
          id?: string
          latitudine?: number | null
          longitudine?: number | null
          mime_type?: string | null
          nome_file?: string
          scattata_il?: string | null
          storage_path?: string
          tag?: string[] | null
          titolo?: string
        }
        Relationships: []
      }
      fasi_catalogo: {
        Row: {
          ambito: string
          attiva: boolean
          codice: string
          descrizione: string | null
          id: string
          nome: string
          ordine: number
        }
        Insert: {
          ambito?: string
          attiva?: boolean
          codice: string
          descrizione?: string | null
          id?: string
          nome: string
          ordine?: number
        }
        Update: {
          ambito?: string
          attiva?: boolean
          codice?: string
          descrizione?: string | null
          id?: string
          nome?: string
          ordine?: number
        }
        Relationships: []
      }
      immobili: {
        Row: {
          anno_costruzione: number | null
          cap: string | null
          comune: string
          created_at: string
          denominazione: string | null
          destinazione_uso: string | null
          id: string
          indirizzo: string
          latitudine: number | null
          longitudine: number | null
          note: string | null
          provincia: string | null
          strumento_urbanistico: string | null
          superficie_mq: number | null
          updated_at: string
          vincoli: string[] | null
          zona_urbanistica: string | null
        }
        Insert: {
          anno_costruzione?: number | null
          cap?: string | null
          comune: string
          created_at?: string
          denominazione?: string | null
          destinazione_uso?: string | null
          id?: string
          indirizzo: string
          latitudine?: number | null
          longitudine?: number | null
          note?: string | null
          provincia?: string | null
          strumento_urbanistico?: string | null
          superficie_mq?: number | null
          updated_at?: string
          vincoli?: string[] | null
          zona_urbanistica?: string | null
        }
        Update: {
          anno_costruzione?: number | null
          cap?: string | null
          comune?: string
          created_at?: string
          denominazione?: string | null
          destinazione_uso?: string | null
          id?: string
          indirizzo?: string
          latitudine?: number | null
          longitudine?: number | null
          note?: string | null
          provincia?: string | null
          strumento_urbanistico?: string | null
          superficie_mq?: number | null
          updated_at?: string
          vincoli?: string[] | null
          zona_urbanistica?: string | null
        }
        Relationships: []
      }
      immobili_catasto: {
        Row: {
          catasto: string
          categoria: string | null
          classe: string | null
          consistenza: string | null
          foglio: string
          id: string
          immobile_id: string
          intestatari: string | null
          note: string | null
          particella: string
          rendita: number | null
          sezione: string | null
          subalterno: string | null
        }
        Insert: {
          catasto?: string
          categoria?: string | null
          classe?: string | null
          consistenza?: string | null
          foglio: string
          id?: string
          immobile_id: string
          intestatari?: string | null
          note?: string | null
          particella: string
          rendita?: number | null
          sezione?: string | null
          subalterno?: string | null
        }
        Update: {
          catasto?: string
          categoria?: string | null
          classe?: string | null
          consistenza?: string | null
          foglio?: string
          id?: string
          immobile_id?: string
          intestatari?: string | null
          note?: string | null
          particella?: string
          rendita?: number | null
          sezione?: string | null
          subalterno?: string | null
        }
        Relationships: []
      }
      prefattibilita: {
        Row: {
          accesso_atti_data: string | null
          accesso_atti_richiesto: boolean | null
          commessa_id: string
          costo_opere_stimato: number | null
          costo_parametrico_mq: number | null
          created_at: string
          data_redazione: string | null
          difformita_descrizione: string | null
          difformita_rilevate: boolean | null
          durata_stimata_mesi: number | null
          esito: string | null
          id: string
          indici_parametri: string | null
          pareri_enti: string[] | null
          redatta_da: string | null
          sanatoria_necessaria: boolean | null
          sintesi: string | null
          stato_legittimo_verificato: boolean | null
          strumento_urbanistico: string | null
          superficie_intervento_mq: number | null
          titolo_edilizio: string | null
          updated_at: string
          versione: number
          vincoli: string[] | null
          vincoli_note: string | null
          zona_urbanistica: string | null
        }
        Insert: {
          accesso_atti_data?: string | null
          accesso_atti_richiesto?: boolean | null
          commessa_id: string
          costo_parametrico_mq?: number | null
          created_at?: string
          data_redazione?: string | null
          difformita_descrizione?: string | null
          difformita_rilevate?: boolean | null
          durata_stimata_mesi?: number | null
          esito?: string | null
          id?: string
          indici_parametri?: string | null
          pareri_enti?: string[] | null
          redatta_da?: string | null
          sanatoria_necessaria?: boolean | null
          sintesi?: string | null
          stato_legittimo_verificato?: boolean | null
          strumento_urbanistico?: string | null
          superficie_intervento_mq?: number | null
          titolo_edilizio?: string | null
          updated_at?: string
          versione?: number
          vincoli?: string[] | null
          vincoli_note?: string | null
          zona_urbanistica?: string | null
        }
        Update: {
          accesso_atti_data?: string | null
          accesso_atti_richiesto?: boolean | null
          commessa_id?: string
          costo_parametrico_mq?: number | null
          created_at?: string
          data_redazione?: string | null
          difformita_descrizione?: string | null
          difformita_rilevate?: boolean | null
          durata_stimata_mesi?: number | null
          esito?: string | null
          id?: string
          indici_parametri?: string | null
          pareri_enti?: string[] | null
          redatta_da?: string | null
          sanatoria_necessaria?: boolean | null
          sintesi?: string | null
          stato_legittimo_verificato?: boolean | null
          strumento_urbanistico?: string | null
          superficie_intervento_mq?: number | null
          titolo_edilizio?: string | null
          updated_at?: string
          versione?: number
          vincoli?: string[] | null
          vincoli_note?: string | null
          zona_urbanistica?: string | null
        }
        Relationships: []
      }
      preventivi: {
        Row: {
          cassa_pct: number
          commessa_id: string
          condizioni_pagamento: string | null
          created_at: string
          created_by: string | null
          data_emissione: string
          data_esito: string | null
          data_invio: string | null
          id: string
          imponibile: number | null
          importo_lavori: number | null
          iva_pct: number
          metodo_calcolo: string
          note: string | null
          numero: string | null
          oggetto: string | null
          percentuale_onorario: number | null
          ritenuta_pct: number | null
          sconto_pct: number | null
          spese_pct: number | null
          stato: string
          totale_cassa: number | null
          totale_documento: number | null
          totale_iva: number | null
          updated_at: string
          validita_giorni: number
          versione: number
        }
        Insert: {
          cassa_pct?: number
          commessa_id: string
          condizioni_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          data_emissione?: string
          data_esito?: string | null
          data_invio?: string | null
          id?: string
          imponibile?: number | null
          importo_lavori?: number | null
          iva_pct?: number
          metodo_calcolo?: string
          note?: string | null
          numero?: string | null
          oggetto?: string | null
          percentuale_onorario?: number | null
          ritenuta_pct?: number | null
          sconto_pct?: number | null
          spese_pct?: number | null
          stato?: string
          totale_cassa?: number | null
          totale_documento?: number | null
          totale_iva?: number | null
          updated_at?: string
          validita_giorni?: number
          versione?: number
        }
        Update: {
          cassa_pct?: number
          commessa_id?: string
          condizioni_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          data_emissione?: string
          data_esito?: string | null
          data_invio?: string | null
          id?: string
          imponibile?: number | null
          importo_lavori?: number | null
          iva_pct?: number
          metodo_calcolo?: string
          note?: string | null
          numero?: string | null
          oggetto?: string | null
          percentuale_onorario?: number | null
          ritenuta_pct?: number | null
          sconto_pct?: number | null
          spese_pct?: number | null
          stato?: string
          totale_cassa?: number | null
          totale_documento?: number | null
          totale_iva?: number | null
          updated_at?: string
          validita_giorni?: number
          versione?: number
        }
        Relationships: []
      }
      preventivi_rate: {
        Row: {
          descrizione: string
          id: string
          importo: number | null
          ordine: number
          percentuale: number | null
          preventivo_id: string
        }
        Insert: {
          descrizione: string
          id?: string
          importo?: number | null
          ordine?: number
          percentuale?: number | null
          preventivo_id: string
        }
        Update: {
          descrizione?: string
          id?: string
          importo?: number | null
          ordine?: number
          percentuale?: number | null
          preventivo_id?: string
        }
        Relationships: []
      }
      preventivi_voci: {
        Row: {
          descrizione: string
          fase_catalogo_id: string | null
          id: string
          importo: number | null
          opzionale: boolean
          ordine: number
          ore_stimate: number | null
          preventivo_id: string
          prezzo_unitario: number
          quantita: number
          unita_misura: string | null
        }
        Insert: {
          descrizione: string
          fase_catalogo_id?: string | null
          id?: string
          opzionale?: boolean
          ordine?: number
          ore_stimate?: number | null
          preventivo_id: string
          prezzo_unitario?: number
          quantita?: number
          unita_misura?: string | null
        }
        Update: {
          descrizione?: string
          fase_catalogo_id?: string | null
          id?: string
          opzionale?: boolean
          ordine?: number
          ore_stimate?: number | null
          preventivo_id?: string
          prezzo_unitario?: number
          quantita?: number
          unita_misura?: string | null
        }
        Relationships: []
      }
      profili: {
        Row: {
          attivo: boolean
          cognome: string
          colore: string | null
          created_at: string
          email: string
          id: string
          iniziali: string | null
          nome: string
          qualifica: string | null
          ruolo: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          cognome: string
          colore?: string | null
          created_at?: string
          email: string
          id: string
          iniziali?: string | null
          nome: string
          qualifica?: string | null
          ruolo?: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          cognome?: string
          colore?: string | null
          created_at?: string
          email?: string
          id?: string
          iniziali?: string | null
          nome?: string
          qualifica?: string | null
          ruolo?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profili_tariffe: {
        Row: {
          costo_orario: number | null
          profilo_id: string
          tariffa_oraria: number | null
          updated_at: string
        }
        Insert: {
          costo_orario?: number | null
          profilo_id: string
          tariffa_oraria?: number | null
          updated_at?: string
        }
        Update: {
          costo_orario?: number | null
          profilo_id?: string
          tariffa_oraria?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_commesse_sintesi: {
        Row: {
          avanzamento_medio: number | null
          cliente: string | null
          codice: string | null
          committenza: string | null
          comune: string | null
          data_apertura: string | null
          data_fine_prevista: string | null
          fasi_completate: number | null
          fasi_totali: number | null
          id: string | null
          indirizzo: string | null
          onorario_concordato: number | null
          ore_budget_totali: number | null
          responsabile: string | null
          stato: string | null
          tipologia_intervento: string | null
          titolo: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ha_ruolo: { Args: { ruoli: string[] }; Returns: boolean }
      is_membro_studio: { Args: never; Returns: boolean }
      ruolo_corrente: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])> =
  (PublicSchema["Tables"] & PublicSchema["Views"])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
