"use client";

import { TIPOLOGIE_INTERVENTO } from "@/lib/dominio";
import type { DatiProcedura } from "@/lib/dati";
import { cn } from "@/lib/utils";

/** Elenco delle fasi del catalogo con quelle proposte già spuntate. */
export function SceltaFasi({
  fasi,
  committenza,
  tipologia,
  scelte,
  personalizzate,
  onCambia,
}: {
  fasi: DatiProcedura["fasi"];
  committenza: string;
  tipologia: string;
  scelte: string[];
  personalizzate: boolean;
  onCambia: (codici: string[] | null) => void;
}) {
  const visibili = fasi.filter(
    (f) =>
      f.ambito === "entrambi" ||
      (committenza === "pubblica" ? f.ambito === "pubblico" : f.ambito === "privato") ||
      scelte.includes(f.codice),
  );
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.9375rem] text-tenue">
        Ti propongo le fasi tipiche per un incarico {committenza === "pubblica" ? "pubblico" : "privato"}
        {tipologia ? ` di ${TIPOLOGIE_INTERVENTO[tipologia]?.toLowerCase()}` : ""}. Togli o aggiungi quelle che servono.
      </p>
      <ul className="grid gap-1 md:grid-cols-2">
        {visibili.map((f) => {
          const scelta = scelte.includes(f.codice);
          return (
            <li key={f.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-medio px-3 py-2.5 transition-colors",
                  scelta ? "bg-accento-tenue" : "hover:bg-superficie-2/60",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[color:var(--accento)]"
                  checked={scelta}
                  onChange={() => onCambia(scelta ? scelte.filter((c) => c !== f.codice) : [...scelte, f.codice])}
                />
                <span className="text-[0.9375rem] leading-snug">{f.nome}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {personalizzate ? (
        <button type="button" onClick={() => onCambia(null)} className="self-start text-sm text-accento hover:underline">
          Torna alla proposta
        </button>
      ) : null}
    </div>
  );
}
