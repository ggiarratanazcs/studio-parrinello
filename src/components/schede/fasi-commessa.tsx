"use client";

import { useEffect, useRef, useState, useTransition, type CSSProperties, type PointerEvent as EventoPuntatore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChartNoAxesGantt, Check, ChevronDown, FileImage, Table2, FileText, GripVertical, Loader2, Minus, Paperclip, Plus, Trash2, X } from "lucide-react";
import { Messaggio } from "@/components/campo";
import { Espandibile, PulsanteEspandi } from "@/components/registro";
import { aggiungiFase, avanzaFase, eliminaFase, modificaFase, riordinaFasi, type CampoFase } from "@/lib/azioni";
import type { Commessa } from "@/lib/dati";
import { apriDocumento, caricaAllegati, dimensione, eliminaAllegato } from "./allegati-fase";
import { STATI_FASE } from "@/lib/dominio";
import { Cronoprogramma } from "./cronoprogramma";
import { cn } from "@/lib/utils";

type Fase = NonNullable<Commessa["fasi"]>[number];
type Profilo = Commessa["profiliStudio"][number];
type VoceCatalogo = Commessa["catalogoFasi"][number];
type Documento = NonNullable<Commessa["documenti"]>[number];

/** Colore per stato della fase (stessa famiglia degli stati di commessa). */
export const COLORI_FASE: Record<string, string> = {
  da_avviare: "var(--tenue)",
  in_corso: "var(--stato-attiva)",
  in_revisione: "var(--stato-preventivo)",
  completata: "var(--stato-conclusa)",
  sospesa: "var(--stato-sospesa)",
  annullata: "var(--stato-contatto)",
};

/** Stato che segue l'avanzamento (sospesa e annullata restano finché non le cambi a mano). */
function statoAutomatico(avanzamento: number, attuale: string) {
  if (attuale === "sospesa" || attuale === "annullata") return attuale;
  return avanzamento >= 100 ? "completata" : avanzamento > 0 ? "in_corso" : "da_avviare";
}

const quarti = (v: number) => Math.max(0, Math.min(100, Math.round(v / 25) * 25));

