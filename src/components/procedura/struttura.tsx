"use client";

import type { ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";
import { Pannello, Pulsante } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Indicatore dei passi: si torna indietro cliccando un passo completato. */
export function Passi({ nomi, corrente, onVai }: { nomi: readonly string[]; corrente: number; onVai: (p: number) => void }) {
  return (
    <ol className="flex gap-2" aria-label="Passi della procedura">
      {nomi.map((nome, i) => {
        const fatto = i < corrente;
        const attivo = i === corrente;
        return (
          <li key={nome} className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onVai(i)}
              disabled={!fatto}
              aria-current={attivo ? "step" : undefined}
              className="group w-full text-left disabled:cursor-default"
            >
              <span
                className={cn(
                  "block h-1 rounded-full transition-colors",
                  attivo ? "bg-accento" : fatto ? "bg-inchiostro" : "bg-linea",
                )}
              />
              <span
                className={cn(
                  "mt-2 flex items-center gap-1.5 text-sm",
                  attivo ? "text-inchiostro" : "text-tenue",
                  fatto ? "group-hover:text-inchiostro" : "",
                )}
              >
                {fatto ? <Check className="size-3.5" strokeWidth={2.2} /> : <span className="numeri">{i + 1}</span>}
                <span className={attivo ? "truncate" : "hidden truncate sm:inline"}>{nome}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Impaginazione comune delle procedure: passi in alto, contenuto del passo,
 * pulsanti Indietro/Avanti, riepilogo a destra su schermi grandi.
 */
export function CorniceProcedura({
  nomi,
  passo,
  titolo,
  onVai,
  onAvanti,
  onSalva,
  etichettaSalva,
  inCorso,
  riepilogo,
  children,
}: {
  nomi: readonly string[];
  passo: number;
  titolo: string;
  onVai: (p: number) => void;
  onAvanti: () => void;
  onSalva: () => void;
  etichettaSalva: string;
  inCorso: boolean;
  riepilogo: { etichetta: string; valore?: string | null }[];
  children: ReactNode;
}) {
  const ultimo = passo === nomi.length - 1;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
      <div className="min-w-0">
        <Passi nomi={nomi} corrente={passo} onVai={onVai} />
        <Pannello className="mt-6 p-5 md:p-7">
          <section aria-labelledby="t-passo" className="flex flex-col gap-5">
            <h2 id="t-passo" className="text-xl font-medium" style={{ fontVariationSettings: '"wdth" 108' }}>
              {titolo}
            </h2>
            {children}
          </section>
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-linea pt-5">
            {passo > 0 ? (
              <Pulsante variante="discreto" type="button" onClick={() => onVai(passo - 1)} disabled={inCorso}>
                Indietro
              </Pulsante>
            ) : (
              <span />
            )}
            {ultimo ? (
              <Pulsante type="button" onClick={onSalva} disabled={inCorso}>
                {inCorso ? <Loader2 className="size-4 animate-spin" /> : null}
                {etichettaSalva}
              </Pulsante>
            ) : (
              <Pulsante type="button" onClick={onAvanti}>
                Avanti
              </Pulsante>
            )}
          </div>
        </Pannello>
      </div>
      <aside className="hidden lg:block">
        <Pannello className="sticky top-6 p-5">
          <h2 className="text-base font-medium">Riepilogo</h2>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            {riepilogo.map((r) => (
              <div key={r.etichetta}>
                <dt className="etichetta">{r.etichetta}</dt>
                <dd className={cn("mt-0.5", r.valore ? "" : "text-tenue")}>{r.valore || "—"}</dd>
              </div>
            ))}
          </dl>
        </Pannello>
      </aside>
    </div>
  );
}

/** Gestione dei passi con validazione: restituisce le funzioni per avanzare e tornare indietro. */
export function navigazionePassi(
  passo: number,
  totale: number,
  setPasso: (p: number) => void,
  setErrori: (e: Record<string, string>) => void,
  validatori: (() => Record<string, string>)[],
) {
  function valida(p: number) {
    const e = validatori[p]?.() ?? {};
    setErrori(e);
    return Object.keys(e).length === 0;
  }
  return {
    valida,
    avanti() {
      if (!valida(passo)) return;
      setPasso(Math.min(passo + 1, totale - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    vaiA(p: number) {
      if (p < passo) {
        setErrori({});
        setPasso(p);
      }
    },
    /** Valida tutti i passi; se uno fallisce porta l'utente lì e restituisce false. */
    validaTutto() {
      for (let p = 0; p < totale; p++) {
        if (!valida(p)) {
          setPasso(p);
          return false;
        }
      }
      return true;
    },
  };
}
