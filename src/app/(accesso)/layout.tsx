import { Monogramma } from "@/components/monogramma";
import { LogoImmagine } from "@/components/studio-contesto";
import { leggiStudio } from "@/lib/studio";

export default async function LayoutAccesso({ children }: LayoutProps<"/">) {
  // Nome, claim e logo dalla configurazione dello studio (lettura pubblica, in memoria)
  const studio = await leggiStudio();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Pannello del marchio: solo su schermi grandi */}
      <aside className="relative hidden overflow-hidden bg-pietra lg:block">
        {studio.logoUrl ? (
          <LogoImmagine logoUrl={studio.logoUrl} nome={studio.nome} titolo="" className="absolute bottom-16 left-12 h-40 max-w-[70%] opacity-90" />
        ) : (
          <Monogramma className="absolute -bottom-[10%] -right-[12%] h-[82%] text-inchiostro/90" titolo="" />
        )}
        <div className="relative px-12 pt-12">
          <p className="text-[1.25rem] font-medium" style={{ fontVariationSettings: '"wdth" 112' }}>
            {studio.nome}
          </p>
          {studio.claim ? <p className="etichetta mt-1 text-inchiostro-2">{studio.claim}</p> : null}
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
