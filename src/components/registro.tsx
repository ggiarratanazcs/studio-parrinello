"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react";
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
}: {
  righe: T[];
  testo: (r: T) => unknown[];
  valore: (r: T, chiave: K) => unknown;
  filtro?: (r: T, scelto: string) => boolean;
  iniziale: Ordine<K>;
}) {
  const [cerca, setCerca] = useState("");
  const [scelto, setScelto] = useState("tutti");
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

/** Barra sopra la tabella: campo di ricerca e, se servono, i filtri a pillola con il conteggio. */
export function BarraRegistro({
  cerca,
  onCerca,
  segnaposto,
  filtri,
  scelto,
  onScegli,
}: {
  cerca: string;
  onCerca: (v: string) => void;
  segnaposto: string;
  filtri?: { id: string; etichetta: string; conteggio: number }[];
  scelto?: string;
  onScegli?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-linea px-4 py-4 md:px-5 lg:flex-row lg:items-center">
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
    </div>
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
