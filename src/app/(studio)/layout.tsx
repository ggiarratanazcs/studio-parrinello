import { Suspense } from "react";
import Link from "next/link";
import { Monogramma } from "@/components/monogramma";
import { NavLaterale, NavMobile, NavSuperiore } from "@/components/navigazione";
import { UtenteLaterale, UtenteMobile, UtenteSegnaposto } from "@/components/utente";
import { PulsanteBarra } from "@/components/pulsante-barra";

/**
 * Area riservata. Contiene entrambe le impaginazioni: il CSS mostra quella scelta
 * in Impostazioni (attributo data-impaginazione su <html>).
 */
export default function LayoutStudio({ children, modale }: LayoutProps<"/">) {
  return (
    <div className="relative min-h-dvh lg:flex">
      {/* ── Impaginazione "laterale": barra fluttuante a sinistra, richiudibile ── */}
      <aside className="barra-laterale solo-laterale sticky top-0 z-40 hidden h-dvh shrink-0 p-3 lg:block">
        <div className="relative flex h-full flex-col rounded-[22px] border border-linea/70 bg-superficie px-3 py-5 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_24px_48px_-24px_rgba(43,42,40,0.35),0_8px_16px_-12px_rgba(43,42,40,0.2)]">
          <PulsanteBarra />
          <Link href="/" data-suggerimento="Home" data-suggerimento-lato="destra" data-suggerimento-se-barra-chiusa className="mb-8 flex items-center gap-3 px-1.5">
            <Monogramma className="h-9 shrink-0" />
            <span className="solo-barra-aperta leading-tight">
              <span className="block whitespace-nowrap text-[1.0625rem] font-medium" style={{ fontVariationSettings: '"wdth" 112' }}>
                Studio Parrinello
              </span>
              <span className="etichetta block whitespace-nowrap">Architettura e design</span>
            </span>
          </Link>

          <NavLaterale />

          <div className="mt-auto border-t border-linea pt-3">
            <Suspense fallback={<UtenteSegnaposto />}>
              <UtenteLaterale />
            </Suspense>
          </div>
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
            <Link href="/" aria-label="Home">
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

        <main className="px-4 pb-28 pt-6 md:px-8 md:pt-10 lg:px-10 lg:pb-16">
          <div className="w-full">{children}</div>
        </main>
      </div>

      <NavMobile />
      {modale}
    </div>
  );
}
