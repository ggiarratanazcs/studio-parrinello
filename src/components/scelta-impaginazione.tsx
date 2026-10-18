"use client";

import { useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import {
  CHIAVE_IMPAGINAZIONE,
  IMPAGINAZIONE_PREDEFINITA,
  IMPAGINAZIONI,
  type IdImpaginazione,
} from "@/lib/impaginazione";
import { cn } from "@/lib/utils";

const ATTRIBUTO = "data-impaginazione";

function iscriviti(aggiorna: () => void) {
  const osservatore = new MutationObserver(aggiorna);
  osservatore.observe(document.documentElement, { attributes: true, attributeFilter: [ATTRIBUTO] });
  return () => osservatore.disconnect();
}

function leggi(): IdImpaginazione {
  return (document.documentElement.getAttribute(ATTRIBUTO) as IdImpaginazione) ?? IMPAGINAZIONE_PREDEFINITA;
}

function scegli(id: IdImpaginazione) {
  document.documentElement.setAttribute(ATTRIBUTO, id);
  try {
    localStorage.setItem(CHIAVE_IMPAGINAZIONE, id);
  } catch {
    // Archiviazione non disponibile: la scelta vale fino alla chiusura della pagina
  }
}

/** Elenco delle impaginazioni: la scelta vale su questo dispositivo. */
export function SceltaImpaginazione() {
  const attiva = useSyncExternalStore(iscriviti, leggi, () => IMPAGINAZIONE_PREDEFINITA);

  return (
    <ul className="divide-y divide-linea" role="radiogroup" aria-label="Impaginazione">
      {IMPAGINAZIONI.map((imp) => {
        const scelta = imp.id === attiva;
        return (
          <li key={imp.id}>
            <button
              type="button"
              role="radio"
              aria-checked={scelta}
              onClick={() => scegli(imp.id)}
              className={cn(
                "flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors md:px-6",
                scelta ? "" : "hover:bg-superficie-2/50",
              )}
            >
              <span>
                <span className="block font-medium">{imp.nome}</span>
                <span className="block text-sm text-tenue">{imp.descrizione}</span>
              </span>
              {scelta ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-accento">
                  <Check className="size-4" strokeWidth={2} /> In uso
                </span>
              ) : (
                <span className="shrink-0 text-sm text-accento">Usa</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
