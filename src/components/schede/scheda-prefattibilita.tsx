import Link from "next/link";
import { notFound } from "next/navigation";
import { Calculator, Check, CircleDot, ClipboardCheck, Minus } from "lucide-react";
import { Pannello } from "@/components/ui";
import { leggiPrefattibilita } from "@/lib/dati";
import { ESITI_PREFATTIBILITA, TIPI_CLIENTE, TIPOLOGIE_INTERVENTO, TITOLI_EDILIZI } from "@/lib/dominio";
import { STATI_PREFATTIBILITA } from "@/lib/preventivo";
import { formattaData, formattaEuro } from "@/lib/utils";
import { AzioniPratica } from "./azioni-pratica";
import { Blocco, Dato, TestataScheda, UUID } from "./comuni";

export async function SchedaPrefattibilita({ id }: { id: string }) {
  if (!UUID.test(id)) notFound();
  const f = await leggiPrefattibilita(id);
  if (!f) notFound();

  const stato = STATI_PREFATTIBILITA[f.stato] ?? STATI_PREFATTIBILITA.in_corso;
  const responsabile = f.responsabile ? `${f.responsabile.nome} ${f.responsabile.cognome}`.trim() : null;
  const controlli = [
    { etichetta: "Accesso agli atti richiesto", valore: f.accesso_atti_richiesto },
    { etichetta: "Stato legittimo verificato", valore: f.stato_legittimo_verificato },
    { etichetta: "Difformità rilevate", valore: f.difformita_rilevate },
    { etichetta: "Sanatoria necessaria", valore: f.sanatoria_necessaria },
  ];

  return (
    <>
      <TestataScheda
        sigla={`Pre-fattibilità ${f.numero ?? ""}`}
        titolo={f.titolo ?? "Pre-fattibilità"}
        sottotitolo={[f.cliente?.denominazione, f.immobile?.comune].filter(Boolean).join(", ")}
        celle={[
          { etichetta: "Stato", valore: stato.etichetta, tinta: stato.colore, icona: CircleDot },
          { etichetta: "Esito", valore: ESITI_PREFATTIBILITA[f.esito ?? ""] ?? "—", icona: ClipboardCheck },
          { etichetta: "Costo opere", valore: formattaEuro(f.costo_opere_stimato), icona: Calculator },
        ]}
        azioni={<AzioniPratica tipo="prefattibilita" id={f.id} stato={f.stato} convertita={Boolean(f.commessa)} />}
      />

      {f.commessa || f.preventivo ? (
        <p className="mb-6 rounded-m bg-accento-tenue px-4 py-3 text-[0.9375rem]">
          {f.preventivo ? (
            <>
              Ha generato il preventivo{" "}
              <Link href={`/preventivi/${f.preventivo.id}`} className="font-medium text-accento hover:underline">{f.preventivo.numero}</Link>
              {f.commessa ? ", " : "."}
            </>
          ) : null}
          {f.commessa ? (
            <>
              {f.preventivo ? "poi la commessa " : "Trasformata in commessa "}
              <Link href={`/commesse/${f.commessa.id}`} className="font-medium text-accento hover:underline">{f.commessa.codice}</Link>.
            </>
          ) : null}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <Pannello className="px-5 py-5 md:px-6">
            <h2 className="mb-4 text-base font-medium">Analisi urbanistica</h2>
            <dl className="grid gap-4 md:grid-cols-2">
              <Dato etichetta="Strumento urbanistico" valore={f.strumento_urbanistico} />
              <Dato etichetta="Zona" valore={f.zona_urbanistica} />
              <Dato etichetta="Titolo edilizio ipotizzato" valore={TITOLI_EDILIZI[f.titolo_edilizio ?? ""]} />
            </dl>
            {f.indici_parametri ? <p className="mt-4 whitespace-pre-line text-[0.9375rem]">{f.indici_parametri}</p> : null}
            <Elenco titolo="Vincoli" voci={f.vincoli ?? []} vuoto="Nessun vincolo segnalato." />
            {f.vincoli_note ? <p className="mt-2 text-sm text-tenue">{f.vincoli_note}</p> : null}
            <Elenco titolo="Pareri e nulla osta" voci={f.pareri_enti ?? []} vuoto="Nessun parere previsto." />
          </Pannello>

          <Pannello className="px-5 py-5 md:px-6">
            <h2 className="mb-4 text-base font-medium">Conformità edilizia</h2>
            <ul className="grid gap-2 md:grid-cols-2">
              {controlli.map((c) => (
                <li key={c.etichetta} className="flex items-center gap-2 text-[0.9375rem]">
                  {c.valore ? <Check className="size-4 text-accento" strokeWidth={2.2} /> : <Minus className="size-4 text-tenue" />}
                  <span className={c.valore ? "" : "text-tenue"}>{c.etichetta}</span>
                </li>
              ))}
            </ul>
            {f.difformita_descrizione ? <p className="mt-4 whitespace-pre-line text-[0.9375rem]">{f.difformita_descrizione}</p> : null}
          </Pannello>

          {f.sintesi ? (
            <Pannello className="px-5 py-5 md:px-6">
              <h2 className="mb-3 text-base font-medium">Sintesi</h2>
              <p className="max-w-prose whitespace-pre-line text-[0.9375rem]">{f.sintesi}</p>
            </Pannello>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <Blocco titolo="Stima">
            <Dato etichetta="Superficie" valore={f.superficie_intervento_mq != null ? `${f.superficie_intervento_mq} mq` : null} />
            <Dato etichetta="Costo parametrico" valore={f.costo_parametrico_mq != null ? `${formattaEuro(f.costo_parametrico_mq)}/mq` : null} />
            <Dato etichetta="Costo opere stimato" valore={f.costo_opere_stimato != null ? formattaEuro(f.costo_opere_stimato) : null} />
            <Dato etichetta="Durata stimata" valore={f.durata_stimata_mesi != null ? `${f.durata_stimata_mesi} mesi` : null} />
            <Dato etichetta="Onorario" valore={f.onorario != null ? formattaEuro(f.onorario) : null} />
          </Blocco>
          <Blocco titolo="Dati">
            <Dato etichetta={TIPI_CLIENTE[f.cliente?.tipo ?? ""] ?? "Committente"} valore={f.cliente?.denominazione} />
            <Dato etichetta="Immobile" valore={f.immobile ? f.immobile.denominazione ?? `${f.immobile.indirizzo}, ${f.immobile.comune}` : "Da definire"} />
            <Dato etichetta="Committenza" valore={f.committenza === "pubblica" ? "Pubblica" : "Privata"} />
            <Dato etichetta="Intervento" valore={TIPOLOGIE_INTERVENTO[f.tipologia_intervento ?? ""]} />
            <Dato etichetta="Redatta il" valore={f.data_redazione ? formattaData(f.data_redazione) : null} />
            <Dato etichetta="Responsabile" valore={responsabile} />
          </Blocco>
        </div>
      </div>
    </>
  );
}

function Elenco({ titolo, voci, vuoto }: { titolo: string; voci: string[]; vuoto: string }) {
  return (
    <div className="mt-5">
      <h3 className="etichetta">{titolo}</h3>
      {voci.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {voci.map((v) => (
            <li key={v} className="rounded-full border border-linea px-3 py-1 text-sm">{v}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-sm text-tenue">{vuoto}</p>
      )}
    </div>
  );
}
