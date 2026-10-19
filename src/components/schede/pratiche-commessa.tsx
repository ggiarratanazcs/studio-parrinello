import Link from "next/link";
import { ArrowRight, DraftingCompass, LandPlot, ReceiptText } from "lucide-react";
import type { ReactNode } from "react";
import { Pannello } from "@/components/ui";
import type { Commessa } from "@/lib/dati";
import { ESITI_PREFATTIBILITA } from "@/lib/dominio";
import { FONDI } from "@/lib/fondi";
import { STATI_PREFATTIBILITA, STATI_PREVENTIVO } from "@/lib/preventivo";
import { formattaData, formattaEuro } from "@/lib/utils";

type Preventivo = NonNullable<Commessa["preventivi"]>[number];
type Prefattibilita = NonNullable<Commessa["prefattibilita"]>[number];

/** Riquadro di un documento della catena (pre-fattibilità, preventivo, commessa). */
function Anello({
  href,
  colore,
  icona,
  tipo,
  numero,
  titolo,
  dettagli,
  stato,
}: {
  href?: string;
  colore: string;
  icona: ReactNode;
  tipo: string;
  numero: string;
  titolo?: string | null;
  dettagli?: string;
  stato?: { etichetta: string; colore: string };
}) {
  const contenuto = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-full text-white" style={{ background: colore, boxShadow: `0 6px 14px -8px ${colore}` }}>
        {icona}
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-tenue">{tipo}</span>
        <span className="numeri block font-medium">{numero}</span>
        {titolo ? <span className="block truncate text-sm text-inchiostro-2">{titolo}</span> : null}
        {dettagli ? <span className="block truncate text-xs text-tenue">{dettagli}</span> : null}
        {stato ? (
          <span className="mt-1 inline-flex items-center gap-1.5 text-xs" style={{ color: stato.colore }}>
            <span className="size-1.5 rounded-full" style={{ background: stato.colore }} />
            {stato.etichetta}
          </span>
        ) : null}
      </span>
    </>
  );
  const classe = "tessera flex min-w-0 flex-1 items-start gap-3 rounded-[18px] p-3 sm:max-w-72";
  return href ? (
    <Link href={href} className={`${classe} transition-transform hover:-translate-y-0.5`}>
      {contenuto}
    </Link>
  ) : (
    <div className={classe}>{contenuto}</div>
  );
}

const Freccia = () => <ArrowRight aria-hidden className="mx-auto size-4 shrink-0 rotate-90 text-tenue sm:mx-0 sm:rotate-0" strokeWidth={1.8} />;

/**
 * Pratiche della commessa: da dove nasce (pre-fattibilità e preventivo d'origine),
 * i preventivi integrativi e il riepilogo dell'onorario.
 */
