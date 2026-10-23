"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowUp,
  Building2,
  ChevronRight,
  DraftingCompass,
  FileImage,
  FileText,
  Layers,
  Loader2,
  Mail,
  Mic,
  Phone,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { cercaDocumentiAssistente, indiceAssistente } from "@/lib/assistente/azioni";
import { interpreta } from "@/lib/assistente/interprete";
import type { DocumentoTrovato, IndiceAssistente, Scheda } from "@/lib/assistente/tipi";
import { apriDocumento } from "@/components/schede/allegati-fase";
import { cn, formattaData } from "@/lib/utils";

type Messaggio = { id: number; da: "io" | "assistente"; testo: string; schede?: Scheda[]; documenti?: DocumentoTrovato[]; attesa?: boolean };

const SCORCIATOIE: { etichetta: string; testo: string; invia?: boolean }[] = [
  { etichetta: "Chiama…", testo: "chiama " },
  { etichetta: "Scrivi a…", testo: "scrivi a " },
  { etichetta: "Fasi in scadenza", testo: "fasi in scadenza", invia: true },
  { etichetta: "Fasi in ritardo", testo: "fasi in ritardo", invia: true },
  { etichetta: "Trova file…", testo: "trova file " },
  { etichetta: "Apri commessa…", testo: "commessa " },
  { etichetta: "Commesse sospese", testo: "commesse sospese", invia: true },
];

const ICONE = { commessa: DraftingCompass, cliente: Users, immobile: Building2, fase: Layers };

/* Riconoscimento vocale del browser (Chrome, Edge, Safari): gratuito, nessuna configurazione. */
type Riconoscimento = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
function creaRiconoscimento(): Riconoscimento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Riconoscimento; webkitSpeechRecognition?: new () => Riconoscimento };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C ? new C() : null;
}

const MINUTI_INDICE = 3;

/** Dati dell'assistente, tenuti in memoria qualche minuto per risposte immediate. */
let indiceInMemoria: { dati: IndiceAssistente; letto: number } | null = null;
async function leggiIndice() {
  if (indiceInMemoria && Date.now() - indiceInMemoria.letto < MINUTI_INDICE * 60_000) return indiceInMemoria.dati;
  const dati = await indiceAssistente();
  if (dati) indiceInMemoria = { dati, letto: Date.now() };
  return dati;
}

