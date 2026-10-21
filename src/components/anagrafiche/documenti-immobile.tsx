"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ChevronRight, FileImage, FileText, Folder, FolderOpen, Loader2, Search, Trash2, Upload, X } from "lucide-react";
import { Messaggio } from "@/components/campo";
import { CATEGORIE_DOCUMENTO, apriDocumento, caricaAllegati, dimensione, eliminaAllegato } from "@/components/schede/allegati-fase";
import type { DocumentoImmobile } from "@/lib/anagrafiche";
import { cn, formattaData } from "@/lib/utils";

type Nodo = { id: string; nome: string; dettaglio?: string; href?: string; documenti: DocumentoImmobile[]; figli: Nodo[] };

/** Raggruppa i documenti: prima quelli dell'immobile, poi una cartella per commessa con le sue fasi. */
function albero(documenti: DocumentoImmobile[]): Nodo[] {
  const propri: Nodo = { id: "immobile", nome: "Documenti dell'immobile", documenti: documenti.filter((d) => !d.commessa), figli: [] };
  const commesse = new Map<string, Nodo>();
  for (const d of documenti) {
    if (!d.commessa) continue;
    let c = commesse.get(d.commessa.id);
    if (!c) {
      c = { id: d.commessa.id, nome: `Commessa ${d.commessa.codice ?? ""}`.trim(), dettaglio: d.commessa.titolo, href: `/commesse/${d.commessa.id}`, documenti: [], figli: [] };
      commesse.set(d.commessa.id, c);
    }
    const idFase = d.fase ? `${c.id}/${d.fase.id}` : `${c.id}/generali`;
    let f = c.figli.find((x) => x.id === idFase);
    if (!f) {
      f = { id: idFase, nome: d.fase ? [d.fase.codice, d.fase.nome].filter(Boolean).join(" · ") : "Documenti generali", documenti: [], figli: [] };
      c.figli.push(f);
    }
    f.documenti.push(d);
  }
  // Nelle commesse i documenti generali vanno in fondo
  for (const c of commesse.values()) c.figli.sort((a, b) => Number(a.id.endsWith("/generali")) - Number(b.id.endsWith("/generali")));
  return [propri, ...commesse.values()];
}

const conta = (n: Nodo): number => n.documenti.length + n.figli.reduce((s, f) => s + conta(f), 0);

/**
 * Documenti dell'immobile come cartelle: "Documenti dell'immobile" (caricati qui, senza commessa)
 * e una cartella per ogni commessa con le sue fasi, così si vede da dove arriva ogni file.
 * Si cerca per nome, categoria o commessa; i risultati aprono da soli le cartelle che li contengono.
 */
