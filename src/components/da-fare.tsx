"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CalendarX2,
  Footprints,
  Gavel,
  LandPlot,
  Mail,
  NotebookPen,
  Phone,
  ReceiptText,
  SquarePen,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Pannello } from "@/components/ui";
import { FONDI, type TipoFondo } from "@/lib/fondi";
import { cn } from "@/lib/utils";
import type { AttivitaRecente, GruppoDaFare, TipoDaFare, VoceDaFare } from "@/lib/da-fare";

const GRUPPI: Record<GruppoDaFare, string> = {
  ritardo: "In ritardo",
  presto: "Questa settimana e la prossima",
  avanzare: "Da far avanzare",
};

const TIPI: Record<TipoDaFare, { fondo: TipoFondo; icona: LucideIcon }> = {
  fase: { fondo: "commessa", icona: CalendarClock },
  preventivo: { fondo: "preventivo", icona: ReceiptText },
  bozza: { fondo: "preventivo", icona: SquarePen },
  prefattibilita: { fondo: "prefattibilita", icona: LandPlot },
};

const TONI: Record<VoceDaFare["tono"], string> = {
  allarme: "var(--stato-sospesa)",
  attenzione: "var(--stato-preventivo)",
  neutro: "var(--tenue)",
};

const DIARIO: Record<string, { etichetta: string; icona: LucideIcon }> = {
  nota: { etichetta: "ha scritto una nota", icona: NotebookPen },
  telefonata: { etichetta: "ha registrato una telefonata", icona: Phone },
  riunione: { etichetta: "ha registrato una riunione", icona: Users },
  sopralluogo: { etichetta: "ha registrato un sopralluogo", icona: Footprints },
  email: { etichetta: "ha registrato una email", icona: Mail },
  decisione: { etichetta: "ha registrato una decisione", icona: Gavel },
};

function stileTinta(fondo: TipoFondo): CSSProperties {
  const f = FONDI[fondo];
  return { background: `linear-gradient(145deg, ${f.chiaro} 0%, ${f.base} 100%)` };
}

const relativo = new Intl.RelativeTimeFormat("it-IT", { numeric: "auto" });
function quandoAttivita(iso: string, adesso: number) {
  const minuti = Math.round((new Date(iso).getTime() - adesso) / 60_000);
  if (minuti > -60) return relativo.format(Math.min(minuti, 0), "minute");
  const ore = Math.round(minuti / 60);
  if (ore > -24) return relativo.format(ore, "hour");
  const giorni = Math.round(ore / 24);
  if (giorni > -7) return relativo.format(giorni, "day");
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(new Date(iso));
}

