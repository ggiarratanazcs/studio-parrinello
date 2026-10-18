import { Monogramma } from "@/components/monogramma";

export default function LayoutAccesso({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Pannello del marchio: solo su schermi grandi */}
      <aside className="relative hidden overflow-hidden bg-pietra lg:block">
        <Monogramma className="absolute -bottom-[10%] -right-[12%] h-[82%] text-inchiostro/90" titolo="" />
        <div className="relative px-12 pt-12">
          <p className="text-[1.25rem] font-medium" style={{ fontVariationSettings: '"wdth" 112' }}>
            Studio Parrinello
          </p>
          <p className="etichetta mt-1 text-inchiostro-2">Architettura e design · Siracusa</p>
        </div>
      </aside>

      <main className="pt-sicuro flex flex-col justify-center px-6 py-12 md:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Monogramma className="mb-10 h-12 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
