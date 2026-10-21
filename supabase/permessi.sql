-- ════════════════════════════════════════════════════════════════════════
--  Ruoli e permessi dello studio
--  · ruoli: titolare, architetto, collaboratore (il ruolo "amministrazione" è eliminato)
--  · permessi per ruolo (modificabili dal titolare) ed eccezioni sul singolo utente
--  · regole di accesso (RLS) riscritte sui permessi
--  Da eseguire una volta nell'editor SQL di Supabase. Si può rieseguire senza danni.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Ruoli: via "amministrazione" ─────────────────────────────────────
update public.profili set ruolo = 'collaboratore' where ruolo = 'amministrazione';
alter table public.profili drop constraint if exists profili_ruolo_check;
alter table public.profili add constraint profili_ruolo_check check (ruolo in ('titolare', 'architetto', 'collaboratore'));

-- ── 2. Tabelle dei permessi ─────────────────────────────────────────────
-- Livelli: aree 0 nessuno · 1 vede · 2 modifica · 3 completo (anche elimina)
--          ambito 0 solo le commesse del proprio team · 1 tutte
--          parti della commessa (c.*) 0 nascosta · 1 visibile · 2 modificabile
create table if not exists public.permessi_ruolo (
  ruolo   text     not null check (ruolo in ('architetto', 'collaboratore')),
  chiave  text     not null,
  livello smallint not null check (livello between 0 and 3),
  primary key (ruolo, chiave)
);

create table if not exists public.permessi_utente (
  profilo_id uuid     not null references public.profili(id) on delete cascade,
  chiave     text     not null,
  livello    smallint not null check (livello between 0 and 3),
  primary key (profilo_id, chiave)
);

alter table public.permessi_ruolo  enable row level security;
alter table public.permessi_utente enable row level security;

-- Valori di partenza (non sovrascrive quelli già cambiati dal titolare)
insert into public.permessi_ruolo (ruolo, chiave, livello) values
  ('architetto', 'pratiche', 2), ('architetto', 'commesse', 3), ('architetto', 'ambito', 1),
  ('architetto', 'economia', 1), ('architetto', 'clienti', 2), ('architetto', 'immobili', 2),
  ('architetto', 'documenti', 3), ('architetto', 'impostazioni', 0),
  ('architetto', 'c.stato', 1), ('architetto', 'c.onorario', 1), ('architetto', 'c.incarico', 2),
  ('architetto', 'c.importo_lavori', 1), ('architetto', 'c.committente', 1), ('architetto', 'c.immobile', 1),
  ('architetto', 'c.pratiche', 2), ('architetto', 'c.fasi', 2), ('architetto', 'c.cronoprogramma', 2),
  ('architetto', 'c.allegati', 2), ('architetto', 'c.team', 2), ('architetto', 'c.diario', 2),
  ('collaboratore', 'pratiche', 0), ('collaboratore', 'commesse', 2), ('collaboratore', 'ambito', 0),
  ('collaboratore', 'economia', 0), ('collaboratore', 'clienti', 1), ('collaboratore', 'immobili', 1),
  ('collaboratore', 'documenti', 2), ('collaboratore', 'impostazioni', 0),
  ('collaboratore', 'c.stato', 1), ('collaboratore', 'c.onorario', 0), ('collaboratore', 'c.incarico', 1),
  ('collaboratore', 'c.importo_lavori', 0), ('collaboratore', 'c.committente', 1), ('collaboratore', 'c.immobile', 1),
  ('collaboratore', 'c.pratiche', 0), ('collaboratore', 'c.fasi', 2), ('collaboratore', 'c.cronoprogramma', 1),
  ('collaboratore', 'c.allegati', 2), ('collaboratore', 'c.team', 1), ('collaboratore', 'c.diario', 2)
on conflict (ruolo, chiave) do nothing;

-- ── 3. Funzioni di controllo ────────────────────────────────────────────
create or replace function public.e_titolare()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profili where id = auth.uid() and attivo and ruolo = 'titolare');
$$;

