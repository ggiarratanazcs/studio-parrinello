# Database Supabase

Migrazioni applicate al progetto `commesse`, in ordine:

1. `schema_v1_mvp` — tabelle, regole di accesso (RLS), catalogo fasi, bucket documenti, vista di sintesi
   (testo completo in `schema_v1.sql`)
2. `schema_v1_hardening` — permessi sulle funzioni, indici sulle chiavi esterne, policy consolidate
3. `funzione_crea_commessa` — funzione `crea_commessa(dati jsonb)` che crea committente, immobile,
   commessa e fasi in un'unica transazione (gira con i permessi dell'utente, quindi valgono le RLS)

4. `preventivi_prefattibilita_autonomi` — preventivi (P-anno-NNN) e pre-fattibilità (F-anno-NNN) autonomi,
   funzioni `crea_preventivo`, `crea_prefattibilita`, `converti_in_commessa`, vista `v_pratiche` per i tassi di conversione

Dopo ogni migrazione rigenerare i tipi in `src/lib/database.types.ts`.

5. `configurazione_studio.sql` — tabella `studio` (nome, claim, logo, dati dei documenti) e spazio `studio` per il logo
6. `permessi.sql` — ruoli titolare/architetto/collaboratore, tabelle `permessi_ruolo` e `permessi_utente`,
   funzioni `permesso(chiave)` e `vede_commessa(id)`, regole di accesso riscritte sui permessi
7. `documenti_immobile.sql` — documenti caricati direttamente su un immobile (colonna `immobile_id`, commessa facoltativa)
