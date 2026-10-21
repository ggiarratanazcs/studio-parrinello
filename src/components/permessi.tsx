import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { Pannello, Vuoto } from "@/components/ui";
import { getPermessi, sezioniNascoste } from "@/lib/permessi";

/**
 * Nasconde dal menu (barra laterale, schede in alto, barra del telefono, "Altro")
 * e dal pulsante "+" le sezioni che l'utente non può usare.
 * Il menu fa parte della parte statica della pagina: qui si aggiunge solo una regola di stile.
 */
export async function NascondiSezioni() {
  const { nascoste, senzaCrea } = await sezioniNascoste();
  const selettori = [...nascoste.map((h) => `[data-sezione="${h}"]`), ...senzaCrea.map((h) => `[data-crea="${h}"]`)];
  if (selettori.length === 0) return null;
  return <style>{`${selettori.join(",")}{display:none!important}`}</style>;
}

/** Messaggio al posto della sezione quando l'utente non ha il permesso. */
export function SenzaAccesso({ testo }: { testo?: string }) {
  return (
    <Pannello className="mt-2">
      <Vuoto
        titolo="Questa sezione non è disponibile per il tuo profilo"
        testo={testo ?? "Se ti serve, chiedi al titolare dello studio di abilitarla in Impostazioni → Ruoli e permessi."}
        azione={
          <Link href="/" className="text-[0.9375rem] font-medium text-accento hover:underline">
            Torna alla home
          </Link>
        }
      />
    </Pannello>
  );
}

async function Controllo({ chiave, minimo, children }: { chiave: string; minimo: number; children: ReactNode }) {
  const p = await getPermessi();
  if (p.liv(chiave) < minimo) return <SenzaAccesso />;
  return <>{children}</>;
}

/** Mostra la sezione solo a chi ha almeno il livello richiesto sull'area. */
export function Guardia({ chiave, minimo = 1, children }: { chiave: string; minimo?: number; children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Controllo chiave={chiave} minimo={minimo}>
        {children}
      </Controllo>
    </Suspense>
  );
}
