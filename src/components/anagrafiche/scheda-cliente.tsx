"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookUser, Building2, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { Campo, AreaTesto, Messaggio, Segmenti } from "@/components/campo";
import { SceltaLocalita } from "@/components/procedura/scelta-localita";
import { CartaAnagrafica, RigaRegistro, SezioneRegistro, classePillola } from "@/components/anagrafiche/carta";
import { useInFinestra } from "@/components/anagrafiche/finestra-anagrafica";
import { TIPI_CLIENTE } from "@/lib/dominio";
import { cn, formattaEuro } from "@/lib/utils";
import {
  cercaDoppioniCliente,
  eliminaReferente,
  salvaCliente,
  salvaReferente,
  type DatiCliente,
  type DatiReferente,
  type PossibileDoppione,
} from "@/lib/azioni-anagrafiche";
import type { Cliente, ImmobileSeguito, Rapporto, Referente, SchedaClienteDati } from "@/lib/anagrafiche";

const vuoto: DatiCliente = {
  tipo: "persona_fisica",
  nome: "",
  cognome: "",
  ragione_sociale: "",
  codice_fiscale: "",
  partita_iva: "",
  codice_sdi: "",
  codice_ipa: "",
  pec: "",
  email: "",
  telefono: "",
  indirizzo: "",
  cap: "",
  comune: "",
  provincia: "",
  fonte: "",
  note: "",
};

function daCliente(c: Cliente): DatiCliente {
  return {
    tipo: (c.tipo as DatiCliente["tipo"]) ?? "persona_fisica",
    nome: c.nome ?? "",
    cognome: c.cognome ?? "",
    ragione_sociale: c.ragione_sociale ?? "",
    codice_fiscale: c.codice_fiscale ?? "",
    partita_iva: c.partita_iva ?? "",
    codice_sdi: c.codice_sdi ?? "",
    codice_ipa: c.codice_ipa ?? "",
    pec: c.pec ?? "",
    email: c.email ?? "",
    telefono: c.telefono ?? "",
    indirizzo: c.indirizzo ?? "",
    cap: c.cap ?? "",
    comune: c.comune ?? "",
    provincia: c.provincia ?? "",
    fonte: c.fonte ?? "",
    note: c.note ?? "",
  };
}

function iniziali(c: Cliente) {
  const parole =
    c.tipo === "persona_fisica"
      ? [c.nome, c.cognome].filter(Boolean)
      : (c.ragione_sociale ?? "").split(/\s+/).filter((p) => p.length > 2 && !/^(di|del|della|dei|srl|s\.r\.l\.|spa|s\.p\.a\.)$/i.test(p));
  return (parole.slice(0, 2).map((p) => p!.charAt(0)).join("") || "?").toUpperCase();
}

/** Pulsante di chiusura: in finestra torna indietro, a pagina intera porta all'elenco. */
function Chiudi() {
  const inFinestra = useInFinestra();
  const router = useRouter();
  const classe = "grid size-9 place-items-center rounded-full border border-linea-forte text-tenue transition-colors hover:bg-superficie-2 hover:text-inchiostro";
  return inFinestra ? (
    <button type="button" onClick={() => router.back()} className={classe} aria-label="Chiudi" data-suggerimento="Chiudi (Esc)" data-suggerimento-lato="sotto">
      <X className="size-4" strokeWidth={1.8} />
    </button>
  ) : (
    <Link href="/clienti" className={classe} aria-label="Torna ai clienti">
      <X className="size-4" strokeWidth={1.8} />
    </Link>
  );
}

/**
 * Scheda anagrafica del cliente. Senza dati (`scheda` = null) si apre vuota in modifica:
 * è la creazione di un nuovo cliente dal "+".
 */
export function SchedaCliente({ scheda }: { scheda: SchedaClienteDati | null }) {
  const [modifica, setModifica] = useState(!scheda);

  return (
    <CartaAnagrafica linguetta={scheda ? "Anagrafica · Cliente" : "Anagrafica · Nuovo cliente"} icona={BookUser}>
      {modifica ? (
        <ModuloCliente scheda={scheda} onFatto={() => setModifica(false)} />
      ) : scheda ? (
        <VistaCliente scheda={scheda} onModifica={() => setModifica(true)} />
      ) : null}
    </CartaAnagrafica>
  );
}

