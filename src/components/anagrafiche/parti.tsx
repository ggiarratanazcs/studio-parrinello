"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, ChevronDown, Copy, Mail, X } from "lucide-react";
import { useInFinestra } from "@/components/anagrafiche/finestra-anagrafica";
import { cn, formattaData, formattaEuro } from "@/lib/utils";
import type { PraticaCliente } from "@/lib/anagrafiche";

/* Parti comuni alle schede anagrafiche (cliente, immobile). */

const classeIcona =
  "grid size-9 shrink-0 place-items-center rounded-full text-tenue transition-colors hover:bg-superficie-2 hover:text-inchiostro";

/** Chiusura: in finestra torna indietro, a pagina intera porta all'elenco. */
export function Chiudi({ elenco, nomeElenco }: { elenco: string; nomeElenco: string }) {
  const inFinestra = useInFinestra();
  const router = useRouter();
  return inFinestra ? (
    <button type="button" onClick={() => router.back()} className={classeIcona} aria-label="Chiudi" data-suggerimento="Chiudi (Esc)" data-suggerimento-lato="sotto">
      <X className="size-5" strokeWidth={1.8} />
    </button>
  ) : (
    <Link href={elenco} className={classeIcona} aria-label={`Torna a ${nomeElenco}`}>
      <X className="size-5" strokeWidth={1.8} />
    </Link>
  );
}

export function TitoloColonna({ children, azione }: { children: ReactNode; azione?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <h2 className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-tenue">{children}</h2>
      {azione}
    </div>
  );
}

/** Dato con pulsante per copiarlo negli appunti. */
export function DatoCopiabile({ voce, valore, codice, riga, icona: Icona }: { voce: string; valore: string | null; codice?: boolean; riga?: boolean; icona?: typeof Mail }) {
  const [copiato, setCopiato] = useState(false);
  async function copia() {
    if (!valore) return;
    try {
      await navigator.clipboard.writeText(valore);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 1500);
    } catch {
      // appunti non disponibili: nessun messaggio, il dato resta selezionabile
    }
  }
  const pulsante = !valore ? null : (
    <button
      type="button"
      onClick={copia}
      className="grid size-6 shrink-0 place-items-center rounded-full text-tenue opacity-100 transition-opacity hover:text-inchiostro md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
      aria-label={copiato ? `${voce} copiato` : `Copia ${voce}`}
    >
      {copiato ? <Check className="size-3.5" strokeWidth={2.2} /> : <Copy className="size-3.5" strokeWidth={1.8} />}
    </button>
  );
  const testo = cn(
    "min-w-0 text-inchiostro [overflow-wrap:anywhere]",
    // Gli indirizzi email lunghi (PEC degli enti) stanno su una riga con un corpo appena più piccolo
    valore?.includes("@") || codice ? "text-[0.84375rem] leading-6" : "text-[0.9375rem]",
    codice && "numeri tracking-[0.02em]",
    !valore && "text-tenue",
  );
  const mostrato = valore ?? "—";
  if (Icona) {
    // Recapito: icona al posto dell'etichetta, su una riga
    return (
      <div className="group flex items-start gap-2.5">
        <dt className="mt-[3px] shrink-0 text-inchiostro-2" title={voce}>
          <Icona aria-hidden className="size-4" strokeWidth={1.7} />
          <span className="sr-only">{voce}</span>
        </dt>
        <dd className={cn(testo, "flex-1")}>{valore ?? `${voce} —`}</dd>
        {pulsante}
      </div>
    );
  }
  if (riga) {
    return (
      <div className="group flex items-center gap-2">
        <dt className="w-[5.25rem] shrink-0 text-[0.8125rem] text-inchiostro-2">{voce}</dt>
        <dd className={cn(testo, "flex-1")}>{mostrato}</dd>
        {pulsante}
      </div>
    );
  }
  return (
    <div className="group min-w-0">
      <dt className="text-[0.75rem] text-inchiostro-2">{voce}</dt>
      <dd className="mt-0.5 flex items-start gap-1.5">
        <span className={cn(testo, "flex-1")}>{mostrato}</span>
        {pulsante}
      </dd>
    </div>
  );
}

