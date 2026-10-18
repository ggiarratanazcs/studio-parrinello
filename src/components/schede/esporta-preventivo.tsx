"use client";

import { useState } from "react";
import { Loader2, Printer } from "lucide-react";

/** Icona documento PDF: foglio con angolo piegato e fascetta "PDF". */
function IconaPdf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M14 2.5H7A2.5 2.5 0 0 0 4.5 5v14A2.5 2.5 0 0 0 7 21.5h10a2.5 2.5 0 0 0 2.5-2.5V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 2.5V8h5.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="1.5" y="11" width="15" height="7.5" rx="1.8" fill="currentColor" />
      <text x="9" y="16.9" textAnchor="middle" fontSize="5.6" fontWeight="800" fontFamily="Arial, Helvetica, sans-serif" fill="#c4302b" letterSpacing="0.2">
        PDF
      </text>
    </svg>
  );
}

/**
 * Barra fluttuante in fondo alla scheda del preventivo con Stampa e Scarica PDF.
 * Sul computer la stampa parte direttamente; su telefono e tablet il PDF si apre
 * in una nuova scheda, da cui stampare o condividere.
 */
export function EsportaPreventivo({ id, numero, totale }: { id: string; numero: string | null; totale: string }) {
  const [inStampa, setInStampa] = useState(false);
  const indirizzo = `/preventivi/${id}/pdf`;

  function stampa() {
    if (window.matchMedia("(pointer: coarse)").matches) {
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
    <div className="piede-scheda sticky z-20 mt-10 flex items-center justify-between gap-3 rounded-full border border-linea bg-superficie/85 py-2 pl-5 pr-2 shadow-[0_18px_40px_-18px_rgba(43,42,40,0.5)] backdrop-blur-md">
      <div className="hidden min-w-0 sm:block">
        <p className="etichetta text-[0.75rem]">Preventivo {numero ?? ""}</p>
        <p className="numeri text-[0.9375rem] font-medium">{totale}</p>
      </div>
      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        <button
          type="button"
          onClick={stampa}
          disabled={inStampa}
          data-suggerimento="Stampa il preventivo"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-linea-forte bg-superficie px-5 text-[0.9375rem] font-medium text-inchiostro shadow-[0_6px_16px_-10px_rgba(43,42,40,0.5)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-superficie-2 disabled:opacity-60"
        >
          {inStampa ? <Loader2 className="size-[18px] animate-spin" /> : <Printer className="size-[18px]" strokeWidth={1.8} />}
          Stampa
        </button>
        <a
          href={`${indirizzo}?scarica=1`}
          download={`Preventivo ${numero ?? ""}.pdf`}
          data-suggerimento="Scarica il preventivo in PDF"
          className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.9375rem] font-medium text-white shadow-[0_10px_22px_-10px_rgba(196,48,43,0.75),inset_0_1px_0_rgba(255,255,255,0.25)] transition-transform hover:-translate-y-0.5"
          style={{ background: "linear-gradient(145deg,#e5524a 0%,#c4302b 100%)" }}
        >
          <IconaPdf className="size-5" />
          Scarica PDF
        </a>
      </div>
    </div>
  );
}
