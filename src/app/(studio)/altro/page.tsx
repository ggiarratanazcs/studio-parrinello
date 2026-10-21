import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Cartiglio } from "@/components/cartiglio";
import { VOCI_ALTRO } from "@/lib/sezioni";
import { Pannello } from "@/components/ui";

export const metadata = { title: "Altro" };

/** Su telefono: le sezioni che non stanno nella barra in basso. */
export default function PaginaAltro() {
  return (
    <>
      <Cartiglio titolo="Altro" />
      <Pannello>
        <ul className="divide-y divide-linea">
          {VOCI_ALTRO.map(({ href, etichetta, icona: Icona }) => (
            <li key={href} data-sezione={href}>
              <Link href={href} className="flex items-center gap-4 px-5 py-4 hover:bg-superficie-2/50">
                <Icona className="size-5 text-tenue" strokeWidth={1.6} />
                <span className="flex-1 text-[0.9375rem]">{etichetta}</span>
                <ChevronRight className="size-4 text-tenue" />
              </Link>
            </li>
          ))}
        </ul>
      </Pannello>
    </>
  );
}
