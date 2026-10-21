"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  DraftingCompass,
  FileUp,
  LandPlot,
  Plus,
  ReceiptText,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { FONDI, type TipoFondo } from "@/lib/fondi";
import { cn } from "@/lib/utils";

/**
 * "Crea": un solo "+" al posto dei pulsanti "nuova pre-fattibilità / preventivo / commessa".
 * Schermi grandi: pallino appoggiato sul bordo della testata, apre un pannello a lista con ricerca.
 * Telefono e tablet: pallino in basso al centro, sopra la navigazione, apre un ventaglio verso l'alto.
 * Scorciatoia: N (fuori dai campi di testo). Esc chiude.
 */

type VoceCrea = {
  etichetta: string;
  descrizione: string;
  icona: LucideIcon;
  tipo: TipoFondo;
  gruppo: "Lavoro" | "Anagrafiche e file";
  /** Senza indirizzo: procedura non ancora disponibile, la voce compare come "in arrivo" */
  href?: string;
};

const VOCI: VoceCrea[] = [
  { etichetta: "Pre-fattibilità", descrizione: "Studio iniziale dell'intervento", icona: LandPlot, tipo: "prefattibilita", gruppo: "Lavoro", href: "/nuova/prefattibilita" },
  { etichetta: "Preventivo", descrizione: "Offerta con fasi e onorario", icona: ReceiptText, tipo: "preventivo", gruppo: "Lavoro", href: "/nuova/preventivo" },
  { etichetta: "Commessa", descrizione: "Incarico da avviare", icona: DraftingCompass, tipo: "commessa", gruppo: "Lavoro", href: "/nuova/commessa" },
  { etichetta: "Cliente", descrizione: "Privato, azienda o ente", icona: Users, tipo: "studio", gruppo: "Anagrafiche e file", href: "/clienti/nuovo" },
  { etichetta: "Immobile", descrizione: "Indirizzo e dati catastali", icona: Building2, tipo: "studio", gruppo: "Anagrafiche e file", href: "/immobili/nuovo" },
  { etichetta: "Documento", descrizione: "Carica e collega a una commessa", icona: FileUp, tipo: "studio", gruppo: "Anagrafiche e file" },
];

const CURVA = "cubic-bezier(0.2, 0.8, 0.2, 1)";

function stileTinta(tipo: TipoFondo): CSSProperties {
  const f = FONDI[tipo];
  return {
    background: `linear-gradient(145deg, ${f.chiaro} 0%, ${f.base} 100%)`,
    ["--ombra" as string]: f.rgb,
  };
}

