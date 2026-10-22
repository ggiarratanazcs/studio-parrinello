import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FONDI } from "@/lib/fondi";

const PORTE = [
  {
    href: "/commesse",
    titolo: "Commesse",
    testo: "Incarichi, fasi e cantieri",
    immagine: "/brand/home-commesse.webp",
    fondo: FONDI.commessa,
    sezione: "/commesse",
  },
  {
    href: "/archivio",
    titolo: "Archivio",
    testo: "Tavole, relazioni, foto e documenti",
    immagine: "/brand/home-archivio.webp",
    fondo: FONDI.studio,
    sezione: "/archivio",
  },
];

/**
 * Due grandi accessi in fondo alla home: Commesse e Archivio (documenti).
 * Le foto sono velate nel colore della sezione e tornano piene al passaggio del mouse.
 */
export function PorteHome() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {PORTE.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          data-sezione={p.sezione}
          className="porta-home group relative block h-48 overflow-hidden rounded-grande md:h-64 lg:h-80"
          style={{ background: p.fondo.base }}
        >
          {/* Foto in bianco e nero, poi colorata dal fondo della sezione */}
          <span
            aria-hidden
            className="absolute inset-0 bg-cover bg-center opacity-55 mix-blend-luminosity grayscale transition-[transform,opacity,filter] duration-700 group-hover:scale-[1.04] group-hover:opacity-70 group-hover:grayscale-[40%]"
            style={{ backgroundImage: `url(${p.immagine})` }}
          />
          <span
            aria-hidden
            className="absolute inset-0"
            style={{ background: `linear-gradient(200deg, rgba(${p.fondo.rgb},0.15) 0%, rgba(${p.fondo.rgb},0.55) 55%, rgba(${p.fondo.rgb},0.92) 100%)` }}
          />
          <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-[#f3ece0] md:p-7">
            <span>
              <span className="block text-[1.75rem] font-medium leading-none md:text-[2rem]" style={{ fontVariationSettings: '"wdth" 112' }}>
                {p.titolo}
              </span>
              <span className="mt-2 block text-[0.875rem] text-[#f3ece0]/75">{p.testo}</span>
            </span>
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-[#f3ece0]/40 bg-white/10 backdrop-blur-sm transition-colors group-hover:bg-white/20">
              <ArrowUpRight className="size-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.7} />
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
