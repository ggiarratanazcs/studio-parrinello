import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Cartiglio } from "@/components/cartiglio";
import { AvanzamentoFasi, Pannello, Scheletro, StatoBadge } from "@/components/ui";
import { leggiCommessa } from "@/lib/dati";
import { AMBITI, STATI_FASE, TIPI_CLIENTE, TIPOLOGIE_INTERVENTO, statoCommessa } from "@/lib/dominio";
import { formattaData, formattaEuro } from "@/lib/utils";

export const metadata = { title: "Scheda commessa" };

export default function PaginaCommessa({ params }: PageProps<"/commesse/[id]">) {
  return (
    <>
      <Link href="/commesse" className="mb-6 inline-flex items-center gap-1.5 text-sm text-tenue hover:text-inchiostro">
        <ArrowLeft className="size-4" strokeWidth={1.8} />
        Commesse
      </Link>
      <Suspense fallback={<SchedaSegnaposto />}>
        <Scheda params={params} />
      </Suspense>
    </>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Scheda({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const c = await leggiCommessa(id);
  if (!c) notFound();

  const fasi = c.fasi ?? [];
  const completate = fasi.filter((f) => f.stato === "completata").length;
  const cliente = c.cliente;
  const immobile = c.immobile;
  const responsabile = c.responsabile ? `${c.responsabile.nome} ${c.responsabile.cognome}`.trim() : null;

  return (
    <>
      <Cartiglio
        titolo={c.titolo}
        sottotitolo={[cliente?.denominazione, immobile?.comune].filter(Boolean).join(", ")}
        celle={[
          { etichetta: "Codice", valore: c.codice },
          { etichetta: "Stato", valore: <StatoBadge stato={c.stato} /> },
          { etichetta: "Apertura", valore: formattaData(c.data_apertura) },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        {/* Fasi */}
        <Pannello>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-linea px-5 py-4 md:px-6">
            <h2 className="text-base font-medium">Fasi</h2>
            <AvanzamentoFasi completate={completate} totali={fasi.length} colore={statoCommessa(c.stato).colore} />
          </div>
          {fasi.length === 0 ? (
            <p className="px-5 py-8 text-[0.9375rem] text-tenue md:px-6">
              Nessuna fase definita. Le fasi si aggiungeranno da qui con il prossimo rilascio.
            </p>
          ) : (
            <ol className="divide-y divide-linea">
              {fasi.map((f) => (
                <li key={f.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 md:px-6">
                  <span className="numeri etichetta">{f.codice}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{f.nome}</span>
                    {f.data_fine_prev ? (
                      <span className="block text-sm text-tenue">Entro il {formattaData(f.data_fine_prev)}</span>
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
            <Dato etichetta="Onorario" valore={c.onorario_concordato != null ? formattaEuro(c.onorario_concordato) : null} />
            <Dato etichetta="Fine prevista" valore={c.data_fine_prevista ? formattaData(c.data_fine_prevista) : null} />
            {c.committenza === "pubblica" ? (
              <>
                <Dato etichetta="CIG" valore={c.cig} />
                <Dato etichetta="CUP" valore={c.cup} />
                <Dato etichetta="RUP" valore={c.rup_nome} />
              </>
            ) : null}
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

function Blocco({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <Pannello className="px-5 py-5">
      <h2 className="mb-4 text-base font-medium">{titolo}</h2>
      <dl className="flex flex-col gap-3">{children}</dl>
    </Pannello>
  );
}

/** Coppia etichetta/valore: le righe vuote non vengono mostrate. */
function Dato({ etichetta, valore }: { etichetta: string; valore?: string | null }) {
  if (!valore) return null;
  return (
    <div>
      <dt className="etichetta">{etichetta}</dt>
      <dd className="mt-0.5 break-words text-[0.9375rem]">{valore}</dd>
    </div>
  );
}

function SchedaSegnaposto() {
  return (
    <>
      <Scheletro className="h-10 w-2/3" />
      <Scheletro className="mt-4 h-4 w-1/3" />
      <Pannello className="mt-10 space-y-4 p-6">
        <Scheletro className="h-4 w-full" />
        <Scheletro className="h-4 w-5/6" />
      </Pannello>
    </>
  );
}
