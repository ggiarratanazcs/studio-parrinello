"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sezione delle Impostazioni che si apre e si chiude: intestazione con icona, titolo,
 * descrizione e un riepilogo a destra; il contenuto compare solo aprendola.
 */
export function SezioneImpostazioni({
  icona,
  titolo,
  descrizione,
  riepilogo,
  children,
}: {
  /** Icona già disegnata (es. <User />): arriva anche da componenti del server */
  icona: ReactNode;
  titolo: string;
  descrizione: string;
  riepilogo?: ReactNode;
  children: ReactNode;
}) {
  const [aperta, setAperta] = useState(false);
  return (
    <section className="pannello overflow-hidden rounded-grande border border-linea bg-superficie">
      <button
        type="button"
        onClick={() => setAperta(!aperta)}
        aria-expanded={aperta}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-superficie-2/40 md:px-6"
      >
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-superficie-2 text-inchiostro-2">
          {icona}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-medium">{titolo}</span>
          <span className="block truncate text-[0.8125rem] text-tenue">{descrizione}</span>
        </span>
        {riepilogo ? <span className="hidden shrink-0 truncate text-[0.8125rem] text-inchiostro-2 sm:block">{riepilogo}</span> : null}
        <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-tenue transition-transform duration-200", aperta && "rotate-180")} strokeWidth={1.8} />
      </button>
      {aperta ? <div className="border-t border-linea">{children}</div> : null}
    </section>
  );
}
