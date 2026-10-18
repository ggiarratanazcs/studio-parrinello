import type { ReactNode } from "react";
import { Tessere, type Cella } from "@/components/tessere";

export type { Cella };

/**
 * Intestazione di pagina: titolo a sinistra, riquadri informativi e azioni a destra.
 */
export function Cartiglio({
  titolo,
  sottotitolo,
  celle = [],
  azioni,
}: {
  titolo: string;
  sottotitolo?: string;
  celle?: Cella[];
  azioni?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-6 border-b border-linea-forte pb-6 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <h1 className="titolo-display text-[2rem] md:text-[2.75rem]">{titolo}</h1>
        {sottotitolo ? <p className="mt-3 text-[0.9375rem] text-tenue">{sottotitolo}</p> : null}
      </div>

      <div className="flex flex-col gap-4 md:items-end">
        {celle.length > 0 ? <Tessere celle={celle} className="md:justify-end" /> : null}
        {azioni ? <div className="flex flex-wrap gap-2 md:justify-end">{azioni}</div> : null}
      </div>
    </header>
  );
}
