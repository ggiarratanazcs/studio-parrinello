import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { StatoBadge, Vuoto, Pannello } from "@/components/ui";
import { COLORI_FASE, STATI_FASE } from "@/lib/dominio";
import type { CommessaMia } from "@/lib/dati";
import { cn } from "@/lib/utils";

const dataBreve = (iso: string | null) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(2, 4)}` : null);

/**
 * Home del collaboratore: le commesse in cui è coinvolto, come schede grandi comode al pollice.
 * In ogni scheda le fasi a lui assegnate con stato, avanzamento e scadenza.
 */
export function MieCommesse({ commesse, oggi }: { commesse: CommessaMia[]; oggi: string }) {
  const fasiTotali = commesse.reduce((n, c) => n + c.fasi.length, 0);
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium" style={{ fontVariationSettings: '"wdth" 108' }}>
          Le mie commesse
        </h2>
        <p className="text-sm text-tenue">
          {commesse.length} {commesse.length === 1 ? "commessa" : "commesse"}
          {fasiTotali ? ` · ${fasiTotali} ${fasiTotali === 1 ? "fase" : "fasi"} a te` : ""}
        </p>
      </div>

      {commesse.length === 0 ? (
        <Pannello>
          <Vuoto
            titolo="Nessuna commessa per ora"
            testo="Qui compaiono le commesse in cui sei nel team o hai una fase assegnata. Quando il titolare ti coinvolge, le trovi subito."
          />
        </Pannello>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {commesse.map((c) => (
            <li key={c.id}>
              <Link
                href={`/commesse/${c.id}`}
                className={cn(
                  "group flex h-full flex-col rounded-grande border border-linea bg-superficie p-4 transition-[box-shadow,border-color] hover:border-linea-forte hover:shadow-[0_18px_36px_-24px_rgba(43,42,40,0.45)] active:scale-[0.995]",
                  c.stato === "conclusa" && "opacity-70",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="numeri etichetta">{c.codice}</p>
                    <p className="mt-0.5 text-[1.0625rem] font-medium leading-snug">{c.titolo}</p>
                    {c.luogo ? (
                      <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-tenue">
                        <MapPin className="size-3.5 shrink-0" strokeWidth={1.8} />
                        <span className="truncate">{c.luogo}</span>
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="mt-1 size-5 shrink-0 text-tenue transition-transform group-hover:translate-x-0.5" strokeWidth={1.6} />
                </div>

                <div className="mt-auto pt-4">
                  {c.fasi.length ? (
                    <ul className="flex flex-col gap-2.5 border-t border-linea pt-3">
                      {c.fasi.map((f) => {
                        const colore = COLORI_FASE[f.stato] ?? "var(--tenue)";
                        const scaduta = f.fine && f.fine < oggi && f.stato !== "completata" && f.stato !== "annullata";
                        return (
                          <li key={f.id} className="flex items-center gap-3">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[0.9375rem]">
                                {f.codice ? <span className="numeri mr-1.5 text-tenue">{f.codice}</span> : null}
                                {f.nome}
                              </span>
                              <span className="flex items-center gap-1.5 text-xs" style={{ color: colore }}>
                                <span aria-hidden className="size-1.5 rounded-full" style={{ background: colore }} />
                                {STATI_FASE[f.stato] ?? f.stato}
                                {f.fine ? (
                                  <span className={cn("numeri", scaduta ? "text-[color:var(--stato-sospesa)]" : "text-tenue")}>
                                    · {scaduta ? "scaduta il" : "entro il"} {dataBreve(f.fine)}
                                  </span>
                                ) : null}
                              </span>
                            </span>
                            <span aria-label={`Avanzamento ${f.avanzamento}%`} className="flex shrink-0 gap-[3px]">
                              {[1, 2, 3, 4].map((k) => (
                                <span key={k} className="h-1.5 w-3 rounded-[2px] bg-linea" style={{ background: f.avanzamento >= k * 25 ? colore : undefined }} />
                              ))}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="flex items-center justify-between border-t border-linea pt-3">
                      <span className="rounded-full border border-linea-forte px-2.5 py-0.5 text-xs text-inchiostro-2">{c.team ? "Team" : "Responsabile"}</span>
                      <StatoBadge stato={c.stato} />
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
