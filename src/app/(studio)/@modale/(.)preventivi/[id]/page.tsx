import { Suspense } from "react";
import { Modale } from "@/components/modale";
import { SchedaPreventivo } from "@/components/schede/scheda-preventivo";
import { SchedaSegnaposto } from "@/components/schede/comuni";

/** Scheda aperta in finestra modale sopra l'elenco. */
export default function ModaleSchedaPreventivo({ params }: PageProps<"/preventivi/[id]">) {
  return (
    <Suspense fallback={<Modale paginaIntera="/preventivi" etichetta="Preventivo"><SchedaSegnaposto /></Modale>}>
      <Contenuto params={params} />
    </Suspense>
  );
}

async function Contenuto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Modale paginaIntera={`/preventivi/${id}`} etichetta="Preventivo">
      <Suspense fallback={<SchedaSegnaposto />}>
        <SchedaPreventivo id={id} />
      </Suspense>
    </Modale>
  );
}
