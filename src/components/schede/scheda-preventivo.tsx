import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Pannello } from "@/components/ui";
import { leggiPreventivo } from "@/lib/dati";
import { TIPI_CLIENTE, TIPOLOGIE_INTERVENTO } from "@/lib/dominio";
import { METODI_CALCOLO, STATI_PREVENTIVO, calcolaTotali } from "@/lib/preventivo";
import { formattaData, formattaEuro } from "@/lib/utils";
import { AzioniPratica } from "./azioni-pratica";
import { EsportaPreventivo } from "./esporta-preventivo";
import { Blocco, Dato, TestataScheda, UUID } from "./comuni";

export async function SchedaPreventivo({ id }: { id: string }) {
  if (!UUID.test(id)) notFound();
  const p = await leggiPreventivo(id);
  if (!p) notFound();

  const stato = STATI_PREVENTIVO[p.stato] ?? STATI_PREVENTIVO.bozza;
  const voci = p.voci ?? [];
  const t = calcolaTotali(
    voci.map((v) => ({ importo: v.importo ?? 0, opzionale: v.opzionale })),
    { sconto: p.sconto_pct ?? 0, spese: p.spese_pct ?? 0, cassa: p.cassa_pct, iva: p.iva_pct, ritenuta: p.ritenuta_pct ?? 0 },
  );
  const scadenza = new Date(p.data_emissione);
  scadenza.setDate(scadenza.getDate() + p.validita_giorni);
  const responsabile = p.responsabile ? `${p.responsabile.nome} ${p.responsabile.cognome}`.trim() : null;

  return (
    <>
      <TestataScheda
        sigla={`Preventivo ${p.numero ?? ""}`}
        titolo={p.titolo ?? p.oggetto ?? "Preventivo"}
        sottotitolo={[p.cliente?.denominazione, p.immobile?.comune].filter(Boolean).join(", ")}
        celle={[
          { etichetta: "Stato", valore: <Badge etichetta={stato.etichetta} colore={stato.colore} /> },
          { etichetta: "Emesso il", valore: formattaData(p.data_emissione) },
          { etichetta: "Totale", valore: formattaEuro(t.totale) },
        ]}
        azioni={
          <div className="flex w-full flex-col gap-3">
            <EsportaPreventivo id={p.id} numero={p.numero} />
            <AzioniPratica tipo="preventivo" id={p.id} stato={p.stato} convertita={Boolean(p.commessa)} />
          </div>
        }
      />

      {p.commessa ? (
        <p className="mb-6 rounded-m bg-accento-tenue px-4 py-3 text-[0.9375rem]">
          Trasformato in commessa{" "}
          <Link href={`/commesse/${p.commessa.id}`} className="font-medium text-accento hover:underline">
            {p.commessa.codice}
          </Link>
          {p.data_conversione ? ` il ${formattaData(p.data_conversione)}` : ""}.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <Pannello>
          <h2 className="border-b border-linea px-5 py-4 text-base font-medium md:px-6">Voci</h2>
          {voci.length === 0 ? (
            <p className="px-5 py-8 text-[0.9375rem] text-tenue md:px-6">Nessuna voce.</p>
          ) : (
            <ul className="divide-y divide-linea">
              {voci.map((v) => (
                <li key={v.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 px-5 py-3.5 md:px-6">
                  <span className="min-w-0">
                    <span className="block">{v.descrizione}</span>
                    {v.ore_stimate || v.opzionale ? (
                      <span className="block text-sm text-tenue">
                        {[v.ore_stimate ? `${v.ore_stimate} ore stimate` : null, v.opzionale ? "opzionale" : null].filter(Boolean).join(", ")}
                      </span>
                    ) : null}
                  </span>
                  <span className="numeri text-[0.9375rem]">{formattaEuro(v.importo)}</span>
                </li>
              ))}
            </ul>
          )}
          <dl className="numeri grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 border-t border-linea px-5 py-5 text-[0.9375rem] md:px-6">
            <dt className="text-tenue">Subtotale</dt><dd className="text-right">{formattaEuro(t.subtotale)}</dd>
            {t.sconto ? (<><dt className="text-tenue">Sconto {p.sconto_pct}%</dt><dd className="text-right">− {formattaEuro(t.sconto)}</dd></>) : null}
            {t.spese ? (<><dt className="text-tenue">Spese {p.spese_pct}%</dt><dd className="text-right">{formattaEuro(t.spese)}</dd></>) : null}
            <dt className="text-tenue">Imponibile</dt><dd className="text-right">{formattaEuro(t.imponibile)}</dd>
            <dt className="text-tenue">Cassa {p.cassa_pct}%</dt><dd className="text-right">{formattaEuro(t.cassa)}</dd>
            <dt className="text-tenue">IVA {p.iva_pct}%</dt><dd className="text-right">{formattaEuro(t.iva)}</dd>
            <dt className="border-t border-linea-forte pt-1.5 font-medium">Totale documento</dt>
            <dd className="border-t border-linea-forte pt-1.5 text-right font-medium">{formattaEuro(t.totale)}</dd>
            {t.ritenuta ? (<><dt className="text-tenue">Netto dopo ritenuta {p.ritenuta_pct}%</dt><dd className="text-right">{formattaEuro(t.netto)}</dd></>) : null}
          </dl>
          {p.oggetto || p.condizioni_pagamento || p.note ? (
            <div className="flex flex-col gap-4 border-t border-linea px-5 py-5 md:px-6">
              {p.oggetto ? <Testo titolo="Oggetto della prestazione" testo={p.oggetto} /> : null}
              {p.condizioni_pagamento ? <Testo titolo="Condizioni di pagamento" testo={p.condizioni_pagamento} /> : null}
              {p.note ? <Testo titolo="Note" testo={p.note} /> : null}
            </div>
          ) : null}
        </Pannello>

        <div className="flex flex-col gap-6">
          <Blocco titolo="Offerta">
            <Dato etichetta="Metodo di calcolo" valore={METODI_CALCOLO[p.metodo_calcolo]} />
            <Dato etichetta="Committenza" valore={p.committenza === "pubblica" ? "Pubblica" : "Privata"} />
            <Dato etichetta="Intervento" valore={TIPOLOGIE_INTERVENTO[p.tipologia_intervento ?? ""]} />
            <Dato etichetta="Importo lavori" valore={p.importo_lavori != null ? formattaEuro(p.importo_lavori) : null} />
            <Dato etichetta="Valido fino al" valore={formattaData(scadenza.toISOString())} />
            <Dato etichetta="Inviato il" valore={p.data_invio ? formattaData(p.data_invio) : null} />
            <Dato etichetta="Esito il" valore={p.data_esito ? formattaData(p.data_esito) : null} />
            <Dato etichetta="Responsabile" valore={responsabile} />
            <Dato etichetta="Dalla pre-fattibilità" valore={p.origine?.numero} href={p.origine ? `/prefattibilita/${p.origine.id}` : undefined} />
          </Blocco>
          <Blocco titolo="Committente">
            <Dato etichetta={TIPI_CLIENTE[p.cliente?.tipo ?? ""] ?? "Committente"} valore={p.cliente?.denominazione} />
            <Dato etichetta="Email" valore={p.cliente?.email} />
            <Dato etichetta="Telefono" valore={p.cliente?.telefono} />
            <Dato etichetta="PEC" valore={p.cliente?.pec} />
            <Dato etichetta="Immobile" valore={p.immobile ? p.immobile.denominazione ?? `${p.immobile.indirizzo}, ${p.immobile.comune}` : "Da definire"} />
          </Blocco>
        </div>
      </div>
    </>
  );
}

function Testo({ titolo, testo }: { titolo: string; testo: string }) {
  return (
    <div>
      <h3 className="etichetta">{titolo}</h3>
      <p className="mt-1.5 max-w-prose whitespace-pre-line text-[0.9375rem]">{testo}</p>
    </div>
  );
}
