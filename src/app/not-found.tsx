import Link from "next/link";
import { Monogramma } from "@/components/monogramma";

export default function NonTrovato() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-start justify-center gap-5 px-6 md:px-16">
      <Monogramma className="h-12 opacity-80" />
      <h1 className="titolo-display text-[2.25rem]">Pagina non trovata</h1>
      <p className="max-w-md text-[0.9375rem] text-tenue">
        Il documento potrebbe essere stato eliminato, oppure il link non è corretto.
      </p>
      <Link href="/" className="text-[0.9375rem] font-medium text-accento hover:underline">
        Torna alla panoramica
      </Link>
    </div>
  );
}
