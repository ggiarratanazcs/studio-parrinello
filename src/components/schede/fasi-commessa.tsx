"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronDown, Loader2, Paperclip, Plus, Trash2 } from "lucide-react";
import { AreaTesto, Campo, Messaggio, Selezione } from "@/components/campo";
import { Pulsante } from "@/components/ui";
import { aggiornaFase, aggiungiFase, eliminaFase, spostaFase } from "@/lib/azioni";
import type { Commessa } from "@/lib/dati";
import { AllegatiFase } from "./allegati-fase";
import { STATI_FASE } from "@/lib/dominio";
import { cn, formattaData, formattaEuro } from "@/lib/utils";

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

function periodo(f: Fase) {
  if (f.data_inizio_prev && f.data_fine_prev) return `${formattaData(f.data_inizio_prev)} → ${formattaData(f.data_fine_prev)}`;
  if (f.data_fine_prev) return `entro il ${formattaData(f.data_fine_prev)}`;
  if (f.data_inizio_prev) return `dal ${formattaData(f.data_inizio_prev)}`;
  return null;
}

/**
 * Fasi della commessa: ogni riga si apre per modificare stato, responsabile, date previste,
 * onorario, ore e avanzamento. In fondo si aggiungono fasi dal catalogo o personalizzate.
 */
export function FasiCommessa({
  commessaId,
  fasi,
  profili,
  catalogo,
  committenza,
  documenti,
  modificabile = true,
  importi = true,
  allegati = 2,
  eliminabile = true,
}: {
  commessaId: string;
  documenti: Documento[];
  /** Permesso "Fasi" modificabile: apre l'editor e permette di aggiungere fasi */
  modificabile?: boolean;
  /** Mostra l'onorario delle singole fasi */
  importi?: boolean;
  /** Livello sugli allegati: 0 nascosti, 1 visibili, 2 modificabili */
  allegati?: number;
  /** Può eliminare fasi e allegati ("Completo" sulle commesse) */
  eliminabile?: boolean;
  fasi: Fase[];
  profili: Profilo[];
  catalogo: VoceCatalogo[];
  committenza: string;
}) {
  const [aperta, setAperta] = useState<string | null>(null);

  return (
    <div>
      {fasi.length === 0 ? (
        <p className="px-5 py-8 text-[0.9375rem] text-tenue md:px-6">{modificabile ? "Nessuna fase definita. Aggiungine una qui sotto." : "Nessuna fase definita."}</p>
      ) : (
        <ol className="divide-y divide-linea">
          {fasi.map((f, i) => (
            <RigaFase
              key={f.id}
              fase={f}
              commessaId={commessaId}
              documenti={documenti.filter((d) => d.fase_id === f.id)}
              profili={profili}
              aperta={aperta === f.id}
              onApri={() => setAperta(aperta === f.id ? null : f.id)}
              onChiudi={() => setAperta(null)}
              prima={i === 0}
              ultima={i === fasi.length - 1}
              modificabile={modificabile}
              importi={importi}
              allegati={allegati}
              eliminabile={eliminabile}
            />
          ))}
        </ol>
      )}
      {modificabile ? <AggiungiFase commessaId={commessaId} catalogo={catalogo} presenti={fasi.map((f) => f.codice).filter(Boolean) as string[]} committenza={committenza} /> : null}
    </div>
  );
}

