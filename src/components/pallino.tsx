"use client";

import type { ComponentType, CSSProperties } from "react";
import Link from "next/link";
import { Loader2, type LucideProps } from "lucide-react";

export type Icona = ComponentType<LucideProps>;

/* ── Tinte dei pallini: gradiente, ombra colorata, colore dell'icona ── */
export type Tinta = "bronzo" | "salvia" | "petrolio" | "mattone" | "ardesia" | "neutra";

const TINTE: Record<Tinta, { sfondo: string; ombra: string; testo: string }> = {
  bronzo: { sfondo: "linear-gradient(145deg,#c08a4c 0%,#8a5a2b 100%)", ombra: "138,90,43", testo: "#fff8ee" },
  salvia: { sfondo: "linear-gradient(145deg,#8fae7b 0%,#5c7a4c 100%)", ombra: "92,122,76", testo: "#f6fbf2" },
  petrolio: { sfondo: "linear-gradient(145deg,#6d90a3 0%,#3f5a6b 100%)", ombra: "63,90,107", testo: "#f2f8fb" },
  mattone: { sfondo: "linear-gradient(145deg,#d3684f 0%,#9a3d2b 100%)", ombra: "154,61,43", testo: "#fff5f1" },
  ardesia: { sfondo: "linear-gradient(145deg,#76879a 0%,#45535f 100%)", ombra: "69,83,95", testo: "#f3f6f9" },
  neutra: { sfondo: "linear-gradient(145deg,#ffffff 0%,#ece5da 100%)", ombra: "43,42,40", testo: "#2b2a28" },
};


/* ── Pallino: pulsante rotondo con icona, ombra colorata e suggerimento ── */
const classePallino =
  "pallino group relative grid size-11 shrink-0 place-items-center rounded-full transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50";

function stilePallino(tinta: Tinta): CSSProperties {
  const t = TINTE[tinta];
  return {
    background: t.sfondo,
    color: t.testo,
    ["--ombra" as string]: t.ombra,
  };
}

export function Pallino({
  etichetta,
  icona: I,
  tinta,
  onClick,
  disabled,
  inCorso,
}: {
  etichetta: string;
  icona: Icona;
  tinta: Tinta;
  onClick: () => void;
  disabled?: boolean;
  inCorso?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={etichetta}
        data-suggerimento={etichetta}
        className={classePallino}
        style={stilePallino(tinta)}
      >
        {inCorso ? <Loader2 className="size-[18px] animate-spin" /> : <I className="size-[18px]" strokeWidth={2} />}
      </button>
      <span className="etichetta-pallino">{etichetta}</span>
    </div>
  );
}

export function PallinoLink({ href, etichetta, icona: I, tinta }: { href: string; etichetta: string; icona: Icona; tinta: Tinta }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Link href={href} aria-label={etichetta} data-suggerimento={etichetta} className={classePallino} style={stilePallino(tinta)}>
        <I className="size-[18px]" strokeWidth={2} />
      </Link>
      <span className="etichetta-pallino">{etichetta}</span>
    </div>
  );
}

