"use client";

import { useState } from "react";
import { Check, Search } from "lucide-react";
import { SceltaLocalita } from "./scelta-localita";
import { Campo, Messaggio, Segmenti } from "@/components/campo";
import { TIPI_CLIENTE } from "@/lib/dominio";
import type { DatiProcedura } from "@/lib/dati";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────────────
   Stato condiviso: committente e immobile (usato da commessa, preventivo,
   pre-fattibilità). Il payload prodotto è letto dalle funzioni di database
   _risolvi_cliente e _risolvi_immobile.
   ────────────────────────────────────────────────────────────────────────── */

export type TipoCliente = "persona_fisica" | "azienda" | "ente_pubblico";

export const clienteVuoto = {
  tipo: "persona_fisica" as TipoCliente,
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
  comune: "",
  provincia: "",
};

export const immobileVuoto = {
  denominazione: "",
  indirizzo: "",
  cap: "",
  comune: "",
  provincia: "",
  zona_urbanistica: "",
  catasto: { catasto: "fabbricati", foglio: "", particella: "", subalterno: "", categoria: "" },
};

export type Iniziali = { clienteId?: string; immobileId?: string; /** in modifica: la pratica non ha ancora un immobile */ immobileNessuno?: boolean };

export function useCommittenteImmobile(dati: DatiProcedura, iniziali: Iniziali = {}) {
  const [modoCliente, setModoCliente] = useState<"esistente" | "nuovo">(
    iniziali.clienteId || dati.clienti.length ? "esistente" : "nuovo",
  );
  const [clienteId, setClienteId] = useState(iniziali.clienteId ?? "");
  const [cercaCliente, setCercaCliente] = useState("");
  const [cliente, setCliente] = useState(clienteVuoto);

  const [modoImmobile, setModoImmobile] = useState<"esistente" | "nuovo" | "nessuno">(
    iniziali.immobileNessuno ? "nessuno" : iniziali.immobileId || dati.immobili.length ? "esistente" : "nuovo",
  );
  const [immobileId, setImmobileId] = useState(iniziali.immobileId ?? "");
  const [cercaImmobile, setCercaImmobile] = useState("");
  const [immobile, setImmobile] = useState(immobileVuoto);

  const clienteScelto = dati.clienti.find((c) => c.id === clienteId);
  const immobileScelto = dati.immobili.find((i) => i.id === immobileId);

  const tipoCommittente: TipoCliente | undefined =
    modoCliente === "nuovo" ? cliente.tipo : (clienteScelto?.tipo as TipoCliente | undefined);

  const nomeCommittente =
    modoCliente === "esistente"
      ? clienteScelto?.denominazione
      : cliente.tipo === "persona_fisica"
        ? [cliente.cognome, cliente.nome].filter(Boolean).join(" ")
        : cliente.ragione_sociale;

  const descrizioneImmobile =
    modoImmobile === "nessuno"
      ? "Da definire"
      : modoImmobile === "esistente"
        ? immobileScelto && (immobileScelto.denominazione ?? `${immobileScelto.indirizzo}, ${immobileScelto.comune}`)
        : [immobile.denominazione || immobile.indirizzo, immobile.comune].filter(Boolean).join(", ");

  function erroriCommittente() {
    const e: Record<string, string> = {};
    if (modoCliente === "esistente" && !clienteId) e.cliente = "Scegli un committente dall'elenco, oppure creane uno nuovo.";
    if (modoCliente === "nuovo") {
      if (cliente.tipo === "persona_fisica" && !cliente.cognome.trim()) e.cognome = "Inserisci il cognome.";
      if (cliente.tipo !== "persona_fisica" && !cliente.ragione_sociale.trim())
        e.ragione_sociale = cliente.tipo === "ente_pubblico" ? "Inserisci la denominazione dell'ente." : "Inserisci la ragione sociale.";
    }
    return e;
  }

  function erroriImmobile() {
    const e: Record<string, string> = {};
    if (modoImmobile === "esistente" && !immobileId)
      e.immobile = "Scegli un immobile dall'elenco, creane uno nuovo o indica che è da definire.";
    if (modoImmobile === "nuovo") {
      if (!immobile.indirizzo.trim()) e.indirizzo = "Inserisci l'indirizzo.";
      if (!immobile.comune.trim()) e.comune_immobile = "Inserisci il comune.";
    }
    return e;
  }

  const payload = {
    cliente_id: modoCliente === "esistente" ? clienteId : null,
    cliente: modoCliente === "nuovo" ? cliente : null,
    immobile_id: modoImmobile === "esistente" ? immobileId : null,
    immobile: modoImmobile === "nuovo" ? immobile : null,
  };

  return {
    dati,
    modoCliente, setModoCliente, clienteId, setClienteId, cercaCliente, setCercaCliente, cliente, setCliente,
    modoImmobile, setModoImmobile, immobileId, setImmobileId, cercaImmobile, setCercaImmobile, immobile, setImmobile,
    tipoCommittente, nomeCommittente, descrizioneImmobile,
    erroriCommittente, erroriImmobile, payload,
  };
}

