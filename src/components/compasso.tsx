"use client";

import { useEffect, useRef } from "react";
import { MONOGRAMMA_TRACCIATO } from "@/lib/monogramma-tracciato";
import { Pannello } from "@/components/ui";
import { cn } from "@/lib/utils";

/*
 * Caricamento con il compasso: il monogramma dello studio si stringe sul suo fusto e diventa
 * un compasso chiuso, che si apre, traccia un cerchio sul foglio, si richiude e torna monogramma.
 * Geometria nel riquadro 200×200: ago piantato in C, cerniera in H, cerchio visto in prospettiva.
 */
const C = { x: 100, y: 150 };
const H = { x: 100, y: 52 };
const RX = 62;
const RY = 16;
const T0 = Math.PI * 0.18; // la mina parte davanti, a destra
const CHIUSO = { x: 103, y: 147 }; // mina accostata all'ago
const SCALA = 118 / 870; // monogramma alto quanto il compasso

/** Fasi del ciclo, in secondi */
const FASI = [
  ["logo", 0.9],
  ["trasforma", 0.65],
  ["apre", 0.55],
  ["traccia", 2.1],
  ["pausa", 0.35],
  ["chiude", 0.45],
  ["torna", 0.6],
] as const;
const DURATA = FASI.reduce((a, [, d]) => a + d, 0);
/** Fine del giro "di benvenuto": cerchio tracciato, poi la schermata sfuma */
export const DURATA_BENVENUTO = FASI.slice(0, 5).reduce((a, [, d]) => a + d, 0);

type Punto = { x: number; y: number };
const morbido = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ellisse = (t: number): Punto => ({ x: C.x + RX * Math.cos(t), y: C.y + RY * Math.sin(t) });
const lungo = (A: Punto, B: Punto, k: number): Punto => ({ x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k) });

/** Gamba affusolata da A (larga wa) a B (larga wb), come punti di un poligono */
function gamba(A: Punto, B: Punto, wa: number, wb: number) {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  return [
    [A.x + (nx * wa) / 2, A.y + (ny * wa) / 2],
    [B.x + (nx * wb) / 2, B.y + (ny * wb) / 2],
    [B.x - (nx * wb) / 2, B.y - (ny * wb) / 2],
    [A.x - (nx * wa) / 2, A.y - (ny * wa) / 2],
  ]
    .map((p) => p.map((v) => v.toFixed(2)).join(","))
    .join(" ");
}

