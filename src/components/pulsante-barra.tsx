"use client";

import { useSyncExternalStore } from "react";
import { ChevronsLeft } from "lucide-react";
import { CHIAVE_BARRA } from "@/lib/impaginazione";

const ATTRIBUTO = "data-barra";

function iscriviti(aggiorna: () => void) {
  const osservatore = new MutationObserver(aggiorna);
  osservatore.observe(document.documentElement, { attributes: true, attributeFilter: [ATTRIBUTO] });
  return () => osservatore.disconnect();
}

const leggi = () => document.documentElement.getAttribute(ATTRIBUTO) === "chiusa";

/** Apre e chiude la barra laterale; la scelta resta salvata su questo dispositivo. */
export function PulsanteBarra() {
  const chiusa = useSyncExternalStore(iscriviti, leggi, () => false);

  function alterna() {
    const nuova = chiusa ? "aperta" : "chiusa";
    document.documentElement.setAttribute(ATTRIBUTO, nuova);
    try {
      localStorage.setItem(CHIAVE_BARRA, nuova);
    } catch {
      // Archiviazione non disponibile: la scelta vale fino alla chiusura della pagina
    }
  }

  return (
    <button
      type="button"
      onClick={alterna}
      aria-label={chiusa ? "Apri la barra laterale" : "Chiudi la barra laterale"}
      title={chiusa ? "Apri la barra" : "Chiudi la barra"}
      className="absolute -right-3.5 top-9 z-10 grid size-7 place-items-center rounded-full border border-linea bg-superficie text-tenue shadow-[0_4px_12px_-4px_rgba(43,42,40,0.35)] transition-colors hover:text-inchiostro"
    >
      <ChevronsLeft className={`size-4 transition-transform duration-300 ${chiusa ? "rotate-180" : ""}`} strokeWidth={1.8} />
    </button>
  );
}
