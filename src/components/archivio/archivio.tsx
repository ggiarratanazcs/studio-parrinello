"use client";

import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ChevronRight,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  Folders,
  Images,
  List,
  Loader2,
  Paperclip,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Messaggio } from "@/components/campo";
import { Tendina } from "@/components/scelta";
import { PulsanteAllegato } from "@/components/schede/carica-apribile";
import { CATEGORIE_DOCUMENTO, apriDocumento, caricaAllegati, dimensione, eliminaAllegato } from "@/components/schede/allegati-fase";
import type { DatiArchivio, DocumentoArchivio } from "@/lib/archivio";
import { cn, formattaData } from "@/lib/utils";

type Vista = "cartelle" | "elenco" | "foto";

/** Dove finiscono i file caricati da una cartella dell'archivio. */
type Destinazione = {
  chiave: string;
  nome: string;
  commessaId: string | null;
  faseId: string | null;
  immobileId?: string;
  /** studio e immobili seguono l'area Archivio, le commesse il permesso Allegati */
  ambito: "archivio" | "commessa";
};

type Nodo = {
  id: string;
  nome: string;
  dettaglio?: string;
  href?: string;
  documenti: DocumentoArchivio[];
  figli: Nodo[];
  destinazione?: Destinazione;
};

const STUDIO: Destinazione = { chiave: "studio", nome: "Studio", commessaId: null, faseId: null, ambito: "archivio" };

const PERIODI = [
  { valore: "sempre", etichetta: "Sempre", giorni: 0 },
  { valore: "7", etichetta: "Ultimi 7 giorni", giorni: 7 },
  { valore: "30", etichetta: "Ultimi 30 giorni", giorni: 30 },
  { valore: "365", etichetta: "Ultimo anno", giorni: 365 },
];

const VISTE: { valore: Vista; etichetta: string; icona: typeof Folders }[] = [
  { valore: "cartelle", etichetta: "Cartelle", icona: Folders },
  { valore: "elenco", etichetta: "Elenco", icona: List },
  { valore: "foto", etichetta: "Foto", icona: Images },
];

const confronta = (a: string, b: string) => a.localeCompare(b, "it", { numeric: true, sensitivity: "base" });
const conta = (n: Nodo): number => n.documenti.length + n.figli.reduce((s, f) => s + conta(f), 0);
const eFoto = (d: DocumentoArchivio) => !!d.mime_type?.startsWith("image/");
const nomeFase = (f: { codice: string | null; nome: string }) => [f.codice, f.nome].filter(Boolean).join(" · ");

