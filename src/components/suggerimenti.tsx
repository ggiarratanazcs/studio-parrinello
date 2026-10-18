"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Suggerimenti (tooltip) di tutto il portale, nello stile dello studio.
 *
 * Uso: aggiungere a qualsiasi elemento l'attributo `data-suggerimento="Testo"`.
 * Opzioni:
 *  - `data-suggerimento-lato="destra" | "sotto" | "sopra"` (predefinito: sopra)
 *  - `data-suggerimento-se-barra-chiusa` mostra il suggerimento solo con la barra laterale chiusa
 *
 * Compare al passaggio del mouse (dopo un breve ritardo) e alla navigazione da tastiera.
 */
type Stato = { testo: string; x: number; y: number; lato: "sopra" | "sotto" | "destra" } | null;

const RITARDO = 280;
const MARGINE = 10;

export function Suggerimenti() {
  const [stato, setStato] = useState<Stato>(null);
  const timer = useRef<number | null>(null);
  const corrente = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function trova(t: EventTarget | null) {
      return t instanceof Element ? (t.closest("[data-suggerimento]") as HTMLElement | null) : null;
    }

    function mostra(el: HTMLElement) {
      if (el.hasAttribute("data-suggerimento-se-barra-chiusa") && document.documentElement.dataset.barra !== "chiusa") return;
      const testo = el.getAttribute("data-suggerimento");
      if (!testo) return;
      const r = el.getBoundingClientRect();
      const lato = (el.getAttribute("data-suggerimento-lato") as "sopra" | "sotto" | "destra") || "sopra";
      if (lato === "destra") setStato({ testo, lato, x: r.right + MARGINE, y: r.top + r.height / 2 });
      else if (lato === "sotto") setStato({ testo, lato, x: r.left + r.width / 2, y: r.bottom + MARGINE });
      else setStato({ testo, lato, x: r.left + r.width / 2, y: r.top - MARGINE });
    }

    function annulla() {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
    }

    function entra(e: Event) {
      const el = trova(e.target);
      if (!el || el === corrente.current) return;
      corrente.current = el;
      annulla();
      const immediato = e.type === "focusin";
      timer.current = window.setTimeout(() => mostra(el), immediato ? 0 : RITARDO);
    }

    function esce(e: Event) {
      const el = trova(e.target);
      const verso = trova((e as MouseEvent).relatedTarget ?? null);
      if (el && verso === el) return;
      corrente.current = null;
      annulla();
      setStato(null);
    }

    function nascondi() {
      corrente.current = null;
      annulla();
      setStato(null);
    }

    document.addEventListener("mouseover", entra);
    document.addEventListener("mouseout", esce);
    document.addEventListener("focusin", entra);
    document.addEventListener("focusout", esce);
    document.addEventListener("pointerdown", nascondi);
    window.addEventListener("scroll", nascondi, true);
    return () => {
      document.removeEventListener("mouseover", entra);
      document.removeEventListener("mouseout", esce);
      document.removeEventListener("focusin", entra);
      document.removeEventListener("focusout", esce);
      document.removeEventListener("pointerdown", nascondi);
      window.removeEventListener("scroll", nascondi, true);
      annulla();
    };
  }, []);

  if (!stato) return null;

  const trasformazione =
    stato.lato === "destra" ? "translate(0, -50%)" : stato.lato === "sotto" ? "translate(-50%, 0)" : "translate(-50%, -100%)";

  return (
    <div
      role="tooltip"
      className="suggerimento pointer-events-none fixed z-[100] max-w-64 rounded-[10px] bg-inchiostro px-2.5 py-1.5 text-[0.8125rem] leading-snug text-superficie shadow-[0_10px_24px_-10px_rgba(43,42,40,0.55)]"
      style={{ left: stato.x, top: stato.y, transform: trasformazione }}
      data-lato={stato.lato}
    >
      {stato.testo}
    </div>
  );
}
