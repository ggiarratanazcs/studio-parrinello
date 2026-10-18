import type { ComponentProps, ComponentType, CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Plus, type LucideProps } from "lucide-react";
import { FONDI, type TipoFondo } from "@/lib/fondi";
import { cn } from "@/lib/utils";

/** Riquadro informativo: pallino con icona, etichetta e valore. */
export type Cella = {
  etichetta: string;
  valore: ReactNode;
  icona: ComponentType<LucideProps>;
  /** Colore del pallino (es. colore dello stato); senza, il pallino è perla. */
  tinta?: string;
};

/**
 * Riquadri informativi delle testate (pagine e schede), nello stile dei pallini:
 * riquadro chiaro arrotondato e ombreggiato, pallino con icona, etichetta e valore.
 */
export function Tessere({ celle, className }: { celle: Cella[]; className?: string }) {
  return (
    <dl className={cn("flex flex-wrap gap-2.5", className)}>
      {celle.map(({ etichetta, valore, icona: Icona, tinta }) => {
        const vuoto = valore === null || valore === undefined || valore === "" || valore === "—";
        return (
          <div key={etichetta} className="tessera flex items-center gap-3 rounded-[18px] py-2.5 pl-2.5 pr-4">
            <span
              aria-hidden
              className={cn("pallino-tessera grid size-9 shrink-0 place-items-center rounded-full", tinta && "colorato")}
              style={tinta ? ({ ["--tinta" as string]: tinta } as CSSProperties) : undefined}
            >
              <Icona className="size-4" strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <dt className="etichetta text-[0.75rem]">{etichetta}</dt>
              <dd
                className={cn("numeri mt-0.5 whitespace-nowrap text-[0.9375rem] font-medium", vuoto && "font-normal text-tenue")}
                style={tinta && !vuoto ? { color: tinta } : undefined}
              >
                {vuoto ? "—" : valore}
              </dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Pulsante a pillola per creare qualcosa di nuovo, coordinato con pallini e riquadri:
 * il "+" sta in un piccolo pallino; il colore è quello della sezione (come nelle modali).
 */
export function PulsanteNuovo({
  href,
  children,
  tipo,
  className,
  style,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string; tipo: TipoFondo }) {
  const f = FONDI[tipo];
  return (
    <Link
      href={href}
      className={cn("pulsante-nuovo inline-flex h-11 items-center gap-2.5 rounded-full py-1 pl-1.5 pr-5 text-[0.9375rem] font-medium", className)}
      style={{ background: `linear-gradient(145deg, ${f.chiaro} 0%, ${f.base} 100%)`, ["--ombra" as string]: f.rgb, ...style }}
      {...props}
    >
      <span aria-hidden className="pallino-piu grid size-8 place-items-center rounded-full">
        <Plus className="size-4" strokeWidth={2.2} />
      </span>
      {children}
    </Link>
  );
}
