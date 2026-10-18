import { Suspense } from "react";
import Link from "next/link";
import { Monogramma } from "@/components/monogramma";
import { NavLaterale, NavMobile, NavSuperiore } from "@/components/navigazione";
import { UtenteLaterale, UtenteMobile, UtenteSegnaposto } from "@/components/utente";

/**
 * Area riservata. Contiene entrambe le impaginazioni: il CSS mostra quella scelta
 * in Impostazioni (attributo data-impaginazione su <html>).
 */
export default function LayoutStudio({ children, modale }: LayoutProps<"/">) {
  return (
    <div className="relative min-h-dvh lg:flex">
      {/* ── Impaginazione "laterale": barra a sinistra, schermi grandi ── */}
      <aside className="solo-laterale sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-linea bg-superficie-2 px-4 py-6 lg:flex">
        <Link href="/" className="mb-10 flex items-center gap-3 px-2">
          <Monogramma className="h-9" />
          <span className="leading-tight">
            <span className="block text-[1.0625rem] font-medium" style={{ fontVariationSettings: '"wdth" 112' }}>
              Studio Parrinello
            </span>
            <span className="etichetta block">Architettura e design</span>
          </span>
        </Link>

        <NavLaterale />

        <div className="mt-auto border-t border-linea pt-4">
          <Suspense fallback={<UtenteSegnaposto />}>
            <UtenteLaterale />
          </Suspense>
        </div>
      </aside>

      {/* ── Impaginazione "materia": monogramma come segno di sfondo ── */}
      <Monogramma
        titolo=""
        className="solo-materia pointer-events-none fixed -right-16 -top-10 h-[26rem] text-inchiostro opacity-[0.07] md:h-[38rem]"
      />

      <div className="relative min-w-0 flex-1">
        {/* Barra in alto — telefono (entrambe le impaginazioni) */}
        <header className="pt-sicuro sticky top-0 z-30 border-b border-linea bg-sfondo/90 backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Monogramma className="h-7" />
              <span className="text-[0.9375rem] font-medium" style={{ fontVariationSettings: '"wdth" 112' }}>
                Studio Parrinello
              </span>
            </Link>
            <Suspense fallback={<UtenteSegnaposto compatto />}>
              <UtenteMobile />
            </Suspense>
          </div>
        </header>

        {/* Barra in alto — schermi grandi, impaginazione "materia" */}
        <header className="solo-materia hidden items-center justify-between gap-6 px-12 pt-8 lg:flex">
          <div className="flex items-center gap-8">
            <Link href="/" aria-label="Panoramica">
              <Monogramma className="h-9" />
            </Link>
            <NavSuperiore />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/impostazioni"
              className="rounded-full px-4 py-1.5 text-[0.9375rem] text-tenue hover:bg-superficie/70 hover:text-inchiostro"
            >
              Impostazioni
            </Link>
            <Suspense fallback={<UtenteSegnaposto compatto />}>
              <UtenteMobile />
            </Suspense>
          </div>
        </header>

        <main className="px-4 pb-28 pt-6 md:px-8 md:pt-10 lg:px-12 lg:pb-16">
          <div className="max-w-6xl">{children}</div>
        </main>
      </div>

      <NavMobile />
      {modale}
    </div>
  );
}
