import Link from "next/link";
import { ArrowRightLeft, Layers, Percent } from "lucide-react";
import { PulsanteNuovo } from "@/components/tessere";
import { Cartiglio } from "@/components/cartiglio";
import { Badge, Pannello, Vuoto } from "@/components/ui";
import type { Pratica } from "@/lib/dati";
import { STATI_PREFATTIBILITA, STATI_PREVENTIVO } from "@/lib/preventivo";
import { formattaData, formattaEuro } from "@/lib/utils";

const COLONNE = "md:grid-cols-[7.5rem_minmax(0,1fr)_7rem_8rem_8rem_7rem]";

const TESTI = {
  preventivo: {
    titolo: "Preventivi",
    sottotitolo: "Le offerte allo studio dei committenti. Un preventivo accettato si trasforma in commessa.",
    nuovo: "Nuovo",
    href: "/nuova/preventivo",
    base: "/preventivi",
    vuotoTitolo: "Ancora nessun preventivo",
    vuotoTesto: "Prepara la prima offerta: voci per fase, cassa e IVA calcolate, numero P-anno-progressivo assegnato in automatico.",
    inviati: "Inviati",
  },
  prefattibilita: {
    titolo: "Pre-fattibilità",
    sottotitolo: "Analisi urbanistiche e di conformità prima dell'incarico. Diventano un preventivo e, se accettato, una commessa.",
    nuovo: "Nuova",
    href: "/nuova/prefattibilita",
    base: "/prefattibilita",
    vuotoTitolo: "Ancora nessuna pre-fattibilità",
    vuotoTesto: "Registra la prima analisi: vincoli, stato legittimo, titolo edilizio, costo parametrico ed esito.",
    inviati: "Consegnate",
  },
};

export function ElencoPratiche({ tipo, pratiche }: { tipo: "preventivo" | "prefattibilita"; pratiche: Pratica[] }) {
  const t = TESTI[tipo];
  const stati = tipo === "preventivo" ? STATI_PREVENTIVO : STATI_PREFATTIBILITA;
  // Gli integrativi nascono già dentro una commessa: non contano nel tasso di conversione
  const base = pratiche.filter((p) => !p.integrativo);
  const convertite = base.filter((p) => p.commessa_id).length;
  const proseguite = tipo === "prefattibilita" ? base.filter((p) => p.commessa_id || p.preventivo_id).length : convertite;
  const chiuse = base.filter((p) => p.stato !== "bozza" && p.stato !== "in_corso").length;
  const tasso = chiuse ? Math.round((proseguite / chiuse) * 100) : null;

  const nuovo = (
    <PulsanteNuovo href={t.href} tipo={tipo}>{t.nuovo}</PulsanteNuovo>
  );

  return (
    <>
      <Cartiglio tipo={tipo}
        titolo={t.titolo}
        celle={[
          { etichetta: "Totale", valore: pratiche.length, icona: Layers },
          { etichetta: "In commessa", valore: convertite, icona: ArrowRightLeft },
          { etichetta: "Conversione", valore: tasso === null ? "—" : `${tasso}%`, icona: Percent },
        ]}
        azioni={nuovo}
      />
      <Pannello>
        {pratiche.length === 0 ? (
          <Vuoto titolo={t.vuotoTitolo} testo={t.vuotoTesto} azione={nuovo} />
        ) : (
          <div role="table" aria-label={t.titolo}>
            <div role="row" className={`elenco-intestazione solo-laterale etichetta hidden border-b border-linea px-6 py-3 md:grid ${COLONNE} md:gap-x-4`}>
              <span role="columnheader">Numero</span>
              <span role="columnheader">Titolo</span>
              <span role="columnheader">Data</span>
              <span role="columnheader" className="text-right">{tipo === "preventivo" ? "Totale" : "Onorario"}</span>
              <span role="columnheader">Stato</span>
              <span role="columnheader">Commessa</span>
            </div>
            <div role="rowgroup" className="elenco divide-y divide-linea">
              {pratiche.map((p) => {
                const s = stati[p.stato ?? ""] ?? { etichetta: p.stato ?? "", colore: "var(--tenue)" };
                return (
                  <Link
                    key={p.id}
                    href={`${t.base}/${p.id}`}
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
            </div>
          </div>
        )}
      </Pannello>
    </>
  );
}
