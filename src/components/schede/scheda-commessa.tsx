import { notFound } from "next/navigation";
import { AvanzamentoFasi, Pannello, StatoBadge } from "@/components/ui";
import { leggiCommessa } from "@/lib/dati";
import { AMBITI, STATI_FASE, TIPI_CLIENTE, TIPOLOGIE_INTERVENTO, statoCommessa } from "@/lib/dominio";
import { formattaData, formattaEuro } from "@/lib/utils";
import { Blocco, Dato, TestataScheda, UUID } from "./comuni";

export async function SchedaCommessa({ id }: { id: string }) {
  if (!UUID.test(id)) notFound();
  const c = await leggiCommessa(id);
  if (!c) notFound();

  const fasi = c.fasi ?? [];
  const completate = fasi.filter((f) => f.stato === "completata").length;
  const cliente = c.cliente;
  const immobile = c.immobile;
  const responsabile = c.responsabile ? `${c.responsabile.nome} ${c.responsabile.cognome}`.trim() : null;
  const daPreventivo = c.preventivi?.[0];
  const daPrefattibilita = c.prefattibilita?.[0];

  return (
    <>
      <TestataScheda
        sigla={`Commessa ${c.codice}`}
        titolo={c.titolo}
        sottotitolo={[cliente?.denominazione, immobile?.comune].filter(Boolean).join(", ")}
        celle={[
          { etichetta: "Stato", valore: <StatoBadge stato={c.stato} /> },
          { etichetta: "Apertura", valore: formattaData(c.data_apertura) },
          { etichetta: "Onorario", valore: formattaEuro(c.onorario_concordato) },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <Pannello>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-linea px-5 py-4 md:px-6">
            <h2 className="text-base font-medium">Fasi</h2>
            <AvanzamentoFasi completate={completate} totali={fasi.length} colore={statoCommessa(c.stato).colore} />
          </div>
          {fasi.length === 0 ? (
            <p className="px-5 py-8 text-[0.9375rem] text-tenue md:px-6">Nessuna fase definita.</p>
          ) : (
            <ol className="divide-y divide-linea">
              {fasi.map((f) => (
                <li key={f.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 md:px-6">
                  <span className="numeri etichetta">{f.codice}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{f.nome}</span>
                    {f.onorario || f.data_fine_prev ? (
                      <span className="block text-sm text-tenue">
                        {[f.onorario ? formattaEuro(f.onorario) : null, f.data_fine_prev ? `entro il ${formattaData(f.data_fine_prev)}` : null]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm text-tenue">{STATI_FASE[f.stato] ?? f.stato}</span>
                </li>
              ))}
            </ol>
          )}
          {c.descrizione ? (
            <div className="border-t border-linea px-5 py-5 md:px-6">
              <h3 className="etichetta">Descrizione</h3>
              <p className="mt-2 max-w-prose whitespace-pre-line text-[0.9375rem]">{c.descrizione}</p>
            </div>
          ) : null}
        </Pannello>

        <div className="flex flex-col gap-6">
          <Blocco titolo="Incarico">
            <Dato etichetta="Committenza" valore={c.committenza === "pubblica" ? "Pubblica" : "Privata"} />
            <Dato etichetta="Intervento" valore={TIPOLOGIE_INTERVENTO[c.tipologia_intervento ?? ""]} />
            <Dato etichetta="Ambito" valore={AMBITI[c.ambito ?? ""]} />
            <Dato etichetta="Responsabile" valore={responsabile} />
            <Dato etichetta="Importo lavori" valore={c.importo_lavori_stimato != null ? formattaEuro(c.importo_lavori_stimato) : null} />
            <Dato etichetta="Fine prevista" valore={c.data_fine_prevista ? formattaData(c.data_fine_prevista) : null} />
            {c.committenza === "pubblica" ? (
              <>
                <Dato etichetta="CIG" valore={c.cig} />
                <Dato etichetta="CUP" valore={c.cup} />
                <Dato etichetta="RUP" valore={c.rup_nome} />
              </>
            ) : null}
            <Dato etichetta="Nata dal preventivo" valore={daPreventivo?.numero} href={daPreventivo ? `/preventivi/${daPreventivo.id}` : undefined} />
            <Dato etichetta="Nata dalla pre-fattibilità" valore={daPrefattibilita?.numero} href={daPrefattibilita ? `/prefattibilita/${daPrefattibilita.id}` : undefined} />
          </Blocco>

          <Blocco titolo="Committente">
            {cliente ? (
              <>
                <Dato etichetta={TIPI_CLIENTE[cliente.tipo] ?? "Committente"} valore={cliente.denominazione} />
                <Dato etichetta="Email" valore={cliente.email} />
                <Dato etichetta="Telefono" valore={cliente.telefono} />
                <Dato etichetta="PEC" valore={cliente.pec} />
                <Dato etichetta="Codice fiscale" valore={cliente.codice_fiscale} />
                <Dato etichetta="Partita IVA" valore={cliente.partita_iva} />
              </>
            ) : null}
          </Blocco>

          <Blocco titolo="Immobile">
            {immobile ? (
              <>
                <Dato etichetta="Nome" valore={immobile.denominazione} />
                <Dato etichetta="Indirizzo" valore={[immobile.indirizzo, immobile.comune].filter(Boolean).join(", ")} />
                <Dato etichetta="Zona urbanistica" valore={immobile.zona_urbanistica} />
                {(immobile.catasto ?? []).map((k) => (
                  <Dato
                    key={k.id}
                    etichetta={k.catasto === "terreni" ? "Catasto terreni" : "Catasto fabbricati"}
                    valore={`Fg. ${k.foglio}, part. ${k.particella}${k.subalterno ? `, sub. ${k.subalterno}` : ""}${k.categoria ? ` (${k.categoria})` : ""}`}
                  />
                ))}
              </>
            ) : (
              <p className="text-[0.9375rem] text-tenue">Immobile da definire.</p>
            )}
          </Blocco>
        </div>
      </div>
    </>
  );
}
