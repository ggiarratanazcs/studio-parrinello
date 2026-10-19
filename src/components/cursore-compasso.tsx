"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/*
 * Mentre si passa da una schermata all'altra, il puntatore del mouse diventa un piccolo compasso
 * che traccia il suo cerchio (fotogrammi SVG che si alternano). Sui telefoni non c'è puntatore: nulla cambia.
 */
const FOTOGRAMMI = 12;
const INCHIOSTRO = "#2b2a28";
const BRONZO = "#8a5a2b";

/** Un fotogramma 32×32: ago piantato in basso al centro (punta del puntatore), mina che gira sull'ellisse. */
function fotogramma(i: number) {
  const a = Math.PI * 0.18 + (i / FOTOGRAMMI) * Math.PI * 2;
  const C = { x: 16, y: 27 };
  const H = { x: 16, y: 7 };
  const T = { x: C.x + 11 * Math.cos(a), y: C.y + 3 * Math.sin(a) };
  // arco già tracciato dall'inizio del giro fino alla mina
  const passi = Math.max(1, Math.round((i / FOTOGRAMMI) * 24));
  let arco = "";
  for (let k = 0; k <= passi; k++) {
    const t = Math.PI * 0.18 + ((a - Math.PI * 0.18) * k) / passi;
    arco += `${k ? "L" : "M"}${(C.x + 11 * Math.cos(t)).toFixed(1)} ${(C.y + 3 * Math.sin(t)).toFixed(1)}`;
  }
  const dietro = Math.sin(a) < 0;
  const ago = `<path d="M${H.x} ${H.y}L${C.x} ${C.y}" stroke="${INCHIOSTRO}" stroke-width="2.2" stroke-linecap="round"/>`;
  const mina = `<path d="M${H.x} ${H.y}L${T.x.toFixed(1)} ${T.y.toFixed(1)}" stroke="${INCHIOSTRO}" stroke-width="2.2" stroke-linecap="round"/><circle cx="${T.x.toFixed(1)}" cy="${T.y.toFixed(1)}" r="1.3" fill="${BRONZO}"/>`;
  // alone chiaro sotto ogni tratto: il cursore si legge anche su fondi scuri
  const alone = (s: string) => s.replace(/stroke="#2b2a28" stroke-width="2.2"/g, 'stroke="#fff" stroke-width="4.2"');
  const gambe = dietro ? mina + ago : ago + mina;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
    `<path d="${arco}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="${arco}" fill="none" stroke="${INCHIOSTRO}" stroke-width="1.2" stroke-linecap="round"/>` +
    alone(gambe) +
    gambe +
    `<rect x="14.4" y="1.5" width="3.2" height="5" rx="1" fill="${INCHIOSTRO}" stroke="#fff" stroke-width="1"/>` +
    `<circle cx="${H.x}" cy="${H.y}" r="2.6" fill="${INCHIOSTRO}" stroke="#fff" stroke-width="1"/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 27, progress`;
}

export function CursoreCompasso() {
  const percorso = usePathname();

  // Cambiata la schermata: il puntatore torna normale
  useEffect(() => {
    const d = document.documentElement;
    delete d.dataset.navigazione;
    d.style.removeProperty("--cursore-compasso");
  }, [percorso]);

  useEffect(() => {
    const fotogrammi = Array.from({ length: FOTOGRAMMI }, (_, i) => fotogramma(i));
    let giro: ReturnType<typeof setInterval> | undefined;
    let limite: ReturnType<typeof setTimeout> | undefined;
    const d = document.documentElement;

    const ferma = () => {
      clearInterval(giro);
      clearTimeout(limite);
      delete d.dataset.navigazione;
      d.style.removeProperty("--cursore-compasso");
    };

    const avvia = () => {
      ferma();
      let i = 0;
      d.dataset.navigazione = "";
      d.style.setProperty("--cursore-compasso", fotogrammi[0]);
      giro = setInterval(() => {
        i = (i + 1) % FOTOGRAMMI;
        if (!("navigazione" in d.dataset)) return ferma();
        d.style.setProperty("--cursore-compasso", fotogrammi[i]);
      }, 90);
      limite = setTimeout(ferma, 10000); // per sicurezza, mai più di 10 secondi
    };

    const clic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      avvia();
    };

    document.addEventListener("click", clic);
    window.addEventListener("popstate", avvia);
    return () => {
      document.removeEventListener("click", clic);
      window.removeEventListener("popstate", avvia);
      ferma();
    };
  }, []);

  return null;
}
