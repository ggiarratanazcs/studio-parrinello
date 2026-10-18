"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Maximize2, X } from "lucide-react";

/**
 * Finestra modale per le schede. Si chiude con Esc, con il pulsante o cliccando
 * fuori; la chiusura torna alla pagina precedente (l'indirizzo resta condivisibile).
 * Su telefono occupa tutto lo schermo.
 */
export function Modale({ children, paginaIntera }: { children: ReactNode; paginaIntera: string }) {
  const router = useRouter();
  const pannello = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chiudiConEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    document.addEventListener("keydown", chiudiConEsc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    pannello.current?.focus();
    return () => {
      document.removeEventListener("keydown", chiudiConEsc);
      document.body.style.overflow = overflow;
    };
  }, [router]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-inchiostro/35 md:items-start md:p-6 lg:p-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) router.back();
      }}
    >
      <div
        ref={pannello}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="pt-sicuro relative flex h-full w-full max-w-6xl flex-col overflow-hidden bg-sfondo outline-none md:h-auto md:max-h-full md:rounded-l md:shadow-[0_24px_60px_-20px_rgba(43,42,40,0.45)]"
      >
        <div className="flex shrink-0 items-center justify-end gap-1 border-b border-linea px-3 py-2">
          <a
            href={paginaIntera}
            className="grid size-9 place-items-center rounded-m text-tenue hover:bg-superficie-2 hover:text-inchiostro"
            title="Apri a pagina intera"
          >
            <Maximize2 className="size-4" strokeWidth={1.8} />
            <span className="sr-only">Apri a pagina intera</span>
          </a>
          <button
            type="button"
            onClick={() => router.back()}
            className="grid size-9 place-items-center rounded-m text-tenue hover:bg-superficie-2 hover:text-inchiostro"
            title="Chiudi"
          >
            <X className="size-5" strokeWidth={1.8} />
            <span className="sr-only">Chiudi</span>
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-10 pt-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}