export function DocumentiImmobile({
  immobileId,
  documenti,
  caricabili,
  eliminabili,
  attivi,
}: {
  immobileId: string;
  documenti: DocumentoImmobile[];
  caricabili: boolean;
  eliminabili: boolean;
  /** false se il database non è ancora pronto per i documenti dell'immobile */
  attivi: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [cerca, setCerca] = useState("");
  const [aperte, setAperte] = useState<Set<string>>(() => new Set(["immobile"]));
  const [categoria, setCategoria] = useState("elaborato_grafico");
  const [caricamento, setCaricamento] = useState<{ fatti: number; totali: number } | null>(null);
  const [sopra, setSopra] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  const termine = cerca.trim().toLowerCase();
  const corrisponde = (d: DocumentoImmobile) =>
    !termine ||
    [d.nome_file, d.titolo, CATEGORIE_DOCUMENTO[d.categoria], d.commessa?.codice, d.commessa?.titolo, d.fase?.nome]
      .filter(Boolean)
      .some((t) => t!.toLowerCase().includes(termine));
  const filtrati = documenti.filter(corrisponde);
  const radici = albero(filtrati).filter((n) => n.id === "immobile" || conta(n) > 0);
  const aperta = (id: string) => (termine ? true : aperte.has(id));

  function alterna(id: string) {
    setAperte((a) => {
      const n = new Set(a);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function carica(files: FileList | null) {
    if (!files?.length) return;
    setErrore(null);
    const esito = await caricaAllegati(null, null, Array.from(files), categoria, (fatti, totali) => setCaricamento({ fatti, totali }), immobileId);
    setCaricamento(null);
    if (input.current) input.current.value = "";
    if (esito) setErrore(esito);
    setAperte((a) => new Set(a).add("immobile"));
    router.refresh();
  }

  // Righe dell'albero come funzioni (non componenti), così non si rimontano a ogni modifica
  function file(d: DocumentoImmobile, livello: number) {
    const Icona = d.mime_type?.startsWith("image/") ? FileImage : FileText;
    return (
      <li key={d.id} className="group flex items-center gap-2.5 rounded-[10px] py-1.5 pr-2 hover:bg-superficie-2/70" style={{ paddingLeft: `${livello * 1.25 + 0.5}rem` }}>
        <Icona aria-hidden className="size-4 shrink-0 text-tenue" strokeWidth={1.6} />
        <button
          type="button"
          onClick={() => apriDocumento(d.storage_path, () => setErrore("Non è stato possibile aprire il file."))}
          className="min-w-0 flex-1 text-left"
          data-suggerimento="Apri il file"
        >
          <span className="block truncate text-[0.9375rem] hover:text-accento">{d.nome_file}</span>
          <span className="block truncate text-[0.75rem] text-tenue">
            {[CATEGORIE_DOCUMENTO[d.categoria] ?? d.categoria, dimensione(d.dimensione_byte), formattaData(d.data)].filter(Boolean).join(" · ")}
          </span>
        </button>
        {eliminabili && !d.commessa ? (
          <button
            type="button"
            aria-label={`Elimina ${d.nome_file}`}
            disabled={inCorso}
            onClick={() =>
              avvia(async () => {
                if (!(await eliminaAllegato(d))) setErrore("Il tuo profilo non può eliminare questo documento.");
                router.refresh();
              })
            }
            className="grid size-7 shrink-0 place-items-center rounded-full text-tenue opacity-0 transition hover:bg-superficie hover:text-inchiostro group-hover:opacity-100"
          >
            <Trash2 className="size-3.5" strokeWidth={1.8} />
          </button>
        ) : null}
      </li>
    );
  }

  function cartella(n: Nodo, livello: number): ReactNode {
    const totale = conta(n);
    const aperto = aperta(n.id) && totale > 0;
    const Icona = aperto ? FolderOpen : Folder;
    return (
      <li key={n.id}>
        <div className="flex items-center gap-1 rounded-[10px] pr-2 hover:bg-superficie-2/70" style={{ paddingLeft: `${livello * 1.25}rem` }}>
          <button type="button" onClick={() => totale && alterna(n.id)} aria-expanded={aperto} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left">
            <ChevronRight className={cn("size-3.5 shrink-0 text-tenue transition-transform", aperto && "rotate-90", !totale && "opacity-0")} strokeWidth={2} />
            <Icona aria-hidden className="size-[18px] shrink-0 text-inchiostro-2" strokeWidth={1.5} />
            <span className="min-w-0 truncate text-[0.9375rem] font-medium">
              {n.nome}
              {n.dettaglio ? <span className="font-normal text-tenue"> · {n.dettaglio}</span> : null}
            </span>
            <span className="numeri ml-auto shrink-0 pl-2 text-[0.8125rem] text-tenue">{totale}</span>
          </button>
          {n.href ? (
            <Link href={n.href} aria-label={`Apri ${n.nome}`} data-suggerimento="Apri la commessa" className="grid size-7 shrink-0 place-items-center rounded-full text-tenue hover:bg-superficie hover:text-inchiostro">
              <ArrowUpRight className="size-3.5" strokeWidth={1.9} />
            </Link>
          ) : null}
        </div>
        {aperto ? (
          <ul className="relative">
            <span aria-hidden className="absolute bottom-2 top-0 w-px bg-linea" style={{ left: `${livello * 1.25 + 0.95}rem` }} />
            {n.figli.map((f) => cartella(f, livello + 1))}
            {n.documenti.map((d) => file(d, livello + 1))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Ricerca */}
      <label className="relative block">
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-tenue" strokeWidth={1.8} />
        <input
          type="search"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
          placeholder="Cerca"
          aria-label="Cerca tra i documenti"
          className="h-10 w-full rounded-medio border border-linea-forte bg-superficie pl-10 pr-9 text-[0.9375rem] outline-none focus:border-accento focus:ring-2 focus:ring-accento/20 [&::-webkit-search-cancel-button]:hidden"
        />
        {cerca ? (
          <button type="button" onClick={() => setCerca("")} aria-label="Cancella la ricerca" className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-tenue hover:text-inchiostro">
            <X className="size-3.5" strokeWidth={2} />
          </button>
        ) : null}
      </label>

      {/* Caricamento sull'immobile, senza commessa */}
      {caricabili ? (
        <div
          className={cn("flex flex-wrap items-center gap-2 rounded-medio border border-dashed p-2 transition-colors", sopra ? "border-accento bg-accento/5" : "border-linea")}
          onDragOver={(e) => {
            e.preventDefault();
            setSopra(true);
          }}
          onDragLeave={() => setSopra(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSopra(false);
            carica(e.dataTransfer.files);
          }}
        >
          <select
            aria-label="Categoria dei file"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="h-9 rounded-medio border border-linea-forte bg-superficie px-2.5 text-sm"
          >
            {Object.entries(CATEGORIE_DOCUMENTO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input ref={input} type="file" multiple className="sr-only" id={`file-immobile-${immobileId}`} onChange={(e) => carica(e.target.files)} />
          <label
            htmlFor={`file-immobile-${immobileId}`}
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-2 rounded-medio border border-linea-forte bg-superficie px-3.5 text-[0.875rem] font-medium transition-colors hover:bg-superficie-2",
              caricamento && "pointer-events-none opacity-60",
            )}
          >
            {caricamento ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" strokeWidth={1.8} />}
            {caricamento ? `Caricamento ${caricamento.fatti}/${caricamento.totali}…` : "Carica sull'immobile"}
          </label>
          <span className="text-sm text-tenue">o trascina qui i file</span>
        </div>
      ) : !attivi ? (
        <p className="text-[0.8125rem] text-tenue">Per caricare documenti sull&apos;immobile va aggiornato il database (file documenti_immobile.sql).</p>
      ) : null}

      {/* Cartelle */}
      {termine && !filtrati.length ? (
        <p className="text-[0.9375rem] text-tenue">Nessun documento corrisponde alla ricerca.</p>
      ) : (
        <ul className="-mx-1">
          {radici.map((n) => cartella(n, 0))}
        </ul>
      )}
      {!documenti.length && !caricabili ? (
        <p className="text-[0.9375rem] text-tenue">Nessun documento: compaiono qui quelli delle commesse su questo immobile.</p>
      ) : null}

      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
    </div>
  );
}
