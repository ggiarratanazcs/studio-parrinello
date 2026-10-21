"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BarraRegistro, FiltroGruppi, filtroGruppi, normalizza, type GruppoFiltro } from "@/components/registro";
import { COLORI_FASE } from "@/components/schede/fasi-commessa";
import type { CommessaSintesi, FaseGantt } from "@/lib/dati";
import { STATI_COMMESSA, STATI_FASE, statoCommessa } from "@/lib/dominio";
import { breve, giorno, intervalloMesi } from "@/lib/calendario";
import { cn } from "@/lib/utils";

const GRUPPI: GruppoFiltro[] = [
  { id: "lavorazione", etichetta: "In lavorazione", stati: ["contatto", "prefattibilita", "preventivo", "attiva", "sospesa"] },
  { id: "archivio", etichetta: "Archivio", stati: ["conclusa", "persa", "annullata"] },
  { id: "tutte", etichetta: "Tutte" },
];
const perGruppo = filtroGruppi(GRUPPI);
const ORDINE_STATI = Object.keys(STATI_COMMESSA);

type Riga = {
  c: CommessaSintesi;
  fasi: (FaseGantt & { da: number | null; a: number | null })[];
  da: number | null;
  a: number | null;
  ritardo: number;
};

/**
 * Gantt generale: una riga per commessa con le sue fasi disposte sul calendario (segmenti colorati per stato),
 * linea di oggi, fine prevista della commessa, ritardi; ▸ apre le fasi della commessa.
 */
