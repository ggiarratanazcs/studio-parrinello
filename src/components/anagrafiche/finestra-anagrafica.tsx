"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * Finestra per le schede anagrafiche: il foglio galleggia sopra la pagina, senza testata scura.
 * Si chiude con Esc, cliccando fuori o con la X del foglio; la chiusura torna alla pagina precedente.
 */
const InFinestra = createContext(false);

/** true se la scheda è aperta in finestra (e non a pagina intera). */
export function useInFinestra() {
  return useContext(InFinestra);
}

export function FinestraAnagrafica({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      // Esc dentro un campo in modifica non deve chiudere la scheda
      const t = e.target as HTMLElement | null;
      if (e.key !== "Escape" || (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      router.back();
    };
    document.addEventListener("keydown", esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = overflow;
    };
  }, [router]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-inchiostro/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.fuori === "si") router.back();
      }}
    >
      {/* Il foglio sta al centro dello schermo; se è più alto della finestra, si scorre */}
      <div data-fuori="si" className="flex min-h-full flex-col justify-center">
        <div
          data-fuori="si"
          role="dialog"
          aria-modal="true"
          aria-label={etichetta}
          className="pt-sicuro mx-auto w-full max-w-[60rem] px-3 pb-10 pt-4 md:px-8 md:py-10 lg:px-0"
        >
          <InFinestra.Provider value={true}>{children}</InFinestra.Provider>
        </div>
      </div>
    </div>
  );
}
