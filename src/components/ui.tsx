import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { statoCommessa } from "@/lib/dominio";

const stiliPulsante = {
  primario: "bg-accento text-su-accento hover:bg-accento-hover",
  secondario: "border border-linea-forte bg-superficie text-inchiostro hover:bg-superficie-2",
  discreto: "text-inchiostro-2 hover:bg-superficie-2",
};

type VariantePulsante = keyof typeof stiliPulsante;

const basePulsante =
  "inline-flex h-10 items-center justify-center gap-2 rounded-m px-4 text-[0.9375rem] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Pulsante({
  variante = "primario",
  className,
  ...props
}: ComponentProps<"button"> & { variante?: VariantePulsante }) {
  return <button className={cn(basePulsante, stiliPulsante[variante], className)} {...props} />;
}

export function LinkPulsante({
  variante = "primario",
  className,
  ...props
}: ComponentProps<typeof Link> & { variante?: VariantePulsante }) {
  return <Link className={cn(basePulsante, stiliPulsante[variante], className)} {...props} />;
}

/** Riquadro con bordo sottile, senza ombra. */
export function Pannello({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("pannello rounded-l border border-linea bg-superficie", className)} {...props} />;
}

export function StatoBadge({ stato }: { stato: string | null }) {
  const s = statoCommessa(stato);
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.8125rem]" style={{ color: s.colore }}>
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: s.colore }} />
      {s.etichetta}
    </span>
  );
}

/** Stato vuoto: dice cosa manca e cosa fare. */
export function Vuoto({
  titolo,
  testo,
  azione,
}: {
  titolo: string;
  testo: ReactNode;
  azione?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 px-5 py-10 md:px-8 md:py-14">
      <p className="text-lg font-medium" style={{ fontVariationSettings: '"wdth" 108' }}>
        {titolo}
      </p>
      <div className="max-w-prose text-[0.9375rem] text-tenue">{testo}</div>
      {azione ? <div className="mt-2">{azione}</div> : null}
    </div>
  );
}

export function Scheletro({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse rounded-s bg-pietra/60", className)} />;
}

/** Barra a segmenti con le fasi completate sul totale (mostrata in impaginazione Materia). */
export function AvanzamentoFasi({
  completate,
  totali,
  colore = "var(--accento)",
}: {
  completate: number;
  totali: number;
  colore?: string;
}) {
  const segmenti = Math.max(totali, 1);
  return (
    <span className="block w-full max-w-44">
      <span className="flex gap-[3px]" aria-hidden>
        {Array.from({ length: segmenti }, (_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: i < completate ? colore : "var(--linea)" }}
          />
        ))}
      </span>
      <span className="etichetta mt-1.5 block">
        {totali === 0 ? "Fasi da definire" : `${completate} di ${totali} fasi completate`}
      </span>
    </span>
  );
}
