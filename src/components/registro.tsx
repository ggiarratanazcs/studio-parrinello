"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Maximize2, Minimize2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pezzi comuni delle tabelle "registro": ricerca, filtri a pillola e intestazioni ordinabili.
 * Usati da Commesse e, a seguire, dalle altre sezioni.
 */

export type Verso = "asc" | "desc";
export type Ordine<K extends string> = { chiave: K; verso: Verso };

/** Testo confrontabile: minuscolo e senza accenti ("Pre-fattibilità" → "pre-fattibilita"). */
export function normalizza(t: unknown) {
  return String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Confronto per l'ordinamento: numeri come numeri, testi in ordine italiano, vuoti sempre in fondo. */
function confronta(a: unknown, b: unknown) {
  const vuotoA = a === null || a === undefined || a === "";
  const vuotoB = b === null || b === undefined || b === "";
  if (vuotoA || vuotoB) return vuotoA === vuotoB ? 0 : vuotoA ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "it", { numeric: true, sensitivity: "base" });
}

/**
 * Stato della tabella: testo cercato, filtro attivo e ordinamento.
 * `testo` dice dove cercare in ogni riga, `valore` cosa ordinare per ogni colonna.
 */
export function useRegistro<T, K extends string>({
  righe,
  testo,
  valore,
  filtro,
  iniziale,
  filtroIniziale = "tutti",
}: {
  righe: T[];
  testo: (r: T) => unknown[];
  valore: (r: T, chiave: K) => unknown;
  filtro?: (r: T, scelto: string) => boolean;
  iniziale: Ordine<K>;
  filtroIniziale?: string;
}) {
  const [cerca, setCerca] = useState("");
  const [scelto, setScelto] = useState(filtroIniziale);
  const [ordine, setOrdine] = useState<Ordine<K>>(iniziale);

  const visibili = useMemo(() => {
    const parole = normalizza(cerca).split(/\s+/).filter(Boolean);
    const filtrate = righe.filter((r) => {
      if (filtro && scelto !== "tutti" && !filtro(r, scelto)) return false;
      if (!parole.length) return true;
      const dove = normalizza(testo(r).filter(Boolean).join(" "));
      return parole.every((p) => dove.includes(p));
    });
    const segno = ordine.verso === "asc" ? 1 : -1;
    return [...filtrate].sort((a, b) => {
      const va = valore(a, ordine.chiave);
      const vb = valore(b, ordine.chiave);
      // i vuoti restano in fondo in entrambi i versi
      const vuoto = va === null || va === undefined || va === "" || vb === null || vb === undefined || vb === "";
      return vuoto ? confronta(va, vb) : segno * confronta(va, vb);
    });
  }, [righe, cerca, scelto, ordine, testo, valore, filtro]);

  function ordina(chiave: K) {
    setOrdine((o) => (o.chiave === chiave ? { chiave, verso: o.verso === "asc" ? "desc" : "asc" } : { chiave, verso: "asc" }));
  }

  return { visibili, cerca, setCerca, scelto, setScelto, ordine, ordina };
}

/** Espansione a tutto schermo: chi la fornisce (Espandibile) e la barra che mostra il pulsante. */
const ContestoEspansione = createContext<{ espanso: boolean; cambia: () => void } | null>(null);

/**
 * Contenitore che si può espandere a tutto schermo (pulsante nella barra di ricerca, Esc per uscire).
 * Il contenuto resta lo stesso: ricerca, filtri e ordinamento non si perdono.
 */
export function Espandibile({ children, className }: { children: ReactNode; className?: string }) {
  const [espanso, setEspanso] = useState(false);
  useEffect(() => {
    if (!espanso) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setEspanso(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = overflow;
    };
  }, [espanso]);
  return (
    <ContestoEspansione.Provider value={{ espanso, cambia: () => setEspanso((v) => !v) }}>
      <div
        className={cn(
          espanso && "fixed inset-0 z-[70] overflow-auto bg-sfondo p-3 md:p-6",
          className,
        )}
      >
        <div className={cn(espanso && "pannello min-h-full overflow-hidden rounded-l border border-linea bg-superficie shadow-[0_24px_60px_-30px_rgba(43,42,40,0.5)]")}>
          {children}
        </div>
      </div>
    </ContestoEspansione.Provider>
  );
}

