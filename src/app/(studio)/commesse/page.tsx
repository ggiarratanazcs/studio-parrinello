import { Suspense } from "react";
import { Landmark, Layers, User } from "lucide-react";
import { PulsanteNuovo } from "@/components/tessere";
import { Cartiglio } from "@/components/cartiglio";
import Link from "next/link";
import { AvanzamentoFasi, Pannello, Scheletro, StatoBadge, Vuoto } from "@/components/ui";
import { elencoCommesse } from "@/lib/dati";
import { TIPOLOGIE_INTERVENTO, statoCommessa } from "@/lib/dominio";
import { formattaData, formattaEuro } from "@/lib/utils";

export const metadata = { title: "Commesse" };

const nuovaCommessa = (
  <PulsanteNuovo href="/nuova/commessa" tipo="commessa">Nuova</PulsanteNuovo>
);

/** Colonne della tabella su schermi grandi (impaginazione laterale). */
const COLONNE = "md:grid-cols-[6.5rem_minmax(0,1fr)_11rem_7rem_7rem_8rem]";

export default function PaginaCommesse() {
  return (
    <Suspense
      fallback={
        <>
          <Cartiglio tipo="commessa" titolo="Commesse" azioni={nuovaCommessa} />
          <Pannello className="p-6">
            <Scheletro className="h-4 w-full" />
            <Scheletro className="mt-4 h-4 w-5/6" />
            <Scheletro className="mt-4 h-4 w-4/6" />
          </Pannello>
        </>
      }
    >
      <ElencoCommesse />
    </Suspense>
  );
}

async function ElencoCommesse() {
  const commesse = await elencoCommesse();
  const pubbliche = commesse.filter((c) => c.committenza === "pubblica").length;

  return (
    <>
      <Cartiglio tipo="commessa"
        titolo="Commesse"
        sottotitolo="Ogni incarico dello studio, dal primo contatto alla chiusura."
        celle={[
          { etichetta: "Totale", valore: commesse.length, icona: Layers },
          { etichetta: "Private", valore: commesse.length - pubbliche, icona: User },
          { etichetta: "Pubbliche", valore: pubbliche, icona: Landmark },
        ]}
        azioni={nuovaCommessa}
      />

      <Pannello>
        {commesse.length === 0 ? (
          <Vuoto
            azione={nuovaCommessa}
            titolo="Ancora nessuna commessa"
            testo={
              <>
                Una commessa nasce dal primo contatto con il committente. Il codice viene assegnato in
                automatico (per esempio <span className="numeri text-inchiostro">2026-001</span>).
              </>
            }
          />
        ) : (
          <div role="table" aria-label="Elenco commesse">
            <div
              role="row"
              className={`elenco-intestazione solo-laterale etichetta hidden border-b border-linea px-6 py-3 md:grid ${COLONNE} md:gap-x-4`}
            >
              <span role="columnheader">Codice</span>
              <span role="columnheader">Commessa</span>
              <span role="columnheader">Intervento</span>
              <span role="columnheader" className="text-right">Onorario</span>
              <span role="columnheader">Apertura</span>
              <span role="columnheader">Stato</span>
            </div>

            <div role="rowgroup" className="elenco divide-y divide-linea">
              {commesse.map((c) => (
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
                    <span className="block truncate text-sm text-tenue">
                      {[c.cliente, c.comune].filter(Boolean).join(", ")}
                    </span>
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
                    <AvanzamentoFasi
                      completate={c.fasi_completate ?? 0}
                      totali={c.fasi_totali ?? 0}
                      colore={statoCommessa(c.stato).colore}
                    />
                  </span>

                  <span role="cell" className="col-start-2 row-start-1 justify-self-end md:col-auto md:row-auto md:justify-self-start">
                    <StatoBadge stato={c.stato} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Pannello>
    </>
  );
}
