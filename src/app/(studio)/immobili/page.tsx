import { Suspense } from "react";
import { Cartiglio } from "@/components/cartiglio";
import { Pannello, Scheletro, Vuoto } from "@/components/ui";
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
        sottotitolo="Gli edifici e i terreni su cui lavora lo studio, con dati catastali e inquadramento urbanistico."
        celle={[
          { etichetta: "Immobili", valore: immobili.length },
          { etichetta: "Comuni", valore: comuni },
        ]}
      />
      <Pannello>
        {immobili.length === 0 ? (
          <Vuoto
            titolo="Nessun immobile registrato"
            testo="Ogni immobile raccoglie indirizzo, foglio, particella e subalterno, zona urbanistica e vincoli. Lo stesso immobile può essere collegato a più commesse nel tempo."
          />
        ) : (
          <ul className="divide-y divide-linea">
            {immobili.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{i.denominazione ?? i.indirizzo}</span>
                  <span className="block truncate text-sm text-tenue">
                    {[i.indirizzo, i.comune].filter(Boolean).join(", ")}
                  </span>
                </span>
                <span className="etichetta shrink-0">{i.zona_urbanistica ? `Zona ${i.zona_urbanistica}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </Pannello>
    </>
  );
}
