import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CalendarDays, CircleDot, Euro } from "lucide-react";
import { AvanzamentoFasi, Pannello } from "@/components/ui";
import { leggiCommessa } from "@/lib/dati";
import { FONDI } from "@/lib/fondi";
import { AMBITI, TIPI_CLIENTE, TIPOLOGIE_INTERVENTO, statoCommessa } from "@/lib/dominio";
import { formattaData, formattaEuro } from "@/lib/utils";
import { AzioniCommessa } from "./azioni-commessa";
import { Blocco, Dato, TestataScheda, UUID } from "./comuni";
import { PulsanteNuovoPreventivo } from "@/components/procedura/modale-nuovo-preventivo";
import { FasiCommessa } from "./fasi-commessa";
import { PraticheCommessa } from "./pratiche-commessa";
import { AlberoAllegati } from "./albero-allegati";
import { Cartelle, SezioniScheda } from "./sezioni-scheda";
import { DiarioCommessa, TeamCommessa } from "./team-diario";

/** Intestazione di una sezione: titolo, descrizione breve ed eventuale elemento a destra. */
function TitoloSezione({ titolo, descrizione, destra }: { titolo: string; descrizione?: string; destra?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-linea px-5 py-4 md:px-6">
      <div>
        <h2 className="text-base font-medium">{titolo}</h2>
        {descrizione ? <p className="mt-0.5 text-sm text-tenue">{descrizione}</p> : null}
      </div>
      {destra}
    </div>
  );
}

const plurale = (n: number, uno: string, molti: string) => `${n} ${n === 1 ? uno : molti}`;

/**
 * Scheda della commessa: testata con stato e azioni, poi le sezioni numerate
 * (dati generali, fasi e allegati, team, diario) una alla volta.
 */