/** Bozza di mail modificabile, da aprire nel programma di posta. */
function SchedaMail({ s }: { s: Extract<Scheda, { tipo: "mail" }> }) {
  const [oggetto, setOggetto] = useState(s.oggetto);
  const [corpo, setCorpo] = useState(s.corpo);
  const href = `mailto:${encodeURIComponent(s.a)}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
  return (
    <div className="rounded-medio border border-linea-forte bg-superficie p-3">
      <p className="truncate text-[0.75rem] text-tenue">
        A: <span className="text-inchiostro-2">{s.destinatario}</span> · {s.a}
      </p>
      <input
        value={oggetto}
        onChange={(e) => setOggetto(e.target.value)}
        aria-label="Oggetto"
        className="mt-1.5 w-full border-b border-linea bg-transparent pb-1 text-[0.875rem] font-medium outline-none focus:border-accento"
      />
      <textarea
        value={corpo}
        onChange={(e) => setCorpo(e.target.value)}
        aria-label="Testo della mail"
        rows={Math.min(10, corpo.split("\n").length + 1)}
        className="mt-2 w-full resize-y bg-transparent text-[0.8125rem] leading-relaxed text-inchiostro-2 outline-none"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <a href={href} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-inchiostro px-3.5 text-[0.8125rem] font-medium text-superficie hover:opacity-90">
          <Mail className="size-3.5" strokeWidth={1.9} />
          Apri nella posta
        </a>
        {s.href ? (
          <Link href={s.href} className="inline-flex h-8 items-center rounded-full border border-linea-forte px-3 text-[0.8125rem] hover:bg-superficie-2">
            Scheda cliente
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function SchedaRisposta({ s, onVai }: { s: Scheda; onVai: () => void }) {
  if (s.tipo === "mail") return <SchedaMail s={s} />;
  if (s.tipo === "telefono") {
    return (
      <div className="rounded-medio border border-linea-forte bg-superficie p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] font-medium">{s.titolo}</p>
            {s.sottotitolo ? <p className="truncate text-[0.75rem] text-tenue">{s.sottotitolo}</p> : null}
          </div>
          {s.href ? (
            <Link href={s.href} onClick={onVai} className="shrink-0 text-[0.75rem] text-tenue hover:text-inchiostro">
              Apri scheda
            </Link>
          ) : null}
        </div>
        {s.numeri.length ? (
          <ul className="mt-2 flex flex-col gap-1.5">
            {s.numeri.map((n) => (
              <li key={n.numero}>
                <a
                  href={`tel:${n.numero.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-2.5 rounded-full bg-inchiostro py-1.5 pl-1.5 pr-3.5 text-superficie hover:opacity-90"
                >
                  <span className="grid size-6 place-items-center rounded-full bg-white/15">
                    <Phone className="size-3.5" strokeWidth={2} />
                  </span>
                  <span className="numeri text-[0.875rem] font-medium">{n.numero}</span>
                  <span className="ml-auto truncate text-[0.75rem] opacity-70">{n.etichetta}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }
  const Icona = ICONE[s.icona];
  return (
    <Link
      href={s.href}
      onClick={onVai}
      className="group flex items-center gap-2.5 rounded-medio border border-linea bg-superficie px-3 py-2 transition-colors hover:border-linea-forte hover:bg-superficie-2/60"
    >
      <Icona aria-hidden className="size-4 shrink-0 text-tenue" strokeWidth={1.7} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.875rem]">{s.titolo}</span>
        {s.sottotitolo ? <span className="block truncate text-[0.75rem] text-tenue">{s.sottotitolo}</span> : null}
      </span>
      {s.nota ? (
        <span className={cn("numeri shrink-0 text-[0.75rem]", s.allarme ? "font-medium text-[#a4472f]" : "text-tenue")}>{s.nota}</span>
      ) : null}
      <ChevronRight className="size-3.5 shrink-0 text-tenue transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
    </Link>
  );
}

/**
 * Assistente dello studio: pulsante con la persona in basso a destra e pannello di dialogo.
 * Capisce comandi in italiano (chiamare, scrivere, aprire, cercare file, scadenze) e propone
 * azioni da confermare. L'interprete è in lib/assistente/interprete.ts e si può sostituire con un'AI.
 */
