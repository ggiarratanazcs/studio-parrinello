"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Maximize2, X } from "lucide-react";
import { Monogramma } from "@/components/monogramma";

/**
 * Finestra modale per le schede. In alto una testata con il prospetto architettonico
 * e il monogramma dello studio in trasparenza. Si chiude con Esc, con la X o cliccando
 * fuori; la chiusura torna alla pagina precedente (l'indirizzo resta condivisibile).
 * Su telefono occupa tutto lo schermo.
 */
export function Modale({
  children,
  paginaIntera,
  etichetta,
}: {
  children: ReactNode;
  paginaIntera: string;
  etichetta: string;
}) {
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
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-inchiostro/40 backdrop-blur-[2px] md:items-start md:p-6 lg:p-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) router.back();
      }}
    >
      <div
        ref={pannello}
        role="dialog"
        aria-modal="true"
        aria-label={etichetta}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-[1400px] flex-col overflow-hidden bg-sfondo outline-none md:h-auto md:max-h-full md:rounded-l md:shadow-[0_30px_80px_-24px_rgba(43,42,40,0.55)]"
      >
        <TestataModale etichetta={etichetta}>
          <a
            href={paginaIntera}
            className="grid size-9 place-items-center rounded-full bg-white/10 text-[#f3ece0] backdrop-blur-md transition-colors hover:bg-white/20"
            title="Apri a pagina intera"
          >
            <Maximize2 className="size-4" strokeWidth={1.8} />
            <span className="sr-only">Apri a pagina intera</span>
          </a>
          <button
            type="button"
            onClick={() => router.back()}
            className="grid size-9 place-items-center rounded-full bg-white/10 text-[#f3ece0] backdrop-blur-md transition-colors hover:bg-white/20"
            title="Chiudi"
          >
            <X className="size-5" strokeWidth={1.8} />
            <span className="sr-only">Chiudi</span>
          </button>
        </TestataModale>
        <div className="overflow-y-auto px-4 pb-10 pt-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}

/**
 * Testata: fondo antracite con il prospetto di una villa disegnato a linee chiare,
 * velatura in bronzo verso sinistra per la leggibilità, monogramma grande in trasparenza.
 */
function TestataModale({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <div className="pt-sicuro relative shrink-0 overflow-hidden bg-[#2b2a28] text-[#f3ece0]">
      {/* Prospetto architettonico */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-[position:center_78%] opacity-80"
        style={{ backgroundImage: "url(/brand/prospetto.svg)" }}
      />
      {/* Velatura per far emergere marchio e testo */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(43,42,40,0.94) 0%, rgba(43,42,40,0.72) 32%, rgba(43,42,40,0.15) 70%, rgba(138,90,43,0.18) 100%)",
        }}
      />
      {/* Monogramma in trasparenza */}
      <Monogramma
        titolo=""
        className="pointer-events-none absolute -bottom-[45%] right-[6%] h-[210%] text-[#f3ece0] opacity-[0.09]"
      />

      <div className="relative flex h-24 items-center justify-between gap-4 px-4 md:h-32 md:px-8">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <Monogramma className="h-9 shrink-0 text-[#f3ece0] md:h-11" />
          <div className="min-w-0 border-l border-white/20 pl-3 md:pl-4">
            <p className="truncate text-[0.9375rem] font-medium md:text-base" style={{ fontVariationSettings: '"wdth" 112' }}>
              Studio Parrinello
            </p>
            <p className="truncate text-[0.8125rem] text-[#f3ece0]/65">{etichetta}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start pt-4 md:pt-5">{children}</div>
      </div>
    </div>
  );
}
