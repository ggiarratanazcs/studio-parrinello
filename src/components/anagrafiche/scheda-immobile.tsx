"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, FileText, House, Landmark, Loader2, MapPin, MapPinned, Navigation, Pencil, Plus, Trash2, User, View } from "lucide-react";
import { Campo, AreaTesto, Messaggio, Segmenti } from "@/components/campo";
import { SceltaLocalita } from "@/components/procedura/scelta-localita";
import { classePillola } from "@/components/anagrafiche/carta";
import { useInFinestra } from "@/components/anagrafiche/finestra-anagrafica";
import { Chiudi, DatoCopiabile, GruppoPratiche, Indietro, SchedeSezioni, TitoloColonna, classeAzione } from "@/components/anagrafiche/parti";
import { CATEGORIE_DOCUMENTO } from "@/components/schede/allegati-fase";
import { TIPI_CLIENTE, VINCOLI } from "@/lib/dominio";
import { cn, formattaData } from "@/lib/utils";
import {
  cercaDoppioniImmobile,
  eliminaCatasto,
  salvaCatasto,
  trovaParticella,
  salvaImmobile,
  type DatiCatasto,
  type DatiImmobile,
  type PossibileDoppioneImmobile,
} from "@/lib/azioni-anagrafiche";
import type { Catasto, CommittenteImmobile, DocumentoImmobile, Immobile, SchedaImmobileDati } from "@/lib/anagrafiche";

/* ──────────────────────────────────────────────────────────────────────────
   Scheda dell'immobile, stessa impostazione della scheda cliente:
   a sinistra identità, posizione e dati urbanistici; a destra pratiche svolte
   sull'immobile, identificativi catastali, committenti e documenti.
   Senza dati (scheda = null) si apre vuota in modifica: è la creazione dal "+".
   ────────────────────────────────────────────────────────────────────────── */

const ELENCO = "/immobili";
const NOME_ELENCO = "immobili";

const vuoto: DatiImmobile = {
  denominazione: "",
  indirizzo: "",
  cap: "",
  comune: "",
  provincia: "",
  zona_urbanistica: "",
  strumento_urbanistico: "",
  destinazione_uso: "",
  superficie_mq: "",
  anno_costruzione: "",
  vincoli: [],
  note: "",
};

function daImmobile(i: Immobile): DatiImmobile {
  return {
    denominazione: i.denominazione ?? "",
    indirizzo: i.indirizzo ?? "",
    cap: i.cap ?? "",
    comune: i.comune ?? "",
    provincia: i.provincia ?? "",
    zona_urbanistica: i.zona_urbanistica ?? "",
    strumento_urbanistico: i.strumento_urbanistico ?? "",
    destinazione_uso: i.destinazione_uso ?? "",
    superficie_mq: i.superficie_mq != null ? String(i.superficie_mq).replace(".", ",") : "",
    anno_costruzione: i.anno_costruzione != null ? String(i.anno_costruzione) : "",
    vincoli: i.vincoli ?? [],
    note: i.note ?? "",
  };
}

const metri = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
const euroCentesimi = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

export function SchedaImmobile({ scheda }: { scheda: SchedaImmobileDati | null }) {
  const [modifica, setModifica] = useState(!scheda);
  return (
    <div className="scheda-profilo">
      {modifica ? (
        <div className="carta-chiara h-full overflow-hidden">
          <ModuloImmobile scheda={scheda} onFatto={() => setModifica(false)} />
        </div>
      ) : scheda ? (
        <VistaImmobile scheda={scheda} onModifica={() => setModifica(true)} />
      ) : null}
    </div>
  );
}

/* ── Lettura ──────────────────────────────────────────────────────────── */

