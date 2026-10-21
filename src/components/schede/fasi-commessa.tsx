"use client";

import { useRef, useState, useTransition, type CSSProperties, type PointerEvent as EventoPuntatore } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, FolderOpen, GripVertical, Loader2, Minus, Paperclip, Plus, X } from "lucide-react";
import { AreaTesto, Campo, Messaggio, Selezione } from "@/components/campo";
import { Pulsante } from "@/components/ui";
import { aggiornaFase, aggiungiFase, avanzaFase, eliminaFase, riordinaFasi } from "@/lib/azioni";
import type { Commessa } from "@/lib/dati";
import { AllegatiFase } from "./allegati-fase";
import { STATI_FASE } from "@/lib/dominio";
import { breve, giorno, intervalloMesi } from "@/lib/calendario";
import { cn, formattaEuro } from "@/lib/utils";

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

/**
 * Fasi della commessa in una tabella: si trascinano per riordinarle, si aggiungono con "+ Fase"
 * e si tolgono con "−". Ogni riga mostra responsabile, periodo sul cronoprogramma, avanzamento
 * a scatti del 25%, allegati e stato; aprendola si modificano i dati e si caricano i file.
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
  importi = true,
  allegati = 2,
  cronoprogramma = true,
  eliminabile = true,
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
  /** Permesso "Fasi" modificabile: aggiunge, riordina, avanza e apre l'editor */
  modificabile?: boolean;
  /** Mostra l'onorario delle singole fasi */
  importi?: boolean;
  /** Livello sugli allegati: 0 nascosti, 1 visibili, 2 modificabili */
  allegati?: number;
  /** Colonna con il periodo sul cronoprogramma */
  cronoprogramma?: boolean;
  /** Può eliminare fasi e allegati ("Completo" sulle commesse) */
  eliminabile?: boolean;
}) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);
  const [aperta, setAperta] = useState<string | null>(null);
  const [aggiunta, setAggiunta] = useState(false);
  const [daEliminare, setDaEliminare] = useState<string | null>(null);
  // Modifiche già fatte ma non ancora tornate dal server: ordine e avanzamenti
  const [ordineLocale, setOrdineLocale] = useState<string[] | null>(null);
  const [avanzamenti, setAvanzamenti] = useState<Record<string, number>>({});
  const [trascinata, setTrascinata] = useState<string | null>(null);
  const righe = useRef(new Map<string, HTMLDivElement>());
  const ordineIniziale = useRef<string[]>([]);

  const perId = new Map(fasi.map((f) => [f.id, f]));
  const daServer = [...fasi].sort((a, b) => a.ordine - b.ordine).map((f) => f.id);
  const ids = ordineLocale ? [...ordineLocale.filter((id) => perId.has(id)), ...daServer.filter((id) => !ordineLocale.includes(id))] : daServer;
  const elenco = ids.map((id) => perId.get(id)!).map((f) => {
    const av = avanzamenti[f.id];
    return av === undefined ? f : { ...f, avanzamento_pct: av, stato: statoAutomatico(av, f.stato) };
  });

  const completate = elenco.filter((f) => f.stato === "completata").length;
  const generali = documenti.filter((d) => !d.fase_id);
  const apribile = modificabile || allegati >= 1;

  // Cronoprogramma: intervallo a mesi interi che contiene date delle fasi, apertura, fine prevista e oggi
  const date = elenco.flatMap((f) => [f.data_inizio_prev, f.data_fine_prev]).filter((d): d is string => Boolean(d));
  const tempo = date.length ? intervalloMesi([...date, ...(apertura ? [apertura] : []), ...(finePrevista ? [finePrevista] : []), oggi].map(giorno)) : null;
  const pos = (g: number) => (tempo ? ((g - tempo.inizio) / tempo.giorni) * 100 : 0);
  const passoMesi = tempo ? Math.max(1, Math.ceil(tempo.mesi.length / 4)) : 1;

  // Colonne: presenti solo quelle permesse
  const colonne = [
    modificabile ? "1.25rem" : null,
    "3rem",
    "minmax(0,1fr)",
    "2rem",
    cronoprogramma ? "minmax(7rem,11rem)" : null,
    "6.5rem",
    allegati >= 1 ? "2.25rem" : null,
    "7rem",
    eliminabile ? "2rem" : null,
  ]
    .filter(Boolean)
    .join(" ");
  // Su telefono restano maniglia, fase (con lo stato sotto) e avanzamento
  const griglia = { "--colonne": colonne, "--colonne-telefono": modificabile ? "1.25rem minmax(0,1fr) auto" : "minmax(0,1fr) auto" } as CSSProperties;
  const classeGriglia = "grid items-center gap-x-3 [grid-template-columns:var(--colonne-telefono)] md:[grid-template-columns:var(--colonne)]";

  function esegui(azione: () => Promise<{ ok: boolean; errore?: string }>, dopo?: (ok: boolean) => void) {
    setErrore(null);
    avvia(async () => {
      const esito = await azione();
      if (!esito.ok) setErrore(esito.errore ?? "Operazione non riuscita.");
      dopo?.(esito.ok);
      if (esito.ok) router.refresh();
    });
  }

  function avanza(f: Fase, nuovo: number) {
    const prima = avanzamenti[f.id];
    setAvanzamenti((a) => ({ ...a, [f.id]: nuovo }));
    esegui(
      () => avanzaFase(f.id, nuovo),
      (ok) => {
        if (!ok) setAvanzamenti((a) => ({ ...a, [f.id]: prima ?? f.avanzamento_pct }));
      },
    );
  }

  /* ── Trascinamento con il puntatore (mouse, dito, penna) ── */
  function inizia(e: EventoPuntatore<HTMLButtonElement>, id: string) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    ordineIniziale.current = ids;
    setOrdineLocale(ids);
    setTrascinata(id);
    setAperta(null);
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
    <div>
      {/* Intestazione: avanzamento complessivo e aggiunta */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linea px-5 py-4 md:px-6">
        <div>
          <h2 className="text-base font-medium">Fasi</h2>
          <p className="mt-0.5 text-sm text-tenue">
            {elenco.length ? `${completate} di ${elenco.length} completate` : "Nessuna fase"}
            {allegati >= 1 && documenti.length ? ` · ${documenti.length} ${documenti.length === 1 ? "allegato" : "allegati"}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* barra delle fasi completate, a segmenti */}
          {elenco.length ? (
            <span aria-hidden className="hidden gap-1 sm:flex">
              {elenco.map((f) => (
                <span key={f.id} className="h-1.5 w-5 rounded-full" style={{ background: f.stato === "completata" ? COLORI_FASE.completata : "var(--linea)" }} />
              ))}
            </span>
          ) : null}
          {modificabile ? (
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

      <div role="table" aria-label="Fasi della commessa">
        {/* Intestazione delle colonne */}
        {elenco.length ? (
          <div role="row" className={cn("elenco-intestazione etichetta border-b border-linea px-5 py-2.5 max-md:!hidden md:px-6", classeGriglia)} style={griglia}>
            {modificabile ? <span /> : null}
            <span role="columnheader">Cod.</span>
            <span role="columnheader">Fase</span>
            <span role="columnheader" aria-label="Responsabile" />
            {cronoprogramma ? (
              <span role="columnheader" className="relative h-4" aria-label="Periodo">
                {tempo
                  ? tempo.mesi.map((m, i) =>
                      i % passoMesi === 0 ? (
                        <span key={m.g} className="absolute top-0" style={{ left: `${pos(m.g)}%` }}>
                          {m.etichetta}
                        </span>
                      ) : null,
                    )
                  : "Periodo"}
              </span>
            ) : null}
            <span role="columnheader">Avanzamento</span>
            {allegati >= 1 ? (
              <span role="columnheader" aria-label="Allegati" className="flex justify-center">
                <Paperclip className="size-3.5" strokeWidth={1.8} />
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
            const aperto = aperta === f.id;
            const ip = f.data_inizio_prev ? giorno(f.data_inizio_prev) : null;
            const fp = f.data_fine_prev ? giorno(f.data_fine_prev) : null;
            const responsabile = f.responsabile ? `${f.responsabile.nome} ${f.responsabile.cognome}`.trim() : null;
            const periodo = ip !== null || fp !== null ? `${breve(f.data_inizio_prev)} → ${breve(f.data_fine_prev)}` : "Date da definire";
            return (
              <div
                key={f.id}
                ref={(el) => {
                  if (el) righe.current.set(f.id, el);
                  else righe.current.delete(f.id);
                }}
                className={cn(
                  "transition-[background-color,box-shadow]",
                  aperto && "bg-superficie-2/50",
                  trascinata === f.id && "relative z-10 bg-superficie shadow-[0_12px_30px_-14px_rgba(43,42,40,0.45)]",
                )}
              >
                <div
                  role="row"
                  onClick={() => apribile && !trascinata && setAperta(aperto ? null : f.id)}
                  className={cn(classeGriglia, "px-5 py-3 md:px-6", apribile && "cursor-pointer hover:bg-superficie-2/40")}
                  style={griglia}
                >
                  {modificabile ? (
                    <button
                      type="button"
                      aria-label={`Trascina per spostare ${f.nome}`}
                      data-suggerimento="Trascina per riordinare"
                      onPointerDown={(e) => inizia(e, f.id)}
                      onPointerMove={muovi}
                      onPointerUp={rilascia}
                      onPointerCancel={rilascia}
                      onClick={(e) => e.stopPropagation()}
                      className="grid h-8 w-5 cursor-grab touch-none place-items-center rounded text-tenue/70 hover:text-inchiostro active:cursor-grabbing"
                    >
                      <GripVertical className="size-4" strokeWidth={1.8} />
                    </button>
                  ) : null}
                  <span role="cell" className="numeri etichetta hidden md:block">
                    {f.codice ?? "—"}
                  </span>
                  <span role="cell" className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">{f.nome}</span>
                      {apribile ? <ChevronDown className={cn("size-3.5 shrink-0 text-tenue transition-transform", aperto && "rotate-180")} strokeWidth={1.8} /> : null}
                    </span>
                    {/* Su telefono: stato sotto il nome */}
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs md:hidden" style={{ color: colore }}>
                      <span aria-hidden className="size-1.5 rounded-full" style={{ background: colore }} />
                      {STATI_FASE[f.stato] ?? f.stato}
                    </span>
                  </span>
                  <span role="cell" className="hidden md:block">
                    {f.responsabile ? (
                      <span
                        className="grid size-7 place-items-center rounded-full bg-superficie text-[0.6875rem] font-medium text-inchiostro-2 shadow-[0_0_0_1px_var(--linea)]"
                        data-suggerimento={responsabile ?? undefined}
                      >
                        {f.responsabile.iniziali ?? f.responsabile.nome.slice(0, 1)}
                      </span>
                    ) : (
                      <span className="text-tenue">—</span>
                    )}
                  </span>
                  {cronoprogramma ? (
                    <span role="cell" className="relative hidden h-2 rounded-full bg-linea/70 md:block" data-suggerimento={periodo}>
                      {tempo && (ip !== null || fp !== null) ? (
                        <span
                          className="absolute inset-y-0 rounded-full"
                          style={{
                            left: `${pos(ip ?? fp!)}%`,
                            width: `${Math.max(pos((fp ?? ip!) + 1) - pos(ip ?? fp!), 1.5)}%`,
                            background: colore,
                            opacity: 0.8,
                          }}
                        />
                      ) : null}
                      {tempo ? <span aria-hidden className="absolute -inset-y-1 w-px bg-accento" style={{ left: `${pos(giorno(oggi))}%` }} /> : null}
                    </span>
                  ) : null}
                  <span role="cell" onClick={(e) => e.stopPropagation()}>
                    <Tacche valore={f.avanzamento_pct} colore={colore} disabilitato={inCorso} onCambia={modificabile ? (n) => avanza(f, n) : undefined} />
                  </span>
                  {allegati >= 1 ? (
                    <span role="cell" className="hidden justify-center text-sm text-tenue md:flex">
                      {docs.length ? <span className="numeri">{docs.length}</span> : null}
                    </span>
                  ) : null}
                  <span role="cell" className="hidden items-center gap-1.5 whitespace-nowrap text-sm md:inline-flex" style={{ color: colore }}>
                    <span aria-hidden className="size-1.5 rounded-full" style={{ background: colore }} />
                    {STATI_FASE[f.stato] ?? f.stato}
                  </span>
                  {eliminabile ? (
                    <span role="cell" className="hidden justify-end md:flex" onClick={(e) => e.stopPropagation()}>
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

                {aperto ? (
                  <div className="grid gap-4 px-5 pb-5 md:px-6 md:pl-[4.75rem]">
                    {modificabile ? (
                      <EditorFase key={`${f.id}-${f.avanzamento_pct}-${f.stato}`} fase={f} profili={profili} importi={importi} onChiudi={() => setAperta(null)} />
                    ) : (
                      <SolaLettura fase={f} importi={importi} />
                    )}
                    {allegati >= 1 ? (
                      <div className={cn(modificabile && "border-t border-dashed border-linea pt-4")}>
                        <AllegatiFase commessaId={commessaId} faseId={f.id} documenti={docs} modificabile={allegati >= 2} eliminabile={eliminabile} />
                      </div>
                    ) : null}
                    {eliminabile ? (
                      <div className="md:hidden">
                        <button type="button" className="text-sm text-[color:var(--stato-sospesa)]" onClick={() => esegui(() => eliminaFase(f.id))}>
                          Elimina la fase
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}

          {/* Documenti della commessa che non appartengono a una fase */}
          {allegati >= 1 ? (
            <div className={cn(aperta === "generali" && "bg-superficie-2/50")}>
              <div
                role="row"
                onClick={() => setAperta(aperta === "generali" ? null : "generali")}
                className="flex cursor-pointer items-center gap-3 px-5 py-3 text-[0.9375rem] text-inchiostro-2 hover:bg-superficie-2/40 md:px-6"
              >
                <FolderOpen className="size-4 text-tenue" strokeWidth={1.7} />
                <span className="flex-1">Documenti generali</span>
                {generali.length ? <span className="numeri text-sm text-tenue">{generali.length}</span> : null}
                <ChevronDown className={cn("size-3.5 text-tenue transition-transform", aperta === "generali" && "rotate-180")} strokeWidth={1.8} />
              </div>
              {aperta === "generali" ? (
                <div className="px-5 pb-5 md:px-6 md:pl-[4.75rem]">
                  <AllegatiFase commessaId={commessaId} faseId={null} documenti={generali} modificabile={allegati >= 2} eliminabile={eliminabile} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {errore ? (
        <div className="px-5 pb-4 pt-2 md:px-6">
          <Messaggio tipo="errore">{errore}</Messaggio>
        </div>
      ) : null}
    </div>
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

/* ── Dati della fase per chi non può modificarla ─────────────────────── */

function SolaLettura({ fase: f, importi }: { fase: Fase; importi: boolean }) {
  const righe = [
    ["Inizio previsto", breve(f.data_inizio_prev)],
    ["Fine prevista", breve(f.data_fine_prev)],
    ["Responsabile", f.responsabile ? `${f.responsabile.nome} ${f.responsabile.cognome}` : "—"],
    importi ? ["Onorario", formattaEuro(f.onorario)] : null,
    ["Ore stimate", f.ore_budget ? `${f.ore_budget} h` : "—"],
  ].filter(Boolean) as [string, string][];
  return (
    <div className="grid gap-3">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[0.875rem] sm:grid-cols-3 lg:grid-cols-5">
        {righe.map(([e, v]) => (
          <div key={e}>
            <dt className="etichetta">{e}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {f.note ? <p className="whitespace-pre-line text-[0.875rem] text-inchiostro-2">{f.note}</p> : null}
    </div>
  );
}

/* ── Modifica della fase (riga aperta) ───────────────────────────────── */

function EditorFase({ fase: f, profili, importi, onChiudi }: { fase: Fase; profili: Profilo[]; importi: boolean; onChiudi: () => void }) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);
  const avanzamentoIniziale = quarti(f.avanzamento_pct);
  const [v, setV] = useState({
    // "auto" se lo stato attuale è quello che deriva dall'avanzamento
    stato: statoAutomatico(avanzamentoIniziale, f.stato) === f.stato ? "auto" : f.stato,
    responsabile_id: f.responsabile_id ?? "",
    data_inizio_prev: f.data_inizio_prev ?? "",
    data_fine_prev: f.data_fine_prev ?? "",
    onorario: f.onorario != null ? String(f.onorario).replace(".", ",") : "",
    ore_budget: f.ore_budget != null ? String(f.ore_budget).replace(".", ",") : "",
    avanzamento_pct: avanzamentoIniziale,
    note: f.note ?? "",
  });
  const cambia = <K extends keyof typeof v>(k: K, valore: (typeof v)[K]) => setV((x) => ({ ...x, [k]: valore }));
  const p = `fase-${f.id}`;
  const statoRisultante = v.stato === "auto" ? statoAutomatico(v.avanzamento_pct, "") : v.stato;

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setErrore(null);
        avvia(async () => {
          const esito = await aggiornaFase(f.id, {
            ...v,
            responsabile_id: v.responsabile_id || null,
            onorario: importi ? v.onorario : undefined,
          });
          if (esito.ok) {
            onChiudi();
            router.refresh();
          } else setErrore(esito.errore ?? "Operazione non riuscita.");
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo etichetta="Inizio previsto" id={`${p}-ini`} type="date" value={v.data_inizio_prev} onChange={(e) => cambia("data_inizio_prev", e.target.value)} />
        <Campo etichetta="Fine prevista" id={`${p}-fine`} type="date" value={v.data_fine_prev} onChange={(e) => cambia("data_fine_prev", e.target.value)} />
        <Selezione etichetta="Responsabile" id={`${p}-resp`} value={v.responsabile_id} onChange={(e) => cambia("responsabile_id", e.target.value)}>
          <option value="">Nessuno</option>
          {profili.map((pr) => (
            <option key={pr.id} value={pr.id}>
              {pr.nome} {pr.cognome}
            </option>
          ))}
        </Selezione>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-inchiostro-2">Avanzamento</span>
          <div className="flex h-11 items-center">
            <Tacche valore={v.avanzamento_pct} colore={COLORI_FASE[statoRisultante] ?? "var(--tenue)"} onCambia={(n) => cambia("avanzamento_pct", n)} />
          </div>
        </div>
        <Selezione etichetta="Stato" id={`${p}-stato`} value={v.stato} onChange={(e) => cambia("stato", e.target.value)}>
          <option value="auto">Automatico · {STATI_FASE[statoAutomatico(v.avanzamento_pct, "")]}</option>
          {Object.entries(STATI_FASE).map(([k, e]) => (
            <option key={k} value={k}>
              {e}
            </option>
          ))}
        </Selezione>
        {importi ? <Campo etichetta="Onorario €" id={`${p}-on`} inputMode="decimal" value={v.onorario} onChange={(e) => cambia("onorario", e.target.value)} /> : null}
        <Campo etichetta="Ore stimate" id={`${p}-ore`} inputMode="decimal" value={v.ore_budget} onChange={(e) => cambia("ore_budget", e.target.value)} />
      </div>
      <AreaTesto etichetta="Note" id={`${p}-note`} value={v.note} onChange={(e) => cambia("note", e.target.value)} className="min-h-16" />
      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tenue">Lo stato segue l’avanzamento; sospesa e annullata, o uno stato diverso, si scelgono a mano.</p>
        <div className="flex items-center gap-2">
          <Pulsante type="button" variante="discreto" onClick={onChiudi} disabled={inCorso}>
            Annulla
          </Pulsante>
          <Pulsante type="submit" disabled={inCorso}>
            {inCorso ? <Loader2 className="size-4 animate-spin" /> : null}
            Salva la fase
          </Pulsante>
        </div>
      </div>
    </form>
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
