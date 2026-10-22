import type { ReactNode } from "react";
import { Tessere, type Cella } from "@/components/tessere";
import Link from "next/link";
import { Pannello, Scheletro } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Intestazione di una scheda: numero/codice, titolo, sottotitolo, riquadri informativi e azioni. */
export function TestataScheda({
  sigla,
  titolo,
  sottotitolo,
  celle,
  azioni,
  compatta,
}: {
  sigla?: string | null;
  titolo: string;
  sottotitolo?: string | null;
  celle?: Cella[];
  azioni?: ReactNode;
  /** Dati in una riga sottile sotto il titolo, al posto dei riquadri: lascia spazio alle sezioni */
  compatta?: boolean;
}) {
  if (compatta) {
    return (
      <header className="mb-5 flex flex-col gap-3 border-b border-linea-forte pb-4 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="min-w-0">
          {sigla ? <p className="numeri etichetta">{sigla}</p> : null}
          <h1 className="titolo-display mt-0.5 text-[1.5rem] leading-tight md:text-[1.875rem]">{titolo}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.875rem] text-tenue">
            {celle?.map((c, i) => {
              return (
                <span key={c.etichetta} className="inline-flex items-center gap-1.5" title={c.etichetta}>
                  {i ? <span aria-hidden className="mr-1.5 text-linea-forte">·</span> : null}
                  {/* Solo lo stato ha il pallino colorato: gli altri dati si leggono da soli */}
                  {c.tinta ? <span aria-hidden className="size-2 rounded-full" style={{ background: c.tinta }} /> : null}
                  <span className="sr-only">{c.etichetta}: </span>
                  <span className={cn(c.tinta ? "font-medium" : "text-inchiostro-2")} style={c.tinta ? { color: c.tinta } : undefined}>
                    {c.valore}
                  </span>
                </span>
              );
            })}
            {sottotitolo ? (
              <span className="inline-flex min-w-0 items-center">
                {celle?.length ? <span aria-hidden className="mr-3 text-linea-forte">·</span> : null}
                <span className="truncate">{sottotitolo}</span>
              </span>
            ) : null}
          </p>
        </div>
        {azioni ? <div className="flex shrink-0 flex-wrap items-center gap-2">{azioni}</div> : null}
      </header>
    );
  }
  return (
    <header className="mb-6 flex flex-col gap-5 border-b border-linea-forte pb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {sigla ? <p className="numeri etichetta">{sigla}</p> : null}
          <h1 className="titolo-display mt-1 text-[1.75rem] md:text-[2.25rem]">{titolo}</h1>
          {sottotitolo ? <p className="mt-2 text-[0.9375rem] text-tenue">{sottotitolo}</p> : null}
        </div>
        {celle?.length ? <Tessere celle={celle} className="shrink-0" /> : null}
      </div>
      {azioni ? <div className="flex flex-wrap items-center gap-2">{azioni}</div> : null}
    </header>
  );
}

export function Blocco({
  titolo,
  children,
  className,
  icona,
  dueColonne,
}: {
  titolo: string;
  children: ReactNode;
  className?: string;
  /** Icona piccola accanto al titolo */
  icona?: ReactNode;
  /** Dati affiancati a coppie, per tenere basso il riquadro */
  dueColonne?: boolean;
}) {
  return (
    <Pannello className={cn("px-5 py-5", className)}>
      <h2 className="mb-4 flex items-center gap-2 text-base font-medium">
        {icona ? <span className="text-tenue [&>svg]:size-4">{icona}</span> : null}
        {titolo}
      </h2>
      <dl className={cn(dueColonne ? "grid grid-cols-2 gap-x-5 gap-y-3" : "flex flex-col gap-3")}>{children}</dl>
    </Pannello>
  );
}

/** Coppia etichetta/valore: le righe vuote non vengono mostrate. */
export function Dato({ etichetta, valore, href }: { etichetta: string; valore?: ReactNode; href?: string }) {
  if (valore === null || valore === undefined || valore === "") return null;
  return (
    <div>
      <dt className="etichetta">{etichetta}</dt>
      <dd className="mt-0.5 break-words text-[0.9375rem]">
        {href ? (
          <Link href={href} className="text-accento hover:underline">
            {valore}
          </Link>
        ) : (
          valore
        )}
      </dd>
    </div>
  );
}

export function SchedaSegnaposto() {
  return (
    <div>
      <Scheletro className="h-4 w-24" />
      <Scheletro className="mt-3 h-9 w-2/3" />
      <Scheletro className="mt-3 h-4 w-1/3" />
      <Pannello className="mt-8 space-y-4 p-6">
        <Scheletro className="h-4 w-full" />
        <Scheletro className="h-4 w-5/6" />
        <Scheletro className="h-4 w-4/6" />
      </Pannello>
    </div>
  );
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
