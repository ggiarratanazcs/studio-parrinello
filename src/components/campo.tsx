import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const stileControllo =
  "w-full rounded-medio border border-linea-forte bg-superficie px-3 text-base text-inchiostro outline-none transition-colors placeholder:text-tenue/70 focus:border-accento focus:ring-2 focus:ring-accento/20 aria-[invalid=true]:border-[color:var(--stato-sospesa)]";

function Etichetta({ id, etichetta, obbligatorio }: { id: string; etichetta: string; obbligatorio?: boolean }) {
  return (
    <label htmlFor={id} className="text-sm font-medium text-inchiostro-2">
      {etichetta}
      {obbligatorio ? <span className="text-accento"> *</span> : null}
    </label>
  );
}

function Aiuto({ testo, errore }: { testo?: ReactNode; errore?: string | null }) {
  if (errore) return <p className="text-sm text-[color:var(--stato-sospesa)]">{errore}</p>;
  if (testo) return <p className="text-sm text-tenue">{testo}</p>;
  return null;
}

type Extra = { etichetta: string; id: string; aiuto?: ReactNode; errore?: string | null; obbligatorio?: boolean };

/** Campo di testo con etichetta sopra. */
export function Campo({ etichetta, id, aiuto, errore, obbligatorio, className, ...props }: ComponentProps<"input"> & Extra) {
  return (
    <div className="flex flex-col gap-1.5">
      <Etichetta id={id} etichetta={etichetta} obbligatorio={obbligatorio} />
      <input id={id} aria-invalid={errore ? true : undefined} className={cn(stileControllo, "h-11", className)} {...props} />
      <Aiuto testo={aiuto} errore={errore} />
    </div>
  );
}

/** Menu a tendina con etichetta sopra. */
export function Selezione({
  etichetta,
  id,
  aiuto,
  errore,
  obbligatorio,
  className,
  children,
  ...props
}: ComponentProps<"select"> & Extra) {
  return (
    <div className="flex flex-col gap-1.5">
      <Etichetta id={id} etichetta={etichetta} obbligatorio={obbligatorio} />
      <select
        id={id}
        aria-invalid={errore ? true : undefined}
        className={cn(stileControllo, "h-11 appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9", className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236e685e' stroke-width='1.8'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {children}
      </select>
      <Aiuto testo={aiuto} errore={errore} />
    </div>
  );
}

/** Testo su più righe con etichetta sopra. */
export function AreaTesto({ etichetta, id, aiuto, errore, obbligatorio, className, ...props }: ComponentProps<"textarea"> & Extra) {
  return (
    <div className="flex flex-col gap-1.5">
      <Etichetta id={id} etichetta={etichetta} obbligatorio={obbligatorio} />
      <textarea id={id} className={cn(stileControllo, "min-h-24 py-2.5", className)} {...props} />
      <Aiuto testo={aiuto} errore={errore} />
    </div>
  );
}

/** Scelta tra poche opzioni affiancate. */
export function Segmenti<T extends string>({
  etichetta,
  valore,
  opzioni,
  onCambia,
}: {
  etichetta: string;
  valore: T;
  opzioni: { valore: T; etichetta: string }[];
  onCambia: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-inchiostro-2">{etichetta}</span>
      {/* Stesso stile delle schede degli elenchi: testo con una riga sotto l'opzione scelta */}
      <div role="radiogroup" aria-label={etichetta} className="flex w-fit flex-wrap items-center gap-x-5 gap-y-1 border-b border-linea">
        {opzioni.map((o) => (
          <button
            key={o.valore}
            type="button"
            role="radio"
            aria-checked={o.valore === valore}
            onClick={() => onCambia(o.valore)}
            className={cn(
              "-mb-px h-9 border-b-2 text-[0.9375rem] transition-colors duration-200",
              o.valore === valore ? "border-inchiostro font-medium text-inchiostro" : "border-transparent text-inchiostro-2 hover:text-inchiostro",
            )}
          >
            {o.etichetta}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Messaggio({ tipo, children }: { tipo: "errore" | "ok"; children: React.ReactNode }) {
  return (
    <p
      role={tipo === "errore" ? "alert" : "status"}
      className={cn(
        "rounded-medio border px-3 py-2.5 text-sm",
        tipo === "errore"
          ? "border-[color:var(--stato-sospesa)]/30 bg-[color:var(--stato-sospesa)]/8 text-[color:var(--stato-sospesa)]"
          : "border-[color:var(--stato-attiva)]/30 bg-[color:var(--stato-attiva)]/8 text-[color:var(--stato-attiva)]",
      )}
    >
      {children}
    </p>
  );
}