export function Assistente() {
  const [aperto, setAperto] = useState(false);
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [testo, setTesto] = useState("");
  const [ascolto, setAscolto] = useState(false);
  const [voce, setVoce] = useState(false);
  const contatore = useRef(0);
  const campo = useRef<HTMLInputElement>(null);
  const fondo = useRef<HTMLDivElement>(null);
  const riconoscimento = useRef<Riconoscimento | null>(null);

  // Microfono disponibile solo se il browser lo supporta (si controlla dopo il montaggio)
  useEffect(() => {
    const disponibile = !!creaRiconoscimento();
    const t = setTimeout(() => setVoce(disponibile), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!aperto) return;
    const t = setTimeout(() => campo.current?.focus(), 120);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAperto(false);
    window.addEventListener("keydown", esc);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", esc);
    };
  }, [aperto]);

  useEffect(() => {
    fondo.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messaggi]);

  function apri() {
    setAperto(true);
    // Prepara i dati in anticipo, così la prima risposta è immediata
    void leggiIndice();
  }

  async function invia(frase: string) {
    const pulita = frase.trim();
    if (!pulita) return;
    setTesto("");
    const mio = ++contatore.current;
    const risposta = ++contatore.current;
    setMessaggi((m) => [...m, { id: mio, da: "io", testo: pulita }, { id: risposta, da: "assistente", testo: "", attesa: true }]);
    const aggiorna = (dati: Partial<Messaggio>) => setMessaggi((m) => m.map((x) => (x.id === risposta ? { ...x, ...dati } : x)));

    const dati = await leggiIndice();
    if (!dati) {
      aggiorna({ testo: "L'assistente non è disponibile per il tuo profilo.", attesa: false });
      return;
    }
    const oggi = new Date();
    const iso = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, "0")}-${String(oggi.getDate()).padStart(2, "0")}`;
    const r = interpreta(pulita, { indice: dati, oggi: iso });
    if (r.cercaDocumenti) {
      aggiorna({ testo: r.testo });
      const trovati = await cercaDocumentiAssistente(r.cercaDocumenti);
      aggiorna({
        testo: trovati.length ? (trovati.length === 1 ? "Ho trovato questo file:" : `Ho trovato ${trovati.length} file:`) : `Nessun file corrisponde a «${r.cercaDocumenti}».`,
        documenti: trovati,
        attesa: false,
      });
      return;
    }
    aggiorna({ testo: r.testo, schede: r.schede, attesa: false });
  }

  function invio(e: FormEvent) {
    e.preventDefault();
    invia(testo);
  }

  function scorciatoia(s: (typeof SCORCIATOIE)[number]) {
    if (s.invia) return invia(s.testo);
    setTesto(s.testo);
    campo.current?.focus();
  }

  function detta() {
    if (ascolto) {
      riconoscimento.current?.stop();
      return;
    }
    const r = creaRiconoscimento();
    if (!r) return;
    r.lang = "it-IT";
    r.interimResults = true;
    r.continuous = false;
    let finale = "";
    r.onresult = (e) => {
      let parziale = "";
      for (let i = 0; i < e.results.length; i++) {
        const risultato = e.results[i];
        if (risultato.isFinal) finale = risultato[0].transcript;
        else parziale += risultato[0].transcript;
      }
      setTesto(finale || parziale);
    };
    r.onend = () => {
      setAscolto(false);
      if (finale) invia(finale);
    };
    r.onerror = () => setAscolto(false);
    riconoscimento.current = r;
    setAscolto(true);
    r.start();
  }

  const chiudi = () => setAperto(false);

  return (
    <>
      {/* Pulsante: in basso a destra; su telefono sopra la barra di navigazione */}
      <button
        type="button"
        onClick={() => (aperto ? chiudi() : apri())}
        aria-expanded={aperto}
        aria-label={aperto ? "Chiudi l'assistente" : "Assistente dello studio"}
        data-suggerimento={aperto ? undefined : "Assistente dello studio"}
        className="pulsante-nuovo assistente-pulsante fixed right-4 z-30 grid size-14 place-items-center rounded-full lg:bottom-6 lg:right-6 lg:z-40"
        style={{ background: "linear-gradient(145deg, #4a4642 0%, #2b2a28 100%)", ["--ombra" as string]: "43,42,40" }}
      >
        {aperto ? <X className="size-6" strokeWidth={1.9} /> : <UserRound className="size-6" strokeWidth={1.8} />}
      </button>

      {/* Velo su telefono */}
      <div
        aria-hidden
        onClick={chiudi}
        className={cn(
          "fixed inset-0 z-[60] bg-inchiostro/30 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden",
          aperto ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Pannello: foglio dal basso su telefono, finestra sopra il pulsante su schermi grandi */}
      <section
        role="dialog"
        aria-label="Assistente dello studio"
        aria-hidden={!aperto}
        className={cn(
          "pb-sicuro fixed inset-x-0 bottom-0 z-[61] flex max-h-[82dvh] flex-col rounded-t-[22px] border border-linea-forte bg-sfondo shadow-[0_-20px_50px_-20px_rgba(43,42,40,0.45)] transition-[transform,opacity] duration-300 ease-out",
          "lg:inset-x-auto lg:bottom-24 lg:right-6 lg:z-40 lg:max-h-[min(640px,calc(100dvh-8rem))] lg:w-[400px] lg:rounded-[20px] lg:pb-0 lg:shadow-[0_30px_60px_-24px_rgba(43,42,40,0.5)]",
          aperto ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
        )}
      >
        <header className="flex items-center gap-2.5 border-b border-linea px-4 py-3">
          <span className="grid size-8 place-items-center rounded-full bg-inchiostro text-superficie">
            <UserRound className="size-4" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.9375rem] font-medium leading-tight">Assistente dello studio</p>
            <p className="text-[0.75rem] text-tenue">Chiama, scrivi, trova, controlla le scadenze</p>
          </div>
          {messaggi.length ? (
            <button type="button" onClick={() => setMessaggi([])} className="text-[0.75rem] text-tenue hover:text-inchiostro">
              Pulisci
            </button>
          ) : null}
          <button type="button" onClick={chiudi} aria-label="Chiudi" className="grid size-8 place-items-center rounded-full text-tenue hover:bg-superficie-2 hover:text-inchiostro">
            <X className="size-4" strokeWidth={1.9} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {!messaggi.length ? (
            <div className="flex flex-col gap-3 py-2">
              <p className="text-[0.875rem] text-inchiostro-2">Cosa posso fare per te? Scrivi o detta un comando, oppure parti da qui:</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {messaggi.map((m) =>
                m.da === "io" ? (
                  <li key={m.id} className="ml-10 self-end rounded-[16px] rounded-br-[4px] bg-inchiostro px-3.5 py-2 text-[0.875rem] text-superficie">
                    {m.testo}
                  </li>
                ) : (
                  <li key={m.id} className="mr-4 flex flex-col gap-2">
                    {m.testo ? <p className="whitespace-pre-line text-[0.875rem] text-inchiostro-2">{m.testo}</p> : null}
                    {m.attesa ? <Loader2 className="size-4 animate-spin text-tenue" /> : null}
                    {m.schede?.map((s, i) => <SchedaRisposta key={i} s={s} onVai={chiudi} />)}
                    {m.documenti?.map((d) => {
                      const Icona = d.foto ? FileImage : FileText;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => apriDocumento(d.storagePath, () => undefined)}
                          className="flex items-center gap-2.5 rounded-medio border border-linea bg-superficie px-3 py-2 text-left transition-colors hover:border-linea-forte hover:bg-superficie-2/60"
                        >
                          <Icona aria-hidden className="size-4 shrink-0 text-tenue" strokeWidth={1.7} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.875rem]">{d.nome}</span>
                            <span className="block truncate text-[0.75rem] text-tenue">
                              {d.provenienza} · {formattaData(d.data)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </li>
                ),
              )}
            </ul>
          )}
          <div ref={fondo} />
        </div>

        <div className="border-t border-linea px-3 pb-3 pt-2.5">
          <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
            {SCORCIATOIE.map((s) => (
              <button
                key={s.etichetta}
                type="button"
                onClick={() => scorciatoia(s)}
                className="shrink-0 whitespace-nowrap rounded-full border border-linea-forte px-2.5 py-1 text-[0.75rem] text-inchiostro-2 transition-colors hover:bg-superficie-2"
              >
                {s.etichetta}
              </button>
            ))}
          </div>
          <form onSubmit={invio} className="flex items-center gap-1.5 rounded-full border border-linea-forte bg-superficie py-1 pl-4 pr-1 focus-within:border-accento focus-within:ring-2 focus-within:ring-accento/20">
            <input
              ref={campo}
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              placeholder={ascolto ? "Ti ascolto…" : "Scrivi o detta un comando"}
              aria-label="Comando per l'assistente"
              enterKeyHint="send"
              className="campo-assistente h-9 min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none"
            />
            {voce ? (
              <button
                type="button"
                onClick={detta}
                aria-label={ascolto ? "Smetti di ascoltare" : "Detta"}
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full transition-colors",
                  ascolto ? "animate-pulse bg-[#a4472f] text-white" : "text-tenue hover:bg-superficie-2 hover:text-inchiostro",
                )}
              >
                <Mic className="size-4" strokeWidth={1.9} />
              </button>
            ) : null}
            <button
              type="submit"
              disabled={!testo.trim()}
              aria-label="Invia"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-inchiostro text-superficie transition-opacity disabled:opacity-30"
            >
              <ArrowUp className="size-4" strokeWidth={2.2} />
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
