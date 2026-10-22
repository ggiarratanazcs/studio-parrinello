import { Files, FolderClosed, Images } from "lucide-react";
import { Suspense } from "react";
import { Archivio } from "@/components/archivio/archivio";
import { Cartiglio } from "@/components/cartiglio";
import { Pannello, Scheletro } from "@/components/ui";
import { leggiArchivio } from "@/lib/archivio";
import { DISEGNO_DOCUMENTI } from "@/lib/fondi";

export const metadata = { title: "Archivio" };

export default function PaginaArchivio() {
  return (
    <Suspense
      fallback={
        <>
          <Cartiglio titolo="Archivio" disegno={DISEGNO_DOCUMENTI} />
          <Pannello className="p-6">
            <Scheletro className="h-4 w-2/3" />
          </Pannello>
        </>
      }
    >
      <ContenutoArchivio />
    </Suspense>
  );
}

async function ContenutoArchivio() {
  const dati = await leggiArchivio();
  const commesse = new Set(dati.documenti.map((d) => d.commessa?.id).filter(Boolean)).size;
  const foto = dati.documenti.filter((d) => d.mime_type?.startsWith("image/")).length;
  return (
    <>
      <Cartiglio
        titolo="Archivio"
        disegno={DISEGNO_DOCUMENTI}
        celle={[
          { etichetta: "File archiviati", valore: dati.documenti.length, icona: Files },
          { etichetta: "Commesse", valore: commesse, icona: FolderClosed },
          { etichetta: "Foto", valore: foto, icona: Images },
        ]}
      />
      <Pannello className="p-4 md:p-6">
        <Archivio {...dati} />
      </Pannello>
    </>
  );
}
