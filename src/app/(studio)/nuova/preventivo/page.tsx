import { Suspense } from "react";
import { connection } from "next/server";
import { Cartiglio } from "@/components/cartiglio";
import { CaricamentoProcedura } from "@/components/procedura/caricamento";
import { datiProcedura } from "@/lib/dati";
import { origineNuovoPreventivo } from "@/lib/origine-preventivo";
import { oggiIso } from "@/lib/utils";
import { ProceduraNuovoPreventivo } from "./procedura";

export const metadata = { title: "Nuovo preventivo" };

export default function PaginaNuovoPreventivo({ searchParams }: PageProps<"/nuova/preventivo">) {
  return (
    <>
      <Cartiglio tipo="preventivo"
        titolo="Nuovo preventivo"
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
  const commessa = typeof parametri.commessa === "string" ? parametri.commessa : null;
  const [dati, origine] = await Promise.all([datiProcedura(), origineNuovoPreventivo({ da, commessa })]);
  await connection();
  return <ProceduraNuovoPreventivo dati={dati} oggi={oggiIso()} origine={origine} />;
}
