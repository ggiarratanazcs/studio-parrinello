# Database Supabase

Migrazioni applicate al progetto `commesse`, in ordine:

1. `schema_v1_mvp` — tabelle, regole di accesso (RLS), catalogo fasi, bucket documenti, vista di sintesi
   (testo completo in `schema_v1.sql`)
2. `schema_v1_hardening` — permessi sulle funzioni, indici sulle chiavi esterne, policy consolidate
3. `funzione_crea_commessa` — funzione `crea_commessa(dati jsonb)` che crea committente, immobile,
   commessa e fasi in un'unica transazione (gira con i permessi dell'utente, quindi valgono le RLS)

Dopo ogni migrazione rigenerare i tipi in `src/lib/database.types.ts`.
