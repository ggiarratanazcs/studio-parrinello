"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { BarraRegistro, FiltroGruppi, Intestazione, PiedeRegistro, filtroGruppi, useRegistro, type GruppoFiltro } from "@/components/registro";
import type { Pratica } from "@/lib/dati";
import { STATI_PREFATTIBILITA, STATI_PREVENTIVO } from "@/lib/preventivo";
import { formattaData, formattaEuro } from "@/lib/utils";

const COLONNE = "md:grid-cols-[7.5rem_minmax(0,1fr)_7rem_8rem_8rem_7rem]";

type Chiave = "numero" | "titolo" | "data" | "importo" | "stato" | "commessa";

const CONFIG = {
  preventivo: {
    stati: STATI_PREVENTIVO,
    base: "/preventivi",
    nome: ["preventivo", "preventivi"] as [string, string],
    importo: "Totale",
    gruppi: [
      { id: "aperti", etichetta: "Aperti", stati: ["bozza", "inviato"] },
      { id: "chiusi", etichetta: "Chiusi", stati: ["accettato", "rifiutato", "superato"] },
      { id: "tutti", etichetta: "Tutti" },
    ] as GruppoFiltro[],
  },
  prefattibilita: {
    stati: STATI_PREFATTIBILITA,
    base: "/prefattibilita",
    nome: ["pre-fattibilità", "pre-fattibilità"] as [string, string],
    importo: "Onorario",
    gruppi: [
      { id: "aperte", etichetta: "Aperte", stati: ["in_corso", "consegnata"] },
      { id: "archivio", etichetta: "Archivio", stati: ["convertita", "archiviata"] },
      { id: "tutte", etichetta: "Tutte" },
    ] as GruppoFiltro[],
  },
};

const testo = (p: Pratica) => [p.numero, p.titolo, p.cliente, p.comune, p.commessa_codice, p.integrativo ? "integrativo" : null];

/** Preventivi o pre-fattibilità in forma di registro: ricerca, schede per stato, colonne ordinabili. */
export function TabellaPratiche({ tipo, pratiche }: { tipo: "preventivo" | "prefattibilita"; pratiche: Pratica[] }) {
  const c = CONFIG[tipo];
  const ordineStati = Object.keys(c.stati);
  const info = (s: string) => c.stati[s] ?? { etichetta: s, colore: "var(--tenue)" };
  const statoDi = (p: Pratica) => p.stato ?? "";

  const r = useRegistro<Pratica, Chiave>({
    righe: pratiche,
    testo,
    valore: valoreDi(ordineStati),
    filtro: filtroDi(c.gruppi),
    iniziale: { chiave: "numero", verso: "desc" },
    filtroIniziale: `${c.gruppi[0].id}|`,
  });

  const intestazione = (chiave: Chiave, nome: string, destra = false) => (
    <Intestazione chiave={chiave} ordine={r.ordine} onOrdina={r.ordina} destra={destra}>
      {nome}
    </Intestazione>
  );

  return (
    <>
      <BarraRegistro cerca={r.cerca} onCerca={r.setCerca} segnaposto="Cerca">
        <FiltroGruppi
          gruppi={c.gruppi}
          ordine={ordineStati}
          info={info}
          stati={pratiche.map(statoDi)}
          scelto={r.scelto}
          onScegli={r.setScelto}
        />
      </BarraRegistro>
      <div role="table" aria-label={c.nome[1]}>
        <div role="row" className={`elenco-intestazione etichetta hidden border-b border-linea px-6 py-3 md:grid ${COLONNE} md:gap-x-4`}>
          {intestazione("numero", "Numero")}
          {intestazione("titolo", "Titolo")}
          {intestazione("data", "Data")}
          {intestazione("importo", c.importo, true)}
          {intestazione("stato", "Stato")}
          {intestazione("commessa", "Commessa")}
        </div>
        <div role="rowgroup" className="elenco divide-y divide-linea">
          {r.visibili.map((p) => {
            const s = info(statoDi(p));
            return (
              <Link
                key={p.id}
                href={`${c.base}/${p.id}`}
                role="row"
                className={`grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-superficie-2/50 md:items-center md:px-6 ${COLONNE}`}
              >
                <span role="cell" className="numeri etichetta col-start-1 row-start-1 md:col-auto md:row-auto">{p.numero}</span>
                <span role="cell" className="col-span-2 row-start-2 min-w-0 md:col-span-1 md:row-auto">
                  <span className="block truncate font-medium">{p.titolo ?? "Senza titolo"}</span>
                  <span className="block truncate text-sm text-tenue">{[p.cliente, p.comune].filter(Boolean).join(", ")}</span>
                </span>
                <span role="cell" className="numeri hidden text-sm text-inchiostro-2 md:block">{formattaData(p.data)}</span>
                <span role="cell" className="numeri hidden text-right text-sm md:block">{formattaEuro(p.importo)}</span>
                <span role="cell" className="col-start-2 row-start-1 justify-self-end md:col-auto md:row-auto md:justify-self-start">
                  <Badge etichetta={s.etichetta} colore={s.colore} />
                </span>
                <span role="cell" className="numeri hidden text-sm text-inchiostro-2 md:block">{p.commessa_codice ?? "—"}</span>
              </Link>
            );
          })}
          {r.visibili.length === 0 ? (
            <p className="px-6 py-10 text-center text-[0.9375rem] text-tenue">Nessun risultato per la ricerca o il filtro.</p>
          ) : null}
        </div>
      </div>
      <PiedeRegistro visibili={r.visibili.length} totali={pratiche.length} nome={c.nome} />
    </>
  );
}

// Funzioni stabili per tipo (memorizzate per non ricalcolare l'elenco a ogni render)
const cacheValore = new Map<string, (p: Pratica, k: Chiave) => unknown>();
function valoreDi(ordineStati: string[]) {
  const chiave = ordineStati.join(",");
  if (!cacheValore.has(chiave)) {
    cacheValore.set(chiave, (p, k) => {
      switch (k) {
        case "numero":
          return p.numero;
        case "titolo":
          return p.titolo;
        case "data":
          return p.data;
        case "importo":
          return p.importo;
        case "stato":
          return ordineStati.indexOf(p.stato ?? "");
        case "commessa":
          return p.commessa_codice;
      }
    });
  }
  return cacheValore.get(chiave)!;
}

const cacheFiltro = new Map<GruppoFiltro[], (p: Pratica, scelto: string) => boolean>();
function filtroDi(gruppi: GruppoFiltro[]) {
  if (!cacheFiltro.has(gruppi)) {
    const f = filtroGruppi(gruppi);
    cacheFiltro.set(gruppi, (p, scelto) => f(p.stato ?? "", scelto));
  }
  return cacheFiltro.get(gruppi)!;
}
