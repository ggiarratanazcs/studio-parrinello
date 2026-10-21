"use client";

import { useRef, useSyncExternalStore } from "react";
import { ChevronsLeft } from "lucide-react";
import { LogoStudio } from "@/components/studio-contesto";
import { CHIAVE_BARRA } from "@/lib/impaginazione";
import { cn } from "@/lib/utils";

const ATTRIBUTO = "data-barra";

function iscriviti(aggiorna: () => void) {
  const osservatore = new MutationObserver(aggiorna);
  osservatore.observe(document.documentElement, { attributes: true, attributeFilter: [ATTRIBUTO] });
  return () => osservatore.disconnect();
}

const leggi = () => document.documentElement.getAttribute(ATTRIBUTO) === "chiusa";

/** Stato della barra (laterale o capsula in alto): chiusa o aperta, salvato su questo dispositivo. */
function useBarra() {
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
  return { chiusa, alterna };
}

/** Freccia sul bordo della barra laterale: apre e chiude la barra. */
export function PulsanteBarra() {
  const { chiusa, alterna } = useBarra();
  return (
    <button
      type="button"
      onClick={alterna}
      aria-label={chiusa ? "Apri la barra laterale" : "Chiudi la barra laterale"}
      data-suggerimento={chiusa ? "Apri la barra" : "Chiudi la barra"}
      data-suggerimento-lato="destra"
      className="absolute -right-3.5 top-9 z-10 grid size-7 place-items-center rounded-full border border-linea bg-superficie text-tenue shadow-[0_4px_12px_-4px_rgba(43,42,40,0.35)] transition-colors hover:text-inchiostro"
    >
      <ChevronsLeft className={`size-4 transition-transform duration-300 ${chiusa ? "rotate-180" : ""}`} strokeWidth={1.8} />
    </button>
  );
}

/**
 * Monogramma dello studio che apre e chiude la barra (laterale o capsula in alto).
 * Al clic il monogramma fa un mezzo giro sul suo asse, come un foglio voltato.
 */
export function LogoBarra({
  className,
  classeLogo = "h-9",
  lato = "destra",
  children,
}: {
  className?: string;
  classeLogo?: string;
  lato?: "destra" | "sotto";
  children?: React.ReactNode;
}) {
  const { chiusa, alterna } = useBarra();
  const logo = useRef<HTMLSpanElement>(null);

  function clic() {
    const el = logo.current;
    if (el) {
      el.classList.remove("logo-volta");
      void el.offsetWidth; // riavvia l'animazione anche a clic ravvicinati
      el.classList.add("logo-volta");
    }
    alterna();
  }

  return (
    <button
      type="button"
      onClick={clic}
      aria-expanded={!chiusa}
      aria-label={chiusa ? "Apri il menu" : "Chiudi il menu"}
      data-suggerimento={chiusa ? "Apri il menu" : "Chiudi il menu"}
      data-suggerimento-lato={lato}
      className={cn("logo-barra flex items-center gap-3 rounded-[12px] text-left", className)}
    >
      <span ref={logo} className="inline-flex shrink-0">
        <LogoStudio className={classeLogo} titolo="" />
      </span>
      {children}
    </button>
  );
}
