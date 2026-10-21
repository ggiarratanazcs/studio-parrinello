import { Suspense } from "react";
import { FinestraAnagrafica } from "@/components/anagrafiche/finestra-anagrafica";
import { SchedaClienteDaId, SegnapostoAnagrafica } from "@/components/anagrafiche/scheda-cliente-dati";

/** Scheda del cliente in finestra, sopra la pagina da cui è stata aperta. */
export default function FinestraCliente({ params }: PageProps<"/clienti/[id]">) {
  return (
    <FinestraAnagrafica etichetta="Cliente">
      <Suspense fallback={<SegnapostoAnagrafica />}>
        <Contenuto params={params} />
      </Suspense>
    </FinestraAnagrafica>
  );
}

async function Contenuto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SchedaClienteDaId id={id} />;
}
