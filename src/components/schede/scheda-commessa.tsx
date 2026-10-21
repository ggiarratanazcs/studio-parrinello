import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BriefcaseBusiness, CalendarDays, CircleDot, Euro, Fingerprint, Hash, House, Mail, MailCheck, Phone, UserRound, UsersRound } from "lucide-react";
import { Pannello } from "@/components/ui";
import { leggiCommessa } from "@/lib/dati";
import { getPermessi } from "@/lib/permessi";
import { FONDI } from "@/lib/fondi";
import { AMBITI, TIPI_CLIENTE, TIPOLOGIE_INTERVENTO, statoCommessa } from "@/lib/dominio";
import { formattaData, formattaEuro, oggiIso } from "@/lib/utils";
import { AzioniCommessa } from "./azioni-commessa";
import { Blocco, Dato, TestataScheda, UUID } from "./comuni";
import { PulsanteNuovoPreventivo } from "@/components/procedura/modale-nuovo-preventivo";
import { FasiCommessa } from "./fasi-commessa";
import { PraticheCommessa } from "./pratiche-commessa";
import { AlberoAllegati } from "./albero-allegati";
import { AllegatiFase } from "./allegati-fase";
import { Cronoprogramma } from "./cronoprogramma";
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
  const [c, permessi] = await Promise.all([leggiCommessa(id), getPermessi()]);
  if (!c) notFound();

  // Cosa vede e cosa può cambiare l'utente (Impostazioni → Ruoli e permessi)
  const liv = permessi.liv;
  const vede = {
    stato: liv("c.stato") >= 1,
    onorario: liv("c.onorario") >= 1,
    incarico: liv("c.incarico") >= 1,
    importoLavori: liv("c.importo_lavori") >= 1,
    committente: liv("c.committente") >= 1,
    immobile: liv("c.immobile") >= 1,
    pratiche: liv("c.pratiche") >= 1,
    fasi: liv("c.fasi") >= 1,
    cronoprogramma: liv("c.cronoprogramma") >= 1,
    allegati: liv("c.allegati") >= 1,
    team: liv("c.team") >= 1,
    diario: liv("c.diario") >= 1,
  };
  const completo = liv("commesse") >= 3;

  // Le cifre non lasciano il server se l'utente non le può vedere
  const fasi = (c.fasi ?? []).map((f) => (vede.onorario ? f : { ...f, onorario: null }));
  const team = c.team ?? [];
  const diario = c.diario ?? [];
  const documenti = c.documenti ?? [];
  const completate = fasi.filter((f) => f.stato === "completata").length;
  const cliente = c.cliente;
  const immobile = c.immobile;
  const responsabile = c.responsabile ? `${c.responsabile.nome} ${c.responsabile.cognome}`.trim() : null;
  const daPreventivo = c.preventivi?.find((p) => !p.integrativo);
  const daPrefattibilita = c.prefattibilita?.[0];

  const contatto = (Icona: typeof Mail, valore: string | null | undefined, etichetta: string) =>
    valore ? (
      <li className="flex min-w-0 items-center gap-2.5" title={etichetta}>
        <Icona aria-hidden className="size-4 shrink-0 text-tenue" strokeWidth={1.6} />
        <span className="truncate">{valore}</span>
      </li>
    ) : null;

  // Incarico, committente e immobile affiancati alla stessa altezza; sotto il team e la descrizione
  const datiGenerali = (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
        {vede.incarico ? (
          <Blocco titolo="Incarico" icona={<BriefcaseBusiness strokeWidth={1.7} />} dueColonne className="h-full">
            <Dato etichetta="Committenza" valore={c.committenza === "pubblica" ? "Pubblica" : "Privata"} />
            <Dato etichetta="Intervento" valore={TIPOLOGIE_INTERVENTO[c.tipologia_intervento ?? ""]} />
            <Dato etichetta="Ambito" valore={AMBITI[c.ambito ?? ""]} />
            <Dato etichetta="Responsabile" valore={responsabile} />
            {vede.importoLavori ? <Dato etichetta="Importo lavori" valore={c.importo_lavori_stimato != null ? formattaEuro(c.importo_lavori_stimato) : null} /> : null}
            <Dato etichetta="Fine prevista" valore={c.data_fine_prevista ? formattaData(c.data_fine_prevista) : null} />
            <Dato etichetta="Chiusa il" valore={c.data_chiusura ? formattaData(c.data_chiusura) : null} />
            {c.committenza === "pubblica" ? (
              <>
                <Dato etichetta="CIG" valore={c.cig} />
                <Dato etichetta="CUP" valore={c.cup} />
                <Dato etichetta="RUP" valore={c.rup_nome} />
              </>
            ) : null}
            <Dato etichetta="Dal preventivo" valore={daPreventivo?.numero} href={daPreventivo ? `/preventivi/${daPreventivo.id}` : undefined} />
            <Dato etichetta="Dalla pre-fattibilità" valore={daPrefattibilita?.numero} href={daPrefattibilita ? `/prefattibilita/${daPrefattibilita.id}` : undefined} />
          </Blocco>
        ) : null}

        {vede.committente ? (
          <Pannello className="h-full px-5 py-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-medium">
              <UserRound aria-hidden className="size-4 text-tenue" strokeWidth={1.7} />
              Committente
            </h2>
            {cliente ? (
              <>
                <Link href={`/clienti/${cliente.id}`} className="block truncate text-[1.0625rem] font-medium hover:text-accento">
                  {cliente.denominazione}
                </Link>
                <p className="etichetta mt-0.5">{TIPI_CLIENTE[cliente.tipo] ?? "Committente"}</p>
                <ul className="mt-4 flex flex-col gap-2 text-[0.9375rem]">
                  {contatto(Mail, cliente.email, "Email")}
                  {contatto(Phone, cliente.telefono, "Telefono")}
                  {contatto(MailCheck, cliente.pec, "PEC")}
                  {contatto(Fingerprint, cliente.codice_fiscale, "Codice fiscale")}
                  {contatto(Hash, cliente.partita_iva, "Partita IVA")}
                </ul>
              </>
            ) : (
              <p className="text-[0.9375rem] text-tenue">Committente da definire.</p>
            )}
          </Pannello>
        ) : null}

        {vede.immobile ? (
          <Pannello className="h-full px-5 py-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-medium">
              <House aria-hidden className="size-4 text-tenue" strokeWidth={1.7} />
              Immobile
            </h2>
            {immobile ? (
              <>
                <Link href={`/immobili/${immobile.id}`} className="block truncate text-[1.0625rem] font-medium hover:text-accento">
                  {immobile.denominazione || immobile.indirizzo}
                </Link>
                <p className="mt-0.5 text-[0.875rem] text-tenue">{[immobile.indirizzo, immobile.comune].filter(Boolean).join(", ")}</p>
                <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3">
                  <Dato etichetta="Zona urbanistica" valore={immobile.zona_urbanistica} />
                  {(immobile.catasto ?? []).map((k) => (
                    <Dato
                      key={k.id}
                      etichetta={k.catasto === "terreni" ? "Catasto terreni" : "Catasto fabbricati"}
                      valore={`Fg. ${k.foglio}, p. ${k.particella}${k.subalterno ? `, sub. ${k.subalterno}` : ""}${k.categoria ? ` (${k.categoria})` : ""}`}
                    />
                  ))}
                </dl>
              </>
            ) : (
              <p className="text-[0.9375rem] text-tenue">Immobile da definire.</p>
            )}
          </Pannello>
        ) : null}
      </div>

      {/* Chi lavora sulla commessa, in una fascia */}
      {vede.team ? (
        <Pannello className="px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
            <h2 className="flex shrink-0 items-center gap-2 text-base font-medium">
              <UsersRound aria-hidden className="size-4 text-tenue" strokeWidth={1.7} />
              Team di commessa
            </h2>
            <TeamCommessa commessaId={c.id} team={team} profili={c.profiliStudio} modificabile={liv("c.team") >= 2} />
          </div>
        </Pannello>
      ) : null}

      {vede.incarico && c.descrizione ? (
        <Pannello className="px-5 py-5">
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
          ...(vede.stato
            ? [
                { etichetta: "Stato", valore: statoCommessa(c.stato).etichetta, tinta: statoCommessa(c.stato).colore, icona: CircleDot },
                { etichetta: "Apertura", valore: formattaData(c.data_apertura), icona: CalendarDays },
              ]
            : []),
          ...(vede.onorario ? [{ etichetta: "Onorario", valore: formattaEuro(c.onorario_concordato), icona: Euro }] : []),
        ]}
        azioni={completo ? <AzioniCommessa id={c.id} stato={c.stato} /> : null}
      />

      <SezioniScheda
        tinta={FONDI.commessa.chiaro}
        sezioni={[
          (vede.incarico || vede.committente || vede.immobile || vede.team) && {
            id: "generali",
            titolo: "Dati generali",
            sottotitolo: TIPOLOGIE_INTERVENTO[c.tipologia_intervento ?? ""] ?? (c.committenza === "pubblica" ? "Committenza pubblica" : "Committenza privata"),
            contenuto: datiGenerali,
          },
          vede.pratiche && {
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
                  liv("c.pratiche") >= 2 && liv("pratiche") >= 2 ? (
                    <PulsanteNuovoPreventivo fonte={{ commessa: c.id }}>Preventivo integrativo</PulsanteNuovoPreventivo>
                  ) : null
                }
              />
            ),
          },
          (vede.fasi || vede.cronoprogramma) && {
            id: "fasi",
            titolo: vede.fasi ? "Fasi e cronoprogramma" : "Cronoprogramma",
            sottotitolo: `${completate}/${fasi.length} completate`,
            contenuto: (
              <Pannello>
                {vede.fasi ? (
                  <FasiCommessa
                    commessaId={c.id}
                    fasi={fasi}
                    profili={c.profiliStudio}
                    catalogo={c.catalogoFasi}
                    committenza={c.committenza}
                    documenti={documenti}
                    apertura={c.data_apertura}
                    finePrevista={c.data_fine_prevista}
                    oggi={oggiIso()}
                    gantt={vede.cronoprogramma}
                    modificabile={liv("c.fasi") >= 2}
                    allegati={liv("c.allegati")}
                    eliminabile={completo}
                  />
                ) : (
                  // Senza le fasi: restano visibili, se permessi, il cronoprogramma e l'archivio degli allegati
                  <Cartelle
                    cartelle={[
                      vede.cronoprogramma && {
                        id: "cronoprogramma",
                        nome: "Cronoprogramma",
                        contenuto: <Cronoprogramma fasi={fasi} apertura={c.data_apertura} finePrevista={c.data_fine_prevista} oggi={oggiIso()} />,
                      },
                    ].filter((x) => !!x)}
                  />
                )}
              </Pannello>
            ),
          },
          vede.allegati && {
            id: "allegati",
            titolo: "Allegati",
            sottotitolo: documenti.length ? plurale(documenti.length, "allegato", "allegati") : "Nessun allegato",
            contenuto: (
              <Pannello>
                <TitoloSezione
                  titolo="Allegati"
                  descrizione="Tutti i file della commessa, divisi per fase. Qui puoi caricare anche documenti che non appartengono a una fase."
                />
                {liv("c.allegati") >= 2 ? (
                  <div className="border-b border-linea px-5 py-4 md:px-6">
                    <AllegatiFase commessaId={c.id} faseId={null} documenti={[]} soloCaricamento />
                  </div>
                ) : null}
                <AlberoAllegati codice={c.codice ?? ""} fasi={fasi} documenti={documenti} />
              </Pannello>
            ),
          },
          vede.diario && {
            id: "diario",
            titolo: "Diario",
            sottotitolo: diario.length ? plurale(diario.length, "voce", "voci") : "Nessuna voce",
            contenuto: (
              <Pannello>
                <TitoloSezione titolo="Diario di commessa" descrizione="Sopralluoghi, telefonate, riunioni e decisioni, in ordine di data." />
                <DiarioCommessa commessaId={c.id} diario={diario} modificabile={liv("c.diario") >= 2} eliminabile={completo} />
              </Pannello>
            ),
          },
        ].filter((x) => !!x)}
      />
    </>
  );
}
