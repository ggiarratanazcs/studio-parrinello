"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────────────
   Tendine e calendari nello stile del portale, al posto di quelli del browser.
   Il pannello si apre sotto il campo (o sopra, se sotto non c'è spazio),
   si chiude cliccando fuori, con Esc o scorrendo la pagina.
   ────────────────────────────────────────────────────────────────────────── */

export type Opzione = { valore: string; etichetta: string; disabilitata?: boolean };

/** Pannello sospeso agganciato a un elemento, disegnato sopra a tutto. */
function Sospeso({
  ancora,
  aperto,
  onChiudi,
  larghezza,
  children,
}: {
  ancora: React.RefObject<HTMLElement | null>;
  aperto: boolean;
  onChiudi: () => void;
  /** Larghezza fissa; senza, quella del campo */
  larghezza?: number;
  children: ReactNode;
}) {
  const pannello = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; sopra: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!aperto) return;
    const calcola = () => {
      const r = ancora.current?.getBoundingClientRect();
      if (!r) return;
      const w = larghezza ?? Math.max(r.width, 180);
      const altezza = pannello.current?.offsetHeight ?? 280;
      const sopra = r.bottom + altezza + 8 > window.innerHeight && r.top > altezza + 8;
      setPos({
        top: sopra ? r.top - altezza - 6 : r.bottom + 6,
        left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)),
        width: w,
        sopra,
      });
    };
    calcola();
    // Seconda misura dopo il primo disegno, quando l'altezza del pannello è nota
    const frame = requestAnimationFrame(calcola);
    return () => cancelAnimationFrame(frame);
  }, [aperto, ancora, larghezza]);

  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!pannello.current?.contains(t) && !ancora.current?.contains(t)) onChiudi();
    };
    const scorri = (e: Event) => {
      if (!pannello.current?.contains(e.target as Node)) onChiudi();
    };
    document.addEventListener("pointerdown", fuori);
    window.addEventListener("scroll", scorri, true);
    window.addEventListener("resize", onChiudi);
    return () => {
      document.removeEventListener("pointerdown", fuori);
      window.removeEventListener("scroll", scorri, true);
      window.removeEventListener("resize", onChiudi);
    };
  }, [aperto, ancora, onChiudi]);

  if (!aperto || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={pannello}
      style={pos ? { top: pos.top, left: pos.left, width: pos.width } : { top: -9999, left: -9999 }}
      className={cn(
        "sospeso fixed z-[95] rounded-medio border border-linea bg-superficie p-1.5 shadow-[0_22px_48px_-22px_rgba(43,42,40,0.55),0_4px_10px_-6px_rgba(43,42,40,0.2)]",
        pos?.sopra ? "origin-bottom" : "origin-top",
      )}
    >
      {children}
    </div>,
    document.body,
  );
}

/* ── Tendina ──────────────────────────────────────────────────────────── */

