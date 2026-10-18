import { Suspense } from "react";
import { connection } from "next/server";
import { Cartiglio } from "@/components/cartiglio";
import { CaricamentoProcedura } from "@/components/procedura/caricamento";
import { datiProcedura, leggiPrefattibilita } from "@/lib/dati";
import { ProceduraNuovoPreventivo, type OrigineNuovoPreventivo } from "./procedura";

export const metadata = { title: "Nuovo preventivo" };

export default function PaginaNuovoPreventivo({ searchParams }: PageProps<"/nuova/preventivo">) {
  return (
    <>
      <Cartiglio tipo="preventivo"
        titolo="Nuovo preventivo"
        sottotitolo="Riceve un numero P-anno-progressivo. Quando il committente accetta, lo trasformi in commessa."
      />
      <Suspense fallback={<CaricamentoProcedura />}>
        <Procedura searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Procedura({ searchParams }: { searchParams: PageProps<"/nuova/preventivo">["searchParams"] }) {
  const parametri = await searchParams;
  const da = typeof parametri.da === "string" ? parametri.da : null;
  const [dati, pref] = await Promise.all([datiProcedura(), da ? leggiPrefattibilita(da) : Promise.resolve(null)]);
  await connection();

  const origine: OrigineNuovoPreventivo = pref
    ? {
        prefattibilita_id: pref.id,
        numero: pref.numero,
        cliente_id: pref.cliente_id,
        immobile_id: pref.immobile_id,
        titolo: pref.titolo,
        committenza: pref.committenza,
        tipologia_intervento: pref.tipologia_intervento,
        importo_lavori: pref.costo_opere_stimato,
      }
    : null;

  return <ProceduraNuovoPreventivo dati={dati} oggi={new Date().toISOString().slice(0, 10)} origine={origine} />;
}
