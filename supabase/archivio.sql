-- ════════════════════════════════════════════════════════════════════════
--  Archivio: documenti dello studio
--  Oltre ai documenti di una commessa o di un immobile, l'Archivio accoglie i
--  documenti generali dello studio (modelli, normative, capitolati tipo, moduli),
--  che non appartengono né a una commessa né a un immobile.
--  Le regole di accesso restano quelle già in uso: i documenti senza commessa
--  seguono il permesso dell'area "Archivio" (chiave documenti).
--  Da eseguire una volta nell'editor SQL di Supabase. Si può rieseguire senza danni.
-- ════════════════════════════════════════════════════════════════════════

alter table public.documenti drop constraint if exists documenti_commessa_o_immobile;

create index if not exists documenti_created_at_idx on public.documenti (created_at desc);

-- Verifica: deve restituire 0 (il vincolo non c'è più)
select count(*) as vincoli_rimasti
  from information_schema.table_constraints
 where table_schema = 'public' and table_name = 'documenti'
   and constraint_name = 'documenti_commessa_o_immobile';
