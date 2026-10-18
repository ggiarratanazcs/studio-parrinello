import type { ReactNode } from "react";

export type Cella = { etichetta: string; valore: ReactNode };

/**
 * Intestazione di pagina ispirata al cartiglio delle tavole di progetto:
 * titolo a sinistra, blocco di dati incasellati a destra.
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
        {celle.length > 0 ? (
          <dl
            className="grid border border-linea-forte"
            style={{ gridTemplateColumns: `repeat(${celle.length}, minmax(0, auto))` }}
          >
            {celle.map((c, i) => (
              <div
                key={c.etichetta}
                className={`min-w-24 px-3 py-2 ${i > 0 ? "border-l border-linea-forte" : ""}`}
              >
                <dt className="etichetta text-[0.75rem]">{c.etichetta}</dt>
                <dd className="numeri mt-0.5 text-[0.9375rem] font-medium">{c.valore}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {azioni ? <div className="flex gap-2">{azioni}</div> : null}
      </div>
    </header>
  );
}