export function GruppoPratiche({
  titolo,
  colore,
  pratiche,
  vuoto,
  importo,
}: {
  titolo: string;
  colore: string;
  pratiche: PraticaCliente[];
  vuoto: string;
  importo: string;
}) {
  // All'apertura della scheda i gruppi sono chiusi: si vedono titolo e quantità, si espandono al clic
  const [aperto, setAperto] = useState(false);
  return (
    <section className="rounded-[14px] bg-superficie-2/80">
      <button type="button" onClick={() => setAperto(!aperto)} aria-expanded={aperto} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left">
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="size-2 rounded-full" style={{ background: colore }} />
          <span className="text-[0.9375rem] font-medium text-inchiostro">{titolo}</span>
        </span>
        <span className="flex items-center gap-2 text-inchiostro-2">
          <span className="numeri text-[0.875rem]">{pratiche.length}</span>
          <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-200", aperto && "rotate-180")} strokeWidth={1.8} />
        </span>
      </button>
      {!aperto ? null : pratiche.length === 0 ? (
        <p className="px-4 pb-4 text-[0.875rem] text-inchiostro-2">{vuoto}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 px-2 pb-2">
          <li aria-hidden className="flex justify-end px-3 text-[0.6875rem] uppercase tracking-[0.12em] text-tenue">
            {importo}
          </li>
          {pratiche.map((p) => (
            <li key={p.id}>
              <Link
                href={p.href}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-[10px] bg-superficie px-3.5 py-2.5 shadow-[0_1px_2px_rgba(20,30,50,0.06)] transition-shadow hover:shadow-[0_4px_14px_-6px_rgba(20,30,50,0.25)]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[0.9375rem] text-inchiostro">
                    {p.sigla ? <span className="numeri text-inchiostro-2">{p.sigla} · </span> : null}
                    {p.titolo}
                  </span>
                  <span className="block truncate text-[0.8125rem] text-inchiostro-2">
                    <span style={{ color: p.colore }}>{p.statoEtichetta}</span>
                    {[p.data ? formattaData(p.data) : null, p.luogo].filter(Boolean).map((x) => ` · ${x}`)}
                  </span>
                </span>
                <span className="numeri text-right text-[0.9375rem] text-inchiostro">{p.importo != null ? formattaEuro(p.importo) : <span className="text-tenue">—</span>}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Navigazione tra le sezioni della carta di destra: schede sottolineate, con la chiusura a destra. */
export function SchedeSezioni<T extends string>({
  sezioni,
  scelta,
  onScegli,
  chiudi,
}: {
  sezioni: readonly (readonly [T, string, number | null])[];
  scelta: T;
  onScegli: (v: T) => void;
  chiudi: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-linea px-6 pt-4 lg:px-8">
      <div role="tablist" aria-label="Sezioni" className="-mb-px flex gap-7 overflow-x-auto">
        {sezioni.map(([valore, etichetta, numero]) => (
          <button
            key={valore}
            type="button"
            role="tab"
            aria-selected={scelta === valore}
            onClick={() => onScegli(valore)}
            className={cn(
              "flex shrink-0 items-baseline gap-1.5 border-b-2 pb-3 pt-3 text-[0.9375rem] transition-colors",
              scelta === valore ? "border-inchiostro font-medium text-inchiostro" : "border-transparent text-inchiostro-2 hover:text-inchiostro",
            )}
          >
            {etichetta}
            {numero ? <span className="numeri text-[0.8125rem] font-normal text-tenue">{numero}</span> : null}
          </button>
        ))}
      </div>
      <span className="hidden pb-1.5 lg:block">{chiudi}</span>
    </div>
  );
}

/** Pulsante d'azione quadrato della carta dell'identità (scrivi, chiama, mappa…); spento se manca il dato. */
export const classeAzione = "grid h-10 place-items-center rounded-[10px] bg-superficie-2 text-inchiostro transition-colors hover:bg-linea";

/** Da dove si è arrivati a una scheda (parametro ?da=…): serve per la freccia "torna indietro". */
const PROVENIENZE: Record<string, string> = {
  cliente: "Torna al cliente",
  immobile: "Torna all'immobile",
};

/**
 * Freccia per tornare alla scheda da cui si è arrivati (es. dal cliente all'immobile).
 * Compare solo se l'indirizzo dice da dove si viene; torna indietro nella cronologia.
 */
export function Indietro() {
  const router = useRouter();
  const da = useSearchParams().get("da");
  const etichetta = da ? PROVENIENZE[da] : null;
  if (!etichetta) return null;
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => router.back()}
        className="-ml-1.5 inline-flex h-8 items-center gap-1.5 rounded-full pl-1.5 pr-3 text-[0.8125rem] text-inchiostro-2 transition-colors hover:bg-superficie-2 hover:text-inchiostro"
      >
        <ArrowLeft className="size-4" strokeWidth={1.8} />
        {etichetta}
      </button>
    </div>
  );
}
