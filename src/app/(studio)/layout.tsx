import { Suspense } from "react";
import Link from "next/link";
import { Monogramma } from "@/components/monogramma";
import { NavLaterale, NavMobile, NavSuperiore } from "@/components/navigazione";
import { SalutoUtente, UtenteLaterale, UtenteMobile, UtenteSegnaposto } from "@/components/utente";
import { LogoBarra, PulsanteBarra } from "@/components/pulsante-barra";
import { Benvenuto } from "@/components/benvenuto";
import { CursoreCompasso } from "@/components/cursore-compasso";
import { LogoImmagine, StudioProvider } from "@/components/studio-contesto";
import { leggiStudio } from "@/lib/studio";
import { NascondiSezioni } from "@/components/permessi";
import { AssistenteStudio } from "@/components/assistente/assistente-studio";

/**
 * Area riservata. Contiene entrambe le impaginazioni: il CSS mostra quella scelta
 * in Impostazioni (attributo data-impaginazione su <html>).
 */
export default async function LayoutStudio({ children, modale }: LayoutProps<"/">) {
  // Nome, claim e logo dalla configurazione dello studio (in memoria, si aggiorna al salvataggio)
  const studio = await leggiStudio();
  return (
    <StudioProvider valore={{ nome: studio.nome, claim: studio.claim, logoUrl: studio.logoUrl }}>
    <div className="relative min-h-dvh lg:flex">
      <Benvenuto />
      <Suspense fallback={null}>
        <CursoreCompasso />
      </Suspense>
      {/* Sezioni non permesse: tolte dal menu e dal "+" */}
      <Suspense fallback={null}>
        <NascondiSezioni />
      </Suspense>
      {/* ── Impaginazione "laterale": barra fluttuante a sinistra, richiudibile ── */}
      <aside className="barra-laterale solo-laterale sticky top-0 z-40 hidden h-dvh shrink-0 p-3 lg:block">
        <div className="relative flex h-full flex-col rounded-[22px] border border-linea/70 bg-superficie px-3 py-5 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_24px_48px_-24px_rgba(43,42,40,0.35),0_8px_16px_-12px_rgba(43,42,40,0.2)]">
          <PulsanteBarra />
          {/* Il monogramma apre e chiude la barra; la home resta la prima voce del menu */}
          <LogoBarra className="mb-8 px-1.5">
            <span className="solo-barra-aperta leading-tight">
              <span className="block whitespace-nowrap text-[1.0625rem] font-medium" style={{ fontVariationSettings: '"wdth" 112' }}>
                {studio.nome}
              </span>
              {studio.claim ? <span className="etichetta block whitespace-nowrap">{studio.claim}</span> : null}
            </span>
          </LogoBarra>

          <NavLaterale />

          <div className="mt-auto border-t border-linea pt-3">
            <Suspense fallback={<UtenteSegnaposto />}>
              <UtenteLaterale />
            </Suspense>
          </div>
        </div>
      </aside>

      {/* ── Impaginazione "materia": monogramma come segno di sfondo (solo senza logo caricato) ── */}
      {studio.logoUrl ? null : (
        <Monogramma
          titolo=""
          className="solo-materia pointer-events-none fixed -right-16 -top-10 h-[26rem] text-inchiostro opacity-[0.07] md:h-[38rem]"
        />
      )}

      <div className="relative min-w-0 flex-1">
        {/* Barra in alto — telefono (entrambe le impaginazioni) */}
        <header className="pt-sicuro sticky top-0 z-30 border-b border-linea bg-sfondo/90 backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoImmagine logoUrl={studio.logoUrl} nome={studio.nome} className="h-7" />
              <span className="text-[0.9375rem] font-medium" style={{ fontVariationSettings: '"wdth" 112' }}>
                {studio.nome}
              </span>
            </Link>
            <Suspense fallback={<UtenteSegnaposto compatto />}>
              <UtenteMobile />
            </Suspense>
          </div>
        </header>

        {/* Barra in alto — schermi grandi, impaginazione "materia": capsula fluttuante sopra la testata */}
        <header className="barra-materia solo-materia absolute inset-x-0 top-0 z-40 hidden px-6 pt-5 lg:block">
          <div className="capsula flex items-center justify-between gap-6 rounded-[22px] border border-linea/70 bg-superficie/95 py-2 pl-5 pr-3 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_24px_48px_-24px_rgba(43,42,40,0.45),0_8px_16px_-12px_rgba(43,42,40,0.25)] backdrop-blur-md">
            <div className="flex items-center gap-6">
              {/* Il monogramma richiude la capsula fino a lasciare solo sé stesso */}
              <LogoBarra classeLogo="h-8" lato="sotto" />
              <div className="contenuto-capsula">
                <NavSuperiore />
              </div>
            </div>
            <div className="contenuto-capsula">
              <Suspense fallback={<UtenteSegnaposto compatto />}>
                <SalutoUtente />
              </Suspense>
            </div>
          </div>
        </header>

        <main className="area-lavoro px-4 pb-36 pt-6 md:px-8 md:pt-10 lg:px-10 lg:pb-16">
          <div className="w-full">{children}</div>
        </main>
      </div>

      <NavMobile />
      {/* Assistente dello studio (titolare e architetti) */}
      <Suspense fallback={null}>
        <AssistenteStudio />
      </Suspense>
      {modale}
    </div>
    </StudioProvider>
  );
}
