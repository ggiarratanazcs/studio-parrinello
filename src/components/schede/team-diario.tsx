"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck2,
  Footprints,
  Gavel,
  Loader2,
  Mail,
  NotebookPen,
  Phone,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { AreaTesto, Campo, Messaggio, Selezione } from "@/components/campo";
import type { Icona } from "@/components/pallino";
import { Pulsante } from "@/components/ui";
import { aggiungiMembro, aggiungiNota, eliminaNota, rimuoviMembro } from "@/lib/azioni";
import type { Commessa } from "@/lib/dati";
import { cn } from "@/lib/utils";

type Membro = NonNullable<Commessa["team"]>[number];
type Nota = NonNullable<Commessa["diario"]>[number];
type Profilo = Commessa["profiliStudio"][number];

const RUOLI_COMMESSA = [
  "Progettista",
  "Direttore dei lavori",
  "Coordinatore sicurezza (CSP)",
  "Coordinatore sicurezza (CSE)",
  "Disegnatore",
  "Rilievo",
  "Modellazione BIM",
  "Pratiche edilizie",
];

/* ── Team di commessa ─────────────────────────────────────────────────── */

export function TeamCommessa({ commessaId, team, profili }: { commessaId: string; team: Membro[]; profili: Profilo[] }) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [aperto, setAperto] = useState(false);
  const [persona, setPersona] = useState("");
  const [ruolo, setRuolo] = useState("");
  const [errore, setErrore] = useState<string | null>(null);

  const liberi = profili.filter((p) => !team.some((m) => m.profilo_id === p.id));

  function esegui(azione: () => Promise<{ ok: boolean; errore?: string }>, dopo?: () => void) {
    setErrore(null);
    avvia(async () => {
      const esito = await azione();
      if (esito.ok) {
        dopo?.();
        router.refresh();
      } else setErrore(esito.errore ?? "Operazione non riuscita.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {team.length === 0 ? <p className="text-[0.9375rem] text-tenue">Nessuno assegnato.</p> : null}
      <ul className="flex flex-col gap-2">
        {team.map((m) => (
          <li key={m.profilo_id} className="group flex items-center gap-3">
            <span className="pallino-tessera grid size-9 shrink-0 place-items-center rounded-full text-[0.75rem] font-medium">
              {m.profilo?.iniziali ?? m.profilo?.nome?.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9375rem]">
                {m.profilo?.nome} {m.profilo?.cognome}
              </span>
              {m.ruolo_commessa ? <span className="block truncate text-sm text-tenue">{m.ruolo_commessa}</span> : null}
            </span>
            <button
              type="button"
              onClick={() => esegui(() => rimuoviMembro(commessaId, m.profilo_id))}
              disabled={inCorso}
              aria-label={`Togli ${m.profilo?.nome} dal team`}
              data-suggerimento="Togli dal team"
              className="grid size-8 place-items-center rounded-full text-tenue opacity-60 transition hover:bg-superficie-2 hover:text-inchiostro group-hover:opacity-100"
            >
              <X className="size-4" strokeWidth={1.8} />
            </button>
          </li>
        ))}
      </ul>

      {aperto ? (
        <div className="grid gap-3 rounded-m bg-superficie-2/70 p-3">
          <Selezione etichetta="Persona" id={`team-p-${commessaId}`} value={persona} onChange={(e) => setPersona(e.target.value)}>
            <option value="">Scegli…</option>
            {liberi.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} {p.cognome}
              </option>
            ))}
          </Selezione>
          <Campo
            etichetta="Ruolo nella commessa"
            id={`team-r-${commessaId}`}
            list={`ruoli-${commessaId}`}
            value={ruolo}
            onChange={(e) => setRuolo(e.target.value)}
            placeholder="es. Direttore dei lavori"
          />
          <datalist id={`ruoli-${commessaId}`}>
            {RUOLI_COMMESSA.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          <div className="flex justify-end gap-2">
            <Pulsante type="button" variante="discreto" onClick={() => setAperto(false)} disabled={inCorso}>
              Annulla
            </Pulsante>
            <Pulsante
              type="button"
              disabled={inCorso || !persona}
              onClick={() =>
                esegui(
                  () => aggiungiMembro(commessaId, persona, ruolo),
                  () => {
                    setAperto(false);
                    setPersona("");
                    setRuolo("");
                  },
                )
              }
            >
              {inCorso ? <Loader2 className="size-4 animate-spin" /> : null}
              Aggiungi
            </Pulsante>
          </div>
        </div>
      ) : liberi.length ? (
        <Pulsante type="button" variante="discreto" className="-ml-3 w-fit" onClick={() => setAperto(true)}>
          <Plus className="size-4" strokeWidth={2} />
          Aggiungi al team
        </Pulsante>
      ) : null}
      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
    </div>
  );
}

/* ── Diario di commessa ───────────────────────────────────────────────── */

