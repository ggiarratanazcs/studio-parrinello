import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Cartiglio } from "@/components/cartiglio";
import { Pannello, Pulsante, Scheletro, StatoBadge, Vuoto } from "@/components/ui";
import { elencoCommesse } from "@/lib/dati";
import { TIPOLOGIE_INTERVENTO } from "@/lib/dominio";
import { formattaData, formattaEuro } from "@/lib/utils";

export const metadata = { title: "Commesse" };

const nuovaCommessa = (
  <Pulsante disabled title="Disponibile nel prossimo rilascio">
    <Plus className="size-4" strokeWidth={2} />
    Nuova commessa
  </Pulsante>
);

export default function PaginaCommesse() {
  return (
    <Suspense
      fallback={
        <>
          <Cartiglio titolo="Commesse" azioni={nuovaCommessa} />
          <Pannello className="p-6">
            <Scheletro className="h-4 w-full" />
            <Scheletro className="mt-4 h-4 w-5/6" />
            <Scheletro className="mt-4 h-4 w-4/6" />
          </Pannello>
        </>
      }
    >
      <ElencoCommesse />
    </Suspense>
  );
}

async function ElencoCommesse() {
  const commesse = await elencoCommesse();
  const pubbliche = commesse.filter((c) => c.committenza === "pubblica").length;

  return (
    <>
      <Cartiglio
        titolo="Commesse"
        sottotitolo="Ogni incarico dello studio, dal primo contatto alla chiusura."
        celle={[
          { etichetta: "Totale", valore: commesse.length },
          { etichetta: "Private", valore: commesse.length - pubbliche },
          { etichetta: "Pubbliche", valore: pubbliche },
        ]}
        azioni={nuovaCommessa}
      />

      <Pannello>
        {commesse.length === 0 ? (
          <Vuoto
            titolo="Ancora nessuna commessa"
            testo={
              <>
                Una commessa nasce dal primo contatto con il committente. Con il prossimo rilascio potrai
                crearla qui: il codice viene assegnato in automatico (per esempio{" "}
                <span className="numeri text-inchiostro">2026-001</span>).
              </>
            }
          />
        ) : (
          <table className="w-full text-left">
            <thead className="hidden border-b border-linea md:table-header-group">
              <tr className="etichetta">
                <th className="px-6 py-3 font-medium">Codice</th>
                <th className="px-3 py-3 font-medium">Commessa</th>
                <th className="px-3 py-3 font-medium">Intervento</th>
                <th className="px-3 py-3 text-right font-medium">Onorario</th>
                <th className="px-3 py-3 font-medium">Apertura</th>
                <th className="px-6 py-3 font-medium">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {commesse.map((c) => (
                <tr key={c.id} className="grid grid-cols-[1fr_auto] gap-1 px-5 py-4 md:table-row md:px-0 md:py-0">
                  <td className="numeri etichetta col-start-1 row-start-1 md:px-6 md:py-4">{c.codice}</td>
                  <td className="col-span-2 row-start-2 min-w-0 md:px-3 md:py-4">
                    <span className="block truncate font-medium">{c.titolo}</span>
                    <span className="block truncate text-sm text-tenue">
                      {[c.cliente, c.comune].filter(Boolean).join(", ")}
                    </span>
                  </td>
                  <td className="hidden text-sm text-inchiostro-2 md:table-cell md:px-3 md:py-4">
                    {TIPOLOGIE_INTERVENTO[c.tipologia_intervento ?? ""] ?? "—"}
                  </td>
                  <td className="numeri hidden text-right text-sm md:table-cell md:px-3 md:py-4">
                    {formattaEuro(c.onorario_concordato)}
                  </td>
                  <td className="numeri hidden text-sm text-inchiostro-2 md:table-cell md:px-3 md:py-4">
                    {formattaData(c.data_apertura)}
                  </td>
                  <td className="col-start-2 row-start-1 justify-self-end md:px-6 md:py-4">
                    <StatoBadge stato={c.stato} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Pannello>
    </>
  );
}