export function GanttCommesse({ commesse, fasi, oggi }: { commesse: CommessaSintesi[]; fasi: FaseGantt[]; oggi: string }) {
  const [cerca, setCerca] = useState("");
  const [scelto, setScelto] = useState("lavorazione|");
  const [aperte, setAperte] = useState<Set<string>>(new Set());
  const g0 = giorno(oggi);

  const parole = normalizza(cerca).split(/\s+/).filter(Boolean);
  const righe: Riga[] = commesse
    .filter((c) => perGruppo(c.stato ?? "contatto", scelto))
    .filter((c) => !parole.length || parole.every((p) => normalizza([c.codice, c.titolo, c.cliente, c.comune].join(" ")).includes(p)))
    .map((c) => {
      const proprie = fasi
        .filter((f) => f.commessa_id === c.id)
        .map((f) => {
          const da = f.data_inizio_prev ?? f.data_inizio_eff;
          const a = f.data_fine_prev ?? f.data_fine_eff;
          return { ...f, da: da ? giorno(da) : null, a: a ? giorno(a) : null };
        });
      const datate = proprie.filter((f) => f.da !== null && f.a !== null);
      const ritardo = Math.max(
        0,
        ...proprie
          .filter((f) => f.data_fine_prev && f.stato !== "completata" && f.stato !== "annullata")
          .map((f) => g0 - giorno(f.data_fine_prev!)),
      );
      return {
        c,
        fasi: proprie,
        da: datate.length ? Math.min(...datate.map((f) => f.da!)) : null,
        a: datate.length ? Math.max(...datate.map((f) => f.a!)) : null,
        ritardo,
      };
    })
    // pianificate prima (per inizio), poi quelle senza date
    .sort((x, y) => (x.da === null ? 1 : 0) - (y.da === null ? 1 : 0) || (x.da ?? 0) - (y.da ?? 0) || (y.c.codice ?? "").localeCompare(x.c.codice ?? ""));

  const estremi = [
    g0,
    ...righe
      // spazio a destra per la scritta del ritardo
      .flatMap((r) => [r.da, r.a !== null && r.ritardo > 0 ? Math.max(r.a, r.c.data_fine_prevista ? giorno(r.c.data_fine_prevista) : r.a) + 28 : r.a, r.c.data_fine_prevista ? giorno(r.c.data_fine_prevista) : null])
      .filter((g): g is number => g !== null),
  ];
  const { inizio, fine, giorni, mesi } = intervalloMesi(estremi);
  const pos = (g: number) => `${((g - inizio) / giorni) * 100}%`;
  const largh = (a: number, b: number) => `${(Math.max(b - a + 1, 1) / giorni) * 100}%`;
  const dentro = (g: number) => g >= inizio && g < fine;

  const apri = (id: string) =>
    setAperte((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const sfondoMesi = (
    <>
      {mesi.map((m) => (
        <span key={m.g} aria-hidden className="absolute inset-y-0 w-px bg-linea/60" style={{ left: pos(m.g) }} />
      ))}
      {dentro(g0) ? <span aria-hidden className="absolute inset-y-0 z-[2] w-[1.5px] bg-accento" style={{ left: pos(g0) }} /> : null}
    </>
  );

  return (
    <>
      <BarraRegistro cerca={cerca} onCerca={setCerca} segnaposto="Cerca">
        <FiltroGruppi
          gruppi={GRUPPI}
          ordine={ORDINE_STATI}
          info={statoCommessa}
          stati={commesse.map((c) => c.stato ?? "contatto")}
          scelto={scelto}
          onScegli={setScelto}
          nome="Gruppo di commesse"
        />
      </BarraRegistro>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-[13rem_1fr] md:grid-cols-[18rem_1fr]" style={{ minWidth: `calc(18rem + ${Math.max(giorni * 3, 560)}px)` }}>
          {/* Intestazione */}
          <div className="elenco-intestazione etichetta sticky left-0 z-20 border-b border-r border-linea bg-superficie px-4 py-3 text-[0.6875rem] uppercase tracking-[0.12em]">
            Commessa
          </div>
          <div className="elenco-intestazione relative h-11 border-b border-linea">
            {mesi.map((m, i) => (
              <span
                key={m.g}
                className="absolute inset-y-0 flex items-center border-l border-linea pl-2 text-[0.6875rem] uppercase tracking-[0.12em] text-tenue"
                style={{ left: pos(m.g) }}
              >
                {m.etichetta}
                {i === 0 || m.etichetta === "Gen" ? <span className="ml-1 opacity-70">{m.anno}</span> : null}
              </span>
            ))}
            {dentro(g0) ? (
              <span className="absolute bottom-1 z-[3] -translate-x-1/2 rounded-full bg-accento px-2 py-px text-[0.625rem] text-su-accento" style={{ left: pos(g0) }}>
                Oggi
              </span>
            ) : null}
          </div>

          {righe.map((r) => {
            const aperta = aperte.has(r.c.id ?? "");
            const fineCommessa = r.c.data_fine_prevista ? giorno(r.c.data_fine_prevista) : null;
            const s = statoCommessa(r.c.stato);
            const pct = r.c.fasi_totali ? Math.round(((r.c.fasi_completate ?? 0) / r.c.fasi_totali) * 100) : null;
            return (
              <Fragment key={r.c.id}>
                {/* Commessa */}
                <div className="sticky left-0 z-10 flex min-w-0 items-center gap-1.5 border-b border-r border-linea bg-superficie py-2.5 pl-2 pr-3">
                  <button
                    type="button"
                    onClick={() => apri(r.c.id ?? "")}
                    disabled={!r.fasi.length}
                    aria-expanded={aperta}
                    aria-label={aperta ? "Chiudi le fasi" : "Mostra le fasi"}
                    className="grid size-7 shrink-0 place-items-center rounded-full text-tenue transition-colors hover:bg-superficie-2 hover:text-inchiostro disabled:opacity-30"
                  >
                    <ChevronRight className={cn("size-4 transition-transform", aperta && "rotate-90")} strokeWidth={1.8} />
                  </button>
                  <Link href={`/commesse/${r.c.id}`} className="min-w-0 hover:text-accento">
                    <span className="block truncate text-[0.875rem] font-medium">
                      <span className="numeri mr-1.5 font-normal text-tenue">{r.c.codice}</span>
                      {r.c.titolo}
                    </span>
                    <span className="flex items-center gap-1.5 truncate text-xs text-tenue">
                      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: s.colore }} />
                      {[r.c.cliente, pct !== null ? `${pct}%` : null].filter(Boolean).join(" · ")}
                    </span>
                  </Link>
                </div>
                <div className="relative min-h-14 border-b border-linea">
                  {sfondoMesi}
                  {r.da !== null && r.a !== null ? (
                    <>
                      {/* binario della commessa e fasi come segmenti */}
                      <span
                        className="absolute top-1/2 h-3.5 -translate-y-1/2 rounded-full"
                        style={{
                          left: pos(r.da),
                          width: largh(r.da, r.a),
                          background: "color-mix(in srgb, var(--linea) 55%, transparent)",
                          boxShadow: r.ritardo > 0 ? "0 0 0 1.5px var(--stato-sospesa)" : "inset 0 0 0 1px var(--linea-forte)",
                        }}
                      />
                      {r.fasi.map((f) =>
                        f.da !== null && f.a !== null ? (
                          <span
                            key={f.id}
                            className="absolute top-1/2 h-3.5 -translate-y-1/2 rounded-full border border-superficie"
                            style={{ left: pos(f.da), width: largh(f.da, f.a), background: coloreSegmento(f) }}
                            data-suggerimento={`${f.nome} · ${STATI_FASE[f.stato] ?? f.stato} · ${f.avanzamento_pct}% · ${breve(f.data_inizio_prev ?? f.data_inizio_eff)} → ${breve(f.data_fine_prev ?? f.data_fine_eff)}`}
                          />
                        ) : null,
                      )}
                      {r.ritardo > 0 && r.a !== null ? (
                        <span
                          className="absolute top-1/2 z-[3] ml-2 -translate-y-1/2 whitespace-nowrap text-[0.6875rem] text-[color:var(--stato-sospesa)]"
                          style={{ left: pos(Math.max(r.a, fineCommessa ?? r.a) + 2) }}
                        >
                          ● {r.ritardo} gg oltre
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs italic text-tenue">
                      Nessuna data prevista: apri la commessa per pianificarla
                    </span>
                  )}
                  {fineCommessa !== null && dentro(fineCommessa) ? (
                    <span
                      aria-hidden
                      className="absolute top-1/2 z-[3] size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-[1.5px] border-inchiostro bg-superficie"
                      style={{ left: pos(fineCommessa + 1) }}
                      data-suggerimento={`Fine prevista della commessa: ${breve(r.c.data_fine_prevista)}`}
                    />
                  ) : null}
                </div>

                {/* Fasi della commessa aperta */}
                {aperta
                  ? r.fasi.map((f) => (
                      <Fragment key={f.id}>
                        <div className="sticky left-0 z-10 flex min-w-0 items-center gap-2 border-b border-r border-linea bg-superficie py-1.5 pl-11 pr-3">
                          <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: COLORI_FASE[f.stato] ?? "var(--tenue)" }} />
                          <span className="min-w-0 truncate text-[0.8125rem] text-inchiostro-2">{f.nome}</span>
                        </div>
                        <div className="relative min-h-9 border-b border-linea bg-superficie-2/20">
                          {sfondoMesi}
                          {f.da !== null && f.a !== null ? (
                            <span
                              className="absolute top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full"
                              style={{
                                left: pos(f.da),
                                width: largh(f.da, f.a),
                                background: `color-mix(in srgb, ${COLORI_FASE[f.stato] ?? "var(--tenue)"} 20%, transparent)`,
                              }}
                              data-suggerimento={`${f.nome} · ${STATI_FASE[f.stato] ?? f.stato} · ${f.avanzamento_pct}%`}
                            >
                              <span
                                className="absolute inset-y-0 left-0 rounded-full"
                                style={{ width: `${f.avanzamento_pct}%`, background: COLORI_FASE[f.stato] ?? "var(--tenue)" }}
                              />
                            </span>
                          ) : (
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.6875rem] italic text-tenue">Da pianificare</span>
                          )}
                        </div>
                      </Fragment>
                    ))
                  : null}
              </Fragment>
            );
          })}
        </div>
        {righe.length === 0 ? (
          <p className="px-6 py-10 text-center text-[0.9375rem] text-tenue">Nessuna commessa corrisponde alla ricerca o al filtro.</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-linea px-5 py-3 text-xs text-tenue md:px-6">
        {[
          ["completata", "Fase completata"],
          ["in_corso", "In corso"],
          ["da_avviare", "Da avviare"],
          ["sospesa", "Sospesa"],
        ].map(([k, t]) => (
          <span key={k} className="inline-flex items-center gap-2">
            <span className="h-2 w-5 rounded-full" style={{ background: coloreSegmento({ stato: k, avanzamento_pct: k === "in_corso" ? 50 : 0 }) }} />
            {t}
          </span>
        ))}
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rotate-45 border-[1.5px] border-inchiostro" /> Fine prevista commessa
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-[1.5px] bg-accento" /> Oggi
        </span>
      </div>
    </>
  );
}

/** Colore del segmento di una fase nella riga della commessa: pieno se completata, chiaro se da avviare. */
function coloreSegmento(f: { stato: string; avanzamento_pct: number }) {
  const c = COLORI_FASE[f.stato] ?? "var(--tenue)";
  if (f.stato === "da_avviare") return "color-mix(in srgb, var(--linea-forte) 70%, transparent)";
  if (f.stato === "in_corso" || f.stato === "in_revisione")
    return `linear-gradient(90deg, ${c} ${f.avanzamento_pct}%, color-mix(in srgb, ${c} 30%, var(--superficie)) ${f.avanzamento_pct}%)`;
  return c;
}
