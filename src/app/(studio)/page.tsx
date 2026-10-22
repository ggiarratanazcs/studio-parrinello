import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Crea } from "@/components/crea";
import { DaFare } from "@/components/da-fare";
import { getProfilo } from "@/lib/auth";
import { DISEGNO_HOME } from "@/lib/fondi";
import { leggiStudio } from "@/lib/studio";
import { leggiDaFare, ultimeAttivita } from "@/lib/da-fare";
import { istanteAttuale, oggiIso } from "@/lib/utils";
import { Cartiglio } from "@/components/cartiglio";
import { Pannello, Scheletro } from "@/components/ui";
import { elencoCommesse, elencoPratiche, mieCommesse } from "@/lib/dati";
import { MieCommesse } from "@/components/mie-commesse";
import { PorteHome } from "@/components/porte-home";

export async function generateMetadata() {
  const studio = await leggiStudio();
  return { title: { absolute: studio.nome } };
}

export default function HomePage() {
  return (
    <Suspense fallback={<PanoramicaSegnaposto />}>
      <PanoramicaContenuto />
    </Suspense>
  );
}

async function PanoramicaContenuto() {
  const studio = await leggiStudio();
  await connection();
  const oggi = oggiIso();

  // Il collaboratore vede solo le commesse in cui è coinvolto
  const io = await getProfilo();
  if (io.ruolo === "collaboratore") {
    const mie = await mieCommesse(io.id);
    return (
      <>
        <Cartiglio titolo={studio.claim || studio.nome} disegno={DISEGNO_HOME} />
        <MieCommesse commesse={mie} oggi={oggi} />
        <div aria-hidden className="h-16 lg:hidden" />
      </>
    );
  }

  const adesso = istanteAttuale();
  const [commesse, preventivi, prefattibilita, daFare, attivita, profilo] = await Promise.all([
    elencoCommesse(),
    elencoPratiche("preventivo"),
    elencoPratiche("prefattibilita"),
    leggiDaFare(oggi),
    ultimeAttivita(),
    getProfilo(),
  ]);

  const inCorso = commesse.filter((c) => c.stato === "attiva");

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
      <Cartiglio titolo={studio.claim || studio.nome} disegno={DISEGNO_HOME} crea={<Crea />} />

      <DaFare
        voci={daFare}
        attivita={attivita}
        profiloId={profilo.id}
        vedeTutto={profilo.ruolo === "titolare"}
        adesso={adesso}
      />

      <Pannello className="mt-6 px-5 py-5 md:px-6">
        <h2 className="text-base font-medium">Dalla proposta alla commessa</h2>
        <p className="mt-1 text-sm text-tenue">Pre-fattibilità e preventivi aperti, commesse in corso e concluse.</p>
        <ol className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4">
          {imbuto.map((v) => (
            <li key={v.etichetta} className="min-w-0">
              <Link href={v.href} className="group block">
                <span className="block h-16 overflow-hidden rounded-piccolo bg-superficie-2 md:h-20">
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

      {/* Accessi grandi alle commesse e all'archivio dei documenti */}
      <PorteHome />
      {/* Su telefono lascia spazio al "+" che galleggia sopra la navigazione */}
      <div aria-hidden className="h-16 lg:hidden" />
    </>
  );
}

async function PanoramicaSegnaposto() {
  const studio = await leggiStudio();
  return (
    <>
      <Cartiglio titolo={studio.claim || studio.nome} disegno={DISEGNO_HOME} crea={<Crea />} />
      <Pannello className="px-6 py-6">
        <Scheletro className="h-4 w-48" />
        <Scheletro className="mt-6 h-20 w-full" />
      </Pannello>
    </>
  );
}