function VistaImmobile({ scheda, onModifica }: { scheda: SchedaImmobileDati; onModifica: () => void }) {
  const { immobile: i } = scheda;
  const [vista, setVista] = useState<"pratiche" | "catasto" | "committenti" | "documenti">("pratiche");
  const localita = [i.cap, i.comune, i.provincia ? `(${i.provincia})` : null].filter(Boolean).join(" ");
  const indirizzoCompleto = [i.indirizzo, localita].filter(Boolean).join(", ");
  const coordinate = i.latitudine != null && i.longitudine != null ? `${i.latitudine},${i.longitudine}` : null;
  const destinazione = coordinate ?? indirizzoCompleto;
  const totale = scheda.prefattibilita.length + scheda.preventivi.length + scheda.commesse.length;

  const urbanistica: [string, string | null][] = [
    ["Zona", i.zona_urbanistica],
    ["Strumento", i.strumento_urbanistico],
    ["Destinazione", i.destinazione_uso],
    ["Superficie", i.superficie_mq != null ? `${metri.format(i.superficie_mq)} m²` : null],
    ["Anno", i.anno_costruzione != null ? String(i.anno_costruzione) : null],
  ];

  return (
    <div className="grid gap-4 lg:h-full lg:grid-cols-[21.5rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
      {/* ── Carta dell'identità ── */}
      <aside className="carta-chiara senza-barra px-6 py-6 lg:overflow-y-auto">
        <Indietro />
        <div className="flex items-center justify-between gap-3">
          <span className="etichetta-anagrafica">Anagrafica · Immobile</span>
          <span className="lg:hidden">
            <Chiudi elenco={ELENCO} nomeElenco={NOME_ELENCO} />
          </span>
        </div>

        <div className="mt-5 flex items-center gap-3.5">
          <House aria-hidden className="size-8 shrink-0 text-inchiostro" strokeWidth={1.3} />
          <div className="min-w-0">
            <h1 className="titolo-display text-[1.375rem] leading-[1.15] text-inchiostro">{i.denominazione || i.indirizzo}</h1>
            <p className="mt-0.5 text-[0.875rem] text-inchiostro-2">{i.destinazione_uso || "Immobile"}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinazione)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={classeAzione}
            aria-label="Apri sulla mappa"
            data-suggerimento="Apri sulla mappa"
            data-suggerimento-lato="sotto"
          >
            <MapPin className="size-[18px]" strokeWidth={1.7} />
          </a>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinazione)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={classeAzione}
            aria-label="Indicazioni stradali"
            data-suggerimento="Indicazioni stradali"
            data-suggerimento-lato="sotto"
          >
            <Navigation className="size-[18px]" strokeWidth={1.7} />
          </a>
          {coordinate ? (
            <a
              href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coordinate}`}
              target="_blank"
              rel="noopener noreferrer"
              className={classeAzione}
              aria-label="Street View"
              data-suggerimento="Street View"
              data-suggerimento-lato="sotto"
            >
              <View className="size-[18px]" strokeWidth={1.7} />
            </a>
          ) : (
            <span className={cn(classeAzione, "pointer-events-none opacity-35")} aria-hidden data-suggerimento="Posizione non ancora sulla mappa">
              <View className="size-[18px]" strokeWidth={1.7} />
            </span>
          )}
          <button type="button" onClick={onModifica} className="grid h-10 place-items-center rounded-[10px] bg-inchiostro text-superficie transition-opacity hover:opacity-90" aria-label="Modifica" data-suggerimento="Modifica" data-suggerimento-lato="sotto">
            <Pencil className="size-[18px]" strokeWidth={1.7} />
          </button>
        </div>

        <dl className="mt-5 flex flex-col gap-2 border-b border-linea pb-4">
          <DatoCopiabile voce="Indirizzo" valore={indirizzoCompleto || null} icona={MapPin} />
          {!coordinate ? <p className="pl-6 text-[0.8125rem] text-tenue">Non ancora sulla mappa: si posiziona dall&apos;elenco immobili.</p> : null}
        </dl>

        <dl className="mt-4 flex flex-col gap-1 border-b border-linea pb-4">
          {urbanistica.map(([voce, valore]) => (
            <DatoCopiabile key={voce} voce={voce} valore={valore} riga />
          ))}
        </dl>

        <div className="mt-4">
          <TitoloColonna>Vincoli</TitoloColonna>
          {i.vincoli?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {i.vincoli.map((v) => (
                <span key={v} className="rounded-full bg-superficie-2 px-2.5 py-0.5 text-[0.8125rem] text-inchiostro">
                  {v}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[0.875rem] text-tenue">—</p>
          )}
        </div>

        {i.note ? (
          <div className="mt-6">
            <TitoloColonna>Note</TitoloColonna>
            <p className="line-clamp-3 text-[0.875rem] text-inchiostro-2" title={i.note}>
              {i.note}
            </p>
          </div>
        ) : null}
      </aside>

      {/* ── Carta delle relazioni ── */}
      <section className="carta-chiara flex min-w-0 flex-col lg:min-h-0">
        <SchedeSezioni
          sezioni={[
            ["pratiche", "Pratiche", totale],
            ["catasto", "Catasto", scheda.catasto.length],
            ["committenti", "Committenti", scheda.committenti.length],
            ["documenti", "Documenti", scheda.totaleDocumenti],
          ] as const}
          scelta={vista}
          onScegli={setVista}
          chiudi={<Chiudi elenco={ELENCO} nomeElenco={NOME_ELENCO} />}
        />
        <div className="min-h-0 flex-1 px-6 pb-7 pt-5 lg:overflow-y-auto lg:px-8">
          {vista === "pratiche" ? (
            <div className="flex flex-col gap-2.5">
              <GruppoPratiche titolo="Pre-fattibilità" colore="var(--stato-prefattibilita)" pratiche={scheda.prefattibilita} vuoto="Nessuna pre-fattibilità su questo immobile." importo="Onorario" />
              <GruppoPratiche titolo="Preventivi" colore="var(--stato-preventivo)" pratiche={scheda.preventivi} vuoto="Nessun preventivo su questo immobile." importo="Imponibile" />
              <GruppoPratiche titolo="Commesse" colore="var(--stato-attiva)" pratiche={scheda.commesse} vuoto="Nessuna commessa su questo immobile." importo="Onorario" />
            </div>
          ) : vista === "catasto" ? (
            <CatastoImmobile immobileId={i.id} righe={scheda.catasto} posizionato={coordinate !== null} />
          ) : vista === "committenti" ? (
            <Committenti committenti={scheda.committenti} />
          ) : (
            <Documenti documenti={scheda.documenti} totale={scheda.totaleDocumenti} />
          )}
        </div>
      </section>
    </div>
  );
}

/* ── Committenti e documenti ──────────────────────────────────────────── */

function Committenti({ committenti }: { committenti: CommittenteImmobile[] }) {
  if (!committenti.length) {
    return <p className="text-[0.9375rem] text-inchiostro-2">Nessun committente: compaiono qui i clienti delle pratiche svolte su questo immobile.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {committenti.map((c) => {
        const Icona = c.tipo === "persona_fisica" ? User : c.tipo === "ente_pubblico" ? Landmark : Building2;
        return (
          <li key={c.id}>
            <Link href={`/clienti/${c.id}?da=immobile`} className="flex items-center gap-3.5 rounded-[12px] bg-superficie-2/80 px-4 py-3.5 transition-colors hover:bg-superficie-2">
              <Icona aria-hidden className="size-6 shrink-0 text-inchiostro-2" strokeWidth={1.4} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem] font-medium text-inchiostro">{c.nome}</span>
                <span className="block text-[0.8125rem] text-inchiostro-2">{TIPI_CLIENTE[c.tipo] ?? c.tipo}</span>
              </span>
              <span className="numeri shrink-0 text-[0.8125rem] text-inchiostro-2">
                {c.pratiche} {c.pratiche === 1 ? "pratica" : "pratiche"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Documenti({ documenti, totale }: { documenti: DocumentoImmobile[]; totale: number }) {
  if (!totale) {
    return <p className="text-[0.9375rem] text-inchiostro-2">Nessun documento: si caricano dalla scheda di ogni commessa e compaiono qui raccolti per immobile.</p>;
  }
  return (
    <>
      <ul className="flex flex-col gap-1.5">
        {documenti.map((d) => (
          <li key={d.id}>
            <Link href={`/commesse/${d.commessa.id}`} className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors hover:bg-superficie-2/70">
              <FileText aria-hidden className="size-[18px] shrink-0 text-inchiostro-2" strokeWidth={1.5} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem] text-inchiostro">{d.titolo}</span>
                <span className="block truncate text-[0.8125rem] text-inchiostro-2">
                  {[CATEGORIE_DOCUMENTO[d.categoria] ?? d.categoria, formattaData(d.data), [d.commessa.codice, d.commessa.titolo].filter(Boolean).join(" · ")].join(" · ")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {totale > documenti.length ? (
        <p className="mt-3 text-[0.8125rem] text-tenue">
          Sono mostrati gli ultimi {documenti.length} di {totale}: gli altri sono nelle schede delle commesse.
        </p>
      ) : null}
    </>
  );
}

/* ── Catasto ──────────────────────────────────────────────────────────── */

const catastoVuoto: DatiCatasto = {
  catasto: "fabbricati",
  sezione: "",
  foglio: "",
  particella: "",
  subalterno: "",
  categoria: "",
  classe: "",
  consistenza: "",
  rendita: "",
  intestatari: "",
  note: "",
};

function daCatasto(r: Catasto): DatiCatasto {
  return {
    catasto: r.catasto === "terreni" ? "terreni" : "fabbricati",
    sezione: r.sezione ?? "",
    foglio: r.foglio ?? "",
    particella: r.particella ?? "",
    subalterno: r.subalterno ?? "",
    categoria: r.categoria ?? "",
    classe: r.classe ?? "",
    consistenza: r.consistenza ?? "",
    rendita: r.rendita != null ? String(r.rendita).replace(".", ",") : "",
    intestatari: r.intestatari ?? "",
    note: r.note ?? "",
  };
}

function CatastoImmobile({ immobileId, righe, posizionato }: { immobileId: string; righe: Catasto[]; posizionato: boolean }) {
  const router = useRouter();
  const [aperto, setAperto] = useState<string | null>(null);
  const [dati, setDati] = useState<DatiCatasto>(catastoVuoto);
  const [errore, setErrore] = useState<string | null>(null);
  const [daEliminare, setDaEliminare] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();
  const [proposta, setProposta] = useState<string | null>(null);
  const [cercando, avviaRicerca] = useTransition();

  /** Propone foglio e particella dalla cartografia catastale nel punto dell'immobile */
  function trova() {
    setErrore(null);
    setProposta(null);
    avviaRicerca(async () => {
      const r = await trovaParticella(immobileId);
      if (!r.ok) return setErrore(r.errore);
      setDaEliminare(null);
      setDati({ ...catastoVuoto, foglio: r.foglio, particella: r.particella, note: "Da cartografia catastale (Agenzia delle Entrate)" });
      setAperto("nuovo");
      setProposta(`Nel punto dell'immobile la cartografia indica foglio ${r.foglio}, particella ${r.particella}. Verifica e completa prima di aggiungere.`);
    });
  }

  function apri(r?: Catasto) {
    setProposta(null);
    setErrore(null);
    setDaEliminare(null);
    setDati(r ? daCatasto(r) : catastoVuoto);
    setAperto(r ? r.id : "nuovo");
  }
  function salva() {
    avvia(async () => {
      const esito = await salvaCatasto(immobileId, aperto === "nuovo" ? null : aperto, dati);
      if (!esito.ok) return setErrore(esito.errore);
      setAperto(null);
      router.refresh();
    });
  }
  function elimina(id: string) {
    avvia(async () => {
      const esito = await eliminaCatasto(id);
      if (!esito.ok) return setErrore(esito.errore);
      setDaEliminare(null);
      router.refresh();
    });
  }
  const set = (campo: Exclude<keyof DatiCatasto, "catasto">) => (e: { target: { value: string } }) => setDati({ ...dati, [campo]: e.target.value });
  const fabbricati = dati.catasto === "fabbricati";

  const modulo = (
    <div className="flex flex-col gap-4 rounded-[14px] bg-superficie-2/80 p-4">
      <Segmenti
        etichetta="Catasto"
        valore={dati.catasto}
        opzioni={[
          { valore: "fabbricati", etichetta: "Fabbricati" },
          { valore: "terreni", etichetta: "Terreni" },
        ]}
        onCambia={(catasto) => setDati({ ...dati, catasto })}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Campo etichetta="Sezione" id="k-sez" value={dati.sezione} onChange={set("sezione")} className="uppercase" />
        <Campo etichetta="Foglio" id="k-fg" obbligatorio value={dati.foglio} onChange={set("foglio")} inputMode="numeric" autoFocus />
        <Campo etichetta="Particella" id="k-part" obbligatorio value={dati.particella} onChange={set("particella")} />
        <Campo etichetta="Subalterno" id="k-sub" value={dati.subalterno} onChange={set("subalterno")} />
        {fabbricati ? <Campo etichetta="Categoria" id="k-cat" value={dati.categoria} onChange={set("categoria")} placeholder="A/2" className="uppercase" /> : null}
        <Campo etichetta="Classe" id="k-cl" value={dati.classe} onChange={set("classe")} />
        <Campo etichetta={fabbricati ? "Consistenza" : "Superficie"} id="k-cons" value={dati.consistenza} onChange={set("consistenza")} placeholder={fabbricati ? "5,5 vani" : "1.200 m²"} />
        <Campo etichetta="Rendita (€)" id="k-rend" value={dati.rendita} onChange={set("rendita")} inputMode="decimal" />
      </div>
      <Campo etichetta="Intestatari" id="k-int" value={dati.intestatari} onChange={set("intestatari")} placeholder="Rossi Mario 1/2, Bianchi Anna 1/2" />
      <Campo etichetta="Note" id="k-note" value={dati.note} onChange={set("note")} />
      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={salva} disabled={inCorso} className={cn(classePillola, "border-inchiostro bg-inchiostro text-superficie hover:bg-inchiostro/90")}>
          {inCorso ? "Salvataggio…" : aperto === "nuovo" ? "Aggiungi" : "Salva"}
        </button>
        <button type="button" onClick={() => setAperto(null)} disabled={inCorso} className={classePillola}>
          Annulla
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-2.5">
      {righe.length === 0 && aperto !== "nuovo" ? <p className="text-[0.9375rem] text-inchiostro-2">Nessun identificativo catastale.</p> : null}
      {righe.map((r) =>
        aperto === r.id ? (
          <div key={r.id}>{modulo}</div>
        ) : (
          <div key={r.id} className="group flex items-start gap-3 rounded-[14px] bg-superficie-2/80 px-4 py-3.5">
            <span className="mt-0.5 shrink-0 rounded-full bg-superficie px-2.5 py-0.5 text-[0.75rem] text-inchiostro-2">
              {r.catasto === "terreni" ? "Terreni" : "Fabbricati"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="numeri text-[0.9375rem] text-inchiostro">
                {[r.sezione ? `Sez. ${r.sezione}` : null, `Fg. ${r.foglio}`, `Part. ${r.particella}`, r.subalterno ? `Sub. ${r.subalterno}` : null].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-0.5 text-[0.8125rem] text-inchiostro-2">
                {[r.categoria ? `Cat. ${r.categoria}` : null, r.classe ? `Cl. ${r.classe}` : null, r.consistenza, r.rendita != null ? `Rendita ${euroCentesimi.format(r.rendita)}` : null]
                  .filter(Boolean)
                  .join(" · ") || "Altri dati da completare"}
              </p>
              {r.intestatari ? <p className="mt-0.5 text-[0.8125rem] text-inchiostro-2">Intestatari: {r.intestatari}</p> : null}
              {daEliminare === r.id ? (
                <p className="mt-1 flex items-center gap-2 text-[0.8125rem]">
                  Eliminare?
                  <button type="button" onClick={() => elimina(r.id)} disabled={inCorso} className="text-[color:var(--stato-sospesa)] hover:underline">
                    Sì
                  </button>
                  <button type="button" onClick={() => setDaEliminare(null)} className="text-tenue hover:underline">
                    No
                  </button>
                </p>
              ) : null}
            </div>
            {aperto === null && daEliminare !== r.id ? (
              <span className="flex shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                <button type="button" onClick={() => apri(r)} className="grid size-8 place-items-center rounded-full text-tenue hover:bg-superficie hover:text-inchiostro" aria-label="Modifica identificativo">
                  <Pencil className="size-3.5" strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrore(null);
                    setDaEliminare(r.id);
                  }}
                  className="grid size-8 place-items-center rounded-full text-tenue hover:bg-superficie hover:text-[color:var(--stato-sospesa)]"
                  aria-label="Elimina identificativo"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.8} />
                </button>
              </span>
            ) : null}
          </div>
        ),
      )}
      {aperto === "nuovo" && proposta ? <Messaggio tipo="ok">{proposta}</Messaggio> : null}
      {aperto === "nuovo" ? modulo : null}
      {errore && aperto === null ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
      {aperto === null ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <button type="button" onClick={() => apri()} className="inline-flex w-fit items-center gap-1 text-[0.875rem] text-accento hover:underline">
            <Plus className="size-4" strokeWidth={2} />
            Aggiungi identificativo
          </button>
          <button
            type="button"
            onClick={trova}
            disabled={cercando || !posizionato}
            className="inline-flex w-fit items-center gap-1.5 text-[0.875rem] text-accento hover:underline disabled:cursor-not-allowed disabled:text-tenue disabled:no-underline"
            data-suggerimento={posizionato ? "Cerca nella cartografia catastale nel punto dell'immobile" : "Prima posiziona l'immobile sulla mappa"}
          >
            {cercando ? <Loader2 className="size-4 animate-spin" strokeWidth={1.8} /> : <MapPinned className="size-4" strokeWidth={1.8} />}
            Trova foglio e particella
          </button>
        </div>
      ) : null}
      <p className="mt-2 text-[0.75rem] text-tenue">Foglio e particella proposti dalla cartografia catastale dell&apos;Agenzia delle Entrate (licenza CC-BY 4.0), senza valore certificativo.</p>
    </div>
  );
}