function normalizza(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function Crea() {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [ricerca, setRicerca] = useState("");
  const [scelta, setScelta] = useState(0);
  const campo = useRef<HTMLInputElement>(null);
  const zonaDesktop = useRef<HTMLDivElement>(null);
  const zonaMobile = useRef<HTMLDivElement>(null);

  // Clic o tocco fuori dal pulsante e dal menu: si chiude
  useEffect(() => {
    if (!aperto) return;
    function fuori(e: PointerEvent) {
      const t = e.target as Node | null;
      if (!t) return;
      if (zonaDesktop.current?.contains(t) || zonaMobile.current?.contains(t)) return;
      setAperto(false);
    }
    document.addEventListener("pointerdown", fuori, true);
    return () => document.removeEventListener("pointerdown", fuori, true);
  }, [aperto]);

  const filtrate = useMemo(() => {
    const q = normalizza(ricerca.trim());
    return q ? VOCI.filter((v) => normalizza(`${v.etichetta} ${v.descrizione}`).includes(q)) : VOCI;
  }, [ricerca]);
  const disponibili = filtrate.filter((v) => v.href);

  function apri() {
    setRicerca("");
    setScelta(0);
    setAperto(true);
  }
  function chiudi() {
    setAperto(false);
  }
  function vai(v: VoceCrea) {
    if (!v.href) return;
    setAperto(false);
    router.push(v.href);
  }

  // Scorciatoia N per aprire, Esc per chiudere
  useEffect(() => {
    function tasto(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setAperto(false);
        return;
      }
      if (e.key !== "n" && e.key !== "N") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      e.preventDefault();
      setRicerca("");
      setScelta(0);
      setAperto(true);
    }
    window.addEventListener("keydown", tasto);
    return () => window.removeEventListener("keydown", tasto);
  }, []);

  // Il cursore va nel campo di ricerca appena il pannello si apre (solo schermi grandi)
  useEffect(() => {
    if (aperto && window.matchMedia("(min-width: 1024px)").matches) {
      const t = setTimeout(() => campo.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [aperto]);

  function tastiCampo(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setScelta((s) => Math.min(s + 1, Math.max(disponibili.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setScelta((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const v = disponibili[scelta];
      if (v) vai(v);
    }
  }

  const voceScelta = disponibili[scelta];

  return (
    <>
      {/* Velo sulla pagina mentre il menu è aperto */}
      <div
        aria-hidden
        onClick={chiudi}
        className={cn(
          "fixed inset-0 z-40 bg-inchiostro/25 backdrop-blur-[1px] transition-opacity duration-300",
          aperto ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* ── Schermi grandi: pallino sul bordo della testata + pannello a lista ── */}
      <div ref={zonaDesktop} className="relative z-50 hidden w-fit items-end gap-3 lg:flex">
        <button
          type="button"
          onClick={() => (aperto ? chiudi() : apri())}
          aria-expanded={aperto}
          aria-haspopup="dialog"
          aria-label={aperto ? "Chiudi" : "Crea"}
          aria-keyshortcuts="N"
          className="pulsante-crea grid size-14 shrink-0 place-items-center rounded-full"
          style={stileTinta("studio")}
        >
          <Plus
            aria-hidden
            className="size-6 transition-transform duration-300"
            style={{ transform: aperto ? "rotate(45deg)" : "none", transitionTimingFunction: CURVA }}
            strokeWidth={2}
          />
        </button>

        <div
          role="dialog"
          aria-label="Crea"
          className={cn(
            "absolute left-0 top-full mt-3 w-80 origin-top-left rounded-medio border border-linea bg-superficie p-2.5 shadow-[0_24px_50px_-20px_rgba(43,42,40,0.45)] transition-[opacity,transform] duration-200",
            aperto ? "opacity-100" : "pointer-events-none -translate-y-1.5 scale-[0.98] opacity-0",
          )}
          style={{ transitionTimingFunction: CURVA }}
        >
          <label className="relative block">
            <span className="sr-only">Cosa vuoi creare?</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tenue" />
            <input
              ref={campo}
              value={ricerca}
              onChange={(e) => {
                setRicerca(e.target.value);
                setScelta(0);
              }}
              onKeyDown={tastiCampo}
              placeholder="Cerca"
              autoComplete="off"
              tabIndex={aperto ? 0 : -1}
              className="h-10 w-full rounded-piccolo border border-linea bg-sfondo pl-9 pr-3 text-sm outline-none placeholder:text-tenue focus:border-linea-forte"
            />
          </label>

          <ul className="mt-1.5">
            {filtrate.length === 0 ? (
              <li className="px-2.5 py-3 text-sm text-tenue">Nessuna voce per “{ricerca}”</li>
            ) : null}
            {filtrate.map((v, i) => {
              const primaDelGruppo = !ricerca && (i === 0 || filtrate[i - 1].gruppo !== v.gruppo);
              const Icona = v.icona;
              const selezionata = v === voceScelta;
              return (
                <li key={v.etichetta} data-crea={v.href}>
                  {primaDelGruppo ? (
                    <p className="px-2.5 pb-1 pt-2.5 text-[0.6875rem] uppercase tracking-[0.12em] text-tenue">{v.gruppo}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => vai(v)}
                    onMouseEnter={() => v.href && setScelta(disponibili.indexOf(v))}
                    disabled={!v.href}
                    tabIndex={aperto ? 0 : -1}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-piccolo px-2.5 py-2 text-left transition-[background-color,opacity,transform] duration-200",
                      v.href ? "cursor-pointer" : "cursor-default opacity-55",
                      selezionata && "bg-superficie-2",
                      aperto ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
                    )}
                    style={{ transitionDelay: aperto ? `${i * 25}ms` : "0ms", ...(v.href ? {} : { opacity: aperto ? 0.55 : 0 }) }}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full text-[#fbf6ee]" style={stileTinta(v.tipo)}>
                      <Icona aria-hidden className="size-4" strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.9375rem] text-inchiostro">{v.etichetta}</span>
                      <span className="block truncate text-[0.75rem] text-tenue">{v.descrizione}</span>
                    </span>
                    {v.href ? null : <span className="text-[0.6875rem] text-tenue">In arrivo</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* ── Telefono e tablet: pallino in basso al centro, ventaglio verso l'alto ── */}
      <div className="lg:hidden">
        <div ref={zonaMobile} className="crea-mobile fixed left-1/2 z-50 -translate-x-1/2">
          {VOCI.map((v, i) => {
            // Due archi verso l'alto: "Lavoro" vicino al pollice, anagrafiche e file più in alto
            const n = VOCI.length;
            const interno = v.gruppo === "Lavoro";
            const j = VOCI.filter((w) => w.gruppo === v.gruppo).indexOf(v);
            const angolo = (((interno ? 150 : 135) - (interno ? 60 : 45) * j) * Math.PI) / 180;
            const raggio = interno ? 96 : 200;
            const x = Math.cos(angolo) * raggio;
            const y = -Math.sin(angolo) * raggio;
            const Icona = v.icona;
            return (
              <button
                key={v.etichetta}
                data-crea={v.href}
                type="button"
                onClick={() => vai(v)}
                disabled={!v.href}
                tabIndex={aperto ? 0 : -1}
                aria-hidden={!aperto}
                className="absolute left-1/2 top-1/2 flex w-24 flex-col items-center gap-1.5"
                style={{
                  transform: aperto
                    ? `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) scale(1)`
                    : "translate(-50%, -50%) scale(0.4)",
                  opacity: aperto ? (v.href ? 1 : 0.6) : 0,
                  pointerEvents: aperto && v.href ? "auto" : "none",
                  transition: `transform 340ms cubic-bezier(0.2, 0.9, 0.3, 1.2), opacity 220ms`,
                  transitionDelay: aperto ? `${i * 35}ms` : `${(n - 1 - i) * 20}ms`,
                }}
              >
                <span className="pulsante-crea grid size-12 place-items-center rounded-full text-[#fbf6ee]" style={stileTinta(v.tipo)}>
                  <Icona aria-hidden className="size-5" strokeWidth={1.9} />
                </span>
                <span className="rounded-full border border-linea bg-superficie px-2 py-0.5 text-[0.75rem] leading-tight text-inchiostro">
                  {v.etichetta}
                  {v.href ? null : <span className="block text-center text-[0.625rem] text-tenue">in arrivo</span>}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => (aperto ? chiudi() : apri())}
            aria-expanded={aperto}
            aria-label={aperto ? "Chiudi" : "Crea"}
            className="pulsante-crea relative grid size-14 place-items-center rounded-full"
            style={stileTinta("studio")}
          >
            <Plus
              aria-hidden
              className="size-6 transition-transform duration-300"
              style={{ transform: aperto ? "rotate(45deg)" : "none", transitionTimingFunction: CURVA }}
              strokeWidth={2}
            />
          </button>
        </div>
      </div>
    </>
  );
}
