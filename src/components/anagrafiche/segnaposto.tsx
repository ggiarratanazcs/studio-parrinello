import { BookUser } from "lucide-react";
import { CartaAnagrafica } from "@/components/anagrafiche/carta";
import { Scheletro } from "@/components/ui";

export function SegnapostoAnagrafica({ linguetta = "Anagrafica" }: { linguetta?: string }) {
  return (
    <CartaAnagrafica linguetta={linguetta} icona={BookUser}>
      <div className="flex items-start gap-4">
        <Scheletro className="size-14 rounded-full" />
        <div className="flex-1">
          <Scheletro className="h-3 w-40" />
          <Scheletro className="mt-3 h-8 w-2/3" />
        </div>
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <Scheletro className="h-4 w-full" />
          <Scheletro className="h-4 w-5/6" />
          <Scheletro className="h-4 w-4/6" />
        </div>
        <div className="space-y-3">
          <Scheletro className="h-9 w-full" />
          <Scheletro className="h-9 w-full" />
        </div>
      </div>
    </CartaAnagrafica>
  );
}
