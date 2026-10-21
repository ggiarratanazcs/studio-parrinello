"use client";

import { useSyncExternalStore } from "react";
import { CHIAVE_IMPAGINAZIONE, IMPAGINAZIONE_PREDEFINITA, IMPAGINAZIONI, type IdImpaginazione } from "@/lib/impaginazione";
import { CHIAVE_TEMA, TEMA_PREDEFINITO, TEMI, type IdTema } from "@/lib/temi";
import { cn } from "@/lib/utils";

/**
 * Aspetto dell'app su questo dispositivo: impaginazione e tema, in due righe compatte.
 * Le scelte sono attributi di <html> (data-impaginazione, data-theme) salvati nel browser.
 */

function useAttributo<T extends string>(attributo: string, predefinito: T) {
  return useSyncExternalStore(
    (aggiorna) => {
      const o = new MutationObserver(aggiorna);
      o.observe(document.documentElement, { attributes: true, attributeFilter: [attributo] });
      return () => o.disconnect();
    },
    () => (document.documentElement.getAttribute(attributo) as T) ?? predefinito,
    () => predefinito,
  );
}

function imposta(attributo: string, chiave: string, valore: string) {
  document.documentElement.setAttribute(attributo, valore);
  try {
    localStorage.setItem(chiave, valore);
  } catch {
    // Archiviazione non disponibile: la scelta vale fino alla chiusura della pagina
  }
}

/** Colori di anteprima dei temi (fondo scuro e accento). */
const CAMPIONI: Partial<Record<IdTema, string[]>> = {
  caldo: ["#2e2b27", "#8a5a2b"],
  navy: ["#13213a", "#2d5893"],
};

export function SceltaAspetto() {
  const impaginazione = useAttributo<IdImpaginazione>("data-impaginazione", IMPAGINAZIONE_PREDEFINITA);
  const tema = useAttributo<IdTema>("data-theme", TEMA_PREDEFINITO);
  const descrizione = IMPAGINAZIONI.find((i) => i.id === impaginazione)?.descrizione;

  return (
    <div className="flex flex-col gap-4">
      <Riga etichetta="Impaginazione" nota={descrizione}>
        {IMPAGINAZIONI.map((i) => (
          <Opzione key={i.id} scelta={i.id === impaginazione} onClick={() => imposta("data-impaginazione", CHIAVE_IMPAGINAZIONE, i.id)}>
            {i.nome}
          </Opzione>
        ))}
      </Riga>
      <Riga etichetta="Tema" nota={TEMI.find((t) => t.id === tema)?.descrizione}>
        {TEMI.map((t) => (
          <Opzione key={t.id} scelta={t.id === tema} disabilitata={!t.disponibile} onClick={() => imposta("data-theme", CHIAVE_TEMA, t.id)}>
            {CAMPIONI[t.id] ? (
              <span aria-hidden className="flex -space-x-1">
                {CAMPIONI[t.id]!.map((c) => (
                  <span key={c} className="size-3 rounded-full border border-superficie" style={{ background: c }} />
                ))}
              </span>
            ) : null}
            {t.nome}
            {!t.disponibile ? <span className="text-[0.75rem] font-normal">· in arrivo</span> : null}
          </Opzione>
        ))}
      </Riga>
      <p className="text-[0.8125rem] text-tenue">Le scelte valgono su questo dispositivo.</p>
    </div>
  );
}

/** Riepilogo per l'intestazione della sezione: "Materia · Navy". */
export function RiepilogoAspetto() {
  const impaginazione = useAttributo<IdImpaginazione>("data-impaginazione", IMPAGINAZIONE_PREDEFINITA);
  const tema = useAttributo<IdTema>("data-theme", TEMA_PREDEFINITO);
  return (
    <>
      {IMPAGINAZIONI.find((i) => i.id === impaginazione)?.nome} · {TEMI.find((t) => t.id === tema)?.nome}
    </>
  );
}

function Riga({ etichetta, nota, children }: { etichetta: string; nota?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 md:grid-cols-[8rem_minmax(0,1fr)] md:items-start">
      <span className="pt-2 text-[0.875rem] text-inchiostro-2">{etichetta}</span>
      <div>
        <div role="radiogroup" aria-label={etichetta} className="flex w-fit flex-wrap items-center gap-x-5 gap-y-1 border-b border-linea">
          {children}
        </div>
        {nota ? <p className="mt-1.5 text-[0.8125rem] text-tenue">{nota}</p> : null}
      </div>
    </div>
  );
}

function Opzione({ scelta, disabilitata, onClick, children }: { scelta: boolean; disabilitata?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={scelta}
      disabled={disabilitata}
      onClick={onClick}
      className={cn(
        "-mb-px inline-flex h-9 items-center gap-2 border-b-2 text-[0.9375rem] transition-colors duration-200",
        scelta ? "border-inchiostro font-medium text-inchiostro" : "border-transparent text-inchiostro-2 hover:text-inchiostro",
        disabilitata && "cursor-not-allowed text-tenue opacity-60 hover:text-tenue",
      )}
    >
      {children}
    </button>
  );
}
