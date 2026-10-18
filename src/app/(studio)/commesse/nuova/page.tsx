import { Suspense } from "react";
import { Cartiglio } from "@/components/cartiglio";
import { Pannello, Scheletro } from "@/components/ui";
import { datiNuovaCommessa } from "@/lib/dati";
import { ProceduraNuovaCommessa } from "./procedura";

export const metadata = { title: "Nuova commessa" };

export default function PaginaNuovaCommessa() {
  return (
    <>
      <Cartiglio
        titolo="Nuova commessa"
        sottotitolo="Quattro passi: committente, immobile, incarico e fasi. Il codice viene assegnato al salvataggio."
      />
      <Suspense
        fallback={
          <Pannello className="space-y-4 p-6">
            <Scheletro className="h-4 w-1/3" />
            <Scheletro className="h-11 w-full" />
            <Scheletro className="h-11 w-full" />
          </Pannello>
        }
      >
        <Procedura />
      </Suspense>
    </>
  );
}

async function Procedura() {
  const dati = await datiNuovaCommessa();
  // Letta dopo i dati della richiesta: la data di oggi non entra nella parte statica della pagina
  const oggi = new Date().toISOString().slice(0, 10);
  return <ProceduraNuovaCommessa dati={dati} oggi={oggi} />;
}
