import { Suspense } from "react";
import { ModuloAccesso } from "./modulo-accesso";

export const metadata = { title: "Accesso" };

export default function PaginaAccesso() {
  return (
    <>
      <h1 className="titolo-display text-[2.25rem]">Accedi</h1>
      <p className="mt-3 text-[0.9375rem] text-tenue">Benvenuto nello Studio</p>
      <Suspense>
        <ModuloAccesso />
      </Suspense>
    </>
  );
}
