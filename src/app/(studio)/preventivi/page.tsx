import { Suspense } from "react";
import { Cartiglio } from "@/components/cartiglio";
import { CaricamentoPannello } from "@/components/compasso";
import { ElencoPratiche } from "@/components/elenco-pratiche";
import { elencoPratiche } from "@/lib/dati";

export const metadata = { title: "Preventivi" };

export default function Pagina() {
  return (
    <Suspense
      fallback={
        <>
          <Cartiglio tipo="preventivo" titolo="Preventivi" />
          <CaricamentoPannello />
        </>
      }
    >
      <Elenco />
    </Suspense>
  );
}

async function Elenco() {
  return <ElencoPratiche tipo="preventivo" pratiche={await elencoPratiche("preventivo")} />;
}
