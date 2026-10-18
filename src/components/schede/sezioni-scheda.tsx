"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export type Sezione = {
  id: string;
  titolo: string;
  /** Riepilogo breve sotto il titolo (es. "3 fasi · 1 completata") */
  sottotitolo?: string;
  contenuto: ReactNode;
};

/**
 * Scheda a sezioni: elenco numerato a sinistra (in alto, scorrevole, su telefono)
 * e a destra solo la sezione scelta. La sezione resta aperta anche dopo i salvataggi.
 */
export function SezioniScheda({ sezioni, tinta = "#2f3a2b" }: { sezioni: Sezione[]; tinta?: string }) {
  const [attiva, setAttiva] = useState(sezioni[0]?.id);
  const corrente = sezioni.find((s) => s.id === attiva) ?? sezioni[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:items-start">
      <nav
        aria-label="Sezioni della scheda"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:sticky lg:top-4 lg:mx-0 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {sezioni.map((s, i) => {
          const scelta = s.id === corrente?.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setAttiva(s.id)}
              aria-current={scelta ? "true" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-[16px] py-2 pl-2 pr-4 text-left transition-[background-color,box-shadow] duration-200 lg:w-full",
                scelta ? "tessera" : "hover:bg-superficie/60",
              )}
            >
              <span
                className={cn("pallino-tessera numeri grid size-8 shrink-0 place-items-center rounded-full text-[0.8125rem] font-medium", scelta && "colorato")}
                style={scelta ? ({ ["--tinta" as string]: tinta } as CSSProperties) : undefined}
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className={cn("block whitespace-nowrap text-[0.9375rem]", scelta ? "font-medium text-inchiostro" : "text-inchiostro-2")}>{s.titolo}</span>
                {s.sottotitolo ? <span className="block whitespace-nowrap text-xs text-tenue">{s.sottotitolo}</span> : null}
              </span>
            </button>
          );
        })}
      </nav>

      <section aria-label={corrente?.titolo} className="min-w-0">
        {corrente?.contenuto}
      </section>
    </div>
  );
}

/**
 * Cartelle a linguetta dentro una sezione (es. "Fasi" e "Allegati"):
 * una riga di linguette con l'icona della cartella e sotto il contenuto della cartella scelta.
 */
export function Cartelle({
  cartelle,
  destra,
}: {
  cartelle: { id: string; nome: string; conteggio?: number; contenuto: ReactNode }[];
  destra?: ReactNode;
}) {
  const [attiva, setAttiva] = useState(cartelle[0]?.id);
  const corrente = cartelle.find((c) => c.id === attiva) ?? cartelle[0];
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-linea px-3 pt-3 md:px-4">
        <div role="tablist" className="-mb-px flex gap-1">
          {cartelle.map((c) => {
            const scelta = c.id === corrente?.id;
            const Icona = scelta ? FolderOpen : Folder;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={scelta}
                onClick={() => setAttiva(c.id)}
                className={cn(
                  "flex items-center gap-2 rounded-t-[12px] border border-b-0 px-4 py-2.5 text-[0.9375rem] transition-colors",
                  scelta ? "border-linea bg-superficie font-medium text-inchiostro" : "border-transparent text-tenue hover:text-inchiostro",
                )}
              >
                <Icona className={cn("size-[18px]", scelta ? "text-accento" : "")} strokeWidth={1.6} fill="currentColor" fillOpacity={scelta ? 0.14 : 0.06} />
                {c.nome}
                {c.conteggio !== undefined ? <span className="numeri text-xs text-tenue">{c.conteggio}</span> : null}
              </button>
            );
          })}
        </div>
        {destra ? <div className="pb-3">{destra}</div> : null}
      </div>
      <div role="tabpanel">{corrente?.contenuto}</div>
    </div>
  );
}
