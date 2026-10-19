import { Suspense } from "react";
import { Cartiglio } from "@/components/cartiglio";
import { CaricamentoPannello } from "@/components/compasso";
import { ElencoPratiche } from "@/components/elenco-pratiche";
import { elencoPratiche } from "@/lib/dati";

export const metadata = { title: "Pre-fattibilità" };

export default function Pagina() {
  return (
    <Suspense
      fallback={
        <>
          <Cartiglio tipo="prefattibilita" titolo="Pre-fattibilità" />
          <CaricamentoPannello />
        </>
      }
    >
      <Elenco />
    </Suspense>
  );
}

async function Elenco() {
  return <ElencoPratiche tipo="prefattibilita" pratiche={await elencoPratiche("prefattibilita")} />;
}
