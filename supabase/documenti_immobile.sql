-- ════════════════════════════════════════════════════════════════════════
--  Documenti dell'immobile
--  Un documento può appartenere a una commessa (come finora) oppure direttamente
--  a un immobile, senza commessa. Le regole di accesso già in uso valgono così:
--  i documenti senza commessa seguono il permesso dell'area "Documenti".
--  Da eseguire una volta nell'editor SQL di Supabase. Si può rieseguire senza danni.
-- ════════════════════════════════════════════════════════════════════════

alter table public.documenti alter column commessa_id drop not null;

alter table public.documenti
  add column if not exists immobile_id uuid references public.immobili(id) on delete cascade;

create index if not exists documenti_immobile_id_idx on public.documenti (immobile_id);

-- Ogni documento appartiene almeno a una commessa o a un immobile
alter table public.documenti drop constraint if exists documenti_commessa_o_immobile;
alter table public.documenti add constraint documenti_commessa_o_immobile
  check (commessa_id is not null or immobile_id is not null);

-- Verifica: deve restituire "YES" e una riga con immobile_id
select is_nullable as commessa_facoltativa,
       (select column_name from information_schema.columns
         where table_schema = 'public' and table_name = 'documenti' and column_name = 'immobile_id') as nuova_colonna
  from information_schema.columns
 where table_schema = 'public' and table_name = 'documenti' and column_name = 'commessa_id';
