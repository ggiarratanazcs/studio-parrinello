import { Suspense } from "react";
import { connection } from "next/server";
import { Cartiglio } from "@/components/cartiglio";
import { CaricamentoProcedura } from "@/components/procedura/caricamento";
import { datiProcedura } from "@/lib/dati";
import { ProceduraNuovaPrefattibilita } from "./procedura";

export const metadata = { title: "Nuova pre-fattibilità" };

export default function PaginaNuovaPrefattibilita() {
  return (
    <>
      <Cartiglio tipo="prefattibilita"
        titolo="Nuova pre-fattibilità"
        sottotitolo="Analisi urbanistica, conformità, titolo edilizio e stima dei costi. Riceve un numero F-anno-progressivo."
      />
      <Suspense fallback={<CaricamentoProcedura />}>
        <Procedura />
      </Suspense>
    </>
  );
}

async function Procedura() {
  const dati = await datiProcedura();
  await connection();
  return <ProceduraNuovaPrefattibilita dati={dati} oggi={new Date().toISOString().slice(0, 10)} />;
}
