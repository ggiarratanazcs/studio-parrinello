-- ════════════════════════════════════════════════════════════════════════
--  Collaboratori sulle commesse
--  · più persone assegnate a una fase (oltre al responsabile)
--  · una commessa è visibile anche a chi è assegnato a una sua fase
--  · nuovo permesso "Fasi visibili": tutte, o solo quelle a cui si è assegnati
--  · committente e immobile visibili dentro le commesse che si possono aprire,
--    anche senza accesso alle sezioni Clienti e Immobili
--  · valori del Collaboratore: solo le sue commesse, con dati generali, fasi e allegati
--  Da eseguire una volta nell'editor SQL di Supabase (dopo permessi.sql). Si può rieseguire.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Persone assegnate alle fasi ──────────────────────────────────────
create table if not exists public.commesse_fasi_persone (
  fase_id    uuid not null references public.commesse_fasi(id) on delete cascade,
  profilo_id uuid not null references public.profili(id) on delete cascade,
  primary key (fase_id, profilo_id)
);
create index if not exists commesse_fasi_persone_profilo_idx on public.commesse_fasi_persone (profilo_id);
alter table public.commesse_fasi_persone enable row level security;

-- ── 2. Permessi: nuova voce e valori del Collaboratore ─────────────────
insert into public.permessi_ruolo (ruolo, chiave, livello) values
  ('architetto', 'fasi_ambito', 1),
  ('collaboratore', 'fasi_ambito', 0)
on conflict (ruolo, chiave) do nothing;

-- Il collaboratore vede solo le sue commesse: niente sezioni Clienti, Immobili, Documenti, né diario
update public.permessi_ruolo set livello = 0
 where ruolo = 'collaboratore' and chiave in ('clienti', 'immobili', 'documenti', 'c.diario', 'c.pratiche', 'c.onorario', 'c.importo_lavori');

-- ── 3. Funzioni di controllo ────────────────────────────────────────────
-- Fase "propria": responsabile o assegnato
create or replace function public.fase_propria(p_fase uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from commesse_fasi f where f.id = p_fase and f.responsabile_id = auth.uid())
      or exists (select 1 from commesse_fasi_persone p where p.fase_id = p_fase and p.profilo_id = auth.uid());
$$;

-- Commessa visibile: tutte, oppure quelle del proprio team, di cui si è responsabili,
-- che si sono create o in cui si ha almeno una fase
create or replace function public.vede_commessa(p_commessa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select permesso('commesse') >= 1 and (
    permesso('ambito') >= 1
    or exists (select 1 from commesse c where c.id = p_commessa
               and (c.responsabile_id = auth.uid() or c.created_by = auth.uid()))
    or exists (select 1 from commesse_team t where t.commessa_id = p_commessa and t.profilo_id = auth.uid())
    or exists (select 1 from commesse_fasi f where f.commessa_id = p_commessa and f.responsabile_id = auth.uid())
    or exists (select 1 from commesse_fasi f join commesse_fasi_persone p on p.fase_id = f.id
               where f.commessa_id = p_commessa and p.profilo_id = auth.uid())
  );
$$;

-- Fase visibile: commessa visibile e, se "solo le proprie", fase propria
create or replace function public.vede_fase(p_fase uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from commesse_fasi f
     where f.id = p_fase
       and permesso('c.fasi') >= 1
       and vede_commessa(f.commessa_id)
       and (permesso('fasi_ambito') >= 1 or fase_propria(f.id))
  );
$$;

revoke all on function public.fase_propria(uuid), public.vede_fase(uuid) from public, anon;
grant execute on function public.fase_propria(uuid), public.vede_fase(uuid) to authenticated;

-- ── 4. Regole di accesso ────────────────────────────────────────────────
-- Fasi: si vedono e si modificano solo quelle visibili
drop policy if exists commesse_fasi_select on public.commesse_fasi;
drop policy if exists commesse_fasi_update on public.commesse_fasi;
create policy commesse_fasi_select on public.commesse_fasi for select to authenticated using (vede_fase(id));
create policy commesse_fasi_update on public.commesse_fasi for update to authenticated
  using ((select permesso('c.fasi')) >= 2 and vede_fase(id)) with check ((select permesso('c.fasi')) >= 2);

-- Persone sulle fasi: le vede chi vede la commessa, le cambia chi può modificare le fasi
drop policy if exists commesse_fasi_persone_select on public.commesse_fasi_persone;
drop policy if exists commesse_fasi_persone_write on public.commesse_fasi_persone;
create policy commesse_fasi_persone_select on public.commesse_fasi_persone for select to authenticated
  using ((select permesso('commesse')) >= 1);
create policy commesse_fasi_persone_write on public.commesse_fasi_persone for all to authenticated
  using ((select permesso('c.fasi')) >= 2 and vede_fase(fase_id))
  with check ((select permesso('c.fasi')) >= 2 and vede_fase(fase_id));

-- Allegati: quelli di una fase seguono la visibilità della fase
drop policy if exists documenti_select on public.documenti;
create policy documenti_select on public.documenti for select to authenticated using (
  case when commessa_id is null then (select permesso('documenti')) >= 1
       when fase_id is not null then (select permesso('c.allegati')) >= 1 and vede_fase(fase_id)
       else (select permesso('c.allegati')) >= 1 and vede_commessa(commessa_id) end);

-- Committente e immobile: visibili con l'area, oppure perché legati a una commessa visibile
drop policy if exists clienti_select on public.clienti;
create policy clienti_select on public.clienti for select to authenticated using (
  (select permesso('clienti')) >= 1
  or exists (select 1 from commesse c where c.cliente_id = clienti.id and vede_commessa(c.id)));

drop policy if exists immobili_select on public.immobili;
create policy immobili_select on public.immobili for select to authenticated using (
  (select permesso('immobili')) >= 1
  or exists (select 1 from commesse c where c.immobile_id = immobili.id and vede_commessa(c.id)));

drop policy if exists immobili_catasto_select on public.immobili_catasto;
create policy immobili_catasto_select on public.immobili_catasto for select to authenticated using (
  (select permesso('immobili')) >= 1
  or exists (select 1 from commesse c where c.immobile_id = immobili_catasto.immobile_id and vede_commessa(c.id)));

-- Verifica: deve restituire la nuova tabella e il permesso "fasi_ambito" per i due ruoli
select to_regclass('public.commesse_fasi_persone') as tabella,
       (select count(*) from public.permessi_ruolo where chiave = 'fasi_ambito') as permessi_fasi;
