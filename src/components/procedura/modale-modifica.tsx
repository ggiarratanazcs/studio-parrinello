"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { ProceduraNuovoPreventivo } from "@/app/(studio)/nuova/preventivo/procedura";
import { ProceduraNuovaPrefattibilita } from "@/app/(studio)/nuova/prefattibilita/procedura";
import { Messaggio } from "@/components/campo";
import { TestataModale } from "@/components/modale";
import { CaricamentoProcedura } from "@/components/procedura/caricamento";
import { preparaModifica } from "@/lib/azioni";

type Preparato = Extract<Awaited<ReturnType<typeof preparaModifica>>, { ok: true }>;

/**
 * Modifica di un preventivo o di una pre-fattibilità in una finestra sopra la scheda:
 * la stessa procedura della creazione, già compilata. Si chiude con la X o con Esc senza salvare.
 */
export function ModaleModifica({ tipo, id, onChiudi }: { tipo: "preventivo" | "prefattibilita"; id: string; onChiudi: () => void }) {
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
    preparaModifica(tipo, id).then((r) => {
      if (!attivo) return;
      if (r.ok) setPreparato(r);
      else setErrore(r.errore);
    });
    return () => {
      attivo = false;
    };
  }, [tipo, id]);

  useEffect(() => {
    // Esc chiude solo questa finestra, non la scheda sottostante
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

  const numero = preparato?.preventivo?.numero ?? preparato?.prefattibilita?.numero;
  const etichetta = `Modifica ${tipo === "preventivo" ? "preventivo" : "pre-fattibilità"}${numero ? ` ${numero}` : ""}`;
  const salvata = () => {
    onChiudi();
    router.refresh();
  };

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
        <TestataModale etichetta={etichetta} tipo={tipo}>
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
          ) : !preparato ? (
            <CaricamentoProcedura />
          ) : preparato.preventivo ? (
            <ProceduraNuovoPreventivo dati={preparato.dati} oggi={preparato.oggi} origine={null} esistente={preparato.preventivo} onCreato={salvata} />
          ) : preparato.prefattibilita ? (
            <ProceduraNuovaPrefattibilita dati={preparato.dati} oggi={preparato.oggi} esistente={preparato.prefattibilita} onSalvata={salvata} />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
