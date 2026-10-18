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
/** Colore di fondo della testata per tipo di scheda (stesso disegno, materia diversa). */
const FONDI = {
  commessa: { base: "#2f3a2b", rgb: "47,58,43", riflesso: "120,140,96" },      // oliva scuro
  preventivo: { base: "#4a321c", rgb: "74,50,28", riflesso: "176,124,64" },    // bronzo brunito
  prefattibilita: { base: "#2b3540", rgb: "43,53,64", riflesso: "110,130,150" }, // ardesia
} as const;

export type TipoScheda = keyof typeof FONDI;

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
        className="relative flex h-full w-full max-w-[1400px] flex-col overflow-hidden bg-sfondo outline-none md:h-auto md:max-h-full md:rounded-l md:shadow-[0_30px_80px_-24px_rgba(43,42,40,0.55)]"
      >
        <TestataModale etichetta={etichetta} tipo={tipo}>
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
 * Testata: fondo colorato per tipo di scheda con il prospetto di una villa disegnato a linee chiare,
 * velatura in bronzo verso sinistra per la leggibilità, monogramma grande in trasparenza.
 */
function TestataModale({ etichetta, tipo, children }: { etichetta: string; tipo: TipoScheda; children: ReactNode }) {
  const f = FONDI[tipo];
  return (
    <div className="pt-sicuro relative shrink-0 overflow-hidden text-[#f3ece0]" style={{ background: f.base }}>
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
            `linear-gradient(90deg, rgba(${f.rgb},0.95) 0%, rgba(${f.rgb},0.7) 32%, rgba(${f.rgb},0.12) 70%, rgba(${f.riflesso},0.22) 100%)`,
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