export function PraticheCommessa({ c, azioneNuovo }: { c: Commessa; azioneNuovo?: ReactNode }) {
  const preventivi = c.preventivi ?? [];
  const prefattibilita = c.prefattibilita ?? [];
  const origine: Preventivo | undefined = preventivi.find((p) => !p.integrativo);
  const integrativi = preventivi.filter((p) => p.integrativo).sort((a, b) => a.data_emissione.localeCompare(b.data_emissione));
  const daPref: Prefattibilita | undefined = prefattibilita[0];

  const accettati = integrativi.filter((p) => p.stato === "accettato").reduce((t, p) => t + (p.imponibile ?? 0), 0);
  const complessivo = c.onorario_concordato ?? 0;
  const iniziale = complessivo - accettati;

  const statoPrev = (s: string) => STATI_PREVENTIVO[s] ?? STATI_PREVENTIVO.bozza;
  const statoPref = (s: string) => STATI_PREFATTIBILITA[s] ?? STATI_PREFATTIBILITA.in_corso;

  return (
    <div className="flex flex-col gap-6">
      <Pannello>
        <div className="border-b border-linea px-5 py-4 md:px-6">
          <h2 className="text-base font-medium">Origine della commessa</h2>
          <p className="mt-0.5 text-sm text-tenue">I documenti da cui è nata, in ordine.</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 px-5 py-5 sm:flex-row sm:items-center md:px-6">
          {daPref ? (
            <>
              <Anello
                href={`/prefattibilita/${daPref.id}`}
                colore={FONDI.prefattibilita.chiaro}
                icona={<LandPlot className="size-4" strokeWidth={1.8} />}
                tipo="Pre-fattibilità"
                numero={daPref.numero ?? "—"}
                titolo={daPref.titolo}
                dettagli={[ESITI_PREFATTIBILITA[daPref.esito ?? ""], daPref.onorario ? formattaEuro(daPref.onorario) : null].filter(Boolean).join(" · ")}
                stato={statoPref(daPref.stato)}
              />
              <Freccia />
            </>
          ) : null}
          {origine ? (
            <>
              <Anello
                href={`/preventivi/${origine.id}`}
                colore={FONDI.preventivo.chiaro}
                icona={<ReceiptText className="size-4" strokeWidth={1.8} />}
                tipo="Preventivo"
                numero={origine.numero ?? "—"}
                titolo={origine.titolo}
                dettagli={[formattaData(origine.data_emissione), origine.imponibile != null ? formattaEuro(origine.imponibile) : null].filter(Boolean).join(" · ")}
                stato={statoPrev(origine.stato)}
              />
              <Freccia />
            </>
          ) : null}
          <Anello
            colore={FONDI.commessa.chiaro}
            icona={<DraftingCompass className="size-4" strokeWidth={1.8} />}
            tipo="Commessa"
            numero={c.codice ?? "—"}
            titolo={c.titolo}
            dettagli={`Aperta il ${formattaData(c.data_apertura)}`}
          />
        </div>
        {!daPref && !origine ? (
          <p className="px-5 pb-5 text-sm text-tenue md:px-6">Commessa creata direttamente, senza pre-fattibilità o preventivo.</p>
        ) : null}
      </Pannello>

      <Pannello>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-linea px-5 py-4 md:px-6">
          <div>
            <h2 className="text-base font-medium">Preventivi integrativi</h2>
            <p className="mt-0.5 text-sm text-tenue">Varianti e prestazioni aggiuntive chieste durante la commessa.</p>
          </div>
          {azioneNuovo}
        </div>
        {integrativi.length === 0 ? (
          <p className="px-5 py-6 text-[0.9375rem] text-tenue md:px-6">Nessun preventivo integrativo.</p>
        ) : (
          <ul className="divide-y divide-linea">
            {integrativi.map((p) => {
              const s = statoPrev(p.stato);
              return (
                <li key={p.id}>
                  <Link href={`/preventivi/${p.id}`} className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-superficie-2/60 md:px-6">
                    <span className="numeri etichetta">{p.numero}</span>
                    <span className="min-w-0">
                      <span className="block truncate">{p.titolo ?? "Preventivo integrativo"}</span>
                      <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: s.colore }}>
                        <span className="size-1.5 rounded-full" style={{ background: s.colore }} />
                        {s.etichetta} · <span className="text-tenue">{formattaData(p.data_emissione)}</span>
                      </span>
                    </span>
                    <span className="numeri text-[0.9375rem]">{p.imponibile != null ? formattaEuro(p.imponibile) : "—"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <dl className="grid gap-x-6 gap-y-2 border-t border-linea px-5 py-4 text-[0.9375rem] sm:grid-cols-3 md:px-6">
          <div>
            <dt className="etichetta">Onorario iniziale</dt>
            <dd className="numeri mt-0.5">{formattaEuro(iniziale)}</dd>
          </div>
          <div>
            <dt className="etichetta">Integrativi accettati</dt>
            <dd className="numeri mt-0.5">{accettati ? `+ ${formattaEuro(accettati)}` : "—"}</dd>
          </div>
          <div>
            <dt className="etichetta">Onorario complessivo</dt>
            <dd className="numeri mt-0.5 font-medium">{formattaEuro(complessivo)}</dd>
          </div>
        </dl>
      </Pannello>
    </div>
  );
}
