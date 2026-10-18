"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { VOCI, VOCI_ALTRO } from "@/lib/sezioni";

function attiva(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  if (href === "/altro") return pathname === "/altro" || VOCI_ALTRO.some((v) => pathname.startsWith(v.href));
  return pathname === href || pathname.startsWith(`${href}/`) || (href === "/commesse" && pathname === "/nuova/commessa") ||
    (href === "/preventivi" && pathname === "/nuova/preventivo") || (href === "/prefattibilita" && pathname === "/nuova/prefattibilita");
}

/** Navigazione verticale per schermi grandi. */
function NavLateraleCorpo({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Sezioni" className="flex flex-col gap-1">
      {VOCI.filter((v) => v.laterale).map(({ href, etichetta, icona: Icona, soloIcona }) => {
        const corrente = attiva(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={soloIcona ? etichetta : undefined}
            data-suggerimento={etichetta}
            data-suggerimento-lato="destra"
            data-suggerimento-se-barra-chiusa={soloIcona ? undefined : ""}
            aria-current={corrente ? "page" : undefined}
            className={cn(
              "voce-barra flex h-10 items-center gap-3 rounded-[12px] px-3 text-[0.9375rem] transition-[background-color,color,box-shadow] duration-200",
              corrente
                ? "bg-inchiostro text-superficie shadow-[0_6px_16px_-8px_rgba(43,42,40,0.6)]"
                : "text-inchiostro-2 hover:bg-superficie-2 hover:text-inchiostro",
            )}
          >
            <Icona className="size-[18px] shrink-0" strokeWidth={corrente ? 1.9 : 1.6} />
            {soloIcona ? null : <span className="solo-barra-aperta truncate">{etichetta}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/** Navigazione a schede in alto (impaginazione Materia, schermi grandi). */
function NavSuperioreCorpo({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Sezioni" className="flex flex-wrap items-center gap-1">
      {VOCI.filter((v) => v.superiore).map(({ href, etichetta, icona: Icona, soloIcona }) => {
        const corrente = attiva(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={soloIcona ? etichetta : undefined}
            data-suggerimento={soloIcona ? etichetta : undefined}
            data-suggerimento-lato="sotto"
            aria-current={corrente ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-1.5 text-[0.9375rem] transition-colors",
              corrente ? "bg-inchiostro text-superficie" : "text-tenue hover:bg-superficie/70 hover:text-inchiostro",
            )}
          >
            {soloIcona ? <Icona className="size-[18px]" strokeWidth={1.7} /> : etichetta}
          </Link>
        );
      })}
    </nav>
  );
}

/** Barra a schede in basso per telefono. */
function NavMobileCorpo({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Sezioni"
      className="pb-sicuro fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-superficie/95 backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {VOCI.filter((v) => v.mobile).map(({ href, etichetta, breve, icona: Icona, soloIcona }) => {
          const corrente = attiva(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-label={soloIcona ? etichetta : undefined}
                aria-current={corrente ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 pb-2 pt-2.5 text-[0.6875rem] transition-colors",
                  corrente ? "text-accento" : "text-tenue",
                )}
                style={{ fontVariationSettings: '"wdth" 88' }}
              >
                <Icona className={soloIcona ? "size-[25px]" : "size-[22px]"} strokeWidth={corrente ? 1.9 : 1.5} />
                {soloIcona ? null : (breve ?? etichetta)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Il percorso corrente è noto solo a richiesta: la versione senza voce attiva
 * fa parte della parte statica della pagina, quella con la voce evidenziata la sostituisce.
 */
export function NavLaterale() {
  return (
    <Suspense fallback={<NavLateraleCorpo pathname={null} />}>
      <NavLateraleConPercorso />
    </Suspense>
  );
}

function NavLateraleConPercorso() {
  const pathname = usePathname();
  return <NavLateraleCorpo pathname={pathname} />;
}

/**
 * Il percorso corrente è noto solo a richiesta: la versione senza voce attiva
 * fa parte della parte statica della pagina, quella con la voce evidenziata la sostituisce.
 */
export function NavSuperiore() {
  return (
    <Suspense fallback={<NavSuperioreCorpo pathname={null} />}>
      <NavSuperioreConPercorso />
    </Suspense>
  );
}

function NavSuperioreConPercorso() {
  const pathname = usePathname();
  return <NavSuperioreCorpo pathname={pathname} />;
}

/**
 * Il percorso corrente è noto solo a richiesta: la versione senza voce attiva
 * fa parte della parte statica della pagina, quella con la voce evidenziata la sostituisce.
 */
export function NavMobile() {
  return (
    <Suspense fallback={<NavMobileCorpo pathname={null} />}>
      <NavMobileConPercorso />
    </Suspense>
  );
}

function NavMobileConPercorso() {
  const pathname = usePathname();
  return <NavMobileCorpo pathname={pathname} />;
}
