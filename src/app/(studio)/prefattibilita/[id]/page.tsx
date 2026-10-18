import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SchedaPrefattibilita } from "@/components/schede/scheda-prefattibilita";
import { SchedaSegnaposto } from "@/components/schede/comuni";

export const metadata = { title: "Pre-fattibilità" };

export default function PaginaPrefattibilita({ params }: PageProps<"/prefattibilita/[id]">) {
  return (
    <>
      <Link href="/prefattibilita" className="mb-6 inline-flex items-center gap-1.5 text-sm text-tenue hover:text-inchiostro">
        <ArrowLeft className="size-4" strokeWidth={1.8} />
        Pre-fattibilità
      </Link>
      <Suspense fallback={<SchedaSegnaposto />}>
        <Contenuto params={params} />
      </Suspense>
    </>
  );
}

async function Contenuto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SchedaPrefattibilita id={id} />;
}
