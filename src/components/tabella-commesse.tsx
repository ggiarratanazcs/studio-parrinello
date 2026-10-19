"use client";

import Link from "next/link";
import { AvanzamentoFasi, StatoBadge } from "@/components/ui";
import { BarraRegistro, FiltroGruppi, Intestazione, PiedeRegistro, filtroGruppi, useRegistro, type GruppoFiltro } from "@/components/registro";
import type { CommessaSintesi } from "@/lib/dati";
import { STATI_COMMESSA, TIPOLOGIE_INTERVENTO, statoCommessa } from "@/lib/dominio";
import { formattaData, formattaEuro } from "@/lib/utils";

/** Colonne della tabella su schermi grandi (impaginazione laterale). */
const COLONNE = "md:grid-cols-[6.5rem_minmax(0,1fr)_11rem_7rem_7rem_8rem]";

type Chiave = "codice" | "titolo" | "intervento" | "onorario" | "apertura" | "stato";

const ORDINE_STATI = Object.keys(STATI_COMMESSA);

// Fuori dal componente: funzioni stabili per il registro
const testo = (c: CommessaSintesi) => [
  c.codice,
  c.titolo,
  c.cliente,
  c.comune,
  c.indirizzo,
  c.responsabile,
  TIPOLOGIE_INTERVENTO[c.tipologia_intervento ?? ""],
  statoCommessa(c.stato).etichetta,
];

const valore = (c: CommessaSintesi, k: Chiave): unknown => {
  switch (k) {
    case "codice":
      return c.codice;
    case "titolo":
      return c.titolo;
    case "intervento":
      return TIPOLOGIE_INTERVENTO[c.tipologia_intervento ?? ""];
    case "onorario":
      return c.onorario_concordato;
    case "apertura":
      return c.data_apertura;
    case "stato":
      return ORDINE_STATI.indexOf(c.stato ?? "contatto");
  }
};

/** Commesse ferme in archivio; tutte le altre sono "in lavorazione". */
const GRUPPI: GruppoFiltro[] = [
  { id: "lavorazione", etichetta: "In lavorazione", stati: ["contatto", "prefattibilita", "preventivo", "attiva", "sospesa"] },
  { id: "archivio", etichetta: "Archivio", stati: ["conclusa", "persa", "annullata"] },
  { id: "tutte", etichetta: "Tutte" },
];
const statoDi = (c: CommessaSintesi) => c.stato ?? "contatto";
const perGruppo = filtroGruppi(GRUPPI);
const filtro = (c: CommessaSintesi, scelto: string) => perGruppo(statoDi(c), scelto);

/** Elenco commesse in forma di registro: ricerca, filtri per stato e colonne ordinabili. */
export function TabellaCommesse({ commesse }: { commesse: CommessaSintesi[] }) {
  const r = useRegistro<CommessaSintesi, Chiave>({
    righe: commesse,
    testo,
    valore,
    filtro,
    iniziale: { chiave: "codice", verso: "desc" },
    filtroIniziale: "lavorazione|",
  });

  const intestazione = (chiave: Chiave, nome: string, destra = false) => (
    <Intestazione chiave={chiave} ordine={r.ordine} onOrdina={r.ordina} destra={destra}>
      {nome}
    </Intestazione>
  );

  return (
    <>
      <BarraRegistro
        cerca={r.cerca}
        onCerca={r.setCerca}
        segnaposto="Cerca codice, titolo, committente, comune…"
      >
        <FiltroGruppi
          gruppi={GRUPPI}
          ordine={ORDINE_STATI}
          info={statoCommessa}
          stati={commesse.map(statoDi)}
          scelto={r.scelto}
          onScegli={r.setScelto}
          nome="Gruppo di commesse"
        />
      </BarraRegistro>
      <div role="table" aria-label="Elenco commesse">
        <div
          role="row"
          className={`elenco-intestazione solo-laterale etichetta hidden border-b border-linea px-6 py-3 md:grid ${COLONNE} md:gap-x-4`}
        >
          {intestazione("codice", "Codice")}
          {intestazione("titolo", "Commessa")}
          {intestazione("intervento", "Intervento")}
          {intestazione("onorario", "Onorario", true)}
          {intestazione("apertura", "Apertura")}
          {intestazione("stato", "Stato")}
        </div>

        <div role="rowgroup" className="elenco divide-y divide-linea">
          {r.visibili.map((c) => (
            <Link
              key={c.id}
              href={`/commesse/${c.id}`}
              role="row"
              className={`grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-superficie-2/50 md:items-center md:px-6 ${COLONNE}`}
            >
              <span role="cell" className="numeri etichetta col-start-1 row-start-1 md:col-auto md:row-auto">
                {c.codice}
              </span>
              <span role="cell" className="col-span-2 row-start-2 min-w-0 md:col-span-1 md:row-auto">
                <span className="block truncate font-medium">{c.titolo}</span>
                <span className="block truncate text-sm text-tenue">{[c.cliente, c.comune].filter(Boolean).join(", ")}</span>
              </span>

              {/* Colonne tabellari: solo impaginazione laterale */}
              <span role="cell" className="solo-laterale hidden text-sm text-inchiostro-2 md:block">
                {TIPOLOGIE_INTERVENTO[c.tipologia_intervento ?? ""] ?? "—"}
              </span>
              <span role="cell" className="solo-laterale numeri hidden text-right text-sm md:block">
                {formattaEuro(c.onorario_concordato)}
              </span>
              <span role="cell" className="solo-laterale numeri hidden text-sm text-inchiostro-2 md:block">
                {formattaData(c.data_apertura)}
              </span>

              {/* Avanzamento delle fasi: solo impaginazione Materia */}
              <span role="cell" className="solo-materia col-span-2 row-start-3 mt-2 md:col-span-3 md:row-auto md:mt-0">
                <AvanzamentoFasi completate={c.fasi_completate ?? 0} totali={c.fasi_totali ?? 0} colore={statoCommessa(c.stato).colore} />
              </span>

              <span role="cell" className="col-start-2 row-start-1 justify-self-end md:col-auto md:row-auto md:justify-self-start">
                <StatoBadge stato={c.stato} />
              </span>
            </Link>
          ))}
          {r.visibili.length === 0 ? (
            <p className="px-6 py-10 text-center text-[0.9375rem] text-tenue">Nessuna commessa corrisponde alla ricerca o al filtro.</p>
          ) : null}
        </div>
      </div>
      <PiedeRegistro visibili={r.visibili.length} totali={commesse.length} nome={["commessa", "commesse"]} />
    </>
  );
}