export function DaFare({
  voci,
  attivita,
  profiloId,
  vedeTutto,
  adesso,
}: {
  voci: VoceDaFare[];
  attivita: AttivitaRecente[];
  profiloId: string;
  /** Titolari: predefinito "Tutto lo studio"; collaboratori: "Le mie" */
  vedeTutto: boolean;
  /** Istante della lettura (per le date relative, uguale su server e browser) */
  adesso: number;
}) {
  const [filtro, setFiltro] = useState<"tutti" | "mie">(vedeTutto ? "tutti" : "mie");
  const visibili = filtro === "tutti" ? voci : voci.filter((v) => v.responsabileId === profiloId);
  const quante = visibili.length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Pannello className="lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-5 md:px-6">
          <div>
            <h2 className="text-base font-medium">Da fare</h2>
            <p className="mt-0.5 text-sm text-tenue">
              {quante === 0 ? "Niente in sospeso" : quante === 1 ? "1 cosa da seguire" : `${quante} cose da seguire`}
            </p>
          </div>
          <div role="radiogroup" aria-label="Mostra" className="flex gap-1.5">
            {(
              [
                ["tutti", "Tutto lo studio"],
                ["mie", "Le mie"],
              ] as const
            ).map(([valore, etichetta]) => (
              <button
                key={valore}
                type="button"
                role="radio"
                aria-checked={filtro === valore}
                onClick={() => setFiltro(valore)}
                className={cn(
                  "h-8 rounded-full border px-3.5 text-[0.8125rem] transition-colors",
                  filtro === valore
                    ? "border-inchiostro bg-inchiostro text-superficie"
                    : "border-linea-forte text-inchiostro-2 hover:bg-superficie-2",
                )}
              >
                {etichetta}
              </button>
            ))}
          </div>
        </div>

        {quante === 0 ? (
          <p className="px-5 pb-6 pt-2 text-[0.9375rem] text-inchiostro-2 md:px-6">
            {filtro === "mie" && voci.length > 0
              ? "Niente di tuo in sospeso. Il resto dello studio è in “Tutto lo studio”."
              : "Nessuna scadenza vicina e nessun preventivo in attesa. Ottimo lavoro."}
          </p>
        ) : (
          <ul className="pb-2">
            {visibili.map((v, i) => {
              const nuovoGruppo = i === 0 || visibili[i - 1].gruppo !== v.gruppo;
              const t = TIPI[v.tipo];
              const Icona = v.gruppo === "ritardo" && v.tipo === "fase" ? CalendarX2 : t.icona;
              return (
                <li key={v.id}>
                  {nuovoGruppo ? (
                    <p className="px-5 pb-1.5 pt-4 text-[0.6875rem] uppercase tracking-[0.12em] text-tenue md:px-6">
                      {GRUPPI[v.gruppo]}
                    </p>
                  ) : null}
                  <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-linea px-5 py-3 md:grid-cols-[2rem_minmax(0,1fr)_auto_auto] md:px-6">
                    <span className="grid size-8 place-items-center rounded-full text-[#fbf6ee]" style={stileTinta(t.fondo)}>
                      <Icona aria-hidden className="size-4" strokeWidth={1.9} />
                    </span>
                    <Link href={v.scheda} className="min-w-0 hover:underline-offset-2 [&:hover_.titolo]:underline">
                      <span className="titolo block truncate text-[0.9375rem]">{v.titolo}</span>
                      <span className="block truncate text-[0.8125rem] text-tenue">{v.contesto}</span>
                    </Link>
                    <span
                      className="col-start-2 row-start-2 whitespace-nowrap text-[0.8125rem] md:col-auto md:row-auto"
                      style={{ color: TONI[v.tono] }}
                    >
                      {v.quando}
                    </span>
                    <Link
                      href={v.azione.href}
                      className="col-start-3 row-span-2 row-start-1 whitespace-nowrap rounded-full border border-linea-forte px-3.5 py-1.5 text-[0.8125rem] text-inchiostro transition-colors hover:bg-superficie-2 md:col-auto md:row-auto md:row-span-1"
                    >
                      {v.azione.etichetta}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Pannello>

      <Pannello>
        <h2 className="px-5 pb-2 pt-5 text-base font-medium md:px-6">Ultime attività</h2>
        {attivita.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-tenue md:px-6">
            Qui compariranno note, telefonate e sopralluoghi registrati nel diario delle commesse.
          </p>
        ) : (
          <ul className="pb-2">
            {attivita.map((a) => {
              const d = DIARIO[a.tipo] ?? DIARIO.nota;
              const Icona = d.icona;
              const chi = a.autoreId === profiloId ? "Tu" : (a.autore ?? "Qualcuno");
              const azione = a.autoreId === profiloId ? d.etichetta.replace(/^ha /, "hai ") : d.etichetta;
              const contenuto = (
                <>
                  <Icona aria-hidden className="mt-0.5 size-4 shrink-0 text-tenue" strokeWidth={1.7} />
                  <span className="min-w-0">
                    <span className="block text-[0.875rem] leading-snug">
                      <span className="font-medium">{chi}</span> {azione}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.8125rem] text-inchiostro-2">{a.testo}</span>
                    <span className="block truncate text-[0.75rem] text-tenue">
                      {[a.commessa ? [a.commessa.codice, a.commessa.titolo].filter(Boolean).join(" · ") : null, quandoAttivita(a.data, adesso)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={a.id} className="border-t border-linea">
                  {a.commessa ? (
                    <Link href={`/commesse/${a.commessa.id}`} className="flex gap-3 px-5 py-3 transition-colors hover:bg-superficie-2/50 md:px-6">
                      {contenuto}
                    </Link>
                  ) : (
                    <div className="flex gap-3 px-5 py-3 md:px-6">{contenuto}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Pannello>
    </div>
  );
}