export function Tendina({
  id,
  valore,
  onCambia,
  opzioni,
  etichetta,
  disabilitata,
  invalida,
  segnaposto = "Scegli…",
  variante = "campo",
  className,
  children,
}: {
  id?: string;
  valore: string;
  onCambia: (v: string) => void;
  opzioni: Opzione[];
  /** Nome per gli screen reader quando manca un'etichetta visibile */
  etichetta?: string;
  disabilitata?: boolean;
  invalida?: boolean;
  segnaposto?: string;
  /** campo: come gli altri campi · compatta: più bassa · cella: dentro una tabella, senza bordo */
  variante?: "campo" | "compatta" | "cella";
  className?: string;
  /** Contenuto personalizzato del pulsante (per le celle); senza, l'etichetta dell'opzione scelta */
  children?: ReactNode;
}) {
  const ancora = useRef<HTMLButtonElement>(null);
  const elenco = useRef<HTMLUListElement>(null);
  const idElenco = useId();
  const [aperto, setAperto] = useState(false);
  const [attiva, setAttiva] = useState(0);
  const ricerca = useRef({ testo: "", tempo: 0 });
  const scelta = opzioni.find((o) => o.valore === valore);

  function apri() {
    if (disabilitata) return;
    const i = Math.max(0, opzioni.findIndex((o) => o.valore === valore));
    setAttiva(i);
    setAperto(true);
  }
  function chiudi(focus = true) {
    setAperto(false);
    if (focus) ancora.current?.focus();
  }
  function scegli(o: Opzione) {
    if (o.disabilitata) return;
    if (o.valore !== valore) onCambia(o.valore);
    chiudi();
  }

  useEffect(() => {
    if (aperto) elenco.current?.querySelector<HTMLElement>(`[data-indice="${attiva}"]`)?.scrollIntoView({ block: "nearest" });
  }, [aperto, attiva]);

  function tasti(e: KeyboardEvent) {
    if (!aperto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        apri();
      }
      return;
    }
    const sposta = (passo: number) => {
      let i = attiva;
      for (let k = 0; k < opzioni.length; k++) {
        i = (i + passo + opzioni.length) % opzioni.length;
        if (!opzioni[i].disabilitata) break;
      }
      setAttiva(i);
    };
    if (e.key === "ArrowDown") {
      e.preventDefault();
      sposta(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      sposta(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      setAttiva(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setAttiva(opzioni.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (opzioni[attiva]) scegli(opzioni[attiva]);
    } else if (e.key === "Escape" || e.key === "Tab") chiudi(e.key === "Escape");
    else if (e.key.length === 1) {
      // Si scrive l'inizio di una voce per raggiungerla
      const ora = Date.now();
      ricerca.current.testo = (ora - ricerca.current.tempo > 700 ? "" : ricerca.current.testo) + e.key.toLowerCase();
      ricerca.current.tempo = ora;
      const i = opzioni.findIndex((o) => o.etichetta.toLowerCase().startsWith(ricerca.current.testo));
      if (i >= 0) setAttiva(i);
    }
  }

  return (
    <>
      <button
        ref={ancora}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aperto}
        aria-controls={aperto ? idElenco : undefined}
        aria-label={etichetta}
        aria-invalid={invalida || undefined}
        disabled={disabilitata}
        onClick={() => (aperto ? chiudi() : apri())}
        onKeyDown={tasti}
        className={cn(
          "flex w-full min-w-0 items-center gap-2 text-left text-inchiostro outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          variante !== "cella" &&
            "rounded-medio border border-linea-forte bg-superficie px-3 focus-visible:border-accento focus-visible:ring-2 focus-visible:ring-accento/20 aria-[invalid=true]:border-[color:var(--stato-sospesa)]",
          variante === "campo" && "h-11 text-base",
          variante === "compatta" && "h-9 text-sm",
          variante === "cella" && "-mx-1.5 h-8 rounded-piccolo px-1.5 hover:bg-superficie-2/70 focus-visible:ring-2 focus-visible:ring-accento/25",
          aperto && variante !== "cella" && "border-accento ring-2 ring-accento/20",
          aperto && variante === "cella" && "bg-superficie-2/70",
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">{children ?? (scelta ? scelta.etichetta : <span className="text-tenue/80">{segnaposto}</span>)}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-tenue transition-transform duration-200",
            aperto && "rotate-180",
            variante === "cella" && "size-3",
          )}
          strokeWidth={1.8}
        />
      </button>
      <Sospeso ancora={ancora} aperto={aperto} onChiudi={() => chiudi(false)} larghezza={variante === "cella" ? 240 : undefined}>
        <ul ref={elenco} id={idElenco} role="listbox" aria-label={etichetta} className="max-h-72 overflow-y-auto overscroll-contain">
          {opzioni.map((o, i) => {
            const selezionata = o.valore === valore;
            return (
              <li
                key={o.valore}
                role="option"
                aria-selected={selezionata}
                aria-disabled={o.disabilitata || undefined}
                data-indice={i}
                onPointerEnter={() => setAttiva(i)}
                onClick={() => scegli(o)}
                className={cn(
                  "flex min-h-9 cursor-pointer items-center gap-2 rounded-piccolo px-2.5 py-1.5 text-[0.9375rem] transition-colors",
                  i === attiva && "bg-superficie-2",
                  selezionata ? "font-medium text-inchiostro" : "text-inchiostro-2",
                  o.disabilitata && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="min-w-0 flex-1">{o.etichetta}</span>
                {selezionata ? <Check aria-hidden className="size-4 shrink-0 text-accento" strokeWidth={2} /> : null}
              </li>
            );
          })}
        </ul>
      </Sospeso>
    </>
  );
}

/* ── Calendario ───────────────────────────────────────────────────────── */

const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const GIORNI = ["L", "M", "M", "G", "V", "S", "D"];

const due = (n: number) => String(n).padStart(2, "0");
const iso = (a: number, m: number, g: number) => `${a}-${due(m + 1)}-${due(g)}`;
function oggiLocale() {
  const d = new Date();
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
}

/** "2026-06-16" → "16.06.2026" */
export function dataLeggibile(v: string | null | undefined, breve = false) {
  if (!v) return "";
  return `${v.slice(8, 10)}.${v.slice(5, 7)}.${breve ? v.slice(2, 4) : v.slice(0, 4)}`;
}

/** Legge "16.6.26", "16/06/2026", "16-6-2026" o "2026-06-16"; null se non è una data valida. */
export function leggiData(testo: string): string | null {
  const t = testo.trim();
  if (!t) return null;
  const isoMatch = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const it = t.match(/^(\d{1,2})[./\-\s](\d{1,2})[./\-\s](\d{2}|\d{4})$/);
  let a: number, m: number, g: number;
  if (isoMatch) [a, m, g] = [+isoMatch[1], +isoMatch[2], +isoMatch[3]];
  else if (it) [g, m, a] = [+it[1], +it[2], it[3].length === 2 ? 2000 + +it[3] : +it[3]];
  else return null;
  const d = new Date(a, m - 1, g);
  if (d.getFullYear() !== a || d.getMonth() !== m - 1 || d.getDate() !== g) return null;
  return iso(a, m - 1, g);
}

function Calendario({ valore, onScegli, onCancella }: { valore: string | null; onScegli: (v: string) => void; onCancella?: () => void }) {
  const oggi = oggiLocale();
  const base = valore ?? oggi;
  const [anno, setAnno] = useState(+base.slice(0, 4));
  const [mese, setMese] = useState(+base.slice(5, 7) - 1);
  const [vistaMesi, setVistaMesi] = useState(false);

  const primo = (new Date(anno, mese, 1).getDay() + 6) % 7; // lunedì = 0
  const giorni = new Date(anno, mese + 1, 0).getDate();
  const celle: (number | null)[] = [...Array(primo).fill(null), ...Array.from({ length: giorni }, (_, i) => i + 1)];
  while (celle.length % 7) celle.push(null);

  const passa = (d: number) => {
    const m = mese + d;
    setAnno(anno + Math.floor(m / 12));
    setMese(((m % 12) + 12) % 12);
  };
  const freccia = "grid size-8 place-items-center rounded-full text-inchiostro-2 transition-colors hover:bg-superficie-2 hover:text-inchiostro";

  return (
    <div className="w-[17.5rem] p-1.5 select-none">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className={freccia} onClick={() => (vistaMesi ? setAnno(anno - 1) : passa(-1))} aria-label={vistaMesi ? "Anno precedente" : "Mese precedente"}>
          <ChevronLeft className="size-4" strokeWidth={1.8} />
        </button>
        <button type="button" onClick={() => setVistaMesi(!vistaMesi)} className="rounded-piccolo px-2 py-1 text-[0.9375rem] font-medium hover:bg-superficie-2">
          {vistaMesi ? anno : `${MESI[mese]} ${anno}`}
        </button>
        <button type="button" className={freccia} onClick={() => (vistaMesi ? setAnno(anno + 1) : passa(1))} aria-label={vistaMesi ? "Anno successivo" : "Mese successivo"}>
          <ChevronRight className="size-4" strokeWidth={1.8} />
        </button>
      </div>

      {vistaMesi ? (
        <div className="grid grid-cols-3 gap-1">
          {MESI.map((m, i) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMese(i);
                setVistaMesi(false);
              }}
              className={cn(
                "h-10 rounded-piccolo text-sm transition-colors hover:bg-superficie-2",
                i === mese && "bg-inchiostro text-superficie hover:bg-inchiostro",
              )}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 pb-1 text-center text-[0.6875rem] uppercase tracking-[0.08em] text-tenue">
            {GIORNI.map((g, i) => (
              <span key={i} className={cn(i > 4 && "text-tenue/70")}>
                {g}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {celle.map((g, i) => {
              if (!g) return <span key={i} />;
              const giorno = iso(anno, mese, g);
              const scelto = giorno === valore;
              const odierno = giorno === oggi;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onScegli(giorno)}
                  aria-label={`${g} ${MESI[mese]} ${anno}`}
                  aria-pressed={scelto}
                  className={cn(
                    "numeri mx-auto grid size-9 place-items-center rounded-full text-sm transition-colors",
                    scelto ? "bg-inchiostro font-medium text-superficie" : "hover:bg-superficie-2",
                    !scelto && odierno && "font-medium text-accento ring-1 ring-inset ring-accento/40",
                    !scelto && i % 7 > 4 && "text-tenue",
                  )}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-linea pt-2 text-sm">
        <button type="button" onClick={() => onScegli(oggi)} className="rounded-piccolo px-2 py-1 font-medium text-accento hover:bg-superficie-2">
          Oggi
        </button>
        {onCancella && valore ? (
          <button type="button" onClick={onCancella} className="rounded-piccolo px-2 py-1 text-tenue hover:bg-superficie-2 hover:text-inchiostro">
            Cancella
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Campo data: si scrive (16.06.2026, 16/6/26…) oppure si sceglie dal calendario.
 * Il valore resta nel formato AAAA-MM-GG, come per i campi data del browser.
 */
export function SceltaData({
  id,
  valore,
  onCambia,
  etichetta,
  invalida,
  disabilitata,
  className,
}: {
  id?: string;
  valore: string | null;
  onCambia: (v: string | null) => void;
  etichetta?: string;
  invalida?: boolean;
  disabilitata?: boolean;
  className?: string;
}) {
  const ancora = useRef<HTMLDivElement>(null);
  const [aperto, setAperto] = useState(false);
  const [bozza, setBozza] = useState<string | null>(null);
  const [errata, setErrata] = useState(false);

  function conferma() {
    if (bozza === null) return;
    const v = leggiData(bozza);
    if (bozza.trim() && !v) return setErrata(true);
    setErrata(false);
    setBozza(null);
    if (v !== valore) onCambia(v);
  }

  return (
    <div
      ref={ancora}
      className={cn(
        "flex h-11 items-center rounded-medio border border-linea-forte bg-superficie transition-colors focus-within:border-accento focus-within:ring-2 focus-within:ring-accento/20",
        (invalida || errata) && "border-[color:var(--stato-sospesa)]",
        aperto && "border-accento ring-2 ring-accento/20",
        disabilitata && "opacity-60",
        className,
      )}
    >
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={etichetta}
        aria-invalid={invalida || errata || undefined}
        placeholder="gg.mm.aaaa"
        disabled={disabilitata}
        value={bozza ?? dataLeggibile(valore)}
        onChange={(e) => {
          setBozza(e.target.value);
          setErrata(false);
        }}
        onBlur={conferma}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            conferma();
          } else if (e.key === "ArrowDown" && e.altKey) setAperto(true);
          else if (e.key === "Escape") setAperto(false);
        }}
        className="numeri h-full min-w-0 flex-1 bg-transparent pl-3 text-base text-inchiostro outline-none placeholder:text-tenue/60"
      />
      <button
        type="button"
        disabled={disabilitata}
        onClick={() => setAperto(!aperto)}
        aria-label="Apri il calendario"
        aria-expanded={aperto}
        className="grid h-full w-10 shrink-0 place-items-center text-tenue transition-colors hover:text-inchiostro"
      >
        <CalendarDays className="size-4" strokeWidth={1.7} />
      </button>
      <Sospeso ancora={ancora} aperto={aperto} onChiudi={() => setAperto(false)} larghezza={296}>
        <Calendario
          valore={valore}
          onScegli={(v) => {
            setBozza(null);
            setErrata(false);
            onCambia(v);
            setAperto(false);
          }}
          onCancella={() => {
            onCambia(null);
            setAperto(false);
          }}
        />
      </Sospeso>
    </div>
  );
}

/** Data dentro una cella di tabella: testo gg.mm.aa, il clic apre il calendario. */
export function CellaCalendario({
  valore,
  onCambia,
  etichetta,
  modificabile,
}: {
  valore: string | null;
  onCambia: (v: string | null) => void;
  etichetta: string;
  modificabile: boolean;
}) {
  const ancora = useRef<HTMLButtonElement>(null);
  const [aperto, setAperto] = useState(false);
  const testo = valore ? dataLeggibile(valore, true) : "—";
  if (!modificabile) return <span className={cn("numeri text-sm", !valore && "text-tenue")}>{testo}</span>;
  return (
    <>
      <button
        ref={ancora}
        type="button"
        onClick={() => setAperto(!aperto)}
        aria-label={`${etichetta}: ${valore ? dataLeggibile(valore) : "da definire"}`}
        aria-expanded={aperto}
        className={cn(
          "numeri -mx-1.5 flex h-8 items-center rounded-piccolo px-1.5 text-sm transition-colors hover:bg-superficie-2/70",
          !valore && "text-tenue",
          aperto && "bg-superficie-2/70",
        )}
      >
        {testo}
      </button>
      <Sospeso ancora={ancora} aperto={aperto} onChiudi={() => setAperto(false)} larghezza={296}>
        <Calendario
          valore={valore}
          onScegli={(v) => {
            onCambia(v);
            setAperto(false);
          }}
          onCancella={() => {
            onCambia(null);
            setAperto(false);
          }}
        />
      </Sospeso>
    </>
  );
}
