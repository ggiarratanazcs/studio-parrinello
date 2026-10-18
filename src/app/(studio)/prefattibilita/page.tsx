import { Suspense } from "react";
import { Cartiglio } from "@/components/cartiglio";
import { ElencoPratiche } from "@/components/elenco-pratiche";
import { Pannello, Scheletro } from "@/components/ui";
import { elencoPratiche } from "@/lib/dati";

export const metadata = { title: "Pre-fattibilità" };

export default function Pagina() {
  return (
    <Suspense
      fallback={
        <>
          <Cartiglio tipo="prefattibilita" titolo="Pre-fattibilità" />
          <Pannello className="p-6">
            <Scheletro className="h-4 w-full" />
            <Scheletro className="mt-4 h-4 w-5/6" />
          </Pannello>
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
