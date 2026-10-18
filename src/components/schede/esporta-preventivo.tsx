"use client";

import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { AncoraPulsante, Pulsante } from "@/components/ui";

/**
 * Stampa ed esportazione PDF del preventivo.
 * Sul computer la stampa parte direttamente; su telefono e tablet il PDF si apre
 * in una nuova scheda, da cui stampare o condividere.
 */
export function EsportaPreventivo({ id, numero }: { id: string; numero: string | null }) {
  const [inStampa, setInStampa] = useState(false);
  const indirizzo = `/preventivi/${id}/pdf`;

  function stampa() {
    const tattile = window.matchMedia("(pointer: coarse)").matches;
    if (tattile) {
      window.open(indirizzo, "_blank", "noopener");
      return;
    }
    setInStampa(true);
    document.getElementById("sp-stampa")?.remove();
    const cornice = document.createElement("iframe");
    cornice.id = "sp-stampa";
    cornice.title = "Stampa preventivo";
    cornice.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;";
    cornice.src = indirizzo;
    cornice.onload = () => {
      setInStampa(false);
      try {
        cornice.contentWindow?.focus();
        cornice.contentWindow?.print();
      } catch {
        window.open(indirizzo, "_blank", "noopener");
      }
    };
    document.body.appendChild(cornice);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pulsante type="button" variante="secondario" onClick={stampa} disabled={inStampa} data-suggerimento="Stampa il preventivo">
        {inStampa ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" strokeWidth={1.8} />}
        Stampa
      </Pulsante>
      <AncoraPulsante
        href={`${indirizzo}?scarica=1`}
        download={`Preventivo ${numero ?? ""}.pdf`}
        variante="secondario"
        data-suggerimento="Scarica il preventivo in PDF"
      >
        <Download className="size-4" strokeWidth={1.8} />
        Scarica PDF
      </AncoraPulsante>
    </div>
  );
}
