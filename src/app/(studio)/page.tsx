import { Suspense } from "react";
import Link from "next/link";
import { Cartiglio } from "@/components/cartiglio";
import { Pannello, Scheletro, StatoBadge, Vuoto } from "@/components/ui";
import { elencoCommesse, type CommessaSintesi } from "@/lib/dati";
import { STATI_COMMESSA, type StatoCommessa } from "@/lib/dominio";
import { formattaEuro } from "@/lib/utils";

export const metadata = { title: "Panoramica" };

/** Le fasi del ciclo di vita, nell'ordine in cui una commessa le attraversa. */
const PERCORSO: StatoCommessa[] = ["contatto", "prefattibilita", "preventivo", "attiva", "conclusa"];
const APERTE: StatoCommessa[] = ["contatto", "prefattibilita", "preventivo", "attiva", "sospesa"];

export default function Panoramica() {
  return (
    <Suspense fallback={<PanoramicaSegnaposto />}>
      <PanoramicaContenuto />
    </Suspense>
  );
}

async function PanoramicaContenuto() {
  const commesse = await elencoCommesse();
  const perStato = (s: StatoCommessa) => commesse.filter((c) => c.stato === s).length;
  const aperte = commesse.filter((c) => APERTE.includes(c.stato as StatoCommessa));
  const portafoglio = commesse
    .filter((c) => c.stato === "attiva")
    .reduce((somma, c) => somma + (c.onorario_concordato ?? 0), 0);

  return (
    <>
      <Cartiglio
        titolo="Panoramica"
        sottotitolo="Lo stato dello studio: dove si trovano le commesse e cosa richiede attenzione."
        celle={[
          { etichetta: "Commesse aperte", valore: aperte.length },
          { etichetta: "In corso", valore: perStato("attiva") },
          { etichetta: "Onorari in corso", valore: formattaEuro(portafoglio) },
        ]}
      />

      <Percorso commesse={commesse} />

      <Pannello className="mt-6">
        <div className="flex items-baseline justify-between border-b border-linea px-5 py-4 md:px-6">
          <h2 className="text-base font-medium">Commesse aperte</h2>
          <Link href="/commesse" className="text-sm text-accento hover:underline">
            Vedi tutte
          </Link>
        </div>
        {aperte.length === 0 ? (
          <Vuoto
            titolo="Nessuna commessa aperta"
            testo="Quando registri un primo contatto con un cliente, la commessa compare qui e la segui fino alla chiusura."
          />
        ) : (
          <ul className="elenco divide-y divide-linea">
            {aperte.slice(0, 6).map((c) => (
              <RigaCommessa key={c.id} c={c} />
            ))}
          </ul>
        )}
      </Pannello>
    </>
  );
}

/** Barra a segmenti: quante commesse si trovano in ciascuna fase del percorso. */
function Percorso({ commesse }: { commesse: CommessaSintesi[] }) {
  const totale = PERCORSO.reduce((n, s) => n + commesse.filter((c) => c.stato === s).length, 0);

  return (
    <Pannello className="px-5 py-5 md:px-6">
      <h2 className="text-base font-medium">Percorso delle commesse</h2>
      <p className="mt-1 text-sm text-tenue">Dal primo contatto alla chiusura dei lavori.</p>

      <ol className="mt-5 grid grid-cols-5 gap-1.5">
        {PERCORSO.map((s) => {
          const n = commesse.filter((c) => c.stato === s).length;
          const quota = totale ? n / totale : 0;
          return (
            <li key={s} className="min-w-0">
              <div className="relative h-16 overflow-hidden rounded-s bg-superficie-2 md:h-20">
                <div
                  className="absolute inset-x-0 bottom-0 transition-[height] duration-700"
                  style={{
                    height: `${Math.max(quota * 100, n > 0 ? 8 : 0)}%`,
                    background: STATI_COMMESSA[s].colore,
                  }}
                />
              </div>
              <p className="numeri mt-2 text-xl font-medium" style={{ fontVariationSettings: '"wdth" 110' }}>
                {n}
              </p>
              <p className="etichetta leading-tight [overflow-wrap:anywhere]">{STATI_COMMESSA[s].etichetta}</p>
            </li>
          );
        })}
      </ol>
    </Pannello>
  );
}

function RigaCommessa({ c }: { c: CommessaSintesi }) {
  return (
    <li className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-5 py-4 md:grid-cols-[6rem_1fr_10rem_9rem] md:items-center md:px-6">
      <span className="numeri etichetta col-start-1 row-start-1 md:col-auto md:row-auto">{c.codice}</span>
      <span className="col-span-2 row-start-2 min-w-0 md:col-span-1 md:row-auto">
        <span className="block truncate font-medium">{c.titolo}</span>
        <span className="block truncate text-sm text-tenue">
          {[c.cliente, c.comune].filter(Boolean).join(", ")}
        </span>
      </span>
      <span className="hidden text-sm text-inchiostro-2 md:block">{c.responsabile ?? "—"}</span>
      <span className="col-start-2 row-start-1 justify-self-end md:col-auto md:row-auto md:justify-self-start">
        <StatoBadge stato={c.stato} />
      </span>
    </li>
  );
}

function PanoramicaSegnaposto() {
  return (
    <>
      <Cartiglio
        titolo="Panoramica"
        sottotitolo="Lo stato dello studio: dove si trovano le commesse e cosa richiede attenzione."
      />
      <Pannello className="px-6 py-6">
        <Scheletro className="h-4 w-48" />
        <Scheletro className="mt-6 h-20 w-full" />
      </Pannello>
    </>
  );
}
