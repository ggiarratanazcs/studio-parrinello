-- Configurazione generale dello studio (nome, claim, logo, dati per i documenti).
-- Da eseguire una volta nel SQL Editor di Supabase, progetto "commesse".
-- Non modifica né cancella dati esistenti; si può rieseguire senza danni.

-- Tabella con una sola riga (id = 1), già compilata con i valori di oggi
create table if not exists public.studio (
  id smallint primary key default 1 check (id = 1),
  nome text not null,
  claim text,
  logo_path text,
  indirizzo text,
  telefono text,
  email text,
  sito text,
  partita_iva text,
  updated_at timestamptz not null default now()
);

insert into public.studio (id, nome, claim, indirizzo, telefono, email, sito)
values (1, 'Studio Parrinello', 'Architettura e design', 'Via Temistocle 2, 96100 Siracusa', '+39 334 748 7963', 'info@studioparrinello.com', 'www.studioparrinello.com')
on conflict (id) do nothing;

alter table public.studio enable row level security;

-- Nome, claim e logo compaiono anche nella pagina di accesso: lettura per tutti
drop policy if exists studio_select on public.studio;
create policy studio_select on public.studio for select to anon, authenticated using (true);

-- Modifica riservata al titolare
drop policy if exists studio_update on public.studio;
create policy studio_update on public.studio for update to authenticated
  using ((select public.ha_ruolo(array['titolare'])))
  with check ((select public.ha_ruolo(array['titolare'])));

drop trigger if exists trg_studio_upd on public.studio;
create trigger trg_studio_upd before update on public.studio
  for each row execute function public.set_updated_at();

-- Spazio pubblico per il logo (separato dai documenti, che restano privati)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studio', 'studio', true, 1048576, array['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists studio_logo_insert on storage.objects;
create policy studio_logo_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'studio' and (select public.ha_ruolo(array['titolare'])));
drop policy if exists studio_logo_update on storage.objects;
create policy studio_logo_update on storage.objects for update to authenticated
  using (bucket_id = 'studio' and (select public.ha_ruolo(array['titolare'])));
drop policy if exists studio_logo_delete on storage.objects;
create policy studio_logo_delete on storage.objects for delete to authenticated
  using (bucket_id = 'studio' and (select public.ha_ruolo(array['titolare'])));
