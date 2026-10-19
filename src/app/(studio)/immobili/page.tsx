import { Building, Map, MapPin } from "lucide-react";
import { Suspense } from "react";
import { Cartiglio } from "@/components/cartiglio";
import { CaricamentoPannello } from "@/components/compasso";
import { ImmobiliConMappa } from "@/components/mappa/immobili-mappa";
import { elencoImmobili } from "@/lib/dati";

export const metadata = { title: "Immobili" };

export default function PaginaImmobili() {
  return (
    <Suspense
      fallback={
        <>
          <Cartiglio titolo="Immobili" />
          <CaricamentoPannello />
        </>
      }
    >
      <ElencoImmobili />
    </Suspense>
  );
}

async function ElencoImmobili() {
  const immobili = await elencoImmobili();
  const comuni = new Set(immobili.map((i) => i.comune)).size;

  return (
    <>
      <Cartiglio
        titolo="Immobili"
        celle={[
          { etichetta: "Immobili", valore: immobili.length, icona: Building },
          { etichetta: "Comuni", valore: comuni, icona: MapPin },
          { etichetta: "Sulla mappa", valore: immobili.filter((i) => i.latitudine != null).length, icona: Map },
        ]}
      />
      <ImmobiliConMappa immobili={immobili} />
    </>
  );
}