function tratto(da: number, a: number) {
  if (a <= da) return "";
  const passi = Math.max(2, Math.ceil((a - da) / 0.04));
  let d = "";
  for (let i = 0; i <= passi; i++) {
    const p = ellisse(da + ((a - da) * i) / passi);
    d += `${i ? " L " : "M "}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }
  return d;
}

export function Compasso({
  className,
  didascalia = "Caricamento",
  unaVolta = false,
}: {
  className?: string;
  didascalia?: string | null;
  /** Solo fino al cerchio tracciato (benvenuto), poi resta fermo */
  unaVolta?: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const radice = svg.current;
    if (!radice) return;
    const q = <T extends Element>(sel: string) => radice.querySelector(sel) as T;
    const logo = q<SVGGElement>("[data-logo]");
    const compasso = q<SVGGElement>("[data-compasso]");
    const gambaMina = q<SVGGElement>("[data-gamba-mina]");
    const gambaAgo = q<SVGGElement>("[data-gamba-ago]");
    const agoCorpo = q<SVGPolygonElement>("[data-ago-corpo]");
    const agoPunta = q<SVGLineElement>("[data-ago-punta]");
    const minaCorpo = q<SVGPolygonElement>("[data-mina-corpo]");
    const minaPunta = q<SVGPolygonElement>("[data-mina-punta]");
    const impugnatura = q<SVGRectElement>("[data-impugnatura]");
    const ombra = q<SVGEllipseElement>("[data-ombra]");
    const guida = q<SVGEllipseElement>("[data-guida]");
    const segno = q<SVGPathElement>("[data-tratto]");

    function fotogramma(secondi: number) {
      let t = unaVolta ? Math.min(secondi, DURATA_BENVENUTO - 0.0001) : secondi % DURATA;
      let fase: string = FASI[0][0];
      let k = 0;
      for (const [nome, d] of FASI) {
        if (t <= d) {
          fase = nome;
          k = t / d;
          break;
        }
        t -= d;
      }
      const e = morbido(k);

      let apertura = 0;
      let angolo = T0;
      let fine = T0;
      let opLogo = 0;
      let stretto = 1;
      let opCompasso = 1;
      let opTratto = 1;
      let opGuida = 0;
      switch (fase) {
        case "logo":
          opLogo = 1;
          opCompasso = 0;
          opTratto = 0;
          break;
        case "trasforma":
          opLogo = 1 - e;
          stretto = lerp(1, 0.18, e);
          opCompasso = e;
          opTratto = 0;
          break;
        case "apre":
          apertura = e;
          opGuida = e;
          break;
        case "traccia":
          apertura = 1;
          angolo = T0 + e * Math.PI * 2;
          fine = angolo;
          opGuida = 1;
          break;
        case "pausa":
          apertura = 1;
          angolo = fine = T0 + Math.PI * 2;
          opGuida = unaVolta ? 1 : 1 - e;
          break;
        case "chiude":
          apertura = 1 - e;
          angolo = fine = T0 + Math.PI * 2;
          opTratto = 1 - e;
          break;
        case "torna":
          opLogo = e;
          stretto = lerp(0.18, 1, e);
          opCompasso = 1 - e;
          opTratto = 0;
          break;
      }

      // Compasso: ago fisso, mina che si apre e gira sull'ellisse
      const T = lungo(CHIUSO, ellisse(angolo), apertura);
      const finoAgo = lungo(H, C, 0.9);
      agoCorpo.setAttribute("points", gamba(H, finoAgo, 9.5, 3.6));
      agoPunta.setAttribute("x1", String(finoAgo.x));
      agoPunta.setAttribute("y1", String(finoAgo.y));
      const inizioMina = lungo(H, T, 0.86);
      minaCorpo.setAttribute("points", gamba(H, inizioMina, 9.5, 4.2));
      minaPunta.setAttribute("points", gamba(inizioMina, T, 4.2, 0.5));
      // l'impugnatura si stringe e si allarga mentre ruota tra le dita
      const w = 6.4 * (0.55 + 0.45 * Math.abs(Math.cos(angolo)));
      impugnatura.setAttribute("x", (100 - w / 2).toFixed(2));
      impugnatura.setAttribute("width", w.toFixed(2));
      // quando la mina passa dietro l'ago, la sua gamba va sotto
      if (Math.sin(angolo) < 0) compasso.insertBefore(gambaMina, gambaAgo);
      else compasso.insertBefore(gambaAgo, gambaMina);

      compasso.setAttribute("opacity", opCompasso.toFixed(3));
      ombra.setAttribute("opacity", (0.12 * opCompasso).toFixed(3));
      guida.setAttribute("opacity", (0.9 * opGuida).toFixed(3));
      segno.setAttribute("d", tratto(T0, fine));
      segno.setAttribute("opacity", opTratto.toFixed(3));

      // il monogramma si stringe sul suo fusto e diventa la gamba del compasso (e viceversa)
      logo.setAttribute("opacity", opLogo.toFixed(3));
      logo.setAttribute(
        "transform",
        `translate(100 0) scale(${stretto.toFixed(4)} 1) translate(-100 0) translate(85.1 32) scale(${SCALA}) translate(-330 -178)`,
      );
    }

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fotogramma(DURATA_BENVENUTO - 0.01);
      return;
    }
    let richiesta = 0;
    const inizio = performance.now();
    const ciclo = (ora: number) => {
      const s = (ora - inizio) / 1000;
      fotogramma(s);
      if (!unaVolta || s < DURATA_BENVENUTO) richiesta = requestAnimationFrame(ciclo);
    };
    richiesta = requestAnimationFrame(ciclo);
    return () => cancelAnimationFrame(richiesta);
  }, [unaVolta]);

  return (
    <div role="status" aria-live="polite" aria-label={didascalia ?? "Caricamento"} className={cn("flex flex-col items-center", className)}>
      <svg ref={svg} viewBox="0 0 200 200" aria-hidden className="aspect-square h-auto w-full overflow-visible">
        <ellipse data-guida cx="100" cy="150" rx={RX} ry={RY} fill="none" stroke="var(--linea-forte)" strokeWidth="0.8" strokeDasharray="1.5 3.5" opacity="0" />
        <path data-tratto d="" fill="none" stroke="var(--inchiostro)" strokeWidth="1.8" strokeLinecap="round" />
        <ellipse data-ombra cx="100" cy="151" rx="9" ry="2.4" fill="var(--inchiostro)" opacity="0" />
        <g data-logo transform={`translate(85.1 32) scale(${SCALA}) translate(-330 -178)`}>
          <path fill="var(--inchiostro)" fillRule="evenodd" d={MONOGRAMMA_TRACCIATO} />
        </g>
        <g data-compasso opacity="0">
          <g data-gamba-mina>
            <polygon data-mina-corpo fill="var(--inchiostro)" />
            <polygon data-mina-punta fill="var(--accento)" />
          </g>
          <g data-gamba-ago>
            <polygon data-ago-corpo fill="var(--inchiostro)" />
            <line data-ago-punta x2={C.x} y2={C.y} stroke="var(--inchiostro)" strokeWidth="1" strokeLinecap="round" />
          </g>
          <rect data-impugnatura y="28" height="19" rx="2.5" fill="var(--inchiostro)" />
          <circle cx="100" cy="52" r="9" fill="var(--inchiostro)" />
          <circle cx="100" cy="52" r="3" fill="var(--superficie)" />
        </g>
      </svg>
      {didascalia ? (
        <p className="respiro mt-2 text-[0.6875rem] uppercase tracking-[0.32em] text-tenue">{didascalia}</p>
      ) : null}
    </div>
  );
}

/** Al posto di un pannello che si sta caricando: il compasso al centro. */
export function CaricamentoPannello({ className }: { className?: string }) {
  return (
    <Pannello className={cn("grid min-h-72 place-items-center py-10", className)}>
      <Compasso className="w-36" />
    </Pannello>
  );
}
