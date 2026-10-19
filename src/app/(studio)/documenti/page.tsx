import { Files } from "lucide-react";
import { Suspense } from "react";
import { Cartiglio } from "@/components/cartiglio";
import { Pannello, Vuoto } from "@/components/ui";
import { contaDocumenti } from "@/lib/dati";

export const metadata = { title: "Documenti" };

const CATEGORIE = [
  "Rilievi",
  "Foto di sopralluogo",
  "Elaborati grafici",
  "Relazioni",
  "Pratiche edilizie",
  "Documenti catastali",
  "Incarichi e contratti",
  "Render",
  "Computi",
];

export default function PaginaDocumenti() {
  return (
    <Suspense fallback={<Cartiglio titolo="Documenti" />}>
      <Documenti />
    </Suspense>
  );
}

async function Documenti() {
  const totale = await contaDocumenti();
  return (
    <>
      <Cartiglio
        titolo="Documenti"
        celle={[{ etichetta: "File archiviati", valore: totale, icona: Files }]}
      />
      <Pannello>
        <Vuoto
          titolo={totale === 0 ? "L'archivio è vuoto" : "Archivio documenti"}
          testo={
            <>
              I documenti si caricano dalla scheda di ogni commessa, anche dal telefono in cantiere: le foto
              conservano data e posizione dello scatto. Sono ordinati per categoria:
              <span className="mt-4 flex flex-wrap gap-2">
                {CATEGORIE.map((c) => (
                  <span key={c} className="rounded-full border border-linea px-3 py-1 text-sm text-inchiostro-2">
                    {c}
                  </span>
                ))}
              </span>
            </>
          }
        />
      </Pannello>
    </>
  );
}
