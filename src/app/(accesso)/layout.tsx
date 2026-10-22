import { LogoImmagine } from "@/components/studio-contesto";
import { leggiStudio } from "@/lib/studio";
import { DISEGNO_HOME, FONDI } from "@/lib/fondi";

export default async function LayoutAccesso({ children }: LayoutProps<"/">) {
  // Nome, claim e logo dalla configurazione dello studio (lettura pubblica, in memoria)
  const studio = await leggiStudio();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Pannello del marchio (solo su schermi grandi): fondo scuro dello studio con la mappa di Ortigia
          a linee in trasparenza, come nella testata della home; logo, nome e claim in alto */}
      <aside className="relative hidden overflow-hidden text-[#f3ece0] lg:block" style={{ background: FONDI.studio.base }}>
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-[position:72%_center] opacity-60"
          style={{ backgroundImage: `url(${DISEGNO_HOME})` }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, rgba(${FONDI.studio.rgb},0.92) 0%, rgba(${FONDI.studio.rgb},0.55) 45%, rgba(${FONDI.studio.rgb},0.35) 100%)` }}
        />
        <div className="relative flex h-full flex-col px-12 pb-12 pt-12">
          <LogoImmagine logoUrl={studio.logoUrl} nome={studio.nome} titolo="" className="h-14 w-auto self-start text-[#f3ece0]" chiaro />
          <p className="mt-8 text-[1.75rem] font-medium leading-tight" style={{ fontVariationSettings: '"wdth" 112' }}>
            {studio.nome}
          </p>
          {studio.claim ? <p className="mt-2 text-[0.8125rem] uppercase tracking-[0.22em] text-[#f3ece0]/65">{studio.claim}</p> : null}
        </div>
      </aside>

      <main className="pt-sicuro flex flex-col justify-center px-6 py-12 md:px-16">
        <div className="mx-auto w-full max-w-sm">
          <LogoImmagine logoUrl={studio.logoUrl} nome={studio.nome} className="mb-10 h-12 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