/** Tre rami: Commesse › commessa › fase (o documenti generali), Immobili › immobile, Studio. */
function albero(documenti: DocumentoArchivio[]): Nodo[] {
  const commesse = new Map<string, Nodo>();
  const immobili = new Map<string, Nodo>();
  const studio: Nodo = { id: "studio", nome: "Studio", dettaglio: "modelli, normative, moduli", documenti: [], figli: [], destinazione: { ...STUDIO, chiave: "studio-albero" } };

  for (const d of documenti) {
    if (d.commessa) {
      const cid = d.commessa.id;
      let c = commesse.get(cid);
      if (!c) {
        c = {
          id: `c:${cid}`,
          nome: d.commessa.codice || "Commessa",
          dettaglio: d.commessa.titolo,
          href: `/commesse/${cid}`,
          documenti: [],
          figli: [],
          destinazione: { chiave: `c:${cid}`, nome: `${d.commessa.codice ?? "Commessa"} · Documenti generali`, commessaId: cid, faseId: null, ambito: "commessa" },
        };
        commesse.set(cid, c);
      }
      const idFase = d.fase ? `c:${cid}/f:${d.fase.id}` : `c:${cid}/g`;
      let f = c.figli.find((x) => x.id === idFase);
      if (!f) {
        f = {
          id: idFase,
          nome: d.fase ? nomeFase(d.fase) : "Documenti generali",
          documenti: [],
          figli: [],
          destinazione: {
            chiave: idFase,
            nome: `${d.commessa.codice ?? "Commessa"} · ${d.fase ? nomeFase(d.fase) : "Documenti generali"}`,
            commessaId: cid,
            faseId: d.fase?.id ?? null,
            ambito: "commessa",
          },
        };
        c.figli.push(f);
      }
      f.documenti.push(d);
    } else if (d.immobile) {
      let i = immobili.get(d.immobile.id);
      if (!i) {
        i = {
          id: `i:${d.immobile.id}`,
          nome: d.immobile.nome,
          href: `/immobili/${d.immobile.id}`,
          documenti: [],
          figli: [],
          destinazione: { chiave: `i:${d.immobile.id}`, nome: d.immobile.nome, commessaId: null, faseId: null, immobileId: d.immobile.id, ambito: "archivio" },
        };
        immobili.set(d.immobile.id, i);
      }
      i.documenti.push(d);
    } else {
      studio.documenti.push(d);
    }
  }

  // Fasi nell'ordine della commessa, i documenti generali in fondo; commesse dalla più recente
  const ordineFase = (n: Nodo) => (n.id.endsWith("/g") ? Number.MAX_SAFE_INTEGER : (n.documenti[0]?.fase?.ordine ?? 0));
  for (const c of commesse.values()) c.figli.sort((a, b) => ordineFase(a) - ordineFase(b));

  return [
    { id: "commesse", nome: "Commesse", documenti: [], figli: [...commesse.values()].sort((a, b) => confronta(b.nome, a.nome)) },
    { id: "immobili", nome: "Immobili", documenti: [], figli: [...immobili.values()].sort((a, b) => confronta(a.nome, b.nome)) },
    studio,
  ];
}

/** Provenienza in breve, come testo. */
function testoOrigine(d: DocumentoArchivio) {
  if (d.commessa) return `${d.commessa.codice ?? "Commessa"} › ${d.fase ? d.fase.codice || d.fase.nome : "Generali"}`;
  return d.immobile ? d.immobile.nome : "Studio";
}

/** Da dove viene il documento: commessa › fase, immobile o studio. */
function Origine({ d, className }: { d: DocumentoArchivio; className?: string }) {
  if (d.commessa) {
    return (
      <Link href={`/commesse/${d.commessa.id}`} className={cn("truncate hover:text-accento", className)} data-suggerimento={d.commessa.titolo}>
        {d.commessa.codice ?? "Commessa"} › {d.fase ? d.fase.codice || d.fase.nome : "Generali"}
      </Link>
    );
  }
  if (d.immobile) {
    return (
      <Link href={`/immobili/${d.immobile.id}`} className={cn("truncate hover:text-accento", className)}>
        {d.immobile.nome}
      </Link>
    );
  }
  return <span className={cn("truncate", className)}>Studio</span>;
}