/** Barra sopra la tabella: campo di ricerca e, se servono, i filtri a pillola con il conteggio. */
export function BarraRegistro({
  cerca,
  onCerca,
  segnaposto,
  filtri,
  scelto,
  onScegli,
  children,
}: {
  cerca: string;
  onCerca: (v: string) => void;
  segnaposto: string;
  filtri?: { id: string; etichetta: string; conteggio: number }[];
  scelto?: string;
  onScegli?: (id: string) => void;
  /** Filtri su misura (es. schede e stati delle commesse) al posto delle pillole */
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-linea px-4 py-4 md:px-5 lg:flex-row lg:flex-wrap lg:items-center">
      <label className="relative flex min-w-0 flex-1 items-center lg:max-w-md">
        <Search aria-hidden className="pointer-events-none absolute left-4 size-4 text-tenue" strokeWidth={1.8} />
        <span className="sr-only">Cerca</span>
        <input
          type="search"
          value={cerca}
          onChange={(e) => onCerca(e.target.value)}
          placeholder={segnaposto}
          className="h-10 w-full rounded-full border border-linea bg-superficie pl-11 pr-10 text-[0.9375rem] outline-none transition-colors placeholder:text-tenue focus:border-linea-forte [&::-webkit-search-cancel-button]:hidden"
        />
        {cerca ? (
          <button
            type="button"
            onClick={() => onCerca("")}
            className="absolute right-2 grid size-7 place-items-center rounded-full text-tenue hover:bg-superficie-2 hover:text-inchiostro"
            data-suggerimento="Svuota la ricerca"
          >
            <X className="size-4" strokeWidth={1.8} />
            <span className="sr-only">Svuota la ricerca</span>
          </button>
        ) : null}
      </label>
      {filtri?.length ? (
        <div role="group" aria-label="Filtra" className="flex flex-wrap gap-1.5">
          {filtri.map((f) => {
            const attivo = f.id === scelto;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={attivo}
                onClick={() => onScegli?.(f.id)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[0.8125rem] transition-colors",
                  attivo
                    ? "border-inchiostro bg-inchiostro text-superficie"
                    : "border-linea text-inchiostro-2 hover:border-linea-forte hover:text-inchiostro",
                )}
              >
                {f.etichetta}
                <span className={cn("numeri text-xs", attivo ? "text-superficie/70" : "text-tenue")}>{f.conteggio}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {children}
      <PulsanteEspandi />
    </div>
  );
}

function PulsanteEspandi() {
  const e = useContext(ContestoEspansione);
  if (!e) return null;
  const Icona = e.espanso ? Minimize2 : Maximize2;
  return (
    <button
      type="button"
      onClick={e.cambia}
      className="ml-auto hidden size-10 shrink-0 place-items-center rounded-full border border-linea text-tenue transition-colors hover:border-linea-forte hover:text-inchiostro md:grid"
      data-suggerimento={e.espanso ? "Riduci (Esc)" : "A tutto schermo"}
      data-suggerimento-lato="sotto"
    >
      <Icona className="size-4" strokeWidth={1.8} />
      <span className="sr-only">{e.espanso ? "Riduci" : "A tutto schermo"}</span>
    </button>
  );
}

/**
 * Intestazione di colonna ordinabile: un clic ordina, un secondo clic inverte.
 * Freccia sottile solo sulla colonna attiva; sulle altre compare appena, al passaggio del mouse.
 */
export function Intestazione<K extends string>({
  chiave,
  ordine,
  onOrdina,
  children,
  destra = false,
}: {
  chiave: K;
  ordine: Ordine<K>;
  onOrdina: (k: K) => void;
  children: ReactNode;
  destra?: boolean;
}) {
  const attiva = ordine.chiave === chiave;
  const Freccia = !attiva ? ArrowUpDown : ordine.verso === "asc" ? ArrowUp : ArrowDown;
  return (
    <span
      role="columnheader"
      aria-sort={attiva ? (ordine.verso === "asc" ? "ascending" : "descending") : "none"}
      className={cn("flex", destra && "justify-end")}
    >
      <button
        type="button"
        onClick={() => onOrdina(chiave)}
        className={cn(
          "group -mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[0.6875rem] uppercase tracking-[0.12em] transition-colors",
          attiva ? "text-inchiostro" : "hover:text-inchiostro",
          destra && "flex-row-reverse",
        )}
      >
        {children}
        <Freccia
          aria-hidden
          className={cn("size-3 transition-opacity", attiva ? "opacity-90" : "opacity-0 group-hover:opacity-50 group-focus-visible:opacity-50")}
          strokeWidth={2}
        />
      </button>
    </span>
  );
}

/** Riga sotto la tabella: quante righe si vedono su quante. */
export function PiedeRegistro({ visibili, totali, nome }: { visibili: number; totali: number; nome: [string, string] }) {
  return (
    <p className="border-t border-linea px-5 py-3 text-[0.8125rem] text-tenue md:px-6">
      {visibili === totali ? `${totali} ${totali === 1 ? nome[0] : nome[1]}` : `${visibili} di ${totali} ${nome[1]}`}
    </p>
  );
}

/** Una scheda del filtro: nome e stati che raccoglie (vuoto = tutti). */
export type GruppoFiltro = { id: string; etichetta: string; stati?: string[] };

/** Il filtro scelto è "gruppo|stato" (stato vuoto = tutta la scheda). */
export function filtroGruppi(gruppi: GruppoFiltro[]) {
  return (stato: string, scelto: string) => {
    const [g, s] = scelto.split("|");
    if (s) return stato === s;
    const gruppo = gruppi.find((x) => x.id === g);
    return !gruppo?.stati || gruppo.stati.includes(stato);
  };
}

/**
 * Filtro a schede (es. In lavorazione · Archivio · Tutte) con, sotto, i pallini colorati
 * dei singoli stati presenti nella scheda scelta: un clic filtra quello stato, un secondo clic torna alla scheda.
 */
export function FiltroGruppi({
  gruppi,
  ordine,
  info,
  stati,
  scelto,
  onScegli,
  nome = "Gruppo",
  senzaSchede = false,
}: {
  gruppi: GruppoFiltro[];
  /** Ordine in cui mostrare gli stati */
  ordine: string[];
  info: (stato: string) => { etichetta: string; colore: string };
  /** Lo stato di ogni riga */
  stati: string[];
  scelto: string;
  onScegli: (v: string) => void;
  nome?: string;
  /** Solo i pallini degli stati, senza le schede (le schede le gestisce chi lo usa) */
  senzaSchede?: boolean;
}) {
  const [gruppo, stato] = scelto.split("|");
  const corrente = gruppi.find((g) => g.id === gruppo);
  const conta = (s: string) => stati.filter((x) => x === s).length;
  const visibili = ordine
    .filter((s) => !corrente?.stati || corrente.stati.includes(s))
    .map((s) => ({ id: s, ...info(s), conteggio: conta(s) }))
    .filter((s) => s.conteggio > 0);
  return (
    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-4">
      {senzaSchede ? null : <div role="tablist" aria-label={nome} className="inline-flex w-fit rounded-full bg-superficie-2 p-1">
        {gruppi.map((g) => {
          const attivo = g.id === gruppo;
          const n = g.stati ? stati.filter((x) => g.stati!.includes(x)).length : stati.length;
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={attivo}
              onClick={() => onScegli(`${g.id}|`)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-4 text-[0.8125rem] transition-all duration-200",
                attivo
                  ? "bg-superficie font-medium text-inchiostro shadow-[0_4px_14px_-6px_rgba(43,42,40,0.35)]"
                  : "text-tenue hover:text-inchiostro",
              )}
            >
              {g.etichetta}
              <span className={cn("numeri text-xs", attivo ? "text-tenue" : "text-tenue/70")}>{n}</span>
            </button>
          );
        })}
      </div>}
      {visibili.length > 1 ? (
        <div role="group" aria-label="Stato" className="flex flex-wrap items-center gap-1">
          {visibili.map((s) => {
            const attivo = s.id === stato;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={attivo}
                onClick={() => onScegli(`${gruppo}|${attivo ? "" : s.id}`)}
                data-suggerimento={attivo ? "Mostra di nuovo tutti" : `Solo: ${s.etichetta.toLowerCase()}`}
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[0.8125rem] transition-all duration-200",
                  attivo ? "font-medium" : "border-transparent text-inchiostro-2 hover:bg-superficie-2",
                  stato && !attivo && "opacity-55 hover:opacity-100",
                )}
                style={
                  attivo
                    ? { color: s.colore, borderColor: `color-mix(in srgb, ${s.colore} 45%, transparent)`, background: `color-mix(in srgb, ${s.colore} 10%, transparent)` }
                    : undefined
                }
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: s.colore, boxShadow: `0 0 0 3px color-mix(in srgb, ${s.colore} 18%, transparent)` }}
                />
                {s.etichetta}
                <span className="numeri text-xs text-tenue">{s.conteggio}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