/* ── Modifica e creazione ─────────────────────────────────────────────── */

function SezioneModulo({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[0.6875rem] uppercase tracking-[0.14em] text-tenue">{titolo}</h2>
      {children}
    </section>
  );
}

function ModuloImmobile({ scheda, onFatto }: { scheda: SchedaImmobileDati | null; onFatto: () => void }) {
  const router = useRouter();
  const inFinestra = useInFinestra();
  const id = scheda?.immobile.id ?? null;
  const [d, setD] = useState<DatiImmobile>(scheda ? daImmobile(scheda.immobile) : vuoto);
  const [errori, setErrori] = useState<Record<string, string>>({});
  const [errore, setErrore] = useState<string | null>(null);
  const [doppioni, setDoppioni] = useState<PossibileDoppioneImmobile[] | null>(null);
  const [inCorso, avvia] = useTransition();

  const set = (campo: Exclude<keyof DatiImmobile, "vincoli">) => (e: { target: { value: string } }) => {
    setD({ ...d, [campo]: e.target.value });
    if (errori[campo]) setErrori({ ...errori, [campo]: "" });
    setDoppioni(null);
  };
  const alternaVincolo = (v: string) =>
    setD({ ...d, vincoli: d.vincoli.includes(v) ? d.vincoli.filter((x) => x !== v) : [...d.vincoli, v] });

  function salva(confermato: boolean) {
    setErrore(null);
    avvia(async () => {
      if (!confermato) {
        const trovati = await cercaDoppioniImmobile(d, id);
        if (trovati.length) {
          setDoppioni(trovati);
          return;
        }
      }
      const esito = await salvaImmobile(id, d);
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
        router.replace(`/immobili/${esito.id}`);
      }
    });
  }

  function annulla() {
    if (id) onFatto();
    else if (inFinestra) router.back();
    else router.push(ELENCO);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        salva(false);
      }}
      noValidate
      className="h-full px-5 py-6 md:px-8 md:py-7 lg:overflow-y-auto"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="etichetta-anagrafica">{id ? "Modifica immobile" : "Nuovo immobile"}</span>
          <h1 className="titolo-display mt-3 text-[1.5rem] leading-tight md:text-[1.875rem]">{d.denominazione || d.indirizzo || "Nuovo immobile"}</h1>
        </div>
        <Chiudi elenco={ELENCO} nomeElenco={NOME_ELENCO} />
      </header>

      <div className="mt-7 flex flex-col gap-8">
        <SezioneModulo titolo="Posizione">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Campo etichetta="Nome dell'immobile" id="i-nome" value={d.denominazione} onChange={set("denominazione")} placeholder="Villa M" aiuto="Facoltativo: il nome con cui lo chiamate in studio." autoFocus={!id} />
            </div>
            <div className="md:col-span-2">
              <Campo etichetta="Indirizzo e civico" id="i-ind" obbligatorio value={d.indirizzo} onChange={set("indirizzo")} errore={errori.indirizzo} placeholder="Via Temistocle 2" />
            </div>
            <SceltaLocalita
              prefisso="i"
              valore={{ provincia: d.provincia, comune: d.comune, cap: d.cap }}
              onCambia={(v) => {
                setD({ ...d, ...v });
                setDoppioni(null);
              }}
              errore={errori.comune}
            />
          </div>
        </SezioneModulo>

        <SezioneModulo titolo="Dati urbanistici">
          <div className="grid gap-5 md:grid-cols-2">
            <Campo etichetta="Zona urbanistica" id="i-zona" value={d.zona_urbanistica} onChange={set("zona_urbanistica")} placeholder="B2" />
            <Campo etichetta="Strumento urbanistico" id="i-str" value={d.strumento_urbanistico} onChange={set("strumento_urbanistico")} placeholder="PRG 2007" />
            <Campo etichetta="Destinazione d'uso" id="i-dest" value={d.destinazione_uso} onChange={set("destinazione_uso")} placeholder="Residenziale" />
            <div className="grid grid-cols-2 gap-3">
              <Campo etichetta="Superficie (m²)" id="i-sup" value={d.superficie_mq} onChange={set("superficie_mq")} errore={errori.superficie_mq} inputMode="decimal" />
              <Campo etichetta="Anno di costruzione" id="i-anno" value={d.anno_costruzione} onChange={set("anno_costruzione")} errore={errori.anno_costruzione} inputMode="numeric" />
            </div>
          </div>
        </SezioneModulo>

        <SezioneModulo titolo="Vincoli">
          <div className="flex flex-wrap gap-2">
            {VINCOLI.map((v) => {
              const scelto = d.vincoli.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  role="checkbox"
                  aria-checked={scelto}
                  onClick={() => alternaVincolo(v)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[0.875rem] transition-colors",
                    scelto ? "border-inchiostro bg-inchiostro text-superficie" : "border-linea-forte text-inchiostro-2 hover:bg-superficie-2",
                  )}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </SezioneModulo>

        <SezioneModulo titolo="Note">
          <AreaTesto etichetta="Note" id="i-note" value={d.note} onChange={set("note")} />
        </SezioneModulo>

        {!id ? <p className="text-sm text-tenue">I dati catastali (foglio, particella, subalterno…) si aggiungono dalla scheda, dopo il salvataggio. La posizione sulla mappa si calcola dall&apos;indirizzo.</p> : null}

        {doppioni?.length ? (
          <div role="alert" className="rounded-medio border border-[color:var(--stato-preventivo)]/40 bg-[color:var(--stato-preventivo)]/8 p-4">
            <p className="text-[0.9375rem] font-medium">C&apos;è già un immobile a questo indirizzo</p>
            <ul className="mt-2 flex flex-col gap-1 text-[0.9375rem]">
              {doppioni.map((x) => (
                <li key={x.id}>
                  <Link href={`/immobili/${x.id}`} className="text-accento hover:underline">
                    {x.nome}
                  </Link>
                  <span className="text-tenue"> · {x.indirizzo}</span>
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
            {inCorso ? "Salvataggio…" : id ? "Salva modifiche" : "Salva immobile"}
          </button>
          <button type="button" onClick={annulla} disabled={inCorso} className={classePillola}>
            Annulla
          </button>
        </div>
      </div>
    </form>
  );
}