const TIPI: Record<string, { etichetta: string; icona: Icona; colore: string }> = {
  nota: { etichetta: "Nota", icona: NotebookPen, colore: "#8a5a2b" },
  telefonata: { etichetta: "Telefonata", icona: Phone, colore: "#3f5a6b" },
  riunione: { etichetta: "Riunione", icona: Users, colore: "#5c7a4c" },
  sopralluogo: { etichetta: "Sopralluogo", icona: Footprints, colore: "#7a5530" },
  email: { etichetta: "Email / PEC", icona: Mail, colore: "#45535f" },
  decisione: { etichetta: "Decisione", icona: Gavel, colore: "#9a3d2b" },
};

const dataOra = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });

export function DiarioCommessa({ commessaId, diario }: { commessaId: string; diario: Nota[] }) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [tipo, setTipo] = useState("nota");
  const [testo, setTesto] = useState("");
  const [giorno, setGiorno] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [daEliminare, setDaEliminare] = useState<string | null>(null);

  function salva() {
    setErrore(null);
    avvia(async () => {
      const esito = await aggiungiNota(commessaId, { tipo, testo, data: giorno });
      if (esito.ok) {
        setTesto("");
        setGiorno("");
        router.refresh();
      } else setErrore(esito.errore);
    });
  }

  function elimina(id: string) {
    setErrore(null);
    avvia(async () => {
      const esito = await eliminaNota(id);
      if (esito.ok) {
        setDaEliminare(null);
        router.refresh();
      } else setErrore(esito.errore);
    });
  }

  return (
    <div>
      {/* Scrittura */}
      <form
        className="grid gap-3 border-b border-linea px-5 py-4 md:px-6"
        onSubmit={(e) => {
          e.preventDefault();
          salva();
        }}
      >
        <div role="radiogroup" aria-label="Tipo di nota" className="flex flex-wrap gap-2">
          {Object.entries(TIPI).map(([k, t]) => {
            const I = t.icona;
            const scelto = tipo === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={scelto}
                onClick={() => setTipo(k)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition-colors",
                  scelto ? "border-transparent text-white shadow-[0_6px_14px_-8px_rgba(43,42,40,0.6)]" : "border-linea bg-superficie text-inchiostro-2 hover:bg-superficie-2",
                )}
                style={scelto ? { background: t.colore } : undefined}
              >
                <I className="size-4" strokeWidth={1.8} />
                {t.etichetta}
              </button>
            );
          })}
        </div>
        <AreaTesto
          etichetta="Cosa è successo"
          id={`diario-${commessaId}`}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="es. Sopralluogo con l'impresa: confermata la demolizione del tramezzo al piano terra."
          className="min-h-20"
        />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-44">
            <Campo etichetta="Data" id={`diario-data-${commessaId}`} type="date" value={giorno} onChange={(e) => setGiorno(e.target.value)} aiuto="Vuota = oggi" />
          </div>
          <Pulsante type="submit" disabled={inCorso || !testo.trim()}>
            {inCorso ? <Loader2 className="size-4 animate-spin" /> : <CalendarCheck2 className="size-4" strokeWidth={1.8} />}
            Registra
          </Pulsante>
        </div>
        {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
      </form>

      {/* Linea del tempo */}
      {diario.length === 0 ? (
        <p className="px-5 py-6 text-[0.9375rem] text-tenue md:px-6">Ancora nessuna voce nel diario.</p>
      ) : (
        <ol className="relative px-5 py-4 md:px-6">
          <span aria-hidden className="absolute bottom-6 left-[2.35rem] top-6 w-px bg-linea md:left-[2.85rem]" />
          {diario.map((n) => {
            const t = TIPI[n.tipo] ?? TIPI.nota;
            const I = t.icona;
            return (
              <li key={n.id} className="group relative flex gap-4 py-3">
                <span
                  className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full text-white"
                  style={{ background: t.colore, boxShadow: `0 6px 14px -8px ${t.colore}` }}
                >
                  <I className="size-4" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-tenue">
                    <span className="font-medium text-inchiostro-2">{t.etichetta}</span>
                    {" · "}
                    {dataOra.format(new Date(n.data_evento))}
                    {n.autore ? ` · ${n.autore.nome} ${n.autore.cognome}` : null}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[0.9375rem]">{n.testo}</p>
                  {daEliminare === n.id ? (
                    <p className="mt-2 flex items-center gap-2 text-sm">
                      Eliminare questa voce?
                      <Pulsante type="button" variante="secondario" className="h-8 px-3 text-[color:var(--stato-sospesa)]" disabled={inCorso} onClick={() => elimina(n.id)}>
                        Elimina
                      </Pulsante>
                      <Pulsante type="button" variante="discreto" className="h-8 px-3" onClick={() => setDaEliminare(null)}>
                        No
                      </Pulsante>
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setDaEliminare(n.id)}
                  aria-label="Elimina la voce"
                  data-suggerimento="Elimina"
                  className="grid size-8 shrink-0 place-items-center rounded-full text-tenue opacity-0 transition hover:bg-superficie-2 hover:text-inchiostro focus:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-60"
                >
                  <Trash2 className="size-4" strokeWidth={1.8} />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
