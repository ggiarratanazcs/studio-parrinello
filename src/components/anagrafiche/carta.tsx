import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Foglio anagrafico: carta chiara con una linguetta in alto a sinistra, come la cartella
 * di uno schedario. Distingue clienti e immobili dalle schede documento (testata scura).
 */
export function CartaAnagrafica({
  linguetta,
  icona: Icona,
  children,
  className,
}: {
  linguetta: string;
  icona: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative pt-8", className)}>
      <div className="linguetta-anagrafica absolute left-5 top-0 flex h-8 items-center gap-2 rounded-t-[6px] border border-b-0 border-linea-forte bg-superficie px-4 text-[0.6875rem] uppercase tracking-[0.16em] text-tenue md:left-7">
        <Icona aria-hidden className="size-3.5" strokeWidth={1.8} />
        {linguetta}
      </div>
      <article className="carta-anagrafica rounded-piccolo border border-linea-forte bg-superficie px-5 pb-7 pt-6 md:px-8 md:pt-7">
        {children}
      </article>
    </div>
  );
}

/** Titoletto di sezione dentro il foglio. */
export function SezioneRegistro({ titolo, children, azione, className }: { titolo: string; children: ReactNode; azione?: ReactNode; className?: string }) {
  return (
    <section className={cn("mt-7 first:mt-0", className)}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-[0.6875rem] uppercase tracking-[0.14em] text-tenue">{titolo}</h2>
        {azione}
      </div>
      {children}
    </section>
  );
}

/** Riga da registro: voce a sinistra, puntini, valore a destra. Senza valore mostra un trattino. */
export function RigaRegistro({ voce, valore, href, numerico }: { voce: string; valore?: ReactNode; href?: string; numerico?: boolean }) {
  const vuoto = valore === null || valore === undefined || valore === "";
  return (
    <div className="riga-registro flex items-baseline gap-2 py-1.5 text-[0.9375rem]">
      <span className="shrink-0 text-inchiostro-2">{voce}</span>
      <span aria-hidden className="puntini min-w-4 flex-1" />
      <span className={cn("min-w-0 text-right [overflow-wrap:anywhere]", numerico && "numeri", vuoto && "text-tenue")}>
        {vuoto ? "—" : href ? (
          <a href={href} className="hover:text-accento hover:underline">
            {valore}
          </a>
        ) : (
          valore
        )}
      </span>
    </div>
  );
}

/** Pulsante a pillola sottile, usato nelle schede anagrafiche. */
export const classePillola =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-linea-forte px-4 text-[0.875rem] text-inchiostro transition-colors hover:bg-superficie-2 disabled:cursor-not-allowed disabled:opacity-50";
