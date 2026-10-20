-- Modifica di preventivi e pre-fattibilità esistenti (Studio Parrinello)
-- Da incollare ed eseguire una volta nel SQL Editor di Supabase.

create or replace function public.aggiorna_preventivo(p_id uuid, dati jsonb)
returns uuid language plpgsql set search_path to 'public' as $$
declare p jsonb := dati->'preventivo'; v jsonb; n int := 0; v_stato text;
begin
  if not is_membro_studio() then raise exception 'Utente non autorizzato'; end if;
  select stato into v_stato from preventivi where id = p_id for update;
  if v_stato is null then raise exception 'Preventivo non trovato'; end if;
  if v_stato not in ('bozza','inviato','rifiutato') then
    raise exception 'Un preventivo accettato o superato non si modifica';
  end if;
  update preventivi set
    titolo = p->>'titolo', oggetto = nullif(p->>'oggetto',''),
    cliente_id = _risolvi_cliente(dati), immobile_id = _risolvi_immobile(dati),
    committenza = coalesce(nullif(p->>'committenza',''), 'privata'),
    tipologia_intervento = nullif(p->>'tipologia_intervento',''),
    responsabile_id = nullif(p->>'responsabile_id','')::uuid,
    data_emissione = coalesce(nullif(p->>'data_emissione','')::date, data_emissione),
    validita_giorni = coalesce(nullif(p->>'validita_giorni','')::int, 30),
    metodo_calcolo = coalesce(nullif(p->>'metodo_calcolo',''), 'a_corpo'),
    importo_lavori = nullif(p->>'importo_lavori','')::numeric,
    percentuale_onorario = nullif(p->>'percentuale_onorario','')::numeric,
    spese_pct = coalesce(nullif(p->>'spese_pct','')::numeric, 0),
    sconto_pct = coalesce(nullif(p->>'sconto_pct','')::numeric, 0),
    cassa_pct = coalesce(nullif(p->>'cassa_pct','')::numeric, 4),
    iva_pct = coalesce(nullif(p->>'iva_pct','')::numeric, 22),
    ritenuta_pct = coalesce(nullif(p->>'ritenuta_pct','')::numeric, 0),
    imponibile = nullif(p->>'imponibile','')::numeric,
    totale_cassa = nullif(p->>'totale_cassa','')::numeric,
    totale_iva = nullif(p->>'totale_iva','')::numeric,
    totale_documento = nullif(p->>'totale_documento','')::numeric,
    condizioni_pagamento = nullif(p->>'condizioni_pagamento',''),
    note = nullif(p->>'note','')
  where id = p_id;

  delete from preventivi_voci where preventivo_id = p_id;
  for v in select * from jsonb_array_elements(coalesce(dati->'voci', '[]'::jsonb)) loop
    n := n + 1;
    insert into preventivi_voci (preventivo_id, fase_catalogo_id, ordine, descrizione, quantita, unita_misura,
                                 prezzo_unitario, ore_stimate, opzionale)
    values (p_id, nullif(v->>'fase_catalogo_id','')::uuid, n * 10, v->>'descrizione',
            coalesce(nullif(v->>'quantita','')::numeric, 1), coalesce(nullif(v->>'unita_misura',''), 'a corpo'),
            coalesce(nullif(v->>'prezzo_unitario','')::numeric, 0), nullif(v->>'ore_stimate','')::numeric,
            coalesce((v->>'opzionale')::boolean, false));
  end loop;
  return p_id;
end $$;

create or replace function public.aggiorna_prefattibilita(p_id uuid, dati jsonb)
returns uuid language plpgsql set search_path to 'public' as $$
declare a jsonb := dati->'analisi';
begin
  if not is_membro_studio() then raise exception 'Utente non autorizzato'; end if;
  if not exists (select 1 from prefattibilita where id = p_id) then raise exception 'Pre-fattibilità non trovata'; end if;
  update prefattibilita set
    titolo = a->>'titolo', cliente_id = _risolvi_cliente(dati), immobile_id = _risolvi_immobile(dati),
    committenza = coalesce(nullif(a->>'committenza',''), 'privata'),
    tipologia_intervento = nullif(a->>'tipologia_intervento',''),
    responsabile_id = nullif(a->>'responsabile_id','')::uuid,
    strumento_urbanistico = nullif(a->>'strumento_urbanistico',''),
    zona_urbanistica = nullif(a->>'zona_urbanistica',''),
    indici_parametri = nullif(a->>'indici_parametri',''),
    vincoli = coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(a->'vincoli','[]'::jsonb)) x), '{}'),
    vincoli_note = nullif(a->>'vincoli_note',''),
    accesso_atti_richiesto = coalesce((a->>'accesso_atti_richiesto')::boolean, false),
    stato_legittimo_verificato = coalesce((a->>'stato_legittimo_verificato')::boolean, false),
    difformita_rilevate = coalesce((a->>'difformita_rilevate')::boolean, false),
    difformita_descrizione = nullif(a->>'difformita_descrizione',''),
    sanatoria_necessaria = coalesce((a->>'sanatoria_necessaria')::boolean, false),
    titolo_edilizio = nullif(a->>'titolo_edilizio',''),
    pareri_enti = coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(a->'pareri_enti','[]'::jsonb)) x), '{}'),
    superficie_intervento_mq = nullif(a->>'superficie_intervento_mq','')::numeric,
    costo_parametrico_mq = nullif(a->>'costo_parametrico_mq','')::numeric,
    durata_stimata_mesi = nullif(a->>'durata_stimata_mesi','')::int,
    esito = nullif(a->>'esito',''), sintesi = nullif(a->>'sintesi',''),
    onorario = nullif(a->>'onorario','')::numeric,
    data_redazione = coalesce(nullif(a->>'data_redazione','')::date, data_redazione)
  where id = p_id;
  return p_id;
end $$;
