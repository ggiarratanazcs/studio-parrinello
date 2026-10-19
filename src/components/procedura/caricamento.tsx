import { Pannello, Scheletro } from "@/components/ui";

export function CaricamentoProcedura() {
  return (
    <Pannello className="space-y-4 p-6">
      <Scheletro className="h-4 w-1/3" />
      <Scheletro className="h-11 w-full" />
      <Scheletro className="h-11 w-full" />
    </Pannello>
  );
}
