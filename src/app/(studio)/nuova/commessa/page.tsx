import { Suspense } from "react";
import { connection } from "next/server";
import { Cartiglio } from "@/components/cartiglio";
import { CaricamentoProcedura } from "@/components/procedura/caricamento";
import { datiProcedura } from "@/lib/dati";
import { ProceduraNuovaCommessa } from "./procedura";

export const metadata = { title: "Nuova commessa" };

export default function PaginaNuovaCommessa() {
  return (
    <>
      <Cartiglio
        titolo="Nuova commessa"
        sottotitolo="Per un incarico già affidato. Se devi ancora proporre un'offerta, parti da un preventivo o da una pre-fattibilità."
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
  return <ProceduraNuovaCommessa dati={dati} oggi={new Date().toISOString().slice(0, 10)} />;
}
