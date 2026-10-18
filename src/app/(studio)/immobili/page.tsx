import { Building, Map, MapPin } from "lucide-react";
import { Suspense } from "react";
import { Cartiglio } from "@/components/cartiglio";
import { ImmobiliConMappa } from "@/components/mappa/immobili-mappa";
import { Pannello, Scheletro } from "@/components/ui";
import { elencoImmobili } from "@/lib/dati";

export const metadata = { title: "Immobili" };

export default function PaginaImmobili() {
  return (
    <Suspense
      fallback={
        <>
          <Cartiglio titolo="Immobili" />
          <Pannello className="p-6">
            <Scheletro className="h-4 w-2/3" />
          </Pannello>
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
        sottotitolo="Gli edifici e i terreni su cui lavora o ha lavorato lo studio, sulla mappa e in elenco."
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
