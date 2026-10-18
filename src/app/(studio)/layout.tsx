import { Suspense } from "react";
import Link from "next/link";
import { Monogramma } from "@/components/monogramma";
import { NavLaterale, NavMobile } from "@/components/navigazione";
import { UtenteLaterale, UtenteMobile, UtenteSegnaposto } from "@/components/utente";

export default function LayoutStudio({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      {/* Barra laterale — schermi grandi */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-linea bg-superficie-2 px-4 py-6 lg:flex">
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

      {/* Barra in alto — telefono */}
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

      <main className="min-w-0 px-4 pb-28 pt-6 md:px-8 md:pt-10 lg:px-12 lg:pb-16">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <NavMobile />
    </div>
  );
}
