import { Suspense } from "react";
import Link from "next/link";
import { Activity, Euro, FolderOpen } from "lucide-react";
import { PulsanteNuovo } from "@/components/tessere";
import { Cartiglio } from "@/components/cartiglio";
import { CaricamentoPannello } from "@/components/compasso";
import { Pannello, StatoBadge, Vuoto } from "@/components/ui";
import { elencoCommesse, elencoPratiche, type CommessaSintesi } from "@/lib/dati";
import { formattaEuro } from "@/lib/utils";

export const metadata = { title: { absolute: "Studio Parrinello" } };

const STATI_APERTI = ["contatto", "prefattibilita", "preventivo", "attiva", "sospesa"];

const azioni = (
  <>
    <PulsanteNuovo href="/nuova/prefattibilita" tipo="prefattibilita">
      Pre-fattibilità
    </PulsanteNuovo>
    <PulsanteNuovo href="/nuova/preventivo" tipo="preventivo">
      Preventivo
    </PulsanteNuovo>
    <PulsanteNuovo href="/nuova/commessa" tipo="commessa">
      Commessa
    </PulsanteNuovo>
  </>
);

export default function HomePage() {
  return (
    <Suspense fallback={<PanoramicaSegnaposto />}>
      <PanoramicaContenuto />
    </Suspense>
  );
}

async function PanoramicaContenuto() {
  const [commesse, preventivi, prefattibilita] = await Promise.all([
    elencoCommesse(),
    elencoPratiche("preventivo"),
    elencoPratiche("prefattibilita"),
  ]);

  const aperte = commesse.filter((c) => STATI_APERTI.includes(c.stato ?? ""));
  const inCorso = commesse.filter((c) => c.stato === "attiva");
  const portafoglio = inCorso.reduce((somma, c) => somma + (c.onorario_concordato ?? 0), 0);

  const imbuto = [
    {
      etichetta: "Pre-fattibilità aperte",
      valore: prefattibilita.filter((p) => !p.commessa_id && !p.preventivo_id && (p.stato === "in_corso" || p.stato === "consegnata")).length,
      colore: "var(--stato-prefattibilita)",
      href: "/prefattibilita",
    },
    {
      etichetta: "Preventivi in attesa",
      valore: preventivi.filter((p) => p.stato === "bozza" || p.stato === "inviato").length,
      colore: "var(--stato-preventivo)",
      href: "/preventivi",
    },
    { etichetta: "Commesse in corso", valore: inCorso.length, colore: "var(--stato-attiva)", href: "/commesse" },
    {
      etichetta: "Commesse concluse",
      valore: commesse.filter((c) => c.stato === "conclusa").length,
      colore: "var(--stato-conclusa)",
      href: "/commesse",
    },
  ];
  const massimo = Math.max(1, ...imbuto.map((v) => v.valore));

  return (
    <>
      <Cartiglio
        titolo="Architettura e Design" discreto
        celle={[
          { etichetta: "Commesse aperte", valore: aperte.length, icona: FolderOpen },
          { etichetta: "In corso", valore: inCorso.length, icona: Activity },
          { etichetta: "Onorari in corso", valore: formattaEuro(portafoglio), icona: Euro },
        ]}
        azioni={azioni}
      />

      <Pannello className="px-5 py-5 md:px-6">
        <h2 className="text-base font-medium">Dalla proposta alla commessa</h2>
        <p className="mt-1 text-sm text-tenue">Pre-fattibilità e preventivi aperti, commesse in corso e concluse.</p>
        <ol className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4">
          {imbuto.map((v) => (
            <li key={v.etichetta} className="min-w-0">
              <Link href={v.href} className="group block">
                <span className="block h-16 overflow-hidden rounded-s bg-superficie-2 md:h-20">
                  <span
                    className="block h-full origin-left transition-transform duration-700"
                    style={{ background: v.colore, transform: `scaleX(${v.valore ? Math.max(v.valore / massimo, 0.06) : 0})` }}
                  />
                </span>
                <span className="numeri mt-2 block text-xl font-medium" style={{ fontVariationSettings: '"wdth" 110' }}>
                  {v.valore}
                </span>
                <span className="etichetta block leading-tight group-hover:text-inchiostro">{v.etichetta}</span>
              </Link>
            </li>
          ))}
        </ol>
      </Pannello>

      <Pannello className="mt-6">
        <div className="flex items-baseline justify-between border-b border-linea px-5 py-4 md:px-6">
          <h2 className="text-base font-medium">Commesse aperte</h2>
          <Link href="/commesse" className="text-sm text-accento hover:underline">
            Vedi tutte
          </Link>
        </div>
        {aperte.length === 0 ? (
          <Vuoto
            titolo="Nessuna commessa aperta"
            testo="Le commesse nascono da un preventivo accettato (anche quando parte da una pre-fattibilità), oppure direttamente se l'incarico è già affidato."
          />
        ) : (
          <ul className="elenco divide-y divide-linea">
            {aperte.slice(0, 6).map((c) => (
              <RigaCommessa key={c.id} c={c} />
            ))}
          </ul>
        )}
      </Pannello>
    </>
  );
}

function RigaCommessa({ c }: { c: CommessaSintesi }) {
  return (
    <li>
      <Link
        href={`/commesse/${c.id}`}
        className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-superficie-2/50 md:grid-cols-[6rem_1fr_10rem_9rem] md:items-center md:px-6"
      >
        <span className="numeri etichetta col-start-1 row-start-1 md:col-auto md:row-auto">{c.codice}</span>
        <span className="col-span-2 row-start-2 min-w-0 md:col-span-1 md:row-auto">
          <span className="block truncate font-medium">{c.titolo}</span>
          <span className="block truncate text-sm text-tenue">{[c.cliente, c.comune].filter(Boolean).join(", ")}</span>
        </span>
        <span className="hidden text-sm text-inchiostro-2 md:block">{c.responsabile ?? "—"}</span>
        <span className="col-start-2 row-start-1 justify-self-end md:col-auto md:row-auto md:justify-self-start">
          <StatoBadge stato={c.stato} />
        </span>
      </Link>
    </li>
  );
}

function PanoramicaSegnaposto() {
  return (
    <>
      <Cartiglio titolo="Architettura e Design" discreto azioni={azioni} />
      <CaricamentoPannello />
    </>
  );
}