function RigaFase({
  fase: f,
  commessaId,
  documenti,
  profili,
  aperta,
  onApri,
  onChiudi,
  prima,
  ultima,
  modificabile,
  importi,
  allegati,
  eliminabile,
}: {
  fase: Fase;
  commessaId: string;
  documenti: Documento[];
  profili: Profilo[];
  aperta: boolean;
  onApri: () => void;
  onChiudi: () => void;
  prima: boolean;
  ultima: boolean;
  modificabile: boolean;
  importi: boolean;
  allegati: number;
  eliminabile: boolean;
}) {
  const colore = COLORI_FASE[f.stato] ?? "var(--tenue)";
  const apribile = modificabile || allegati >= 1;
  const dettagli = [periodo(f), importi && f.onorario ? formattaEuro(f.onorario) : null, f.ore_budget ? `${f.ore_budget} h` : null].filter(Boolean);

  return (
    <li className={cn(aperta && "bg-superficie-2/60")}>
      <button
        type="button"
        onClick={apribile ? onApri : undefined}
        aria-expanded={apribile ? aperta : undefined}
        className="grid w-full grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-superficie-2/60 md:grid-cols-[3.5rem_minmax(0,1fr)_auto_auto] md:px-6"
      >
        <span className="numeri etichetta">{f.codice ?? "—"}</span>
        <span className="min-w-0">
          <span className="block truncate">{f.nome}</span>
          {dettagli.length ? <span className="block truncate text-sm text-tenue">{dettagli.join(" · ")}</span> : null}
          <span className="mt-1.5 block h-1 w-full max-w-56 overflow-hidden rounded-full bg-linea">
            <span className="block h-full rounded-full transition-[width]" style={{ width: `${f.avanzamento_pct}%`, background: colore }} />
          </span>
        </span>
        <span className="flex items-center gap-2">
          {allegati >= 1 && documenti.length ? (
            <span className="hidden items-center gap-1 text-sm text-tenue sm:inline-flex" data-suggerimento={`${documenti.length} allegati`}>
              <Paperclip className="size-3.5" strokeWidth={1.8} />
              <span className="numeri">{documenti.length}</span>
            </span>
          ) : null}
          {f.responsabile ? (
            <span
              className="hidden size-7 place-items-center rounded-full bg-superficie text-[0.6875rem] font-medium text-inchiostro-2 shadow-[0_0_0_1px_var(--linea)] md:grid"
              data-suggerimento={`${f.responsabile.nome} ${f.responsabile.cognome}`}
            >
              {f.responsabile.iniziali ?? f.responsabile.nome.slice(0, 1)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm" style={{ color: colore }}>
            <span aria-hidden className="size-1.5 rounded-full" style={{ background: colore }} />
            {STATI_FASE[f.stato] ?? f.stato}
          </span>
        </span>
        {apribile ? <ChevronDown className={cn("hidden size-4 text-tenue transition-transform md:block", aperta && "rotate-180")} strokeWidth={1.8} /> : <span className="hidden md:block" />}
      </button>
      {aperta && apribile ? (
        <>
          {modificabile ? <EditorFase fase={f} profili={profili} onChiudi={onChiudi} prima={prima} ultima={ultima} eliminabile={eliminabile} importi={importi} /> : null}
          {allegati >= 1 ? (
            <div className={cn("mx-5 pb-5 pt-4 md:mx-6", modificabile && "border-t border-dashed border-linea")}>
              <AllegatiFase commessaId={commessaId} faseId={f.id} documenti={documenti} modificabile={allegati >= 2} eliminabile={eliminabile} />
            </div>
          ) : null}
        </>
      ) : null}
    </li>
  );
}

function EditorFase({
  fase: f,
  profili,
  onChiudi,
  prima,
  ultima,
  eliminabile,
  importi,
}: {
  fase: Fase;
  profili: Profilo[];
  onChiudi: () => void;
  prima: boolean;
  ultima: boolean;
  eliminabile: boolean;
  importi: boolean;
}) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);
  const [eliminare, setEliminare] = useState(false);
  const [v, setV] = useState({
    stato: f.stato,
    responsabile_id: f.responsabile_id ?? "",
    data_inizio_prev: f.data_inizio_prev ?? "",
    data_fine_prev: f.data_fine_prev ?? "",
    onorario: f.onorario != null ? String(f.onorario).replace(".", ",") : "",
    ore_budget: f.ore_budget != null ? String(f.ore_budget).replace(".", ",") : "",
    avanzamento_pct: f.avanzamento_pct,
    note: f.note ?? "",
  });
  const cambia = <K extends keyof typeof v>(k: K, valore: (typeof v)[K]) => setV((x) => ({ ...x, [k]: valore }));
  const p = `fase-${f.id}`;

  function esegui(azione: () => Promise<{ ok: boolean; errore?: string }>, chiudi = false) {
    setErrore(null);
    avvia(async () => {
      const esito = await azione();
      if (esito.ok) {
        if (chiudi) onChiudi();
        router.refresh();
      } else setErrore(esito.errore ?? "Operazione non riuscita.");
    });
  }

  return (
    <form
      className="grid gap-4 border-t border-linea px-5 pb-5 pt-4 md:px-6"
      onSubmit={(e) => {
        e.preventDefault();
        esegui(() => aggiornaFase(f.id, { ...v, responsabile_id: v.responsabile_id || null, onorario: importi ? v.onorario : undefined }), true);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Selezione etichetta="Stato" id={`${p}-stato`} value={v.stato} onChange={(e) => cambia("stato", e.target.value)}>
          {Object.entries(STATI_FASE).map(([k, e]) => (
            <option key={k} value={k}>
              {e}
            </option>
          ))}
        </Selezione>
        <Selezione etichetta="Responsabile" id={`${p}-resp`} value={v.responsabile_id} onChange={(e) => cambia("responsabile_id", e.target.value)}>
          <option value="">Nessuno</option>
          {profili.map((pr) => (
            <option key={pr.id} value={pr.id}>
              {pr.nome} {pr.cognome}
            </option>
          ))}
        </Selezione>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${p}-av`} className="text-sm font-medium text-inchiostro-2">
            Avanzamento <span className="numeri text-tenue">{v.stato === "completata" ? 100 : v.avanzamento_pct}%</span>
          </label>
          <input
            id={`${p}-av`}
            type="range"
            min={0}
            max={100}
            step={5}
            value={v.stato === "completata" ? 100 : v.avanzamento_pct}
            disabled={v.stato === "completata"}
            onChange={(e) => cambia("avanzamento_pct", Number(e.target.value))}
            className="h-11 w-full accent-[var(--accento)]"
          />
        </div>
        <Campo etichetta="Inizio previsto" id={`${p}-ini`} type="date" value={v.data_inizio_prev} onChange={(e) => cambia("data_inizio_prev", e.target.value)} />
        <Campo etichetta="Fine prevista" id={`${p}-fine`} type="date" value={v.data_fine_prev} onChange={(e) => cambia("data_fine_prev", e.target.value)} />
        <div className={cn("grid gap-4", importi && "grid-cols-2")}>
          {importi ? <Campo etichetta="Onorario €" id={`${p}-on`} inputMode="decimal" value={v.onorario} onChange={(e) => cambia("onorario", e.target.value)} /> : null}
          <Campo etichetta="Ore stimate" id={`${p}-ore`} inputMode="decimal" value={v.ore_budget} onChange={(e) => cambia("ore_budget", e.target.value)} />
        </div>
      </div>
      <AreaTesto etichetta="Note" id={`${p}-note`} value={v.note} onChange={(e) => cambia("note", e.target.value)} className="min-h-20" />

      {f.data_inizio_eff || f.data_fine_eff ? (
        <p className="text-sm text-tenue">
          {f.data_inizio_eff ? `Avviata il ${formattaData(f.data_inizio_eff)}` : null}
          {f.data_inizio_eff && f.data_fine_eff ? " · " : null}
          {f.data_fine_eff ? `completata il ${formattaData(f.data_fine_eff)}` : null}
        </p>
      ) : null}

      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Pulsante type="button" variante="discreto" className="px-2.5" disabled={inCorso || prima} onClick={() => esegui(() => spostaFase(f.id, "su"))} data-suggerimento="Sposta su" aria-label="Sposta su">
            <ArrowUp className="size-4" strokeWidth={1.8} />
          </Pulsante>
          <Pulsante type="button" variante="discreto" className="px-2.5" disabled={inCorso || ultima} onClick={() => esegui(() => spostaFase(f.id, "giu"))} data-suggerimento="Sposta giù" aria-label="Sposta giù">
            <ArrowDown className="size-4" strokeWidth={1.8} />
          </Pulsante>
          {!eliminabile ? null : eliminare ? (
            <span className="ml-2 flex items-center gap-2 text-sm">
              Eliminare la fase?
              <Pulsante type="button" variante="secondario" className="h-9 px-3 text-[color:var(--stato-sospesa)]" disabled={inCorso} onClick={() => esegui(() => eliminaFase(f.id), true)}>
                Elimina
              </Pulsante>
              <Pulsante type="button" variante="discreto" className="h-9 px-3" onClick={() => setEliminare(false)}>
                No
              </Pulsante>
            </span>
          ) : (
            <Pulsante type="button" variante="discreto" className="px-2.5 text-[color:var(--stato-sospesa)]" disabled={inCorso} onClick={() => setEliminare(true)} data-suggerimento="Elimina la fase" aria-label="Elimina la fase">
              <Trash2 className="size-4" strokeWidth={1.8} />
            </Pulsante>
          )}
        </div>
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

function AggiungiFase({
  commessaId,
  catalogo,
  presenti,
  committenza,
}: {
  commessaId: string;
  catalogo: VoceCatalogo[];
  presenti: string[];
  committenza: string;
}) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [scelta, setScelta] = useState("");
  const [nome, setNome] = useState("");
  const [inCorso, avvia] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);

  const ambito = committenza === "pubblica" ? "pubblico" : "privato";
  const disponibili = catalogo.filter((c) => !presenti.includes(c.codice) && (c.ambito === "entrambi" || c.ambito === ambito));

  function aggiungi() {
    setErrore(null);
    avvia(async () => {
      const esito = await aggiungiFase(commessaId, scelta === "altra" ? { nome } : { catalogoId: scelta });
      if (esito.ok) {
        setAperto(false);
        setScelta("");
        setNome("");
        router.refresh();
      } else setErrore(esito.errore);
    });
  }

  if (!aperto)
    return (
      <div className="border-t border-linea px-5 py-3 md:px-6">
        <Pulsante type="button" variante="discreto" className="-ml-3" onClick={() => setAperto(true)}>
          <Plus className="size-4" strokeWidth={2} />
          Aggiungi una fase
        </Pulsante>
      </div>
    );

  return (
    <div className="grid gap-4 border-t border-linea bg-superficie-2/60 px-5 py-4 md:px-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Selezione etichetta="Fase" id={`nuova-fase-${commessaId}`} value={scelta} onChange={(e) => setScelta(e.target.value)}>
          <option value="">Scegli dal catalogo…</option>
          {disponibili.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codice} · {c.nome}
            </option>
          ))}
          <option value="altra">Altra fase (scrivi il nome)</option>
        </Selezione>
        {scelta === "altra" ? (
          <Campo etichetta="Nome della fase" id={`nome-fase-${commessaId}`} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        ) : null}
      </div>
      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
      <div className="flex justify-end gap-2">
        <Pulsante type="button" variante="discreto" onClick={() => setAperto(false)} disabled={inCorso}>
          Annulla
        </Pulsante>
        <Pulsante type="button" onClick={aggiungi} disabled={inCorso || !scelta || (scelta === "altra" && !nome.trim())}>
          {inCorso ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" strokeWidth={2} />}
          Aggiungi
        </Pulsante>
      </div>
    </div>
  );
}