export async function SchedaCommessa({ id }: { id: string }) {
  if (!UUID.test(id)) notFound();
  const c = await leggiCommessa(id);
  if (!c) notFound();

  const fasi = c.fasi ?? [];
  const team = c.team ?? [];
  const diario = c.diario ?? [];
  const documenti = c.documenti ?? [];
  const completate = fasi.filter((f) => f.stato === "completata").length;
  const cliente = c.cliente;
  const immobile = c.immobile;
  const responsabile = c.responsabile ? `${c.responsabile.nome} ${c.responsabile.cognome}`.trim() : null;
  const daPreventivo = c.preventivi?.find((p) => !p.integrativo);
  const daPrefattibilita = c.prefattibilita?.[0];

  const datiGenerali = (
    <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
      <Blocco titolo="Incarico">
        <Dato etichetta="Committenza" valore={c.committenza === "pubblica" ? "Pubblica" : "Privata"} />
        <Dato etichetta="Intervento" valore={TIPOLOGIE_INTERVENTO[c.tipologia_intervento ?? ""]} />
        <Dato etichetta="Ambito" valore={AMBITI[c.ambito ?? ""]} />
        <Dato etichetta="Responsabile" valore={responsabile} />
        <Dato etichetta="Importo lavori" valore={c.importo_lavori_stimato != null ? formattaEuro(c.importo_lavori_stimato) : null} />
        <Dato etichetta="Fine prevista" valore={c.data_fine_prevista ? formattaData(c.data_fine_prevista) : null} />
        <Dato etichetta="Chiusa il" valore={c.data_chiusura ? formattaData(c.data_chiusura) : null} />
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

      <div className="flex flex-col gap-6">
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

      {c.descrizione ? (
        <Pannello className="px-5 py-5 xl:col-span-2">
          <h2 className="mb-3 text-base font-medium">Descrizione</h2>
          <p className="max-w-prose whitespace-pre-line text-[0.9375rem]">{c.descrizione}</p>
        </Pannello>
      ) : null}
    </div>
  );

  return (
    <>
      <TestataScheda
        sigla={`Commessa ${c.codice}`}
        titolo={c.titolo}
        sottotitolo={[cliente?.denominazione, immobile?.comune].filter(Boolean).join(", ")}
        celle={[
          { etichetta: "Stato", valore: statoCommessa(c.stato).etichetta, tinta: statoCommessa(c.stato).colore, icona: CircleDot },
          { etichetta: "Apertura", valore: formattaData(c.data_apertura), icona: CalendarDays },
          { etichetta: "Onorario", valore: formattaEuro(c.onorario_concordato), icona: Euro },
        ]}
        azioni={<AzioniCommessa id={c.id} stato={c.stato} />}
      />

      <SezioniScheda
        tinta={FONDI.commessa.chiaro}
        sezioni={[
          {
            id: "generali",
            titolo: "Dati generali",
            sottotitolo: TIPOLOGIE_INTERVENTO[c.tipologia_intervento ?? ""] ?? (c.committenza === "pubblica" ? "Committenza pubblica" : "Committenza privata"),
            contenuto: datiGenerali,
          },
          {
            id: "pratiche",
            titolo: "Pratiche",
            sottotitolo: (() => {
              const integrativi = (c.preventivi ?? []).filter((p) => p.integrativo).length;
              const origine = [c.prefattibilita?.length ? "pre-fattibilità" : null, (c.preventivi ?? []).some((p) => !p.integrativo) ? "preventivo" : null].filter(Boolean).join(" + ");
              return [origine || "Creata direttamente", integrativi ? plurale(integrativi, "integrativo", "integrativi") : null].filter(Boolean).join(" · ");
            })(),
            contenuto: (
              <PraticheCommessa
                c={c}
                azioneNuovo={
                  <PulsanteNuovoPreventivo fonte={{ commessa: c.id }}>Preventivo integrativo</PulsanteNuovoPreventivo>
                }
              />
            ),
          },
          {
            id: "fasi",
            titolo: "Fasi e allegati",
            sottotitolo: `${completate}/${fasi.length} completate · ${plurale(documenti.length, "allegato", "allegati")}`,
            contenuto: (
              <Pannello>
                <Cartelle
                  destra={<AvanzamentoFasi completate={completate} totali={fasi.length} colore={statoCommessa(c.stato).colore} />}
                  cartelle={[
                    {
                      id: "fasi",
                      nome: "Fasi",
                      conteggio: fasi.length,
                      contenuto: (
                        <FasiCommessa
                          commessaId={c.id}
                          fasi={fasi}
                          profili={c.profiliStudio}
                          catalogo={c.catalogoFasi}
                          committenza={c.committenza}
                          documenti={documenti}
                        />
                      ),
                    },
                    {
                      id: "allegati",
                      nome: "Allegati",
                      conteggio: documenti.length,
                      contenuto: <AlberoAllegati codice={c.codice ?? ""} fasi={fasi} documenti={documenti} />,
                    },
                  ]}
                />
              </Pannello>
            ),
          },
          {
            id: "team",
            titolo: "Team",
            sottotitolo: team.length ? plurale(team.length, "persona", "persone") : "Da assegnare",
            contenuto: (
              <Pannello>
                <TitoloSezione titolo="Team" descrizione="Chi lavora sulla commessa e con quale ruolo." />
                <div className="px-5 py-5 md:px-6">
                  <TeamCommessa commessaId={c.id} team={team} profili={c.profiliStudio} />
                </div>
              </Pannello>
            ),
          },
          {
            id: "diario",
            titolo: "Diario",
            sottotitolo: diario.length ? plurale(diario.length, "voce", "voci") : "Nessuna voce",
            contenuto: (
              <Pannello>
                <TitoloSezione titolo="Diario di commessa" descrizione="Sopralluoghi, telefonate, riunioni e decisioni, in ordine di data." />
                <DiarioCommessa commessaId={c.id} diario={diario} />
              </Pannello>
            ),
          },
        ]}
      />
    </>
  );
}