/** Zona di caricamento: categoria, scelta dei file o trascinamento. */
function ZonaCaricamento({ destinazione, onFatto, onChiudi }: { destinazione: Destinazione; onFatto: () => void; onChiudi: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState(!destinazione.commessaId && !destinazione.immobileId ? "altro" : "elaborato_grafico");
  const [caricamento, setCaricamento] = useState<{ fatti: number; totali: number } | null>(null);
  const [sopra, setSopra] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function carica(files: FileList | null) {
    if (!files?.length) return;
    setErrore(null);
    const esito = await caricaAllegati(
      destinazione.commessaId,
      destinazione.faseId,
      Array.from(files),
      categoria,
      (fatti, totali) => setCaricamento({ fatti, totali }),
      destinazione.immobileId,
    );
    setCaricamento(null);
    if (input.current) input.current.value = "";
    if (esito) {
      setErrore(!destinazione.commessaId && !destinazione.immobileId ? `${esito} Se il problema continua va aggiornato il database (file archivio.sql).` : esito);
    }
    onFatto();
  }

  const id = `file-archivio-${destinazione.chiave.replace(/[^a-z0-9]/gi, "-")}`;
  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-medio border border-dashed p-2 transition-colors",
          sopra ? "border-accento bg-accento/5" : "border-linea",
        )}
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
        <span className="flex min-w-0 items-center gap-1.5 px-1 text-[0.8125rem] text-tenue">
          <Paperclip aria-hidden className="size-3.5 shrink-0" strokeWidth={1.8} />
          <span className="truncate">
            In <span className="text-inchiostro-2">{destinazione.nome}</span>
          </span>
        </span>
        <div className="w-44">
          <Tendina
            etichetta="Categoria dei file"
            valore={categoria}
            onCambia={setCategoria}
            opzioni={Object.entries(CATEGORIE_DOCUMENTO).map(([valore, etichetta]) => ({ valore, etichetta }))}
            variante="compatta"
          />
        </div>
        <input ref={input} type="file" multiple className="sr-only" id={id} onChange={(e) => carica(e.target.files)} />
        <label
          htmlFor={id}
          className={cn(
            "inline-flex h-9 cursor-pointer items-center gap-2 rounded-medio border border-linea-forte bg-superficie px-3.5 text-[0.875rem] font-medium transition-colors hover:bg-superficie-2",
            caricamento && "pointer-events-none opacity-60",
          )}
        >
          {caricamento ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" strokeWidth={1.8} />}
          {caricamento ? `Caricamento ${caricamento.fatti}/${caricamento.totali}…` : "Scegli i file"}
        </label>
        <span className="hidden text-sm text-tenue sm:inline">o trascina qui</span>
        <button
          type="button"
          onClick={onChiudi}
          aria-label="Chiudi il caricamento"
          className="ml-auto grid size-7 place-items-center rounded-full text-tenue hover:bg-superficie-2 hover:text-inchiostro"
        >
          <X className="size-3.5" strokeWidth={2} />
        </button>
      </div>
      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
    </div>
  );
}

/**
 * Archivio dello studio: tutti i documenti visibili all'utente, da cercare e filtrare,
 * in tre viste — cartelle (commessa › fase, immobile, studio), elenco e foto.
 * Le cartelle partono sempre chiuse; con una ricerca o un filtro si aprono da sole.
 */
