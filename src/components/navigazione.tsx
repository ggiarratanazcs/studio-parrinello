"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  DraftingCompass,
  Files,
  PanelsTopLeft,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Voce = { href: string; etichetta: string; icona: LucideIcon; mobile: boolean };

export const VOCI: Voce[] = [
  { href: "/", etichetta: "Panoramica", icona: PanelsTopLeft, mobile: true },
  { href: "/commesse", etichetta: "Commesse", icona: DraftingCompass, mobile: true },
  { href: "/clienti", etichetta: "Clienti", icona: Users, mobile: true },
  { href: "/immobili", etichetta: "Immobili", icona: Building2, mobile: true },
  { href: "/documenti", etichetta: "Documenti", icona: Files, mobile: true },
  { href: "/impostazioni", etichetta: "Impostazioni", icona: Settings2, mobile: false },
];

function attiva(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Navigazione verticale per schermi grandi. */
export function NavLaterale() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sezioni" className="flex flex-col gap-0.5">
      {VOCI.map(({ href, etichetta, icona: Icona }) => {
        const corrente = attiva(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={corrente ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-m px-3 py-2 text-[0.9375rem] transition-colors",
              corrente
                ? "bg-superficie text-inchiostro"
                : "text-inchiostro-2 hover:bg-superficie/60 hover:text-inchiostro",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-2 left-0 w-[2px] rounded-full bg-accento transition-opacity",
                corrente ? "opacity-100" : "opacity-0",
              )}
            />
            <Icona className="size-[18px] shrink-0" strokeWidth={1.6} />
            {etichetta}
          </Link>
        );
      })}
    </nav>
  );
}

/** Barra a schede in basso per telefono. */
export function NavMobile() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Sezioni"
      className="pb-sicuro fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-superficie/95 backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {VOCI.filter((v) => v.mobile).map(({ href, etichetta, icona: Icona }) => {
          const corrente = attiva(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={corrente ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 pb-2 pt-2.5 text-[0.6875rem] transition-colors",
                  corrente ? "text-accento" : "text-tenue",
                )}
                style={{ fontVariationSettings: '"wdth" 88' }}
              >
                <Icona className="size-[22px]" strokeWidth={corrente ? 1.9 : 1.5} />
                {etichetta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
