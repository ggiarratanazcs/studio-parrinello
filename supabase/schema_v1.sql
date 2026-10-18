-- =====================================================================
--  STUDIO PARRINELLO — Gestionale Commesse
--  Schema database v1 (MVP) — APPLICATO come migrazione "schema_v1_mvp"
--  Ruoli: i due titolari hanno ruolo 'titolare' e qualifica 'Architetto'
--  Perimetro: anagrafiche, immobili/catasto, commesse con fasi,
--             pre-fattibilità, preventivi versionati, documenti/foto
--  Fuori MVP (predisposto ma non creato): timesheet, pratiche con
--             scadenzario, elaborati con revisioni, parcelle/incassi
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. UTILITY
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 1. PROFILI UTENTE (collaboratori dello studio)
-- ---------------------------------------------------------------------
create table public.profili (
  id              uuid primary key references auth.users(id) on delete cascade,
  nome            text not null,
  cognome         text not null,
  email           text not null,
  telefono        text,
  qualifica       text,                       -- es. "Architetto", "Geometra", "Ing."
  ruolo           text not null default 'collaboratore'
                  check (ruolo in ('titolare','architetto','collaboratore','amministrazione')),
  iniziali        text,                       -- per avatar compatti su mobile
  colore          text default '#8A6F4E',     -- colore avatar
  attivo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_profili_upd before update on public.profili
  for each row execute function public.set_updated_at();

-- Dati economici del personale: tabella separata, visibile solo al titolare
create table public.profili_tariffe (
  profilo_id      uuid primary key references public.profili(id) on delete cascade,
  costo_orario    numeric(10,2),              -- costo interno (per redditività)
  tariffa_oraria  numeric(10,2),              -- tariffa di vendita (preventivi a ore)
  updated_at      timestamptz not null default now()
);
create trigger trg_profili_tariffe_upd before update on public.profili_tariffe
  for each row execute function public.set_updated_at();

-- Creazione automatica del profilo alla registrazione/invito
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profili (id, nome, cognome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    coalesce(new.raw_user_meta_data->>'cognome', ''),
    new.email
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper per le policy RLS
create or replace function public.is_membro_studio()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profili where id = auth.uid() and attivo);
$$;

create or replace function public.ha_ruolo(ruoli text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profili
                 where id = auth.uid() and attivo and ruolo = any(ruoli));
$$;

-- ---------------------------------------------------------------------
-- 2. CLIENTI / COMMITTENTI
-- ---------------------------------------------------------------------
create table public.clienti (
  id                  uuid primary key default gen_random_uuid(),
  tipo                text not null
                      check (tipo in ('persona_fisica','azienda','ente_pubblico')),
  -- persona fisica
  nome                text,
  cognome             text,
  -- azienda / ente
  ragione_sociale     text,
  denominazione       text generated always as (
                        coalesce(nullif(ragione_sociale,''), trim(coalesce(cognome,'') || ' ' || coalesce(nome,'')))
                      ) stored,
  codice_fiscale      text,
  partita_iva         text,
  -- fatturazione elettronica
  codice_sdi          text,                   -- codice destinatario (privati/aziende)
  codice_ipa          text,                   -- codice univoco ufficio (enti pubblici)
  pec                 text,
  -- recapiti
  email               text,
  telefono            text,
  indirizzo           text,
  cap                 text,
  comune              text,
  provincia           text,
  fonte               text,                   -- es. passaparola, sito, gara, Instagram
  note                text,
  created_by          uuid references public.profili(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint clienti_nome_ck check (
    (tipo = 'persona_fisica' and cognome is not null)
    or (tipo <> 'persona_fisica' and ragione_sociale is not null)
  )
);
create index idx_clienti_denominazione on public.clienti (denominazione);
create trigger trg_clienti_upd before update on public.clienti
  for each row execute function public.set_updated_at();

-- Referenti (es. RUP dell'ente, amministratore di condominio, impresa)
create table public.clienti_referenti (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.clienti(id) on delete cascade,
  nome            text not null,
  ruolo           text,                       -- es. "RUP", "Ufficio tecnico", "Coniuge"
  email           text,
  telefono        text,
  principale      boolean not null default false,
  note            text,
  created_at      timestamptz not null default now()
);
create index idx_referenti_cliente on public.clienti_referenti (cliente_id);

-- ---------------------------------------------------------------------
-- 3. IMMOBILI E DATI CATASTALI
-- ---------------------------------------------------------------------
create table public.immobili (
  id                  uuid primary key default gen_random_uuid(),
  denominazione       text,                   -- es. "Villa M", "Palazzina Via Napoli"
  indirizzo           text not null,
  cap                 text,
  comune              text not null,
  provincia           text,
  latitudine          numeric(9,6),
  longitudine         numeric(9,6),
  destinazione_uso    text,                   -- residenziale, ricettivo, industriale...
  superficie_mq       numeric(10,2),
  anno_costruzione    int,
  -- inquadramento urbanistico
  strumento_urbanistico text,                 -- es. "PRG Siracusa 2007"
  zona_urbanistica    text,                   -- es. "B2", "Centro storico A"
  vincoli             text[] default '{}',    -- paesaggistico, idrogeologico, storico...
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger trg_immobili_upd before update on public.immobili
  for each row execute function public.set_updated_at();

-- Un immobile può avere più identificativi catastali
create table public.immobili_catasto (
  id                  uuid primary key default gen_random_uuid(),
  immobile_id         uuid not null references public.immobili(id) on delete cascade,
  catasto             text not null default 'fabbricati'
                      check (catasto in ('fabbricati','terreni')),
  sezione             text,
  foglio              text not null,
  particella          text not null,
  subalterno          text,
  categoria           text,                   -- es. A/2, C/6
  classe              text,
  consistenza         text,
  rendita             numeric(12,2),
  intestatari         text,
  note                text
);
create index idx_catasto_immobile on public.immobili_catasto (immobile_id);

-- ---------------------------------------------------------------------
-- 4. CATALOGO FASI PRESTAZIONALI (template riutilizzabile)
-- ---------------------------------------------------------------------
create table public.fasi_catalogo (
  id              uuid primary key default gen_random_uuid(),
  codice          text not null unique,       -- es. "RIL", "PFTE", "ESE", "DL"
  nome            text not null,
  descrizione     text,
  ambito          text not null default 'entrambi'
                  check (ambito in ('privato','pubblico','entrambi')),
  ordine          int not null default 0,
  attiva          boolean not null default true
);

insert into public.fasi_catalogo (codice, nome, ambito, ordine) values
  ('PREF', 'Pre-fattibilità e analisi urbanistica', 'entrambi', 10),
  ('RIL',  'Rilievo (tradizionale / 3D / drone)',  'entrambi', 20),
  ('CONC', 'Progetto preliminare / Concept',         'privato',  30),
  ('PFTE', 'Progetto di fattibilità tecnico-economica', 'pubblico', 31),
  ('DEF',  'Progetto definitivo',                    'privato',  40),
  ('AUT',  'Pratiche autorizzative (CILA/SCIA/PdC/Paesaggistica)', 'entrambi', 50),
  ('ESE',  'Progetto esecutivo',                     'entrambi', 60),
  ('STR',  'Progettazione strutturale',              'entrambi', 61),
  ('IMP',  'Progettazione impiantistica / termotecnica', 'entrambi', 62),
  ('BIM',  'Modellazione BIM',                       'entrambi', 63),
  ('REN',  'Render e visualizzazioni',               'entrambi', 64),
  ('ENE',  'Efficientamento energetico / APE',       'entrambi', 65),
  ('CSP',  'Coordinamento sicurezza in progettazione', 'entrambi', 70),
  ('DL',   'Direzione lavori',                       'entrambi', 80),
  ('CSE',  'Coordinamento sicurezza in esecuzione',  'entrambi', 81),
  ('CONT', 'Contabilità lavori',                     'entrambi', 82),
  ('COLL', 'Collaudo / Verifica di conformità',      'pubblico', 90),
  ('FINE', 'Fine lavori, catasto (DOCFA) e agibilità (SCA)', 'entrambi', 95),
  ('INT',  'Interior design e arredo',               'privato',  66);

-- ---------------------------------------------------------------------
-- 5. COMMESSE
-- ---------------------------------------------------------------------
create table public.commesse_contatori (
  anno            int primary key,
  ultimo          int not null default 0
);

create table public.commesse (
  id                    uuid primary key default gen_random_uuid(),
  codice                text unique,          -- generato: "2026-014"
  titolo                text not null,        -- es. "Ristrutturazione Villa M"
  cliente_id            uuid not null references public.clienti(id),
  immobile_id           uuid references public.immobili(id),
  committenza           text not null default 'privata'
                        check (committenza in ('privata','pubblica')),
  tipologia_intervento  text
                        check (tipologia_intervento in (
                          'nuova_costruzione','ristrutturazione','restauro',
                          'manutenzione_straordinaria','interni_design','urbano',
                          'industriale','efficientamento','altro')),
  ambito                text
                        check (ambito in ('residenziale','ricettivo','commerciale',
                                          'industriale','urbano','pubblico','altro')),
  stato                 text not null default 'contatto'
                        check (stato in ('contatto','prefattibilita','preventivo',
                                         'attiva','sospesa','conclusa','persa','annullata')),
  descrizione           text,
  responsabile_id       uuid references public.profili(id),
  -- dati economici di sintesi
  importo_lavori_stimato numeric(14,2),
  onorario_concordato    numeric(14,2),       -- valorizzato all'accettazione del preventivo
  -- committenza pubblica
  cig                   text,
  cup                   text,
  rup_nome              text,
  determina_incarico    text,                 -- estremi atto di affidamento
  -- date
  data_apertura         date not null default current_date,
  data_incarico         date,
  data_fine_prevista    date,
  data_chiusura         date,
  -- presentazione
  copertina_path        text,                 -- immagine di copertina (storage)
  tag                   text[] default '{}',
  created_by            uuid references public.profili(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index idx_commesse_cliente on public.commesse (cliente_id);
create index idx_commesse_stato   on public.commesse (stato);
create trigger trg_commesse_upd before update on public.commesse
  for each row execute function public.set_updated_at();

-- Codice commessa progressivo per anno: AAAA-NNN
create or replace function public.genera_codice_commessa()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_anno int := extract(year from coalesce(new.data_apertura, current_date));
  v_num  int;
begin
  if new.codice is null then
    insert into public.commesse_contatori (anno, ultimo) values (v_anno, 1)
      on conflict (anno) do update set ultimo = public.commesse_contatori.ultimo + 1
      returning ultimo into v_num;
    new.codice := v_anno || '-' || lpad(v_num::text, 3, '0');
  end if;
  return new;
end $$;
create trigger trg_commesse_codice before insert on public.commesse
  for each row execute function public.genera_codice_commessa();

-- Team di commessa
create table public.commesse_team (
  commessa_id     uuid references public.commesse(id) on delete cascade,
  profilo_id      uuid references public.profili(id) on delete cascade,
  ruolo_commessa  text,                       -- es. "Progettista", "DL", "Disegnatore"
  primary key (commessa_id, profilo_id)
);

-- Fasi della singola commessa (istanziate dal catalogo o personalizzate)
create table public.commesse_fasi (
  id                uuid primary key default gen_random_uuid(),
  commessa_id       uuid not null references public.commesse(id) on delete cascade,
  fase_catalogo_id  uuid references public.fasi_catalogo(id),
  codice            text,
  nome              text not null,
  ordine            int not null default 0,
  stato             text not null default 'da_avviare'
                    check (stato in ('da_avviare','in_corso','in_revisione',
                                     'completata','sospesa','annullata')),
  avanzamento_pct   int not null default 0 check (avanzamento_pct between 0 and 100),
  onorario          numeric(14,2),            -- quota di onorario della fase
  ore_budget        numeric(8,2),             -- ore stimate (base per redditività)
  responsabile_id   uuid references public.profili(id),
  data_inizio_prev  date,
  data_fine_prev    date,
  data_inizio_eff   date,
  data_fine_eff     date,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_fasi_commessa on public.commesse_fasi (commessa_id);
create trigger trg_fasi_upd before update on public.commesse_fasi
  for each row execute function public.set_updated_at();

-- Diario di commessa (note, telefonate, decisioni, sopralluoghi)
create table public.commesse_diario (
  id              uuid primary key default gen_random_uuid(),
  commessa_id     uuid not null references public.commesse(id) on delete cascade,
  tipo            text not null default 'nota'
                  check (tipo in ('nota','telefonata','riunione','sopralluogo',
                                  'email','decisione')),
  testo           text not null,
  data_evento     timestamptz not null default now(),
  autore_id       uuid references public.profili(id) default auth.uid(),
  created_at      timestamptz not null default now()
);
create index idx_diario_commessa on public.commesse_diario (commessa_id, data_evento desc);

-- ---------------------------------------------------------------------
-- 6. PRE-FATTIBILITÀ
-- ---------------------------------------------------------------------
create table public.prefattibilita (
  id                        uuid primary key default gen_random_uuid(),
  commessa_id               uuid not null references public.commesse(id) on delete cascade,
  versione                  int not null default 1,
  -- analisi urbanistica
  strumento_urbanistico     text,
  zona_urbanistica          text,
  indici_parametri          text,             -- volumetria, rapporto copertura, altezze...
  vincoli                   text[] default '{}',
  vincoli_note              text,
  -- conformità edilizia
  accesso_atti_richiesto    boolean default false,
  accesso_atti_data         date,
  stato_legittimo_verificato boolean default false,
  difformita_rilevate       boolean default false,
  difformita_descrizione    text,
  sanatoria_necessaria      boolean default false,
  -- titolo edilizio ipotizzato
  titolo_edilizio           text
                            check (titolo_edilizio in ('edilizia_libera','CILA','CILAS',
                                   'SCIA','SCIA_alternativa_PdC','PdC',
                                   'autorizzazione_paesaggistica','altro')),
  pareri_enti               text[] default '{}', -- Soprintendenza, Genio Civile, ASP, VVF...
  -- stima economica parametrica
  superficie_intervento_mq  numeric(10,2),
  costo_parametrico_mq      numeric(10,2),
  costo_opere_stimato       numeric(14,2) generated always as
                            (superficie_intervento_mq * costo_parametrico_mq) stored,
  durata_stimata_mesi       int,
  -- esito
  esito                     text
                            check (esito in ('fattibile','fattibile_con_condizioni',
                                             'non_fattibile','da_approfondire')),
  sintesi                   text,
  redatta_da                uuid references public.profili(id),
  data_redazione            date default current_date,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (commessa_id, versione)
);
create trigger trg_pref_upd before update on public.prefattibilita
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 7. PREVENTIVI (versionati) E VOCI
-- ---------------------------------------------------------------------
create table public.preventivi (
  id                  uuid primary key default gen_random_uuid(),
  commessa_id         uuid not null references public.commesse(id) on delete cascade,
  numero              text,                   -- es. "P-2026-014"
  versione            int not null default 1,
  oggetto             text,
  data_emissione      date not null default current_date,
  validita_giorni     int not null default 30,
  stato               text not null default 'bozza'
                      check (stato in ('bozza','inviato','accettato','rifiutato','superato')),
  metodo_calcolo      text not null default 'a_corpo'
                      check (metodo_calcolo in ('a_corpo','percentuale_lavori',
                                                'a_ore','dm_17_06_2016','misto')),
  importo_lavori      numeric(14,2),          -- base per calcolo a percentuale / DM
  percentuale_onorario numeric(5,2),
  spese_pct           numeric(5,2) default 0, -- spese e oneri accessori
  sconto_pct          numeric(5,2) default 0,
  cassa_pct           numeric(5,2) not null default 4,    -- Inarcassa
  iva_pct             numeric(5,2) not null default 22,
  ritenuta_pct        numeric(5,2) default 0,             -- 20% se committente sostituto d'imposta
  -- totali (aggiornati dall'app / da trigger futuro)
  imponibile          numeric(14,2),
  totale_cassa        numeric(14,2),
  totale_iva          numeric(14,2),
  totale_documento    numeric(14,2),
  condizioni_pagamento text,                  -- es. 30% incarico, 40% deposito, 30% fine lavori
  note                text,
  data_invio          date,
  data_esito          date,
  created_by          uuid references public.profili(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (commessa_id, versione)
);
create index idx_preventivi_commessa on public.preventivi (commessa_id);
create trigger trg_preventivi_upd before update on public.preventivi
  for each row execute function public.set_updated_at();

create table public.preventivi_voci (
  id                uuid primary key default gen_random_uuid(),
  preventivo_id     uuid not null references public.preventivi(id) on delete cascade,
  fase_catalogo_id  uuid references public.fasi_catalogo(id), -- lega la voce a una fase
  ordine            int not null default 0,
  descrizione       text not null,
  quantita          numeric(10,2) not null default 1,
  unita_misura      text default 'a corpo',   -- a corpo, ore, mq, cad
  prezzo_unitario   numeric(14,2) not null default 0,
  importo           numeric(14,2) generated always as (quantita * prezzo_unitario) stored,
  ore_stimate       numeric(8,2),             -- alimenta il budget ore della fase
  opzionale         boolean not null default false
);
create index idx_voci_preventivo on public.preventivi_voci (preventivo_id);

-- Rate di pagamento previste (milestone)
create table public.preventivi_rate (
  id              uuid primary key default gen_random_uuid(),
  preventivo_id   uuid not null references public.preventivi(id) on delete cascade,
  ordine          int not null default 0,
  descrizione     text not null,              -- es. "Al deposito del titolo edilizio"
  percentuale     numeric(5,2),
  importo         numeric(14,2)
);

-- ---------------------------------------------------------------------
-- 8. DOCUMENTI, ALLEGATI E FOTO
-- ---------------------------------------------------------------------
create table public.documenti (
  id              uuid primary key default gen_random_uuid(),
  commessa_id     uuid not null references public.commesse(id) on delete cascade,
  fase_id         uuid references public.commesse_fasi(id) on delete set null,
  categoria       text not null default 'altro'
                  check (categoria in ('rilievo','foto_sopralluogo','elaborato_grafico',
                                       'relazione','pratica_edilizia','catastale',
                                       'contratto_incarico','preventivo','corrispondenza',
                                       'render','computo','altro')),
  titolo          text not null,
  descrizione     text,
  storage_path    text not null,              -- percorso nel bucket "documenti"
  nome_file       text not null,
  mime_type       text,
  dimensione_byte bigint,
  -- metadati foto da cantiere (mobile)
  scattata_il     timestamptz,
  latitudine      numeric(9,6),
  longitudine     numeric(9,6),
  tag             text[] default '{}',
  caricato_da     uuid references public.profili(id) default auth.uid(),
  created_at      timestamptz not null default now()
);
create index idx_documenti_commessa on public.documenti (commessa_id, categoria);

-- ---------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY
--    Regola base: tutti i membri attivi dello studio leggono e scrivono.
--    Cancellazioni: solo titolare e architetti.
--    Tariffe personale: solo titolare.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'clienti','clienti_referenti','immobili','immobili_catasto',
    'commesse','commesse_team','commesse_fasi','commesse_diario',
    'prefattibilita','preventivi','preventivi_voci','preventivi_rate','documenti'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s_select" on public.%1$I for select to authenticated using (public.is_membro_studio())', t);
    execute format('create policy "%1$s_insert" on public.%1$I for insert to authenticated with check (public.is_membro_studio())', t);
    execute format('create policy "%1$s_update" on public.%1$I for update to authenticated using (public.is_membro_studio()) with check (public.is_membro_studio())', t);
    execute format('create policy "%1$s_delete" on public.%1$I for delete to authenticated using (public.ha_ruolo(array[''titolare'',''architetto'']))', t);
  end loop;
end $$;

-- Profili: tutti vedono i colleghi; ognuno modifica il proprio; il titolare gestisce tutti
alter table public.profili enable row level security;
create policy profili_select on public.profili for select to authenticated
  using (public.is_membro_studio());
create policy profili_update_self on public.profili for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and ruolo = (select ruolo from public.profili where id = auth.uid()));
create policy profili_update_titolare on public.profili for update to authenticated
  using (public.ha_ruolo(array['titolare']));

alter table public.profili_tariffe enable row level security;
create policy tariffe_titolare on public.profili_tariffe for all to authenticated
  using (public.ha_ruolo(array['titolare'])) with check (public.ha_ruolo(array['titolare']));

-- Catalogo fasi: tutti leggono, solo il titolare modifica
alter table public.fasi_catalogo enable row level security;
create policy fasi_cat_select on public.fasi_catalogo for select to authenticated
  using (public.is_membro_studio());
create policy fasi_cat_write on public.fasi_catalogo for all to authenticated
  using (public.ha_ruolo(array['titolare'])) with check (public.ha_ruolo(array['titolare']));

alter table public.commesse_contatori enable row level security;
-- (nessuna policy: accessibile solo tramite il trigger security definer)

-- ---------------------------------------------------------------------
-- 10. STORAGE — bucket privato per documenti e foto
--     Struttura percorsi: {commessa_id}/{categoria}/{nome_file}
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('documenti', 'documenti', false, 104857600)   -- 100 MB per file
on conflict (id) do nothing;

create policy "documenti_select" on storage.objects for select to authenticated
  using (bucket_id = 'documenti' and public.is_membro_studio());
create policy "documenti_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'documenti' and public.is_membro_studio());
create policy "documenti_update" on storage.objects for update to authenticated
  using (bucket_id = 'documenti' and public.is_membro_studio());
create policy "documenti_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documenti' and public.ha_ruolo(array['titolare','architetto']));

-- ---------------------------------------------------------------------
-- 11. VISTA DI SINTESI COMMESSE (per dashboard e lista)
-- ---------------------------------------------------------------------
create or replace view public.v_commesse_sintesi
with (security_invoker = true) as
select
  c.id, c.codice, c.titolo, c.stato, c.committenza, c.tipologia_intervento,
  c.data_apertura, c.data_fine_prevista, c.onorario_concordato,
  cl.denominazione as cliente,
  i.comune, i.indirizzo,
  p.nome || ' ' || p.cognome as responsabile,
  count(f.id)                                          as fasi_totali,
  count(f.id) filter (where f.stato = 'completata')    as fasi_completate,
  coalesce(round(avg(f.avanzamento_pct)), 0)           as avanzamento_medio,
  coalesce(sum(f.ore_budget), 0)                       as ore_budget_totali
from public.commesse c
join public.clienti cl on cl.id = c.cliente_id
left join public.immobili i on i.id = c.immobile_id
left join public.profili p on p.id = c.responsabile_id
left join public.commesse_fasi f on f.commessa_id = c.id
group by c.id, cl.denominazione, i.comune, i.indirizzo, p.nome, p.cognome;
