import { Compasso } from "@/components/compasso";

/** Mentre si apre una sezione: il compasso al centro dell'area di lavoro. */
export default function Caricamento() {
  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <Compasso className="w-40" />
    </div>
  );
}