export type ControlloCommittenteImmobile = ReturnType<typeof useCommittenteImmobile>;

/* ──────────────────────────────────────────────────────────────────────────
   Passi
   ────────────────────────────────────────────────────────────────────────── */

export function PassoCommittente({
  ctl,
  errori,
  onReset,
}: {
  ctl: ControlloCommittenteImmobile;
  errori: Record<string, string>;
  onReset: () => void;
}) {
  const clienti = filtra(ctl.dati.clienti, ctl.cercaCliente, (c) => `${c.denominazione} ${c.comune ?? ""}`);
  return (
    <div className="flex flex-col gap-5">
      <Segmenti
        etichetta="Committente"
        valore={ctl.modoCliente}
        opzioni={[
          { valore: "esistente", etichetta: "Già in archivio" },
          { valore: "nuovo", etichetta: "Nuovo committente" },
        ]}
        onCambia={(v) => {
          ctl.setModoCliente(v);
          onReset();
        }}
      />
      {ctl.modoCliente === "esistente" ? (
        <SceltaDaElenco
          cerca={ctl.cercaCliente}
          onCerca={ctl.setCercaCliente}
          segnaposto="Cerca per nome o comune"
          vuoto={ctl.dati.clienti.length === 0 ? "L'archivio clienti è vuoto: crea il primo committente." : "Nessun committente corrisponde alla ricerca."}
          errore={errori.cliente}
          voci={clienti.map((c) => ({
            id: c.id,
            titolo: c.denominazione ?? "",
            dettaglio: [TIPI_CLIENTE[c.tipo], c.comune].filter(Boolean).join(", "),
          }))}
          scelto={ctl.clienteId}
          onScegli={ctl.setClienteId}
        />
      ) : (
        <FormCliente valore={ctl.cliente} onCambia={ctl.setCliente} errori={errori} />
      )}
    </div>
  );
}

