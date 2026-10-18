import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SchedaPreventivo } from "@/components/schede/scheda-preventivo";
import { SchedaSegnaposto } from "@/components/schede/comuni";

export const metadata = { title: "Preventivo" };

export default function PaginaPreventivo({ params }: PageProps<"/preventivi/[id]">) {
  return (
    <>
      <Link href="/preventivi" className="mb-6 inline-flex items-center gap-1.5 text-sm text-tenue hover:text-inchiostro">
        <ArrowLeft className="size-4" strokeWidth={1.8} />
        Preventivi
      </Link>
      <Suspense fallback={<SchedaSegnaposto />}>
        <Contenuto params={params} />
      </Suspense>
    </>
  );
}

async function Contenuto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SchedaPreventivo id={id} />;
}
