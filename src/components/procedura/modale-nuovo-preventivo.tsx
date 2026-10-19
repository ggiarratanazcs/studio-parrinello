"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { ProceduraNuovoPreventivo } from "@/app/(studio)/nuova/preventivo/procedura";
import { Messaggio } from "@/components/campo";
import { TestataModale } from "@/components/modale";
import { CaricamentoProcedura } from "@/components/procedura/caricamento";
import { preparaNuovoPreventivo } from "@/lib/azioni";
import { FONDI } from "@/lib/fondi";
import { cn } from "@/lib/utils";

type Fonte = { da?: string; commessa?: string };
type Preparato = Extract<Awaited<ReturnType<typeof preparaNuovoPreventivo>>, { ok: true }>;

/**
 * Nuovo preventivo in una finestra sopra quella corrente (scheda di pre-fattibilità o commessa),
 * precompilato con committente, immobile e tutti i dati disponibili dalla pratica di partenza.
 * Si chiude con la X o con Esc senza chiudere la finestra sottostante.
 */
export function ModaleNuovoPreventivo({ fonte, onChiudi }: { fonte: Fonte; onChiudi: () => void }) {
  const router = useRouter();
  const [preparato, setPreparato] = useState<Preparato | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const pannello = useRef<HTMLDivElement>(null);
  const chiudi = useRef(onChiudi);
  useEffect(() => {
    chiudi.current = onChiudi;
  }, [onChiudi]);

  useEffect(() => {
    let attivo = true;
    preparaNuovoPreventivo(fonte).then((r) => {
      if (!attivo) return;
      if (r.ok) setPreparato(r);
      else setErrore(r.errore);
    });
    return () => {
      attivo = false;
    };
    // la fonte non cambia mentre la finestra è aperta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Esc chiude solo questa finestra: intercettato prima della finestra sottostante
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        chiudi.current();
      }
    };
    window.addEventListener("keydown", esc, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    pannello.current?.focus();
    return () => {
      window.removeEventListener("keydown", esc, true);
      document.body.style.overflow = overflow;
    };
  }, []);

  const etichetta = fonte.commessa ? "Nuovo preventivo integrativo" : "Nuovo preventivo dalla pre-fattibilità";

  // Portale su body: la finestra non resta "dentro" quella sottostante (scorrimenti e ritagli)
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-inchiostro/45 backdrop-blur-[3px] md:p-8 lg:p-14">
      <div
        ref={pannello}
        role="dialog"
        aria-modal="true"
        aria-label={etichetta}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-[1280px] flex-col overflow-hidden bg-sfondo outline-none md:rounded-l md:shadow-[0_40px_90px_-24px_rgba(43,42,40,0.65)]"
      >
        <TestataModale etichetta={etichetta} tipo="preventivo">
          <button
            type="button"
            onClick={onChiudi}
            className="grid size-9 place-items-center rounded-full bg-white/10 text-[#f3ece0] backdrop-blur-md transition-colors hover:bg-white/20"
            data-suggerimento="Chiudi senza salvare (Esc)"
            data-suggerimento-lato="sotto"
          >
            <X className="size-5" strokeWidth={1.8} />
            <span className="sr-only">Chiudi</span>
          </button>
        </TestataModale>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-6 md:px-8">
          {errore ? (
            <Messaggio tipo="errore">{errore}</Messaggio>
          ) : preparato ? (
            <ProceduraNuovoPreventivo
              dati={preparato.dati}
              oggi={preparato.oggi}
              origine={preparato.origine}
              onCreato={(id) => {
                onChiudi();
                router.push(`/preventivi/${id}`);
              }}
            />
          ) : (
            <CaricamentoProcedura />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Pulsante a pillola (stile "nuovo") che apre il preventivo in finestra. */
export function PulsanteNuovoPreventivo({ fonte, children }: { fonte: Fonte; children: ReactNode }) {
  const [aperto, setAperto] = useState(false);
  const f = FONDI.preventivo;
  return (
    <>
      <button
        type="button"
        onClick={() => setAperto(true)}
        className={cn("pulsante-nuovo inline-flex h-11 items-center gap-2.5 rounded-full py-1 pl-1.5 pr-5 text-[0.9375rem] font-medium")}
        style={{ background: `linear-gradient(145deg, ${f.chiaro} 0%, ${f.base} 100%)`, ["--ombra" as string]: f.rgb } as CSSProperties}
      >
        <span aria-hidden className="pallino-piu grid size-8 place-items-center rounded-full">
          <Plus className="size-4" strokeWidth={2.2} />
        </span>
        {children}
      </button>
      {aperto ? <ModaleNuovoPreventivo fonte={fonte} onChiudi={() => setAperto(false)} /> : null}
    </>
  );
}
