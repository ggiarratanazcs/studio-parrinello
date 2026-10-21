import { Suspense } from "react";
import { FinestraAnagrafica } from "@/components/anagrafiche/finestra-anagrafica";
import { SchedaImmobileDaId } from "@/components/anagrafiche/scheda-immobile-dati";
import { SegnapostoAnagrafica } from "@/components/anagrafiche/segnaposto";

/** Scheda dell'immobile in finestra, sopra la pagina da cui è stata aperta. */
export default function FinestraImmobile({ params }: PageProps<"/immobili/[id]">) {
  return (
    <FinestraAnagrafica etichetta="Immobile">
      <Suspense fallback={<SegnapostoAnagrafica />}>
        <Contenuto params={params} />
      </Suspense>
    </FinestraAnagrafica>
  );
}

async function Contenuto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SchedaImmobileDaId id={id} />;
}