/* ── Lettura ──────────────────────────────────────────────────────────── */

function VistaCliente({ scheda, onModifica }: { scheda: SchedaClienteDati; onModifica: () => void }) {
  const { cliente: c, referenti, rapporti, immobili, sintesi } = scheda;
  const tipo = TIPI_CLIENTE[c.tipo] ?? c.tipo;
  const ente = c.tipo === "ente_pubblico";
  const localita = [c.cap, c.comune, c.provincia ? `(${c.provincia})` : null].filter(Boolean).join(" ");
  const sede = [c.indirizzo, localita].filter(Boolean).join(", ");

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full border border-linea-forte text-lg tracking-[0.06em] text-inchiostro-2">
            {iniziali(c)}
          </span>
          <div className="min-w-0">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-tenue">
              {tipo} · in archivio dal {new Date(c.created_at).getFullYear()}
            </p>
            <h1 className="titolo-display mt-1 text-[1.6rem] leading-tight md:text-[2rem]">{c.denominazione ?? "Senza nome"}</h1>
            {c.comune ? (
              <p className="mt-1 text-[0.9375rem] text-tenue">
                {c.comune}
                {c.provincia ? ` (${c.provincia})` : ""}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onModifica} className={classePillola}>
            <Pencil className="size-3.5" strokeWidth={1.8} />
            Modifica
          </button>
          <Chiudi />
        </div>
      </header>

      <div className="mt-8 grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          <SezioneRegistro titolo="Dati fiscali">
            <RigaRegistro voce="Codice fiscale" valore={c.codice_fiscale} numerico />
            {c.tipo !== "persona_fisica" ? <RigaRegistro voce="Partita IVA" valore={c.partita_iva} numerico /> : null}
            {ente ? (
              <RigaRegistro voce="Codice univoco ufficio (IPA)" valore={c.codice_ipa} numerico />
            ) : (
              <RigaRegistro voce="Codice destinatario SDI" valore={c.codice_sdi} numerico />
            )}
          </SezioneRegistro>

          <SezioneRegistro titolo="Recapiti">
            <RigaRegistro voce="PEC" valore={c.pec} href={c.pec ? `mailto:${c.pec}` : undefined} />
            <RigaRegistro voce="Email" valore={c.email} href={c.email ? `mailto:${c.email}` : undefined} />
            <RigaRegistro voce="Telefono" valore={c.telefono} href={c.telefono ? `tel:${c.telefono.replace(/\s+/g, "")}` : undefined} numerico />
            <RigaRegistro voce="Sede" valore={sede} />
          </SezioneRegistro>

          <Referenti clienteId={c.id} referenti={referenti} ente={ente} />

          {c.fonte || c.note ? (
            <SezioneRegistro titolo="Note">
              {c.fonte ? <RigaRegistro voce="Come ci ha conosciuti" valore={c.fonte} /> : null}
              {c.note ? <p className="mt-2 whitespace-pre-line text-[0.9375rem] text-inchiostro-2">{c.note}</p> : null}
            </SezioneRegistro>
          ) : null}
        </div>

        <div>
          <SezioneRegistro titolo="Rapporti con lo studio">
            <ElencoRapporti rapporti={rapporti} />
          </SezioneRegistro>

          <SezioneRegistro titolo="Immobili seguiti">
            <ElencoImmobili immobili={immobili} />
          </SezioneRegistro>

          <SezioneRegistro titolo="In sintesi">
            <RigaRegistro voce="Commesse" valore={String(sintesi.commesse)} numerico />
            <RigaRegistro voce="Onorari acquisiti" valore={sintesi.commesse ? formattaEuro(sintesi.onorariAcquisiti) : null} numerico />
            <RigaRegistro
              voce="Preventivi accettati"
              valore={sintesi.preventiviChiusi ? `${sintesi.preventiviAccettati} su ${sintesi.preventiviChiusi}` : null}
              numerico
            />
          </SezioneRegistro>
        </div>
      </div>
    </>
  );
}