export function Archivio({ documenti, caricabili, caricabiliCommesse, eliminabili }: DatiArchivio) {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>("cartelle");
  const [cerca, setCerca] = useState("");
  const [categoria, setCategoria] = useState("tutte");
  const [periodo, setPeriodo] = useState("sempre");
  const [aperte, setAperte] = useState<Set<string>>(() => new Set());
  const [destinazione, setDestinazione] = useState<Destinazione | null>(null);
  const [daEliminare, setDaEliminare] = useState<string | null>(null);
  const [quanti, setQuanti] = useState(150);
  // Inizio del periodo scelto (0 = sempre), calcolato quando si sceglie il periodo
  const [dal, setDal] = useState(0);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  const termine = cerca.trim().toLowerCase();
  const giorni = PERIODI.find((p) => p.valore === periodo)?.giorni ?? 0;
  const filtroAttivo = !!termine || categoria !== "tutte" || giorni > 0;

  const filtrati = useMemo(() => {
    return documenti.filter((d) => {
      if (categoria !== "tutte" && d.categoria !== categoria) return false;
      if (dal && new Date(d.data).getTime() < dal) return false;
      if (!termine) return true;
      return [
        d.nome_file,
        d.titolo,
        CATEGORIE_DOCUMENTO[d.categoria],
        d.commessa?.codice,
        d.commessa?.titolo,
        d.fase?.nome,
        d.fase?.codice,
        d.immobile?.nome,
        d.caricatoDa,
        !d.commessa && !d.immobile ? "studio" : null,
      ]
        .filter(Boolean)
        .some((t) => t!.toLowerCase().includes(termine));
    });
  }, [documenti, categoria, dal, termine]);

  const categorie = useMemo(
    () => Object.keys(CATEGORIE_DOCUMENTO).filter((k) => documenti.some((d) => d.categoria === k)),
    [documenti],
  );
  const radici = useMemo(() => albero(filtrati), [filtrati]);
  const foto = useMemo(() => filtrati.filter(eFoto), [filtrati]);

  const puoCaricare = (dest?: Destinazione) => !!dest && (dest.ambito === "commessa" ? caricabiliCommesse : caricabili);
  const aperta = (id: string) => filtroAttivo || aperte.has(id);

  function scegliPeriodo(valore: string) {
    const g = PERIODI.find((p) => p.valore === valore)?.giorni ?? 0;
    setPeriodo(valore);
    setDal(g ? Date.now() - g * 86_400_000 : 0);
  }

  function alterna(id: string) {
    setAperte((a) => {
      const n = new Set(a);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function apri(d: DocumentoArchivio) {
    setErrore(null);
    apriDocumento(d.storage_path, () => setErrore("Non è stato possibile aprire il file."));
  }

  function caricaIn(dest: Destinazione, idCartella?: string) {
    setDestinazione((attuale) => (attuale?.chiave === dest.chiave ? null : dest));
    if (idCartella) setAperte((a) => new Set(a).add(idCartella));
  }

  function elimina(d: DocumentoArchivio) {
    if (daEliminare !== d.id) {
      setDaEliminare(d.id);
      return;
    }
    avvia(async () => {
      setDaEliminare(null);
      if (!(await eliminaAllegato(d))) setErrore("Il tuo profilo non può eliminare questo documento.");
      router.refresh();
    });
  }

  function cestino(d: DocumentoArchivio, sempreVisibile = false) {
    if (!eliminabili) return null;
    const conferma = daEliminare === d.id;
    return (
      <button
        type="button"
        aria-label={conferma ? `Conferma l'eliminazione di ${d.nome_file}` : `Elimina ${d.nome_file}`}
        disabled={inCorso}
        onClick={() => elimina(d)}
        onBlur={() => conferma && setDaEliminare(null)}
        className={cn(
          "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-full text-[0.75rem] transition",
          conferma ? "bg-[#a4472f] px-2.5 text-white" : "w-7 text-tenue hover:bg-superficie hover:text-inchiostro",
          !conferma && !sempreVisibile && "md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100",
        )}
      >
        {conferma ? "Elimina" : <Trash2 className="size-3.5" strokeWidth={1.8} />}
      </button>
    );
  }

  // ── Vista Cartelle ─────────────────────────────────────────────
  function rigaFile(d: DocumentoArchivio, livello: number) {
    const Icona = eFoto(d) ? FileImage : FileText;
    return (
      <li key={d.id} className="group flex items-center gap-2.5 rounded-[10px] py-1.5 pr-2 hover:bg-superficie-2/70" style={{ paddingLeft: `${livello * 1.25 + 0.5}rem` }}>
        <Icona aria-hidden className="size-4 shrink-0 text-tenue" strokeWidth={1.6} />
        <button type="button" onClick={() => apri(d)} className="min-w-0 flex-1 text-left" data-suggerimento="Apri il file">
          <span className="block truncate text-[0.9375rem] hover:text-accento">{d.nome_file}</span>
          <span className="block truncate text-[0.75rem] text-tenue">
            {[CATEGORIE_DOCUMENTO[d.categoria] ?? d.categoria, dimensione(d.dimensione_byte), formattaData(d.data), d.caricatoDa].filter(Boolean).join(" · ")}
          </span>
        </button>
        {cestino(d)}
      </li>
    );
  }

  function cartella(n: Nodo, livello: number): ReactNode {
    const totale = conta(n);
    const vuota = totale === 0;
    const aperto = aperta(n.id) && !vuota;
    const Icona = aperto ? FolderOpen : Folder;
    const caricaQui = puoCaricare(n.destinazione) && !filtroAttivo;
    const inCaricamento = destinazione && n.destinazione && destinazione.chiave === n.destinazione.chiave;
    return (
      <li key={n.id}>
        <div className="group flex items-center gap-1 rounded-[10px] pr-2 hover:bg-superficie-2/70" style={{ paddingLeft: `${livello * 1.25}rem` }}>
          <button
            type="button"
            onClick={() => !vuota && alterna(n.id)}
            aria-expanded={vuota ? undefined : aperto}
            className={cn("flex min-w-0 flex-1 items-center gap-2 py-2 text-left", vuota && "cursor-default")}
          >
            <ChevronRight className={cn("size-3.5 shrink-0 text-tenue transition-transform", aperto && "rotate-90", vuota && "invisible")} strokeWidth={2} />
            <Icona
              aria-hidden
              className={cn("size-[18px] shrink-0", vuota ? "text-tenue/60" : "text-accento")}
              strokeWidth={1.6}
              fill={vuota ? "none" : "currentColor"}
              fillOpacity={0.14}
            />
            <span className={cn("min-w-0 truncate text-[0.9375rem]", livello === 0 ? "font-medium" : "", vuota && "text-tenue")}>
              {n.nome}
              {n.dettaglio ? <span className="font-normal text-tenue"> · {n.dettaglio}</span> : null}
            </span>
            <span className="numeri ml-auto shrink-0 pl-2 text-[0.8125rem] text-tenue">{vuota ? "vuota" : totale}</span>
          </button>
          {caricaQui ? (
            <button
              type="button"
              onClick={() => caricaIn(n.destinazione!, n.id)}
              aria-label={`Aggiungi file in ${n.nome}`}
              data-suggerimento="Aggiungi file qui"
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-tenue transition hover:bg-superficie hover:text-inchiostro",
                inCaricamento ? "bg-superficie text-inchiostro" : "md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100",
              )}
            >
              <Paperclip className="size-3.5" strokeWidth={1.8} />
            </button>
          ) : caricabili || caricabiliCommesse ? (
            <span aria-hidden className="size-7 shrink-0" />
          ) : null}
          {n.href ? (
            <Link
              href={n.href}
              aria-label={`Apri ${n.nome}`}
              data-suggerimento={n.href.startsWith("/commesse") ? "Apri la commessa" : "Apri l'immobile"}
              className="grid size-7 shrink-0 place-items-center rounded-full text-tenue hover:bg-superficie hover:text-inchiostro"
            >
              <ArrowUpRight className="size-3.5" strokeWidth={1.9} />
            </Link>
          ) : (
            <span aria-hidden className="size-7 shrink-0" />
          )}
        </div>
        {inCaricamento ? (
          <div className="py-1.5 pr-1" style={{ paddingLeft: `${livello * 1.25 + 1.6}rem` }}>
            <ZonaCaricamento destinazione={destinazione!} onFatto={() => router.refresh()} onChiudi={() => setDestinazione(null)} />
          </div>
        ) : null}
        {aperto ? (
          <ul className="relative">
            <span aria-hidden className="absolute bottom-2 top-0 w-px bg-linea" style={{ left: `${livello * 1.25 + 0.95}rem` }} />
            {n.figli.map((f) => cartella(f, livello + 1))}
            {n.documenti.map((d) => rigaFile(d, livello + 1))}
          </ul>
        ) : null}
      </li>
    );
  }

  // ── Vista Elenco ───────────────────────────────────────────────
  const colonne = "md:grid md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.5fr)_minmax(0,1fr)_5.5rem_4.5rem_2rem] md:items-center md:gap-4";
  function elenco() {
    const visibili = filtrati.slice(0, quanti);
    return (
      <div>
        <div className={cn("hidden border-b border-linea px-3 pb-2 text-[0.75rem] uppercase tracking-[0.12em] text-tenue", colonne)}>
          <span>File</span>
          <span>Da dove</span>
          <span>Caricato da</span>
          <span>Data</span>
          <span className="text-right">Peso</span>
          <span />
        </div>
        <ul>
          {visibili.map((d) => {
            const Icona = eFoto(d) ? FileImage : FileText;
            return (
              <li key={d.id} className={cn("group flex items-center gap-3 border-b border-linea/70 px-3 py-2.5 last:border-b-0 hover:bg-superficie-2/60", colonne)}>
                <button type="button" onClick={() => apri(d)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" data-suggerimento="Apri il file">
                  <Icona aria-hidden className="size-4 shrink-0 text-tenue" strokeWidth={1.6} />
                  <span className="min-w-0">
                    <span className="block truncate text-[0.9375rem] hover:text-accento">{d.nome_file}</span>
                    <span className="block truncate text-[0.75rem] text-tenue">
                      <span className="hidden md:inline">{CATEGORIE_DOCUMENTO[d.categoria] ?? d.categoria}</span>
                      <span className="md:hidden">
                        {testoOrigine(d)} · {formattaData(d.data)}
                      </span>
                    </span>
                  </span>
                </button>
                <Origine d={d} className="hidden text-[0.875rem] text-inchiostro-2 md:block" />
                <span className="hidden truncate text-[0.875rem] text-tenue md:block">{d.caricatoDa ?? "—"}</span>
                <span className="numeri hidden text-[0.875rem] text-tenue md:block">{formattaData(d.data)}</span>
                <span className="numeri hidden text-right text-[0.8125rem] text-tenue md:block">{dimensione(d.dimensione_byte)}</span>
                <span className="flex justify-end">{cestino(d)}</span>
              </li>
            );
          })}
        </ul>
        {filtrati.length > quanti ? (
          <div className="flex justify-center pt-4">
            <button type="button" onClick={() => setQuanti((q) => q + 150)} className="rounded-full border border-linea-forte px-4 py-1.5 text-sm hover:bg-superficie-2">
              Mostra altri ({filtrati.length - quanti})
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  // ── Vista Foto ─────────────────────────────────────────────────
  function galleria() {
    if (!foto.length) return <p className="px-2 py-6 text-[0.9375rem] text-tenue">Nessuna foto{filtroAttivo ? " con questi filtri" : " in archivio"}.</p>;
    const visibili = foto.slice(0, quanti);
    return (
      <div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visibili.map((d) => (
            <li key={d.id} className="group min-w-0">
              <button
                type="button"
                onClick={() => apri(d)}
                className="relative block aspect-square w-full overflow-hidden rounded-medio border border-linea bg-superficie-2"
                aria-label={`Apri ${d.nome_file}`}
              >
                {d.miniatura ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.miniatura} alt="" loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                ) : (
                  <FileImage aria-hidden className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 text-tenue" strokeWidth={1.4} />
                )}
              </button>
              <div className="mt-1.5 flex items-start gap-1">
                <div className="min-w-0 flex-1">
                  <Origine d={d} className="block text-[0.8125rem] text-inchiostro-2" />
                  <span className="numeri block text-[0.75rem] text-tenue">{formattaData(d.data)}</span>
                </div>
                {cestino(d)}
              </div>
            </li>
          ))}
        </ul>
        {foto.length > quanti ? (
          <div className="flex justify-center pt-5">
            <button type="button" onClick={() => setQuanti((q) => q + 150)} className="rounded-full border border-linea-forte px-4 py-1.5 text-sm hover:bg-superficie-2">
              Mostra altre ({foto.length - quanti})
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  const radiciVisibili = filtroAttivo ? radici.filter((n) => conta(n) > 0) : radici;
  const nessunRisultato = filtroAttivo && !filtrati.length;
  const destinazioneStudio = destinazione?.chiave === "studio";

  return (
    <div className="flex flex-col gap-4">
      {/* Ricerca, viste e caricamento */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative block min-w-0 flex-1 basis-56">
          <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-tenue" strokeWidth={1.8} />
          <input
            type="search"
            value={cerca}
            onChange={(e) => setCerca(e.target.value)}
            placeholder="Cerca"
            aria-label="Cerca nell'archivio"
            className="h-10 w-full rounded-medio border border-linea-forte bg-superficie pl-10 pr-9 text-[0.9375rem] outline-none focus:border-accento focus:ring-2 focus:ring-accento/20 [&::-webkit-search-cancel-button]:hidden"
          />
          {cerca ? (
            <button
              type="button"
              onClick={() => setCerca("")}
              aria-label="Cancella la ricerca"
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-tenue hover:text-inchiostro"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          ) : null}
        </label>
        <div role="tablist" aria-label="Vista" className="flex h-10 items-center rounded-full border border-linea-forte bg-superficie p-1">
          {VISTE.map((v) => (
            <button
              key={v.valore}
              type="button"
              role="tab"
              aria-selected={vista === v.valore}
              aria-label={v.etichetta}
              onClick={() => {
                setVista(v.valore);
                setQuanti(150);
              }}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.875rem] transition-colors",
                vista === v.valore ? "bg-inchiostro text-superficie" : "text-inchiostro-2 hover:text-inchiostro",
              )}
            >
              <v.icona aria-hidden className="size-4" strokeWidth={1.7} />
              <span className="hidden sm:inline">{v.etichetta}</span>
            </button>
          ))}
        </div>
        {caricabili ? <PulsanteAllegato aperto={destinazioneStudio} onClick={() => caricaIn(STUDIO)} className="size-10" /> : null}
      </div>

      {destinazioneStudio ? <ZonaCaricamento destinazione={STUDIO} onFatto={() => router.refresh()} onChiudi={() => setDestinazione(null)} /> : null}

      {/* Filtri: categoria e periodo */}
      <div className="flex items-center gap-3">
        <div className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
          {["tutte", ...categorie].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoria(c)}
              aria-pressed={categoria === c}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[0.8125rem] transition-colors",
                categoria === c ? "border-inchiostro bg-inchiostro text-superficie" : "border-linea-forte text-inchiostro-2 hover:bg-superficie-2",
              )}
            >
              {c === "tutte" ? "Tutte" : CATEGORIE_DOCUMENTO[c]}
            </button>
          ))}
        </div>
        <div className="w-32 shrink-0 sm:w-40">
          <Tendina etichetta="Periodo" valore={periodo} onCambia={scegliPeriodo} opzioni={PERIODI} variante="compatta" />
        </div>
      </div>

      {filtroAttivo ? (
        <p className="-mt-1 text-[0.8125rem] text-tenue">
          {filtrati.length === 1 ? "1 file" : `${filtrati.length} file`}
          {" · "}
          <button
            type="button"
            onClick={() => {
              setCerca("");
              setCategoria("tutte");
              scegliPeriodo("sempre");
            }}
            className="underline-offset-2 hover:text-inchiostro hover:underline"
          >
            Togli i filtri
          </button>
        </p>
      ) : null}

      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}

      {nessunRisultato ? (
        <p className="px-2 py-6 text-[0.9375rem] text-tenue">Nessun documento corrisponde alla ricerca.</p>
      ) : vista === "cartelle" ? (
        <ul className="-mx-1">{radiciVisibili.map((n) => cartella(n, 0))}</ul>
      ) : vista === "elenco" ? (
        filtrati.length ? elenco() : <p className="px-2 py-6 text-[0.9375rem] text-tenue">L&apos;archivio è vuoto.</p>
      ) : (
        galleria()
      )}
    </div>
  );
}
