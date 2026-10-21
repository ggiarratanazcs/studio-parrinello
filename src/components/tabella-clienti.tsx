"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarraRegistro, FiltroGruppi, Intestazione, PiedeRegistro, filtroGruppi, useRegistro, type GruppoFiltro } from "@/components/registro";

export type ClienteRiga = {
  id: string;
  tipo: string;
  denominazione: string | null;
  comune: string | null;
  email: string | null;
  telefono: string | null;
};

const TIPI: Record<string, { etichetta: string; colore: string }> = {
  persona_fisica: { etichetta: "Privato", colore: "var(--stato-attiva)" },
  azienda: { etichetta: "Azienda", colore: "var(--stato-preventivo)" },
  ente_pubblico: { etichetta: "Ente pubblico", colore: "var(--stato-prefattibilita)" },
};
const ORDINE_TIPI = Object.keys(TIPI);
const info = (t: string) => TIPI[t] ?? { etichetta: t, colore: "var(--tenue)" };

const GRUPPI: GruppoFiltro[] = [
  { id: "tutti", etichetta: "Tutti" },
  { id: "privati", etichetta: "Privati", stati: ["persona_fisica"] },
  { id: "aziende", etichetta: "Aziende", stati: ["azienda"] },
  { id: "enti", etichetta: "Enti", stati: ["ente_pubblico"] },
];

const COLONNE = "md:grid-cols-[minmax(0,1.4fr)_8rem_minmax(0,0.8fr)_minmax(0,1fr)_9rem]";

type Chiave = "nome" | "tipo" | "comune" | "email" | "telefono";

const testo = (c: ClienteRiga) => [c.denominazione, c.comune, c.email, c.telefono, info(c.tipo).etichetta];
const valore = (c: ClienteRiga, k: Chiave): unknown =>
  k === "nome" ? c.denominazione : k === "tipo" ? info(c.tipo).etichetta : k === "comune" ? c.comune : k === "email" ? c.email : c.telefono;
const perGruppo = filtroGruppi(GRUPPI);
const filtro = (c: ClienteRiga, scelto: string) => perGruppo(c.tipo, scelto);

/** Anagrafica clienti in forma di registro: ricerca, schede per tipo, colonne ordinabili. */
export function TabellaClienti({ clienti }: { clienti: ClienteRiga[] }) {
  const router = useRouter();
  const r = useRegistro<ClienteRiga, Chiave>({ righe: clienti, testo, valore, filtro, iniziale: { chiave: "nome", verso: "asc" }, filtroIniziale: "tutti|" });
  const intestazione = (chiave: Chiave, nome: string) => (
    <Intestazione chiave={chiave} ordine={r.ordine} onOrdina={r.ordina}>
      {nome}
    </Intestazione>
  );

  return (
    <>
      <BarraRegistro cerca={r.cerca} onCerca={r.setCerca} segnaposto="Cerca">
        <FiltroGruppi gruppi={GRUPPI} ordine={ORDINE_TIPI} info={info} stati={clienti.map((c) => c.tipo)} scelto={r.scelto} onScegli={r.setScelto} nome="Tipo di cliente" />
      </BarraRegistro>
      <div role="table" aria-label="Clienti">
        <div role="row" className={`elenco-intestazione etichetta hidden border-b border-linea px-6 py-3 md:grid ${COLONNE} md:gap-x-4`}>
          {intestazione("nome", "Cliente")}
          {intestazione("tipo", "Tipo")}
          {intestazione("comune", "Comune")}
          {intestazione("email", "Email")}
          {intestazione("telefono", "Telefono")}
        </div>
        <div role="rowgroup" className="elenco divide-y divide-linea">
          {r.visibili.map((c) => {
            const t = info(c.tipo);
            return (
              <div
                key={c.id}
                role="row"
                // Clic sulla riga: apre la scheda (i collegamenti email e telefono restano cliccabili da soli)
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a")) return;
                  router.push(`/clienti/${c.id}`);
                }}
                className={`grid cursor-pointer grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-superficie-2/50 md:items-center md:px-6 ${COLONNE}`}
              >
                <span role="cell" className="min-w-0">
                  <Link href={`/clienti/${c.id}`} className="block truncate font-medium hover:underline">
                    {c.denominazione ?? "Senza nome"}
                  </Link>
                  <span className="block truncate text-sm text-tenue md:hidden">
                    {[c.comune, c.email ?? c.telefono].filter(Boolean).join(", ") || "Recapiti da completare"}
                  </span>
                </span>
                <span role="cell" className="inline-flex items-center gap-2 justify-self-end text-[0.8125rem] text-inchiostro-2 md:justify-self-start">
                  <span aria-hidden className="size-1.5 rounded-full" style={{ background: t.colore }} />
                  {t.etichetta}
                </span>
                <span role="cell" className="hidden truncate text-sm text-inchiostro-2 md:block">{c.comune ?? "—"}</span>
                <span role="cell" className="hidden truncate text-sm md:block">
                  {c.email ? <a href={`mailto:${c.email}`} className="hover:text-accento">{c.email}</a> : <span className="text-tenue">—</span>}
                </span>
                <span role="cell" className="numeri hidden truncate text-sm md:block">
                  {c.telefono ? <a href={`tel:${c.telefono.replace(/\s+/g, "")}`} className="hover:text-accento">{c.telefono}</a> : <span className="text-tenue">—</span>}
                </span>
              </div>
            );
          })}
          {r.visibili.length === 0 ? <p className="px-6 py-10 text-center text-[0.9375rem] text-tenue">Nessun cliente corrisponde alla ricerca.</p> : null}
        </div>
      </div>
      <PiedeRegistro visibili={r.visibili.length} totali={clienti.length} nome={["cliente", "clienti"]} />
    </>
  );
}