function ElencoRapporti({ rapporti }: { rapporti: Rapporto[] }) {
  if (!rapporti.length) {
    return <p className="py-1.5 text-[0.9375rem] text-tenue">Nessuna pratica ancora. Le crei dal “+” in home.</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {rapporti.map((r) => (
        <li key={`${r.tipo}-${r.id}`}>
          <Link
            href={r.href}
            className="flex items-center justify-between gap-3 rounded-piccolo border border-linea px-3 py-2 text-[0.875rem] transition-colors hover:border-linea-forte hover:bg-superficie-2/50"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: r.colore }} />
              <span className="truncate">
                {r.sigla ? <span className="numeri text-tenue">{r.sigla} · </span> : null}
                {r.titolo}
              </span>
            </span>
            <span className="shrink-0 text-[0.8125rem] text-tenue">{r.stato}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ElencoImmobili({ immobili }: { immobili: ImmobileSeguito[] }) {
  if (!immobili.length) return <p className="py-1.5 text-[0.9375rem] text-tenue">Nessun immobile collegato alle sue pratiche.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {immobili.map((i) => (
        <li key={i.id} className="flex items-center gap-2.5 rounded-piccolo border border-linea px-3 py-2 text-[0.875rem]">
          <Building2 aria-hidden className="size-4 shrink-0 text-tenue" strokeWidth={1.7} />
          <span className="min-w-0 truncate">
            {i.nome}
            {i.nome !== i.indirizzo ? <span className="text-tenue"> · {i.indirizzo}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ── Referenti ────────────────────────────────────────────────────────── */

const referenteVuoto: DatiReferente = { nome: "", ruolo: "", email: "", telefono: "", note: "", principale: false };

function Referenti({ clienteId, referenti, ente }: { clienteId: string; referenti: Referente[]; ente: boolean }) {
  const router = useRouter();
  // null = nessun modulo aperto; "nuovo" = aggiunta; id = modifica di quel referente
  const [aperto, setAperto] = useState<string | null>(null);
  const [dati, setDati] = useState<DatiReferente>(referenteVuoto);
  const [errore, setErrore] = useState<string | null>(null);
  const [daEliminare, setDaEliminare] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  function apri(r?: Referente) {
    setErrore(null);
    setDaEliminare(null);
    setDati(r ? { nome: r.nome, ruolo: r.ruolo ?? "", email: r.email ?? "", telefono: r.telefono ?? "", note: r.note ?? "", principale: r.principale } : { ...referenteVuoto, principale: referenti.length === 0 });
    setAperto(r ? r.id : "nuovo");
  }

  function salva() {
    avvia(async () => {
      const esito = await salvaReferente(clienteId, aperto === "nuovo" ? null : aperto, dati);
      if (!esito.ok) return setErrore(esito.errore);
      setAperto(null);
      router.refresh();
    });
  }

  function elimina(id: string) {
    avvia(async () => {
      const esito = await eliminaReferente(id);
      if (!esito.ok) return setErrore(esito.errore);
      setDaEliminare(null);
      router.refresh();
    });
  }

  const set = (campo: keyof Omit<DatiReferente, "principale">) => (e: { target: { value: string } }) => setDati({ ...dati, [campo]: e.target.value });

  const modulo = (
    <div className="mt-2 flex flex-col gap-4 rounded-piccolo border border-linea bg-sfondo/60 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Campo etichetta="Nome e cognome" id="r-nome" obbligatorio value={dati.nome} onChange={set("nome")} autoComplete="off" autoFocus />
        <Campo etichetta="Ruolo" id="r-ruolo" value={dati.ruolo} onChange={set("ruolo")} placeholder={ente ? "RUP" : "Amministratore di condominio"} />
        <Campo etichetta="Email" id="r-email" type="email" value={dati.email} onChange={set("email")} />
        <Campo etichetta="Telefono" id="r-tel" type="tel" value={dati.telefono} onChange={set("telefono")} />
        <div className="md:col-span-2">
          <Campo etichetta="Note" id="r-note" value={dati.note} onChange={set("note")} placeholder="Reperibile al mattino" />
        </div>
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-[0.9375rem]">
        <input type="checkbox" checked={dati.principale} onChange={(e) => setDati({ ...dati, principale: e.target.checked })} className="size-4 accent-[var(--accento)]" />
        Referente principale
      </label>
      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={salva} disabled={inCorso} className={cn(classePillola, "border-inchiostro bg-inchiostro text-superficie hover:bg-inchiostro/90")}>
          {inCorso ? "Salvataggio…" : aperto === "nuovo" ? "Aggiungi referente" : "Salva referente"}
        </button>
        <button type="button" onClick={() => setAperto(null)} disabled={inCorso} className={classePillola}>
          Annulla
        </button>
      </div>
    </div>
  );

  return (
    <SezioneRegistro
      titolo="Referenti"
      azione={
        aperto === null ? (
          <button type="button" onClick={() => apri()} className="inline-flex items-center gap-1 text-[0.8125rem] text-accento hover:underline">
            <Plus className="size-3.5" strokeWidth={2} />
            Aggiungi
          </button>
        ) : null
      }
    >
      {referenti.length === 0 && aperto !== "nuovo" ? (
        <p className="py-1.5 text-[0.9375rem] text-tenue">
          {ente ? "Nessun referente: aggiungi il RUP o l'ufficio di riferimento." : "Nessun referente oltre al cliente."}
        </p>
      ) : null}
      <ul>
        {referenti.map((r) =>
          aperto === r.id ? (
            <li key={r.id}>{modulo}</li>
          ) : (
            <li key={r.id} className="group flex items-start gap-3 border-b border-linea py-2.5 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[0.9375rem]">
                  <span className="font-medium">{r.nome}</span>
                  {r.ruolo ? <span className="text-inchiostro-2">· {r.ruolo}</span> : null}
                  {r.principale ? <Star aria-label="Referente principale" className="size-3.5 fill-current text-[color:var(--stato-preventivo)]" strokeWidth={1.5} /> : null}
                </p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-[0.8125rem] text-tenue">
                  {r.email ? <a href={`mailto:${r.email}`} className="hover:text-accento">{r.email}</a> : null}
                  {r.telefono ? <a href={`tel:${r.telefono.replace(/\s+/g, "")}`} className="numeri hover:text-accento">{r.telefono}</a> : null}
                  {r.note ? <span>{r.note}</span> : null}
                </p>
              </div>
              {daEliminare === r.id ? (
                <span className="flex shrink-0 items-center gap-2 text-[0.8125rem]">
                  Eliminare?
                  <button type="button" onClick={() => elimina(r.id)} disabled={inCorso} className="text-[color:var(--stato-sospesa)] hover:underline">
                    Sì
                  </button>
                  <button type="button" onClick={() => setDaEliminare(null)} className="text-tenue hover:underline">
                    No
                  </button>
                </span>
              ) : aperto === null ? (
                <span className="flex shrink-0 gap-1 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                  <button type="button" onClick={() => apri(r)} className="grid size-8 place-items-center rounded-full text-tenue hover:bg-superficie-2 hover:text-inchiostro" aria-label={`Modifica ${r.nome}`}>
                    <Pencil className="size-3.5" strokeWidth={1.8} />
                  </button>
                  <button type="button" onClick={() => { setErrore(null); setDaEliminare(r.id); }} className="grid size-8 place-items-center rounded-full text-tenue hover:bg-superficie-2 hover:text-[color:var(--stato-sospesa)]" aria-label={`Elimina ${r.nome}`}>
                    <Trash2 className="size-3.5" strokeWidth={1.8} />
                  </button>
                </span>
              ) : null}
            </li>
          ),
        )}
      </ul>
      {aperto === "nuovo" ? modulo : null}
      {errore && aperto === null ? <div className="mt-2"><Messaggio tipo="errore">{errore}</Messaggio></div> : null}
    </SezioneRegistro>
  );
}

/* ── Modifica e creazione ─────────────────────────────────────────────── */

function ModuloCliente({ scheda, onFatto }: { scheda: SchedaClienteDati | null; onFatto: () => void }) {
  const router = useRouter();
  const inFinestra = useInFinestra();
  const id = scheda?.cliente.id ?? null;
  const [d, setD] = useState<DatiCliente>(scheda ? daCliente(scheda.cliente) : vuoto);
  const [errori, setErrori] = useState<Record<string, string>>({});
  const [errore, setErrore] = useState<string | null>(null);
  const [doppioni, setDoppioni] = useState<PossibileDoppione[] | null>(null);
  const [inCorso, avvia] = useTransition();

  const set = (campo: keyof DatiCliente) => (e: { target: { value: string } }) => {
    setD({ ...d, [campo]: e.target.value });
    if (errori[campo]) setErrori({ ...errori, [campo]: "" });
    setDoppioni(null);
  };

  function salva(confermato: boolean) {
    setErrore(null);
    avvia(async () => {
      if (!confermato) {
        const trovati = await cercaDoppioniCliente(d, id);
        if (trovati.length) {
          setDoppioni(trovati);
          return;
        }
      }
      const esito = await salvaCliente(id, d);
      if (!esito.ok) {
        setErrore(esito.errore);
        if ("errori" in esito) setErrori(esito.errori);
        setDoppioni(null);
        return;
      }
      if (id) {
        onFatto();
        router.refresh();
      } else {
        router.replace(`/clienti/${esito.id}`);
      }
    });
  }

  function annulla() {
    if (id) onFatto();
    else if (inFinestra) router.back();
    else router.push("/clienti");
  }

  const privato = d.tipo === "persona_fisica";
  const ente = d.tipo === "ente_pubblico";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        salva(false);
      }}
      noValidate
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-tenue">{id ? "Modifica anagrafica" : "Nuova anagrafica"}</p>
          <h1 className="titolo-display mt-1 text-[1.6rem] leading-tight md:text-[2rem]">
            {(privato ? [d.cognome, d.nome].filter(Boolean).join(" ") : d.ragione_sociale) || (id ? "Cliente" : "Nuovo cliente")}
          </h1>
        </div>
        <Chiudi />
      </header>

      <div className="mt-7 flex flex-col gap-8">
        <Segmenti
          etichetta="Tipo di cliente"
          valore={d.tipo}
          opzioni={[
            { valore: "persona_fisica", etichetta: "Privato" },
            { valore: "azienda", etichetta: "Azienda" },
            { valore: "ente_pubblico", etichetta: "Ente pubblico" },
          ]}
          onCambia={(tipo) => {
            setD({ ...d, tipo });
            setErrori({});
            setDoppioni(null);
          }}
        />

        <SezioneRegistro titolo={privato ? "Persona" : ente ? "Ente" : "Società"}>
          <div className="mt-2 grid gap-5 md:grid-cols-2">
            {privato ? (
              <>
                <Campo etichetta="Cognome" id="c-cognome" obbligatorio value={d.cognome} onChange={set("cognome")} errore={errori.cognome} autoComplete="off" autoFocus={!id} />
                <Campo etichetta="Nome" id="c-nome" value={d.nome} onChange={set("nome")} autoComplete="off" />
              </>
            ) : (
              <div className="md:col-span-2">
                <Campo
                  etichetta={ente ? "Denominazione dell'ente" : "Ragione sociale"}
                  id="c-rs"
                  obbligatorio
                  value={d.ragione_sociale}
                  onChange={set("ragione_sociale")}
                  errore={errori.ragione_sociale}
                  placeholder={ente ? "Comune di Noto" : "Rossi Immobiliare S.r.l."}
                  autoFocus={!id}
                />
              </div>
            )}
          </div>
        </SezioneRegistro>

        <SezioneRegistro titolo="Dati fiscali">
          <div className="mt-2 grid gap-5 md:grid-cols-2">
            <Campo etichetta="Codice fiscale" id="c-cf" value={d.codice_fiscale} onChange={set("codice_fiscale")} className="uppercase" autoComplete="off" />
            {!privato ? <Campo etichetta="Partita IVA" id="c-piva" value={d.partita_iva} onChange={set("partita_iva")} inputMode="numeric" autoComplete="off" /> : null}
            {ente ? (
              <Campo etichetta="Codice univoco ufficio (IPA)" id="c-ipa" value={d.codice_ipa} onChange={set("codice_ipa")} className="uppercase" aiuto="Per la fattura elettronica alla pubblica amministrazione." />
            ) : (
              <Campo etichetta="Codice destinatario SDI" id="c-sdi" value={d.codice_sdi} onChange={set("codice_sdi")} className="uppercase" />
            )}
          </div>
        </SezioneRegistro>

        <SezioneRegistro titolo="Recapiti e sede">
          <div className="mt-2 grid gap-5 md:grid-cols-2">
            <Campo etichetta="PEC" id="c-pec" type="email" value={d.pec} onChange={set("pec")} errore={errori.pec} />
            <Campo etichetta="Email" id="c-email" type="email" value={d.email} onChange={set("email")} errore={errori.email} />
            <Campo etichetta="Telefono" id="c-tel" type="tel" value={d.telefono} onChange={set("telefono")} />
            <Campo etichetta="Indirizzo" id="c-ind" value={d.indirizzo} onChange={set("indirizzo")} placeholder="Via Roma 12" />
            <SceltaLocalita
              prefisso="c"
              comuneObbligatorio={false}
              valore={{ provincia: d.provincia, comune: d.comune, cap: d.cap }}
              onCambia={(v) => setD({ ...d, provincia: v.provincia, comune: v.comune, cap: v.cap })}
            />
          </div>
        </SezioneRegistro>

        <SezioneRegistro titolo="Note">
          <div className="mt-2 grid gap-5 md:grid-cols-2">
            <Campo etichetta="Come ci ha conosciuti" id="c-fonte" value={d.fonte} onChange={set("fonte")} placeholder="Passaparola, sito, bando…" />
            <div className="md:col-span-2">
              <AreaTesto etichetta="Note" id="c-note" value={d.note} onChange={set("note")} />
            </div>
          </div>
        </SezioneRegistro>

        {!id ? <p className="text-sm text-tenue">I referenti (RUP, amministratore, ufficio tecnico…) si aggiungono dalla scheda, dopo il salvataggio.</p> : null}

        {doppioni?.length ? (
          <div role="alert" className="rounded-piccolo border border-[color:var(--stato-preventivo)]/40 bg-[color:var(--stato-preventivo)]/8 p-4">
            <p className="text-[0.9375rem] font-medium">Potrebbe essere già in archivio</p>
            <ul className="mt-2 flex flex-col gap-1 text-[0.9375rem]">
              {doppioni.map((x) => (
                <li key={x.id}>
                  <Link href={`/clienti/${x.id}`} className="text-accento hover:underline">
                    {x.nome}
                  </Link>
                  <span className="text-tenue">
                    {x.comune ? ` · ${x.comune}` : ""} · {x.motivo}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => salva(true)} disabled={inCorso} className={classePillola}>
                Salva comunque
              </button>
              <button type="button" onClick={() => setDoppioni(null)} className={classePillola}>
                Rivedi i dati
              </button>
            </div>
          </div>
        ) : null}

        {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}

        <div className="flex flex-wrap gap-2 border-t border-linea pt-5">
          <button type="submit" disabled={inCorso || !!doppioni?.length} className={cn(classePillola, "border-inchiostro bg-inchiostro text-superficie hover:bg-inchiostro/90")}>
            {inCorso ? "Salvataggio…" : id ? "Salva modifiche" : "Salva cliente"}
          </button>
          <button type="button" onClick={annulla} disabled={inCorso} className={classePillola}>
            Annulla
          </button>
        </div>
      </div>
    </form>
  );
}