-- Livello dell'utente corrente per una chiave: eccezione personale, altrimenti ruolo.
-- Il titolare ha sempre il massimo; un utente disattivato non ha nulla.
create or replace function public.permesso(p_chiave text)
returns smallint language sql stable security definer set search_path = public as $$
  select case
    when p.id is null or not p.attivo then 0
    when p.ruolo = 'titolare' then 3
    else coalesce(
      (select u.livello from permessi_utente u where u.profilo_id = p.id and u.chiave = p_chiave),
      (select r.livello from permessi_ruolo r where r.ruolo = p.ruolo and r.chiave = p_chiave),
      0)
  end::smallint
  from (select 1) x left join profili p on p.id = auth.uid();
$$;

-- La commessa è tra quelle che l'utente può vedere (tutte, o solo quelle a cui partecipa)
create or replace function public.vede_commessa(p_commessa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select permesso('commesse') >= 1 and (
    permesso('ambito') >= 1
    or exists (select 1 from commesse c where c.id = p_commessa
               and (c.responsabile_id = auth.uid() or c.created_by = auth.uid()))
    or exists (select 1 from commesse_team t where t.commessa_id = p_commessa and t.profilo_id = auth.uid())
  );
$$;

revoke all on function public.permesso(text), public.vede_commessa(uuid), public.e_titolare() from public, anon;
grant execute on function public.permesso(text), public.vede_commessa(uuid), public.e_titolare() to authenticated;

-- ── 4. Regole di accesso ────────────────────────────────────────────────
do $$
declare t text;
begin
  -- toglie le regole precedenti sulle tabelle interessate
  for t in select unnest(array['clienti','clienti_referenti','immobili','immobili_catasto','prefattibilita',
                               'preventivi','preventivi_voci','preventivi_rate','commesse','commesse_fasi',
                               'commesse_team','commesse_diario','documenti','studio','permessi_ruolo','permessi_utente'])
  loop
    execute (select coalesce(string_agg(format('drop policy if exists %I on public.%I;', policyname, t), ' '), '')
             from pg_policies where schemaname = 'public' and tablename = t);
  end loop;
end $$;

-- Permessi: li leggono tutti i membri (servono all'app), li cambia solo il titolare
create policy permessi_ruolo_select on public.permessi_ruolo for select to authenticated using (is_membro_studio());
create policy permessi_ruolo_write  on public.permessi_ruolo for all to authenticated using ((select e_titolare())) with check ((select e_titolare()));
create policy permessi_utente_select on public.permessi_utente for select to authenticated using (is_membro_studio());
create policy permessi_utente_write  on public.permessi_utente for all to authenticated using ((select e_titolare())) with check ((select e_titolare()));

-- Studio: dati modificabili da chi ha "Impostazioni" almeno in modifica
create policy studio_select on public.studio for select to anon, authenticated using (true);
create policy studio_update on public.studio for update to authenticated
  using ((select permesso('impostazioni')) >= 2) with check ((select permesso('impostazioni')) >= 2);

-- Anagrafiche: clienti e immobili (con referenti e dati catastali)
create policy clienti_select on public.clienti for select to authenticated using ((select permesso('clienti')) >= 1);
create policy clienti_insert on public.clienti for insert to authenticated with check ((select permesso('clienti')) >= 2);
create policy clienti_update on public.clienti for update to authenticated using ((select permesso('clienti')) >= 2) with check ((select permesso('clienti')) >= 2);
create policy clienti_delete on public.clienti for delete to authenticated using ((select permesso('clienti')) >= 3);

create policy clienti_referenti_select on public.clienti_referenti for select to authenticated using ((select permesso('clienti')) >= 1);
create policy clienti_referenti_insert on public.clienti_referenti for insert to authenticated with check ((select permesso('clienti')) >= 2);
create policy clienti_referenti_update on public.clienti_referenti for update to authenticated using ((select permesso('clienti')) >= 2) with check ((select permesso('clienti')) >= 2);
create policy clienti_referenti_delete on public.clienti_referenti for delete to authenticated using ((select permesso('clienti')) >= 2);

create policy immobili_select on public.immobili for select to authenticated using ((select permesso('immobili')) >= 1);
create policy immobili_insert on public.immobili for insert to authenticated with check ((select permesso('immobili')) >= 2);
create policy immobili_update on public.immobili for update to authenticated using ((select permesso('immobili')) >= 2) with check ((select permesso('immobili')) >= 2);
create policy immobili_delete on public.immobili for delete to authenticated using ((select permesso('immobili')) >= 3);

create policy immobili_catasto_select on public.immobili_catasto for select to authenticated using ((select permesso('immobili')) >= 1);
create policy immobili_catasto_insert on public.immobili_catasto for insert to authenticated with check ((select permesso('immobili')) >= 2);
create policy immobili_catasto_update on public.immobili_catasto for update to authenticated using ((select permesso('immobili')) >= 2) with check ((select permesso('immobili')) >= 2);
create policy immobili_catasto_delete on public.immobili_catasto for delete to authenticated using ((select permesso('immobili')) >= 2);

-- Pratiche: pre-fattibilità e preventivi (con voci e rate)
create policy prefattibilita_select on public.prefattibilita for select to authenticated using ((select permesso('pratiche')) >= 1);
create policy prefattibilita_insert on public.prefattibilita for insert to authenticated with check ((select permesso('pratiche')) >= 2);
create policy prefattibilita_update on public.prefattibilita for update to authenticated using ((select permesso('pratiche')) >= 2) with check ((select permesso('pratiche')) >= 2);
create policy prefattibilita_delete on public.prefattibilita for delete to authenticated using ((select permesso('pratiche')) >= 3);

create policy preventivi_select on public.preventivi for select to authenticated using ((select permesso('pratiche')) >= 1);
create policy preventivi_insert on public.preventivi for insert to authenticated with check ((select permesso('pratiche')) >= 2);
create policy preventivi_update on public.preventivi for update to authenticated using ((select permesso('pratiche')) >= 2) with check ((select permesso('pratiche')) >= 2);
create policy preventivi_delete on public.preventivi for delete to authenticated using ((select permesso('pratiche')) >= 3);

create policy preventivi_voci_select on public.preventivi_voci for select to authenticated using ((select permesso('pratiche')) >= 1);
create policy preventivi_voci_insert on public.preventivi_voci for insert to authenticated with check ((select permesso('pratiche')) >= 2);
create policy preventivi_voci_update on public.preventivi_voci for update to authenticated using ((select permesso('pratiche')) >= 2) with check ((select permesso('pratiche')) >= 2);
create policy preventivi_voci_delete on public.preventivi_voci for delete to authenticated using ((select permesso('pratiche')) >= 2);

create policy preventivi_rate_select on public.preventivi_rate for select to authenticated using ((select permesso('pratiche')) >= 1);
create policy preventivi_rate_insert on public.preventivi_rate for insert to authenticated with check ((select permesso('pratiche')) >= 2);
create policy preventivi_rate_update on public.preventivi_rate for update to authenticated using ((select permesso('pratiche')) >= 2) with check ((select permesso('pratiche')) >= 2);
create policy preventivi_rate_delete on public.preventivi_rate for delete to authenticated using ((select permesso('pratiche')) >= 2);

-- Commesse: visibili secondo l'ambito (tutte o solo quelle del proprio team)
create policy commesse_select on public.commesse for select to authenticated using (vede_commessa(id));
create policy commesse_insert on public.commesse for insert to authenticated with check ((select permesso('commesse')) >= 2);
create policy commesse_update on public.commesse for update to authenticated using ((select permesso('commesse')) >= 2 and vede_commessa(id)) with check ((select permesso('commesse')) >= 2);
create policy commesse_delete on public.commesse for delete to authenticated using ((select permesso('commesse')) >= 3 and vede_commessa(id));

-- Parti della commessa: ciascuna con il proprio livello; eliminare richiede "Completo" sulle commesse
create policy commesse_fasi_select on public.commesse_fasi for select to authenticated using ((select permesso('c.fasi')) >= 1 and vede_commessa(commessa_id));
create policy commesse_fasi_insert on public.commesse_fasi for insert to authenticated with check ((select permesso('c.fasi')) >= 2 and vede_commessa(commessa_id));
create policy commesse_fasi_update on public.commesse_fasi for update to authenticated using ((select permesso('c.fasi')) >= 2 and vede_commessa(commessa_id)) with check ((select permesso('c.fasi')) >= 2);
create policy commesse_fasi_delete on public.commesse_fasi for delete to authenticated using ((select permesso('c.fasi')) >= 2 and (select permesso('commesse')) >= 3 and vede_commessa(commessa_id));

create policy commesse_team_select on public.commesse_team for select to authenticated using ((select permesso('commesse')) >= 1);
create policy commesse_team_insert on public.commesse_team for insert to authenticated with check ((select permesso('c.team')) >= 2 and vede_commessa(commessa_id));
create policy commesse_team_update on public.commesse_team for update to authenticated using ((select permesso('c.team')) >= 2 and vede_commessa(commessa_id)) with check ((select permesso('c.team')) >= 2);
create policy commesse_team_delete on public.commesse_team for delete to authenticated using ((select permesso('c.team')) >= 2 and vede_commessa(commessa_id));

create policy commesse_diario_select on public.commesse_diario for select to authenticated using ((select permesso('c.diario')) >= 1 and vede_commessa(commessa_id));
create policy commesse_diario_insert on public.commesse_diario for insert to authenticated with check ((select permesso('c.diario')) >= 2 and vede_commessa(commessa_id));
create policy commesse_diario_update on public.commesse_diario for update to authenticated using ((select permesso('c.diario')) >= 2 and vede_commessa(commessa_id)) with check ((select permesso('c.diario')) >= 2);
create policy commesse_diario_delete on public.commesse_diario for delete to authenticated using ((select permesso('c.diario')) >= 2 and (select permesso('commesse')) >= 3 and vede_commessa(commessa_id));

-- Documenti: quelli di una commessa seguono "Allegati", gli altri l'area Documenti
create policy documenti_select on public.documenti for select to authenticated using (
  case when commessa_id is null then (select permesso('documenti')) >= 1
       else (select permesso('c.allegati')) >= 1 and vede_commessa(commessa_id) end);
create policy documenti_insert on public.documenti for insert to authenticated with check (
  case when commessa_id is null then (select permesso('documenti')) >= 2
       else (select permesso('c.allegati')) >= 2 and vede_commessa(commessa_id) end);
create policy documenti_update on public.documenti for update to authenticated using (
  case when commessa_id is null then (select permesso('documenti')) >= 2
       else (select permesso('c.allegati')) >= 2 and vede_commessa(commessa_id) end);
create policy documenti_delete on public.documenti for delete to authenticated using (
  (select permesso('documenti')) >= 3 or (commessa_id is not null and (select permesso('commesse')) >= 3 and vede_commessa(commessa_id)));

-- File nello spazio "documenti": le foto profilo restano di ciascuno, il resto segue i permessi
drop policy if exists documenti_select on storage.objects;
drop policy if exists documenti_insert on storage.objects;
drop policy if exists documenti_update on storage.objects;
drop policy if exists documenti_delete on storage.objects;
create policy documenti_select on storage.objects for select to authenticated using (
  bucket_id = 'documenti' and (
    name like 'profili/%' and is_membro_studio()
    or (select permesso('documenti')) >= 1 or (select permesso('c.allegati')) >= 1));
create policy documenti_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'documenti' and (
    name like 'profili/' || auth.uid()::text || '/%'
    or (select permesso('documenti')) >= 2 or (select permesso('c.allegati')) >= 2));
create policy documenti_update on storage.objects for update to authenticated using (
  bucket_id = 'documenti' and (
    name like 'profili/' || auth.uid()::text || '/%'
    or (select permesso('documenti')) >= 2 or (select permesso('c.allegati')) >= 2));
create policy documenti_delete on storage.objects for delete to authenticated using (
  bucket_id = 'documenti' and (
    name like 'profili/' || auth.uid()::text || '/%'
    or (select permesso('documenti')) >= 3 or (select permesso('commesse')) >= 3));

-- Logo dello studio: chi può modificare le impostazioni dello studio
drop policy if exists studio_logo_insert on storage.objects;
drop policy if exists studio_logo_update on storage.objects;
drop policy if exists studio_logo_delete on storage.objects;
create policy studio_logo_insert on storage.objects for insert to authenticated with check (bucket_id = 'studio' and (select permesso('impostazioni')) >= 2);
create policy studio_logo_update on storage.objects for update to authenticated using (bucket_id = 'studio' and (select permesso('impostazioni')) >= 2);
create policy studio_logo_delete on storage.objects for delete to authenticated using (bucket_id = 'studio' and (select permesso('impostazioni')) >= 2);

-- Verifica: deve restituire 40 righe di permessi e 3 ruoli ammessi
select (select count(*) from public.permessi_ruolo) as permessi_di_partenza,
       (select pg_get_constraintdef(oid) from pg_constraint where conname = 'profili_ruolo_check') as ruoli_ammessi;