export function PassoImmobile({
  ctl,
  errori,
  onReset,
}: {
  ctl: ControlloCommittenteImmobile;
  errori: Record<string, string>;
  onReset: () => void;
}) {
  const immobili = filtra(ctl.dati.immobili, ctl.cercaImmobile, (i) => `${i.denominazione ?? ""} ${i.indirizzo} ${i.comune}`);
  return (
    <div className="flex flex-col gap-5">
      <Segmenti
        etichetta="Immobile"
        valore={ctl.modoImmobile}
        opzioni={[
          { valore: "esistente", etichetta: "Già in archivio" },
          { valore: "nuovo", etichetta: "Nuovo immobile" },
          { valore: "nessuno", etichetta: "Da definire" },
        ]}
        onCambia={(v) => {
          ctl.setModoImmobile(v);
          onReset();
        }}
      />
      {ctl.modoImmobile === "esistente" ? (
        <SceltaDaElenco
          cerca={ctl.cercaImmobile}
          onCerca={ctl.setCercaImmobile}
          segnaposto="Cerca per indirizzo, nome o comune"
          vuoto={ctl.dati.immobili.length === 0 ? "Nessun immobile in archivio: inseriscine uno nuovo." : "Nessun immobile corrisponde alla ricerca."}
          errore={errori.immobile}
          voci={immobili.map((i) => ({
            id: i.id,
            titolo: i.denominazione ?? i.indirizzo,
            dettaglio: i.denominazione ? `${i.indirizzo}, ${i.comune}` : i.comune,
          }))}
          scelto={ctl.immobileId}
          onScegli={ctl.setImmobileId}
        />
      ) : null}
      {ctl.modoImmobile === "nuovo" ? <FormImmobile valore={ctl.immobile} onCambia={ctl.setImmobile} errori={errori} /> : null}
      {ctl.modoImmobile === "nessuno" ? (
        <p className="text-[0.9375rem] text-tenue">
          Va bene per un primo contatto. Potrai collegare l&apos;immobile in seguito.
        </p>
      ) : null}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Componenti interni
   ────────────────────────────────────────────────────────────────────────── */

function filtra<T>(elenco: T[], testo: string, chiave: (x: T) => string) {
  const t = testo.trim().toLowerCase();
  return t ? elenco.filter((x) => chiave(x).toLowerCase().includes(t)) : elenco;
}

function SceltaDaElenco({
  cerca,
  onCerca,
  segnaposto,
  vuoto,
  errore,
  voci,
  scelto,
  onScegli,
}: {
  cerca: string;
  onCerca: (v: string) => void;
  segnaposto: string;
  vuoto: string;
  errore?: string;
  voci: { id: string; titolo: string; dettaglio: string }[];
  scelto: string;
  onScegli: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tenue" />
        <input
          type="search"
          value={cerca}
          onChange={(e) => onCerca(e.target.value)}
          placeholder={segnaposto}
          aria-label={segnaposto}
          className="h-11 w-full rounded-m border border-linea-forte bg-superficie pl-9 pr-3 text-base outline-none focus:border-accento focus:ring-2 focus:ring-accento/20"
        />
      </div>
      {voci.length === 0 ? (
        <p className="text-[0.9375rem] text-tenue">{vuoto}</p>
      ) : (
        <ul role="radiogroup" className="max-h-72 divide-y divide-linea overflow-y-auto rounded-m border border-linea">
          {voci.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                role="radio"
                aria-checked={v.id === scelto}
                onClick={() => onScegli(v.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
                  v.id === scelto ? "bg-accento-tenue" : "hover:bg-superficie-2/60",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{v.titolo}</span>
                  <span className="block truncate text-sm text-tenue">{v.dettaglio}</span>
                </span>
                {v.id === scelto ? <Check className="size-4 shrink-0 text-accento" strokeWidth={2.2} /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
    </div>
  );
}

function FormCliente({
  valore: c,
  onCambia,
  errori,
}: {
  valore: typeof clienteVuoto;
  onCambia: (v: typeof clienteVuoto) => void;
  errori: Record<string, string>;
}) {
  const set = (campo: keyof typeof clienteVuoto) => (e: { target: { value: string } }) =>
    onCambia({ ...c, [campo]: e.target.value });
  return (
    <div className="flex flex-col gap-5">
      <Segmenti
        etichetta="Tipo"
        valore={c.tipo}
        opzioni={[
          { valore: "persona_fisica", etichetta: "Privato" },
          { valore: "azienda", etichetta: "Azienda" },
          { valore: "ente_pubblico", etichetta: "Ente pubblico" },
        ]}
        onCambia={(tipo) => onCambia({ ...c, tipo })}
      />
      <div className="grid gap-5 md:grid-cols-2">
        {c.tipo === "persona_fisica" ? (
          <>
            <Campo etichetta="Nome" id="c-nome" value={c.nome} onChange={set("nome")} autoComplete="off" />
            <Campo etichetta="Cognome" id="c-cognome" obbligatorio value={c.cognome} onChange={set("cognome")} errore={errori.cognome} autoComplete="off" />
            <Campo etichetta="Codice fiscale" id="c-cf" value={c.codice_fiscale} onChange={set("codice_fiscale")} className="uppercase" />
          </>
        ) : (
          <>
            <div className="md:col-span-2">
              <Campo
                etichetta={c.tipo === "ente_pubblico" ? "Denominazione dell'ente" : "Ragione sociale"}
                id="c-rs"
                obbligatorio
                value={c.ragione_sociale}
                onChange={set("ragione_sociale")}
                errore={errori.ragione_sociale}
                placeholder={c.tipo === "ente_pubblico" ? "Comune di Noto" : "Rossi Immobiliare S.r.l."}
              />
            </div>
            <Campo etichetta="Partita IVA" id="c-piva" value={c.partita_iva} onChange={set("partita_iva")} inputMode="numeric" />
            <Campo etichetta="Codice fiscale" id="c-cf" value={c.codice_fiscale} onChange={set("codice_fiscale")} className="uppercase" />
          </>
        )}
        {c.tipo === "ente_pubblico" ? (
          <Campo etichetta="Codice univoco ufficio (IPA)" id="c-ipa" value={c.codice_ipa} onChange={set("codice_ipa")} className="uppercase" />
        ) : (
          <Campo etichetta="Codice destinatario SDI" id="c-sdi" value={c.codice_sdi} onChange={set("codice_sdi")} className="uppercase" />
        )}
        <Campo etichetta="PEC" id="c-pec" type="email" value={c.pec} onChange={set("pec")} />
        <Campo etichetta="Email" id="c-email" type="email" value={c.email} onChange={set("email")} />
        <Campo etichetta="Telefono" id="c-tel" type="tel" value={c.telefono} onChange={set("telefono")} />
        <SceltaLocalita
          prefisso="c"
          mostraCap={false}
          valore={{ provincia: c.provincia, comune: c.comune }}
          onCambia={(v) => onCambia({ ...c, provincia: v.provincia, comune: v.comune })}
        />
      </div>
    </div>
  );
}

function FormImmobile({
  valore: i,
  onCambia,
  errori,
}: {
  valore: typeof immobileVuoto;
  onCambia: (v: typeof immobileVuoto) => void;
  errori: Record<string, string>;
}) {
  const set = (campo: Exclude<keyof typeof immobileVuoto, "catasto">) => (e: { target: { value: string } }) =>
    onCambia({ ...i, [campo]: e.target.value });
  const setCat = (campo: keyof typeof immobileVuoto.catasto) => (e: { target: { value: string } }) =>
    onCambia({ ...i, catasto: { ...i.catasto, [campo]: e.target.value } });
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Campo etichetta="Nome dell'immobile" id="i-nome" value={i.denominazione} onChange={set("denominazione")} placeholder="Villa M" aiuto="Facoltativo: il nome con cui lo chiamate in studio." />
        </div>
        <SceltaLocalita
          prefisso="i"
          valore={{ provincia: i.provincia, comune: i.comune, cap: i.cap }}
          onCambia={(v) => onCambia({ ...i, ...v })}
          errore={errori.comune_immobile}
        />
        <div className="md:col-span-2">
          <Campo etichetta="Indirizzo e civico" id="i-ind" obbligatorio value={i.indirizzo} onChange={set("indirizzo")} errore={errori.indirizzo} placeholder="Via Temistocle 2" />
        </div>
        <Campo etichetta="Zona urbanistica" id="i-zona" value={i.zona_urbanistica} onChange={set("zona_urbanistica")} placeholder="B2" />
      </div>
      <fieldset className="flex flex-col gap-4 border-t border-linea pt-5">
        <legend className="mb-3 text-[0.9375rem] font-medium">Dati catastali</legend>
        <Segmenti
          etichetta="Catasto"
          valore={i.catasto.catasto as "fabbricati" | "terreni"}
          opzioni={[
            { valore: "fabbricati", etichetta: "Fabbricati" },
            { valore: "terreni", etichetta: "Terreni" },
          ]}
          onCambia={(v) => onCambia({ ...i, catasto: { ...i.catasto, catasto: v } })}
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Campo etichetta="Foglio" id="i-foglio" value={i.catasto.foglio} onChange={setCat("foglio")} inputMode="numeric" />
          <Campo etichetta="Particella" id="i-part" value={i.catasto.particella} onChange={setCat("particella")} />
          <Campo etichetta="Subalterno" id="i-sub" value={i.catasto.subalterno} onChange={setCat("subalterno")} />
          <Campo etichetta="Categoria" id="i-cat" value={i.catasto.categoria} onChange={setCat("categoria")} placeholder="A/2" />
        </div>
        <p className="text-sm text-tenue">Facoltativi. Altri identificativi si aggiungono dalla scheda dell&apos;immobile.</p>
      </fieldset>
    </div>
  );
}
