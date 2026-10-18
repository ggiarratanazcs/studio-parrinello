import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SchedaCommessa } from "@/components/schede/scheda-commessa";
import { SchedaSegnaposto } from "@/components/schede/comuni";

export const metadata = { title: "Commessa" };

export default function PaginaCommessa({ params }: PageProps<"/commesse/[id]">) {
  return (
    <>
      <Link href="/commesse" className="mb-6 inline-flex items-center gap-1.5 text-sm text-tenue hover:text-inchiostro">
        <ArrowLeft className="size-4" strokeWidth={1.8} />
        Commesse
      </Link>
      <Suspense fallback={<SchedaSegnaposto />}>
        <Contenuto params={params} />
      </Suspense>
    </>
  );
}

async function Contenuto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SchedaCommessa id={id} />;
}
