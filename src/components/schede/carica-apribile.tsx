"use client";

import { useState, type ReactNode } from "react";
import { Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pulsante tondo e leggero per aggiungere allegati: apre sotto la zona di caricamento
 * (scegli o trascina i file) e la richiude. Il resto della sezione resta pulito.
 */
export function PulsanteAllegato({ aperto, onClick, className }: { aperto: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={aperto}
      aria-label={aperto ? "Chiudi il caricamento" : "Aggiungi allegati"}
      data-suggerimento={aperto ? "Chiudi" : "Aggiungi allegati"}
      className={cn(
        "relative grid size-9 shrink-0 place-items-center rounded-full border transition-colors",
        aperto ? "border-inchiostro bg-inchiostro text-superficie" : "border-linea-forte text-inchiostro-2 hover:bg-superficie-2 hover:text-inchiostro",
        className,
      )}
    >
      {aperto ? (
        <X className="size-4" strokeWidth={1.8} />
      ) : (
        <>
          <Paperclip className="size-4" strokeWidth={1.7} />
          <span aria-hidden className="absolute -right-0.5 -top-0.5 grid size-3.5 place-items-center rounded-full bg-superficie text-[0.6875rem] font-medium leading-none text-inchiostro shadow-[0_0_0_1px_var(--linea-forte)]">
            +
          </span>
        </>
      )}
    </button>
  );
}

/** Intestazione di sezione con il pulsante per aggiungere allegati; la zona di caricamento si apre sotto. */
export function IntestazioneConCaricamento({
  titolo,
  descrizione,
  caricamento,
}: {
  titolo: string;
  descrizione?: string;
  /** Zona di caricamento (scegli o trascina); senza, il pulsante non compare */
  caricamento?: ReactNode;
}) {
  const [aperto, setAperto] = useState(false);
  return (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-linea px-5 py-4 md:px-6">
        <div>
          <h2 className="text-base font-medium">{titolo}</h2>
          {descrizione ? <p className="mt-0.5 text-sm text-tenue">{descrizione}</p> : null}
        </div>
        {caricamento ? <PulsanteAllegato aperto={aperto} onClick={() => setAperto(!aperto)} /> : null}
      </div>
      {caricamento && aperto ? <div className="border-b border-linea bg-superficie-2/40 px-5 py-4 md:px-6">{caricamento}</div> : null}
    </>
  );
}
