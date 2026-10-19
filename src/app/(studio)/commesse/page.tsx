import { Suspense } from "react";
import { Landmark, Layers, User } from "lucide-react";
import { PulsanteNuovo } from "@/components/tessere";
import { Cartiglio } from "@/components/cartiglio";
import { Pannello, Scheletro, Vuoto } from "@/components/ui";
import { TabellaCommesse } from "@/components/tabella-commesse";
import { elencoCommesse, fasiPerGantt } from "@/lib/dati";
import Link from "next/link";
import { GanttChart, Table2 } from "lucide-react";
import { GanttCommesse } from "@/components/gantt-commesse";
import { Espandibile } from "@/components/registro";
import { oggiIso } from "@/lib/utils";

export const metadata = { title: "Commesse" };

const nuovaCommessa = (
  <PulsanteNuovo href="/nuova/commessa" tipo="commessa">Nuova</PulsanteNuovo>
);

/** Pulsante accanto a "Nuova": passa dalla tabella al Gantt generale e viceversa. */
function PulsanteVista({ gantt }: { gantt: boolean }) {
  const Icona = gantt ? Table2 : GanttChart;
  return (
    <Link
      href={gantt ? "/commesse" : "/commesse?vista=gantt"}
      scroll={false}
      className="inline-flex h-11 items-center gap-2.5 rounded-full border border-linea-forte bg-superficie py-1 pl-1.5 pr-5 text-[0.9375rem] font-medium text-inchiostro shadow-[0_8px_20px_-14px_rgba(43,42,40,0.5)] transition-colors hover:bg-superficie-2"
    >
      <span aria-hidden className="grid size-8 place-items-center rounded-full bg-superficie-2">
        <Icona className="size-4" strokeWidth={1.8} />
      </span>
      {gantt ? "Tabella" : "Gantt"}
    </Link>
  );
}

export default function PaginaCommesse({ searchParams }: PageProps<"/commesse">) {
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
      <ElencoCommesse searchParams={searchParams} />
    </Suspense>
  );
}

async function ElencoCommesse({ searchParams }: { searchParams: PageProps<"/commesse">["searchParams"] }) {
  const gantt = (await searchParams).vista === "gantt";
  const [commesse, fasi] = await Promise.all([elencoCommesse(), gantt ? fasiPerGantt() : Promise.resolve([])]);
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
        azioni={
          <>
            {nuovaCommessa}
            <PulsanteVista gantt={gantt} />
          </>
        }
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
          <Espandibile>
            {gantt ? <GanttCommesse commesse={commesse} fasi={fasi} oggi={oggiIso()} /> : <TabellaCommesse commesse={commesse} />}
          </Espandibile>
        )}
      </Pannello>
    </>
  );
}
