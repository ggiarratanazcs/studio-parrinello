"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Campo, Selezione } from "@/components/campo";
import { cn } from "@/lib/utils";

type Dati = { province: [string, string][]; comuni: [string, string, string, string][] };
type Comune = { nome: string; sigla: string; catastale: string; cap: string[] };

// Elenco caricato una sola volta per tutta la sessione
let promessa: Promise<Dati> | null = null;
function caricaComuni() {
  promessa ??= fetch("/dati/comuni.json").then((r) => r.json() as Promise<Dati>);
  return promessa;
}

const normalizza = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, "")
    .toLowerCase()
    .trim();

/**
 * Provincia, comune e CAP da elenchi ufficiali (ISTAT).
 * Si sceglie la provincia (facoltativo) e si cerca il comune: alla scelta si compilano
 * provincia e, se unico, il CAP; con più CAP si sceglie dall'elenco del comune.
 * Un comune non in elenco si può comunque scrivere a mano.
 */
export function SceltaLocalita({
  valore,
  onCambia,
  errore,
  mostraCap = true,
  prefisso,
}: {
  valore: { provincia: string; comune: string; cap?: string };
  onCambia: (v: { provincia: string; comune: string; cap: string }) => void;
  errore?: string;
  mostraCap?: boolean;
  prefisso: string;
}) {
  const [dati, setDati] = useState<Dati | null>(null);
  const [aperto, setAperto] = useState(false);
  const [evidenziato, setEvidenziato] = useState(0);
  const listaId = useId();
  const contenitore = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let attivo = true;
    caricaComuni()
      .then((d) => attivo && setDati(d))
      .catch(() => {
        promessa = null;
      });
    return () => {
      attivo = false;
    };
  }, []);

  // Chiude i suggerimenti cliccando fuori
  useEffect(() => {
    const fuori = (e: MouseEvent) => {
      if (contenitore.current && !contenitore.current.contains(e.target as Node)) setAperto(false);
    };
    document.addEventListener("mousedown", fuori);
    return () => document.removeEventListener("mousedown", fuori);
  }, []);

  const comuni: Comune[] = useMemo(
    () => (dati?.comuni ?? []).map(([nome, sigla, catastale, cap]) => ({ nome, sigla, catastale, cap: cap ? cap.split(" ") : [] })),
    [dati],
  );

  const scelto = useMemo(
    () => comuni.find((c) => normalizza(c.nome) === normalizza(valore.comune) && (!valore.provincia || c.sigla === valore.provincia.toUpperCase())),
    [comuni, valore.comune, valore.provincia],
  );

  const suggerimenti = useMemo(() => {
    const q = normalizza(valore.comune);
    if (!q) return [];
    const prov = valore.provincia.toUpperCase();
    const inProvincia = comuni.filter((c) => !prov || c.sigla === prov);
    const iniziano = inProvincia.filter((c) => normalizza(c.nome).startsWith(q));
    const contengono = inProvincia.filter((c) => !normalizza(c.nome).startsWith(q) && normalizza(c.nome).includes(q));
    return [...iniziano, ...contengono].slice(0, 8);
  }, [comuni, valore.comune, valore.provincia]);

  function scegli(c: Comune) {
    onCambia({ provincia: c.sigla, comune: c.nome, cap: c.cap.length === 1 ? c.cap[0] : c.cap.includes(valore.cap ?? "") ? (valore.cap ?? "") : "" });
    setAperto(false);
  }

  const mostraSuggerimenti = aperto && suggerimenti.length > 0 && !(scelto && suggerimenti.length === 1 && suggerimenti[0] === scelto);

  return (
    <div className={cn("grid gap-5 md:col-span-2", mostraCap ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.8fr)]" : "md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]")}>
      <Selezione
        etichetta="Provincia"
        id={`${prefisso}-prov`}
        value={valore.provincia.toUpperCase()}
        onChange={(e) => {
          const prov = e.target.value;
          // Se il comune scritto non è di questa provincia, lo si svuota
          const resta = scelto && (!prov || scelto.sigla === prov);
          onCambia({ provincia: prov, comune: resta ? valore.comune : "", cap: resta ? (valore.cap ?? "") : "" });
        }}
      >
        <option value="">{dati ? "Tutte" : "Caricamento…"}</option>
        {(dati?.province ?? []).map(([sigla, nome]) => (
          <option key={sigla} value={sigla}>
            {nome} ({sigla})
          </option>
        ))}
      </Selezione>

      <div ref={contenitore} className="relative">
        <Campo
          etichetta="Comune"
          id={`${prefisso}-comune`}
          obbligatorio
          value={valore.comune}
          errore={errore}
          placeholder="Inizia a scrivere…"
          autoComplete="off"
          role="combobox"
          aria-expanded={mostraSuggerimenti}
          aria-controls={listaId}
          aria-autocomplete="list"
          onFocus={() => setAperto(true)}
          onChange={(e) => {
            onCambia({ provincia: valore.provincia, comune: e.target.value, cap: valore.cap ?? "" });
            setAperto(true);
            setEvidenziato(0);
          }}
          onKeyDown={(e) => {
            if (!mostraSuggerimenti) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setEvidenziato((i) => Math.min(i + 1, suggerimenti.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setEvidenziato((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              scegli(suggerimenti[evidenziato]);
            } else if (e.key === "Escape") setAperto(false);
          }}
        />
        {scelto ? (
          <Check className="pointer-events-none absolute right-3 top-[2.45rem] size-4 text-[color:var(--stato-attiva)]" strokeWidth={2.2} aria-label="Comune riconosciuto" />
        ) : null}
        {mostraSuggerimenti ? (
          <ul
            id={listaId}
            role="listbox"
            className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-medio border border-linea bg-superficie py-1 shadow-[0_18px_40px_-18px_rgba(43,42,40,0.5)]"
          >
            {suggerimenti.map((c, i) => (
              <li key={`${c.nome}-${c.sigla}`} role="option" aria-selected={i === evidenziato}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => scegli(c)}
                  onMouseEnter={() => setEvidenziato(i)}
                  className={cn("flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[0.9375rem]", i === evidenziato && "bg-superficie-2")}
                >
                  <span className="truncate">{c.nome}</span>
                  <span className="numeri shrink-0 text-xs text-tenue">
                    {c.sigla}
                    {c.cap.length === 1 ? ` · ${c.cap[0]}` : c.cap.length > 1 ? ` · ${c.cap.length} CAP` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {mostraCap ? (
        scelto && scelto.cap.length > 1 ? (
          <Selezione
            etichetta="CAP"
            id={`${prefisso}-cap`}
            value={valore.cap ?? ""}
            onChange={(e) => onCambia({ provincia: valore.provincia, comune: valore.comune, cap: e.target.value })}
          >
            <option value="">Scegli…</option>
            {scelto.cap.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Selezione>
        ) : (
          <Campo
            etichetta="CAP"
            id={`${prefisso}-cap`}
            value={valore.cap ?? ""}
            onChange={(e) => onCambia({ provincia: valore.provincia, comune: valore.comune, cap: e.target.value.replace(/\D/g, "").slice(0, 5) })}
            inputMode="numeric"
            maxLength={5}
          />
        )
      ) : null}
    </div>
  );
}
