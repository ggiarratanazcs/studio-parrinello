"use client";

import { CalendarRange } from "lucide-react";
import type { Commessa } from "@/lib/dati";
import { STATI_FASE } from "@/lib/dominio";
import { COLORI_FASE } from "./fasi-commessa";
import { breve, daGiorno, giorno, GIORNO, MESI } from "@/lib/calendario";

type Fase = NonNullable<Commessa["fasi"]>[number];

/**
 * Cronoprogramma (Gantt) della commessa: una riga per fase, barra delle date previste
 * con l'avanzamento, sotto un filo con le date effettive; linea di oggi e fine prevista della commessa.
 */
export function Cronoprogramma({
  fasi,
  apertura,
  finePrevista,
  oggi,
}: {
  fasi: Fase[];
  apertura: string | null;
  finePrevista: string | null;
  /** Data di oggi (AAAA-MM-GG), calcolata dal server */
  oggi: string;
}) {
  const ordinate = [...fasi].sort((a, b) => a.ordine - b.ordine);

  const date = ordinate
    .flatMap((f) => [f.data_inizio_prev, f.data_fine_prev, f.data_inizio_eff, f.data_fine_eff])
    .filter((d): d is string => Boolean(d));
  const pianificate = ordinate.filter((f) => f.data_inizio_prev && f.data_fine_prev).length;

  if (!date.length) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-superficie-2 text-tenue">
          <CalendarRange className="size-6" strokeWidth={1.5} />
        </span>
        <p className="font-medium">Cronoprogramma da impostare</p>
        <p className="max-w-md text-[0.9375rem] text-tenue">
          Torna alla tabella e inserisci le date di inizio e fine delle fasi: qui comparirà il diagramma dei tempi.
        </p>
      </div>
    );
  }

  // Intervallo: dal primo giorno del mese più vecchio all'ultimo del mese più lontano
  const tutte = [...date, ...(apertura ? [apertura] : []), ...(finePrevista ? [finePrevista] : []), oggi].map(giorno);
  const minimo = daGiorno(Math.min(...tutte));
  const massimo = daGiorno(Math.max(...tutte));
  const inizio = Math.floor(Date.UTC(minimo.getUTCFullYear(), minimo.getUTCMonth(), 1) / GIORNO);
  const fine = Math.floor(Date.UTC(massimo.getUTCFullYear(), massimo.getUTCMonth() + 1, 1) / GIORNO);
  const giorni = fine - inizio;
  const pos = (g: number) => `${((g - inizio) / giorni) * 100}%`;
  const largh = (a: number, b: number) => `${(Math.max(b - a + 1, 1) / giorni) * 100}%`;

  // Mesi dell'intestazione
  const mesi: { g: number; etichetta: string; anno: number }[] = [];
  for (let d = daGiorno(inizio); Math.floor(d.getTime() / GIORNO) < fine; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    mesi.push({ g: Math.floor(d.getTime() / GIORNO), etichetta: MESI[d.getUTCMonth()], anno: d.getUTCFullYear() });
  }
  const g0 = giorno(oggi);
  const larghezzaMinima = `${Math.max(giorni * 3.5, 560)}px`;

  return (
    <div className="px-3 py-4 md:px-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2 text-sm text-tenue">
        <span>
          {pianificate} di {ordinate.length} fasi con date previste
        </span>
        <span className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-6 rounded-full bg-[color:var(--tenue)]/25 ring-1 ring-[color:var(--tenue)]/40" /> Previsto
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-[3px] w-6 rounded-full bg-inchiostro" /> Effettivo
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-px bg-accento" /> Oggi
          </span>
        </span>
      </div>

      <div className="overflow-x-auto rounded-medio border border-linea">
        <div className="grid grid-cols-[11rem_1fr] md:grid-cols-[15rem_1fr]" style={{ minWidth: `calc(15rem + ${larghezzaMinima})` }}>
          {/* Intestazione: mesi */}
          <div className="etichetta sticky left-0 z-20 border-b border-r border-linea bg-superficie px-3 py-2.5 text-[0.6875rem] uppercase tracking-[0.12em]">
            Fase
          </div>
          <div className="relative h-10 border-b border-linea bg-[color:color-mix(in_srgb,var(--superficie-2)_38%,transparent)]">
            {mesi.map((m, i) => (
              <span
                key={m.g}
                className="absolute inset-y-0 flex items-center border-l border-linea pl-2 text-[0.6875rem] uppercase tracking-[0.12em] text-tenue"
                style={{ left: pos(m.g) }}
              >
                {m.etichetta}
                {i === 0 || m.etichetta === "Gen" ? <span className="ml-1 text-tenue/70">{m.anno}</span> : null}
              </span>
            ))}
          </div>

          {/* Righe delle fasi */}
          {ordinate.map((f, i) => {
            const colore = COLORI_FASE[f.stato] ?? "var(--tenue)";
            const ip = f.data_inizio_prev ? giorno(f.data_inizio_prev) : null;
            const fp = f.data_fine_prev ? giorno(f.data_fine_prev) : null;
            const ie = f.data_inizio_eff ? giorno(f.data_inizio_eff) : null;
            const fe = f.data_fine_eff ? giorno(f.data_fine_eff) : f.data_inizio_eff && f.stato !== "completata" ? Math.min(g0, fine - 1) : null;
            const responsabile = f.responsabile ? `${f.responsabile.nome} ${f.responsabile.cognome}`.trim() : null;
            const ritardo = fp !== null && f.stato !== "completata" && f.stato !== "annullata" && g0 > fp;
            const suggerimento = [
              `${f.nome} · ${STATI_FASE[f.stato] ?? f.stato} · ${f.avanzamento_pct}%`,
              ip !== null ? `Previsto ${breve(f.data_inizio_prev)} → ${breve(f.data_fine_prev)}` : null,
              ie !== null ? `Effettivo ${breve(f.data_inizio_eff)} → ${f.data_fine_eff ? breve(f.data_fine_eff) : "in corso"}` : null,
              responsabile,
              ritardo ? "Oltre la fine prevista" : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={f.id} className="contents">
                <div className="sticky left-0 z-10 flex min-w-0 items-center gap-2.5 border-r border-linea bg-superficie px-3 py-2.5" style={i ? { borderTop: "1px solid var(--linea)" } : undefined}>
                  <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: colore }} />
                  <span className="min-w-0">
                    <span className="block truncate text-[0.875rem]">{f.nome}</span>
                    <span className="block truncate text-xs text-tenue">
                      {ip !== null ? `${breve(f.data_inizio_prev)} – ${breve(f.data_fine_prev)}` : "Da pianificare"}
                      {responsabile ? ` · ${responsabile}` : ""}
                    </span>
                  </span>
                </div>
                <div className="relative min-h-12" style={i ? { borderTop: "1px solid var(--linea)" } : undefined}>
                  <Segni pos={pos} oggi={g0} fine={finePrevista ? giorno(finePrevista) : null} dentro={(g) => g >= inizio && g < fine} />
                  {/* righe dei mesi */}
                  {mesi.map((m) => (
                    <span key={m.g} aria-hidden className="absolute inset-y-0 w-px bg-linea/60" style={{ left: pos(m.g) }} />
                  ))}
                  {ip !== null && fp !== null ? (
                    <span
                      className="absolute top-3 h-4 overflow-hidden rounded-full"
                      style={{
                        left: pos(ip),
                        width: largh(ip, fp),
                        background: `color-mix(in srgb, ${colore} 18%, transparent)`,
                        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${colore} ${ritardo ? 90 : 45}%, transparent)`,
                      }}
                      data-suggerimento={suggerimento}
                    >
                      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${f.avanzamento_pct}%`, background: colore, opacity: 0.85 }} />
                    </span>
                  ) : (
                    <span className="absolute left-3 top-3.5 text-xs italic text-tenue">Date previste da inserire</span>
                  )}
                  {ie !== null && fe !== null ? (
                    <span
                      className="absolute top-[2.0rem] h-[3px] rounded-full bg-inchiostro"
                      style={{ left: pos(ie), width: largh(ie, fe) }}
                      data-suggerimento={suggerimento}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}

          {/* Piede: fine prevista della commessa */}
          <div className="sticky left-0 z-10 border-r border-t border-linea bg-superficie px-3 py-2 text-xs text-tenue">
            {finePrevista ? `Fine prevista ${breve(finePrevista)}` : "Fine commessa non indicata"}
          </div>
          <div className="relative min-h-8 border-t border-linea">
            <Segni pos={pos} oggi={g0} fine={finePrevista ? giorno(finePrevista) : null} dentro={(g) => g >= inizio && g < fine} />
            <span className="absolute top-2 -translate-x-1/2 rounded-full bg-accento px-2 py-0.5 text-[0.6875rem] text-su-accento" style={{ left: pos(g0) }}>
              Oggi
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

/** Linea di oggi (piena, color accento) e fine prevista della commessa (tratteggiata), dentro una riga. */
function Segni({ pos, oggi, fine, dentro }: { pos: (g: number) => string; oggi: number; fine: number | null; dentro: (g: number) => boolean }) {
  return (
    <>
      {dentro(oggi) ? <span aria-hidden className="absolute inset-y-0 z-[1] w-px bg-accento" style={{ left: pos(oggi) }} /> : null}
      {fine !== null && dentro(fine) ? (
        <span aria-hidden className="absolute inset-y-0 z-[1] border-l border-dashed border-inchiostro/50" style={{ left: pos(fine + 1) }} />
      ) : null}
    </>
  );
}
