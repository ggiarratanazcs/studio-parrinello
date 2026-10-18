import type { ReactNode } from "react";
import Link from "next/link";
import { Pannello, Scheletro } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Intestazione di una scheda: numero/codice, titolo, sottotitolo, celle e azioni. */
export function TestataScheda({
  sigla,
  titolo,
  sottotitolo,
  celle,
  azioni,
}: {
  sigla?: string | null;
  titolo: string;
  sottotitolo?: string | null;
  celle?: { etichetta: string; valore: ReactNode }[];
  azioni?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-5 border-b border-linea-forte pb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {sigla ? <p className="numeri etichetta">{sigla}</p> : null}
          <h1 className="titolo-display mt-1 text-[1.75rem] md:text-[2.25rem]">{titolo}</h1>
          {sottotitolo ? <p className="mt-2 text-[0.9375rem] text-tenue">{sottotitolo}</p> : null}
        </div>
        {celle?.length ? (
          <dl className="grid w-fit shrink-0 border border-linea-forte" style={{ gridTemplateColumns: `repeat(${celle.length}, auto)` }}>
            {celle.map((c, i) => (
              <div key={c.etichetta} className={cn("min-w-24 px-3 py-2", i > 0 && "border-l border-linea-forte")}>
                <dt className="etichetta text-[0.75rem]">{c.etichetta}</dt>
                <dd className="numeri mt-0.5 text-[0.9375rem] font-medium">{c.valore}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      {azioni ? <div className="flex flex-wrap items-center gap-2">{azioni}</div> : null}
    </header>
  );
}

export function Blocco({ titolo, children, className }: { titolo: string; children: ReactNode; className?: string }) {
  return (
    <Pannello className={cn("px-5 py-5", className)}>
      <h2 className="mb-4 text-base font-medium">{titolo}</h2>
      <dl className="flex flex-col gap-3">{children}</dl>
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
