"use client";

import { useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { CHIAVE_TEMA, TEMA_PREDEFINITO, TEMI, type IdTema } from "@/lib/temi";
import { cn } from "@/lib/utils";

const ATTRIBUTO = "data-theme";

function iscriviti(aggiorna: () => void) {
  const osservatore = new MutationObserver(aggiorna);
  osservatore.observe(document.documentElement, { attributes: true, attributeFilter: [ATTRIBUTO] });
  return () => osservatore.disconnect();
}

function leggi(): IdTema {
  return (document.documentElement.getAttribute(ATTRIBUTO) as IdTema) ?? TEMA_PREDEFINITO;
}

function scegli(id: IdTema) {
  document.documentElement.setAttribute(ATTRIBUTO, id);
  try {
    localStorage.setItem(CHIAVE_TEMA, id);
  } catch {
    // Archiviazione non disponibile: la scelta vale fino alla chiusura della pagina
  }
}

/** Anteprima del tema: tre campioni di colore (fondo, barra, accento). */
const CAMPIONI: Partial<Record<IdTema, string[]>> = {
  caldo: ["#ede8df", "#2e2b27", "#8a5a2b"],
  navy: ["#eef2f7", "#13213a", "#2d5893"],
};

/** Elenco dei temi: la scelta vale su questo dispositivo. */
export function SceltaTema() {
  const attivo = useSyncExternalStore(iscriviti, leggi, () => TEMA_PREDEFINITO);

  return (
    <ul className="divide-y divide-linea" role="radiogroup" aria-label="Tema">
      {TEMI.map((t) => {
        const scelto = t.id === attivo;
        const campioni = CAMPIONI[t.id];
        return (
          <li key={t.id}>
            <button
              type="button"
              role="radio"
              aria-checked={scelto}
              disabled={!t.disponibile}
              onClick={() => scegli(t.id)}
              className={cn(
                "flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors md:px-6",
                !scelto && t.disponibile && "hover:bg-superficie-2/50",
              )}
            >
              <span className="flex items-center gap-4">
                {campioni ? (
                  <span aria-hidden className="flex -space-x-1.5">
                    {campioni.map((c) => (
                      <span key={c} className="size-5 rounded-full border-2 border-superficie" style={{ background: c }} />
                    ))}
                  </span>
                ) : (
                  <span aria-hidden className="size-5 w-[3.25rem]" />
                )}
                <span>
                  <span className={cn("block font-medium", !t.disponibile && "text-tenue")}>{t.nome}</span>
                  <span className="block text-sm text-tenue">{t.descrizione}</span>
                </span>
              </span>
              {scelto ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-accento">
                  <Check className="size-4" strokeWidth={2} /> In uso
                </span>
              ) : t.disponibile ? (
                <span className="shrink-0 text-sm text-accento">Usa</span>
              ) : (
                <span className="etichetta shrink-0">In arrivo</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
