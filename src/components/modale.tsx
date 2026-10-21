"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Maximize2, X } from "lucide-react";
import { Monogramma } from "@/components/monogramma";
import { FONDI, type TipoFondo } from "@/lib/fondi";

/**
 * Finestra modale per le schede. In alto una testata con il prospetto architettonico
 * e il monogramma dello studio in trasparenza. Si chiude con Esc, con la X o cliccando
 * fuori; la chiusura torna alla pagina precedente (l'indirizzo resta condivisibile).
 * Su telefono occupa tutto lo schermo.
 */
export type TipoScheda = Exclude<TipoFondo, "studio">;

export function Modale({
  children,
  paginaIntera,
  etichetta,
  tipo,
}: {
  children: ReactNode;
  paginaIntera: string;
  etichetta: string;
  tipo: TipoScheda;
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
        className="relative flex h-full w-full max-w-[1400px] flex-col overflow-hidden bg-sfondo outline-none md:h-full md:rounded-grande md:shadow-[0_30px_80px_-24px_rgba(43,42,40,0.55)]"
      >
        <TestataModale etichetta={etichetta} tipo={tipo}>
          <a
            href={paginaIntera}
            className="grid size-9 place-items-center rounded-full bg-white/10 text-[#f3ece0] backdrop-blur-md transition-colors hover:bg-white/20"
            data-suggerimento="Apri a pagina intera"
            data-suggerimento-lato="sotto"
          >
            <Maximize2 className="size-4" strokeWidth={1.8} />
            <span className="sr-only">Apri a pagina intera</span>
          </a>
          <button
            type="button"
            onClick={() => router.back()}
            className="grid size-9 place-items-center rounded-full bg-white/10 text-[#f3ece0] backdrop-blur-md transition-colors hover:bg-white/20"
            data-suggerimento="Chiudi (Esc)"
            data-suggerimento-lato="sotto"
          >
            <X className="size-5" strokeWidth={1.8} />
            <span className="sr-only">Chiudi</span>
          </button>
        </TestataModale>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}

/**
 * Testata: fondo colorato per tipo di scheda con lo stesso disegno della testata della sua sezione
 * (attenuato come nelle pagine), velatura verso sinistra per la leggibilità, monogramma leggero in trasparenza.
 */
export function TestataModale({ etichetta, tipo, children }: { etichetta: string; tipo: TipoScheda; children: ReactNode }) {
  const f = FONDI[tipo];
  return (
    <div className="pt-sicuro relative shrink-0 overflow-hidden text-[#f3ece0]" style={{ background: f.base }}>
      {/* Disegno della sezione (lo stesso della testata di pagina) */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-[position:62%_center] opacity-50 md:bg-[position:right_center]"
        style={{ backgroundImage: `url(${f.disegno})` }}
      />
      {/* Velatura per far emergere marchio e testo */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            `linear-gradient(90deg, rgba(${f.rgb},0.95) 0%, rgba(${f.rgb},0.8) 32%, rgba(${f.rgb},0.5) 70%, rgba(${f.rgb},0.42) 100%)`,
        }}
      />
      {/* Monogramma in trasparenza */}
      <Monogramma
        titolo=""
        className="pointer-events-none absolute -bottom-[18%] right-[14%] hidden h-[115%] text-[#f3ece0] opacity-[0.045] md:block"
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
