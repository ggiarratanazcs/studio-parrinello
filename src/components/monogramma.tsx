import { cn } from "@/lib/utils";
import { MONOGRAMMA_TRACCIATO, MONOGRAMMA_VIEWBOX } from "@/lib/monogramma-tracciato";

/** Monogramma dello Studio Parrinello. Eredita il colore del testo. */
export function Monogramma({ className, titolo = "Studio Parrinello" }: { className?: string; titolo?: string }) {
  return (
    <svg viewBox={`${MONOGRAMMA_VIEWBOX.x} ${MONOGRAMMA_VIEWBOX.y} ${MONOGRAMMA_VIEWBOX.larghezza} ${MONOGRAMMA_VIEWBOX.altezza}`} className={cn("h-8 w-auto", className)} role="img" aria-label={titolo}>
      <path fill="currentColor" fillRule="evenodd" d={MONOGRAMMA_TRACCIATO} />
    </svg>
  );
}