/** "2026-06-16" → "16.06.26" */
function dataBreve(iso: string | null) {
  if (!iso) return null;
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(2, 4)}`;
}

/**
 * Fasi della commessa in una tabella che si modifica direttamente nelle celle:
 * date di inizio e fine, responsabile, avanzamento a scatti del 25%, allegati (con il +) e stato.
 * Le righe si trascinano per riordinarle; "+ Fase" aggiunge, "−" toglie. La tabella si porta a tutto schermo.
 */
export function FasiCommessa({
  commessaId,
  fasi,
  profili,
  catalogo,
  committenza,
  documenti,
  apertura,
  finePrevista,
  oggi,
  modificabile = true,
  allegati = 2,
  eliminabile = true,
  gantt: ganttPermesso = true,
}: {
  commessaId: string;
  fasi: Fase[];
  profili: Profilo[];
  catalogo: VoceCatalogo[];
  committenza: string;
  documenti: Documento[];
  apertura: string | null;
  finePrevista: string | null;
  /** Data di oggi (AAAA-MM-GG), dal server */
  oggi: string;
  /** Permesso "Cronoprogramma": mostra il pulsante per la vista Gantt */
  gantt?: boolean;
  /** Permesso "Fasi" modificabile: aggiunge, riordina e modifica le celle */
  modificabile?: boolean;
  /** Livello sugli allegati: 0 nascosti, 1 visibili, 2 modificabili */
  allegati?: number;
  /** Può eliminare fasi e allegati ("Completo" sulle commesse) */
  eliminabile?: boolean;
}) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);
  const [aggiunta, setAggiunta] = useState(false);
  const [vistaGantt, setVistaGantt] = useState(false);
  const [daEliminare, setDaEliminare] = useState<string | null>(null);
  // Modifiche già fatte ma non ancora tornate dal server
  const [ordineLocale, setOrdineLocale] = useState<string[] | null>(null);
  const [modifiche, setModifiche] = useState<Record<string, Partial<Fase>>>({});
  const [trascinata, setTrascinata] = useState<string | null>(null);
  const righe = useRef(new Map<string, HTMLDivElement>());
  const ordineIniziale = useRef<string[]>([]);

  const perId = new Map(fasi.map((f) => [f.id, f]));
  const daServer = [...fasi].sort((a, b) => a.ordine - b.ordine).map((f) => f.id);
  const ids = ordineLocale ? [...ordineLocale.filter((id) => perId.has(id)), ...daServer.filter((id) => !ordineLocale.includes(id))] : daServer;
  const elenco = ids.map((id) => ({ ...perId.get(id)!, ...modifiche[id] }) as Fase);

  const completate = elenco.filter((f) => f.stato === "completata").length;
  const nomi = new Map(profili.map((p) => [p.id, p]));

  const colonne = [
    modificabile ? "1.25rem" : null,
    "3rem",
    "minmax(12rem,1fr)",
    "10rem",
    "5rem",
    "5rem",
    "7rem",
    allegati >= 1 ? "4.5rem" : null,
    "8.5rem",
    eliminabile ? "2rem" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const griglia = { gridTemplateColumns: colonne } as CSSProperties;
  const classeRiga = "grid items-center gap-x-3 px-5 md:px-6";

  function esegui(azione: () => Promise<{ ok: boolean; errore?: string }>, dopo?: (ok: boolean) => void) {
    setErrore(null);
    avvia(async () => {
      const esito = await azione();
      if (!esito.ok) setErrore(esito.errore ?? "Operazione non riuscita.");
      dopo?.(esito.ok);
      if (esito.ok) router.refresh();
    });
  }

  /** Aggiorna subito la riga e salva; se il server rifiuta, torna com'era. */
  function cambia(f: Fase, locale: Partial<Fase>, salva: () => Promise<{ ok: boolean; errore?: string }>) {
    const prima = modifiche[f.id];
    setModifiche((m) => ({ ...m, [f.id]: { ...m[f.id], ...locale } }));
    esegui(salva, (ok) => {
      if (!ok) setModifiche((m) => ({ ...m, [f.id]: prima ?? {} }));
    });
  }

  function campo(f: Fase, nome: CampoFase, valore: string | null) {
    if (nome === "stato") {
      const stato = valore === "auto" ? statoAutomatico(f.avanzamento_pct, "") : valore!;
      cambia(f, { stato, ...(stato === "completata" ? { avanzamento_pct: 100 } : {}) }, () => modificaFase(f.id, "stato", valore));
    } else {
      cambia(f, { [nome]: valore || null } as Partial<Fase>, () => modificaFase(f.id, nome, valore));
    }
  }

  /* ── Trascinamento con il puntatore (mouse, dito, penna) ── */
  function inizia(e: EventoPuntatore<HTMLButtonElement>, id: string) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    ordineIniziale.current = ids;
    setOrdineLocale(ids);
    setTrascinata(id);
  }
  function muovi(e: EventoPuntatore<HTMLButtonElement>) {
    if (!trascinata) return;
    const altre = ids.filter((id) => id !== trascinata);
    const prima = altre.filter((id) => {
      const r = righe.current.get(id)?.getBoundingClientRect();
      return r ? r.top + r.height / 2 < e.clientY : false;
    }).length;
    const nuovo = [...altre.slice(0, prima), trascinata, ...altre.slice(prima)];
    if (nuovo.join() !== ids.join()) setOrdineLocale(nuovo);
  }
  function rilascia() {
    if (!trascinata) return;
    setTrascinata(null);
    const finale = ids;
    if (finale.join() === ordineIniziale.current.join()) return;
    esegui(
      () => riordinaFasi(commessaId, finale),
      (ok) => {
        if (!ok) setOrdineLocale(ordineIniziale.current);
      },
    );
  }

  return (
    <Espandibile>
      {/* Intestazione: conteggio, aggiunta, tutto schermo */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linea px-5 py-4 md:px-6">
        <div>
          <h2 className="text-base font-medium">Fasi e cronoprogramma</h2>
          <p className="mt-0.5 text-sm text-tenue">
            {elenco.length ? `${completate} di ${elenco.length} completate` : "Nessuna fase"}
            {allegati >= 1 && documenti.length ? ` · ${documenti.length} ${documenti.length === 1 ? "allegato" : "allegati"}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {elenco.length ? (
            <span aria-hidden className="hidden gap-1 sm:flex">
              {elenco.map((f) => (
                <span key={f.id} className="h-1.5 w-5 rounded-full" style={{ background: f.stato === "completata" ? COLORI_FASE.completata : "var(--linea)" }} />
              ))}
            </span>
          ) : null}
          {ganttPermesso && elenco.length ? (
            <button
              type="button"
              onClick={() => {
                setVistaGantt(!vistaGantt);
                setAggiunta(false);
              }}
              aria-pressed={vistaGantt}
              aria-label={vistaGantt ? "Torna alla tabella delle fasi" : "Vedi il cronoprogramma (Gantt)"}
              data-suggerimento={vistaGantt ? "Tabella delle fasi" : "Cronoprogramma"}
              className={cn(
                "grid size-8 place-items-center rounded-full border transition-colors",
                vistaGantt ? "border-inchiostro bg-inchiostro text-superficie" : "border-linea-forte text-inchiostro-2 hover:bg-superficie-2",
              )}
            >
              {vistaGantt ? <Table2 className="size-4" strokeWidth={1.7} /> : <ChartNoAxesGantt className="size-4" strokeWidth={1.7} />}
            </button>
          ) : null}
          {modificabile && !vistaGantt ? (
            <button
              type="button"
              onClick={() => setAggiunta(!aggiunta)}
              aria-expanded={aggiunta}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.875rem] transition-colors",
                aggiunta ? "border-inchiostro bg-inchiostro text-superficie" : "border-linea-forte hover:bg-superficie-2",
              )}
            >
              {aggiunta ? <X className="size-3.5" strokeWidth={2} /> : <Plus className="size-3.5" strokeWidth={2} />}
              Fase
            </button>
          ) : null}
          <PulsanteEspandi className="ml-0 size-8" />
        </div>
      </div>

      {aggiunta ? (
        <AggiungiFase
          commessaId={commessaId}
          catalogo={catalogo}
          presenti={elenco.map((f) => f.codice).filter(Boolean) as string[]}
          committenza={committenza}
          onAggiunta={() => router.refresh()}
        />
      ) : null}

      {vistaGantt ? (
        <Cronoprogramma fasi={elenco} apertura={apertura} finePrevista={finePrevista} oggi={oggi} />
      ) : (
      /* Su schermi stretti la tabella scorre in orizzontale */
      <div className="overflow-x-auto">
        <div role="table" aria-label="Fasi della commessa" className="min-w-[58rem]">
          {elenco.length ? (
            <div role="row" className={cn("elenco-intestazione etichetta border-b border-linea py-2.5", classeRiga)} style={griglia}>
              {modificabile ? <span /> : null}
              <span role="columnheader">Cod.</span>
              <span role="columnheader">Fase</span>
              <span role="columnheader">Responsabile</span>
              <span role="columnheader">Inizio</span>
              <span role="columnheader">Fine</span>
              <span role="columnheader">Avanzamento</span>
              {allegati >= 1 ? (
                <span role="columnheader" className="flex items-center gap-1">
                  <Paperclip className="size-3.5" strokeWidth={1.8} />
                  <span className="sr-only">Allegati</span>
                </span>
              ) : null}
              <span role="columnheader">Stato</span>
              {eliminabile ? <span /> : null}
            </div>
          ) : (
            <p className="px-5 py-8 text-[0.9375rem] text-tenue md:px-6">
              {modificabile ? "Nessuna fase. Aggiungine una con “+ Fase”." : "Nessuna fase definita."}
            </p>
          )}

          <div role="rowgroup" className="divide-y divide-linea">
            {elenco.map((f) => {
              const colore = COLORI_FASE[f.stato] ?? "var(--tenue)";
              const docs = documenti.filter((d) => d.fase_id === f.id);
              const responsabile = f.responsabile_id ? nomi.get(f.responsabile_id) ?? f.responsabile : null;
              const auto = statoAutomatico(f.avanzamento_pct, "") === f.stato;
              return (
                <div
                  key={f.id}
                  role="row"
                  ref={(el) => {
                    if (el) righe.current.set(f.id, el);
                    else righe.current.delete(f.id);
                  }}
                  className={cn(
                    classeRiga,
                    "min-h-12 py-2 transition-[background-color,box-shadow] hover:bg-superficie-2/30",
                    trascinata === f.id && "relative z-10 bg-superficie shadow-[0_12px_30px_-14px_rgba(43,42,40,0.45)]",
                  )}
                  style={griglia}
                >
                  {modificabile ? (
                    <button
                      type="button"
                      aria-label={`Trascina per spostare ${f.nome}`}
                      onPointerDown={(e) => inizia(e, f.id)}
                      onPointerMove={muovi}
                      onPointerUp={rilascia}
                      onPointerCancel={rilascia}
                      className="grid h-8 w-5 cursor-grab touch-none place-items-center rounded text-tenue/70 hover:text-inchiostro active:cursor-grabbing"
                    >
                      <GripVertical className="size-4" strokeWidth={1.8} />
                    </button>
                  ) : null}
                  <span role="cell" className="numeri etichetta">
                    {f.codice ?? "—"}
                  </span>
                  <span role="cell" className="truncate" title={f.nome}>
                    {f.nome}
                  </span>

                  {/* Responsabile */}
                  <Cella
                    modificabile={modificabile}
                    etichetta={`Responsabile di ${f.nome}`}
                    valore={f.responsabile_id ?? ""}
                    onCambia={(v) => campo(f, "responsabile_id", v || null)}
                    opzioni={[["", "Nessuno"], ...profili.map((p) => [p.id, `${p.nome} ${p.cognome}`] as [string, string])]}
                  >
                    {responsabile ? (
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-superficie text-[0.625rem] font-medium text-inchiostro-2 shadow-[0_0_0_1px_var(--linea)]">
                          {responsabile.iniziali ?? responsabile.nome.slice(0, 1)}
                        </span>
                        <span className="truncate text-sm">
                          {responsabile.nome.slice(0, 1)}. {responsabile.cognome}
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-tenue">—</span>
                    )}
                  </Cella>

                  {/* Inizio e fine */}
                  <CellaData modificabile={modificabile} etichetta={`Inizio di ${f.nome}`} valore={f.data_inizio_prev} onCambia={(v) => campo(f, "data_inizio_prev", v)} />
                  <CellaData modificabile={modificabile} etichetta={`Fine di ${f.nome}`} valore={f.data_fine_prev} onCambia={(v) => campo(f, "data_fine_prev", v)} />

                  {/* Avanzamento a scatti del 25%: lo stato segue */}
                  <span role="cell">
                    <Tacche
                      valore={f.avanzamento_pct}
                      colore={colore}
                      disabilitato={inCorso}
                      onCambia={
                        modificabile
                          ? (n) => cambia(f, { avanzamento_pct: n, stato: statoAutomatico(n, f.stato) }, () => avanzaFase(f.id, n))
                          : undefined
                      }
                    />
                  </span>

                  {allegati >= 1 ? (
                    <CellaAllegati commessaId={commessaId} faseId={f.id} nome={f.nome} documenti={docs} carica={allegati >= 2} eliminabile={eliminabile} />
                  ) : null}

                  {/* Stato: automatico o scelto a mano */}
                  <Cella
                    modificabile={modificabile}
                    etichetta={`Stato di ${f.nome}`}
                    valore={auto ? "auto" : f.stato}
                    onCambia={(v) => campo(f, "stato", v)}
                    opzioni={[["auto", `Automatico · ${STATI_FASE[statoAutomatico(f.avanzamento_pct, "")]}`], ...Object.entries(STATI_FASE)]}
                  >
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm" style={{ color: colore }}>
                      <span aria-hidden className="size-1.5 rounded-full" style={{ background: colore }} />
                      {STATI_FASE[f.stato] ?? f.stato}
                      {!auto ? <span className="text-[0.6875rem] text-tenue">· manuale</span> : null}
                    </span>
                  </Cella>

                  {eliminabile ? (
                    <span role="cell" className="flex justify-end">
                      {daEliminare === f.id ? (
                        <button
                          type="button"
                          aria-label={`Conferma: elimina ${f.nome}`}
                          data-suggerimento="Clic di nuovo per eliminare"
                          disabled={inCorso}
                          onBlur={() => setDaEliminare(null)}
                          onClick={() => esegui(() => eliminaFase(f.id), () => setDaEliminare(null))}
                          className="grid size-7 place-items-center rounded-full border border-[color:var(--stato-sospesa)]/50 text-[color:var(--stato-sospesa)]"
                          autoFocus
                        >
                          {inCorso ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" strokeWidth={2.2} />}
                        </button>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Elimina ${f.nome}`}
                          data-suggerimento="Elimina la fase"
                          onClick={() => setDaEliminare(f.id)}
                          className="grid size-7 place-items-center rounded-full border border-transparent text-tenue transition-colors hover:border-linea-forte hover:text-inchiostro"
                        >
                          <Minus className="size-3.5" strokeWidth={2} />
                        </button>
                      )}
                    </span>
                  ) : null}
                </div>
              );
            })}

          </div>
        </div>
      </div>
      )}

      {errore ? (
        <div className="px-5 pb-4 pt-2 md:px-6">
          <Messaggio tipo="errore">{errore}</Messaggio>
        </div>
      ) : null}
    </Espandibile>
  );
}

/* ── Celle modificabili sul posto ─────────────────────────────────────── */

/** Cella con una scelta: si vede il valore formattato, il clic apre l'elenco nativo. */
function Cella({
  modificabile,
  etichetta,
  valore,
  opzioni,
  onCambia,
  children,
}: {
  modificabile: boolean;
  etichetta: string;
  valore: string;
  opzioni: [string, string][];
  onCambia: (v: string) => void;
  children: ReactNode;
}) {
  if (!modificabile) return <span role="cell">{children}</span>;
  return (
    <span role="cell" className="group/cella relative -mx-1.5 flex h-8 items-center rounded-piccolo px-1.5 transition-colors hover:bg-superficie-2/70">
      {children}
      <ChevronDown aria-hidden className="ml-auto size-3 shrink-0 text-tenue opacity-0 transition-opacity group-hover/cella:opacity-100" strokeWidth={2} />
      <select aria-label={etichetta} value={valore} onChange={(e) => onCambia(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
        {opzioni.map(([v, e]) => (
          <option key={v} value={v}>
            {e}
          </option>
        ))}
      </select>
    </span>
  );
}

/** Data come gg.mm.aa; il clic apre il calendario del browser. */
function CellaData({ modificabile, etichetta, valore, onCambia }: { modificabile: boolean; etichetta: string; valore: string | null; onCambia: (v: string | null) => void }) {
  const testo = dataBreve(valore);
  const contenuto = <span className={cn("numeri text-sm", !testo && "text-tenue")}>{testo ?? "—"}</span>;
  if (!modificabile) return <span role="cell">{contenuto}</span>;
  return (
    <span role="cell" className="relative -mx-1.5 flex h-8 items-center rounded-piccolo px-1.5 transition-colors hover:bg-superficie-2/70">
      {contenuto}
      <input
        type="date"
        aria-label={etichetta}
        value={valore ?? ""}
        onChange={(e) => onCambia(e.target.value || null)}
        onClick={(e) => e.currentTarget.showPicker?.()}
        className="absolute inset-0 w-full cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:size-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
      />
    </span>
  );
}

/** Allegati della fase: numero (apre l'elenco) e + per caricarne di nuovi. */
function CellaAllegati({
  commessaId,
  faseId,
  nome,
  documenti,
  carica,
  eliminabile,
}: {
  commessaId: string;
  faseId: string | null;
  nome: string;
  documenti: Documento[];
  carica: boolean;
  eliminabile: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const zona = useRef<HTMLSpanElement>(null);
  const [aperto, setAperto] = useState<{ top: number; left: number } | null>(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  // L'elenco si chiude cliccando fuori o scorrendo la pagina
  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: PointerEvent) => !zona.current?.contains(e.target as Node) && setAperto(null);
    const chiudi = () => setAperto(null);
    document.addEventListener("pointerdown", fuori);
    window.addEventListener("scroll", chiudi, true);
    window.addEventListener("resize", chiudi);
    return () => {
      document.removeEventListener("pointerdown", fuori);
      window.removeEventListener("scroll", chiudi, true);
      window.removeEventListener("resize", chiudi);
    };
  }, [aperto]);

  // Elenco posizionato rispetto alla finestra: la tabella scorre in orizzontale e lo taglierebbe
  function apri() {
    const r = zona.current?.getBoundingClientRect();
    if (!r) return;
    setAperto({ top: r.bottom + 4, left: Math.max(8, Math.min(r.right - 320, window.innerWidth - 328)) });
  }

  async function scegli(files: FileList | null) {
    if (!files?.length) return;
    setErrore(null);
    setCaricamento(true);
    const esito = await caricaAllegati(commessaId, faseId, Array.from(files));
    setCaricamento(false);
    if (input.current) input.current.value = "";
    if (esito) {
      setErrore(esito);
      apri();
    }
    router.refresh();
  }

  return (
    <span role="cell" ref={zona} className="relative flex items-center gap-1">
      <button
        type="button"
        onClick={() => (aperto ? setAperto(null) : documenti.length || errore ? apri() : undefined)}
        disabled={!documenti.length && !errore}
        aria-label={`${documenti.length} allegati di ${nome}`}
        aria-expanded={!!aperto}
        className={cn(
          "numeri h-7 min-w-7 rounded-full px-1.5 text-sm transition-colors",
          documenti.length ? "text-inchiostro-2 hover:bg-superficie-2" : "text-tenue/60",
          aperto && "bg-superficie-2",
        )}
      >
        {documenti.length || "—"}
      </button>
      {carica ? (
        <>
          <input ref={input} type="file" multiple className="sr-only" tabIndex={-1} onChange={(e) => scegli(e.target.files)} />
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={caricamento}
            aria-label={`Aggiungi allegati a ${nome}`}
            data-suggerimento="Aggiungi allegati"
            className="grid size-7 place-items-center rounded-full border border-transparent text-tenue transition-colors hover:border-linea-forte hover:text-inchiostro"
          >
            {caricamento ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" strokeWidth={2} />}
          </button>
        </>
      ) : null}

      {aperto ? (
        <span style={aperto} className="fixed z-[80] block w-80 rounded-medio border border-linea bg-superficie p-1.5 text-left shadow-[0_18px_40px_-20px_rgba(43,42,40,0.5)]">
          {documenti.map((d) => {
            const Icona = d.mime_type?.startsWith("image/") ? FileImage : FileText;
            return (
              <span key={d.id} className="group flex items-center gap-2.5 rounded-piccolo px-2 py-1.5 hover:bg-superficie-2/60">
                <Icona className="size-4 shrink-0 text-tenue" strokeWidth={1.6} />
                <button
                  type="button"
                  onClick={() => apriDocumento(d.storage_path, () => setErrore("Non è stato possibile aprire il file."))}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm hover:text-accento">{d.nome_file}</span>
                  <span className="block text-xs text-tenue">{dimensione(d.dimensione_byte)}</span>
                </button>
                {eliminabile ? (
                  <button
                    type="button"
                    aria-label={`Elimina ${d.nome_file}`}
                    disabled={inCorso}
                    onClick={() =>
                      avvia(async () => {
                        if (!(await eliminaAllegato(d))) setErrore("Il tuo profilo non può eliminare questo allegato.");
                        router.refresh();
                      })
                    }
                    className="grid size-7 shrink-0 place-items-center rounded-full text-tenue opacity-0 transition hover:bg-superficie hover:text-inchiostro group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.8} />
                  </button>
                ) : null}
              </span>
            );
          })}
          {errore ? <span className="block px-2 py-1.5 text-xs text-[color:var(--stato-sospesa)]">{errore}</span> : null}
        </span>
      ) : null}
    </span>
  );
}

/* ── Avanzamento a quattro tacche (25% ciascuna) ─────────────────────── */

function Tacche({
  valore,
  colore,
  onCambia,
  disabilitato,
}: {
  valore: number;
  colore: string;
  /** Senza, l'avanzamento è solo da leggere */
  onCambia?: (nuovo: number) => void;
  disabilitato?: boolean;
}) {
  const v = quarti(valore);
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-[3px]" role={onCambia ? "group" : undefined} aria-label={`Avanzamento ${v}%`}>
        {[1, 2, 3, 4].map((k) => {
          const pieno = v >= k * 25;
          const stile = { background: pieno ? colore : undefined };
          if (!onCambia) return <span key={k} className="h-2 w-3.5 rounded-[2px] bg-linea" style={stile} />;
          // Clic su una tacca: arriva lì; sull'ultima piena: torna indietro di un quarto
          const nuovo = v === k * 25 ? (k - 1) * 25 : k * 25;
          return (
            <button
              key={k}
              type="button"
              disabled={disabilitato}
              onClick={() => onCambia(nuovo)}
              aria-label={`Porta l'avanzamento al ${nuovo}%`}
              className="group/tacca -my-2 py-2"
            >
              <span className="block h-2 w-3.5 rounded-[2px] bg-linea transition-[transform,background-color] group-hover/tacca:scale-y-150" style={stile} />
            </button>
          );
        })}
      </span>
      <span className="numeri w-8 text-right text-xs text-tenue">{v}%</span>
    </span>
  );
}

/* ── Aggiunta dal catalogo o con un nome libero ──────────────────────── */

function AggiungiFase({
  commessaId,
  catalogo,
  presenti,
  committenza,
  onAggiunta,
}: {
  commessaId: string;
  catalogo: VoceCatalogo[];
  presenti: string[];
  committenza: string;
  onAggiunta: () => void;
}) {
  const [altra, setAltra] = useState(false);
  const [nome, setNome] = useState("");
  const [inCorso, avvia] = useTransition();
  const [chi, setChi] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const ambito = committenza === "pubblica" ? "pubblico" : "privato";
  const disponibili = catalogo.filter((c) => !presenti.includes(c.codice) && (c.ambito === "entrambi" || c.ambito === ambito));

  function aggiungi(scelta: { catalogoId?: string; nome?: string }, id: string) {
    setErrore(null);
    setChi(id);
    avvia(async () => {
      const esito = await aggiungiFase(commessaId, scelta);
      setChi(null);
      if (esito.ok) {
        setNome("");
        setAltra(false);
        onAggiunta();
      } else setErrore(esito.errore);
    });
  }

  const chip = "inline-flex h-8 items-center gap-1.5 rounded-full border border-linea-forte px-3 text-[0.8125rem] transition-colors hover:bg-superficie-2 disabled:opacity-50";
  return (
    <div className="border-b border-linea bg-superficie-2/50 px-5 py-4 md:px-6">
      <p className="mb-2.5 text-sm text-tenue">Aggiungi dal catalogo</p>
      <div className="flex flex-wrap gap-2">
        {disponibili.map((c) => (
          <button key={c.id} type="button" disabled={inCorso} onClick={() => aggiungi({ catalogoId: c.id }, c.id)} className={chip}>
            {chi === c.id ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" strokeWidth={2} />}
            <span className="numeri text-tenue">{c.codice}</span>
            {c.nome}
          </button>
        ))}
        {altra ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (nome.trim()) aggiungi({ nome }, "altra");
            }}
          >
            <input
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome della fase"
              aria-label="Nome della fase"
              className="h-8 w-56 rounded-full border border-linea-forte bg-superficie px-3 text-[0.8125rem] outline-none focus:border-accento"
            />
            <button type="submit" disabled={inCorso || !nome.trim()} className={chip}>
              {chi === "altra" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" strokeWidth={2} />}
              Aggiungi
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setAltra(true)} className={cn(chip, "border-dashed")}>
            Altra fase…
          </button>
        )}
      </div>
      {errore ? (
        <div className="mt-3">
          <Messaggio tipo="errore">{errore}</Messaggio>
        </div>
      ) : null}
    </div>
  );
}
