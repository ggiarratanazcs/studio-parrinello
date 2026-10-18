import { Suspense } from "react";
import { Modale } from "@/components/modale";
import { SchedaPrefattibilita } from "@/components/schede/scheda-prefattibilita";
import { SchedaSegnaposto } from "@/components/schede/comuni";

/** Scheda aperta in finestra modale sopra l'elenco. */
export default function ModaleSchedaPrefattibilita({ params }: PageProps<"/prefattibilita/[id]">) {
  return (
    <Suspense fallback={<Modale paginaIntera="/prefattibilita" etichetta="Pre-fattibilità"><SchedaSegnaposto /></Modale>}>
      <Contenuto params={params} />
    </Suspense>
  );
}

async function Contenuto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Modale paginaIntera={`/prefattibilita/${id}`} etichetta="Pre-fattibilità">
      <Suspense fallback={<SchedaSegnaposto />}>
        <SchedaPrefattibilita id={id} />
      </Suspense>
    </Modale>
  );
}
