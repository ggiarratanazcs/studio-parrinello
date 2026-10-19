import { Suspense } from "react";
import { Check } from "lucide-react";
import { FotoProfilo } from "@/components/foto-profilo";
import { Cartiglio } from "@/components/cartiglio";
import { LinkPulsante, Pannello, Scheletro } from "@/components/ui";
import { getProfilo } from "@/lib/auth";
import { RUOLI } from "@/lib/dominio";
import { TEMI, TEMA_PREDEFINITO } from "@/lib/temi";
import { SceltaImpaginazione } from "@/components/scelta-impaginazione";

export const metadata = { title: "Impostazioni" };

export default function PaginaImpostazioni() {
  return (
    <>
      <Cartiglio titolo="Impostazioni" sottotitolo="Il tuo profilo e l'aspetto dell'applicazione. Impaginazione e tema valgono su questo dispositivo." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Pannello>
          <h2 className="border-b border-linea px-5 py-4 text-base font-medium md:px-6">Profilo</h2>
          <Suspense
            fallback={
              <div className="space-y-3 p-6">
                <Scheletro className="h-4 w-1/2" />
                <Scheletro className="h-4 w-2/3" />
              </div>
            }
          >
            <Profilo />
          </Suspense>
        </Pannello>

        <Pannello>
          <h2 className="border-b border-linea px-5 py-4 text-base font-medium md:px-6">Impaginazione</h2>
          <SceltaImpaginazione />
        </Pannello>

        <Pannello>
          <h2 className="border-b border-linea px-5 py-4 text-base font-medium md:px-6">Tema</h2>
          <ul className="divide-y divide-linea">
            {TEMI.map((t) => {
              const attivo = t.id === TEMA_PREDEFINITO;
              return (
                <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
                  <span>
                    <span className={`block font-medium ${t.disponibile ? "" : "text-tenue"}`}>{t.nome}</span>
                    <span className="block text-sm text-tenue">{t.descrizione}</span>
                  </span>
                  {attivo ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-accento">
                      <Check className="size-4" strokeWidth={2} /> In uso
                    </span>
                  ) : (
                    <span className="etichetta">In arrivo</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Pannello>
      </div>
    </>
  );
}

async function Profilo() {
  const p = await getProfilo();
  const righe = [
    { etichetta: "Nome", valore: [p.nome, p.cognome].filter(Boolean).join(" ") || "Da completare" },
    { etichetta: "Email", valore: p.email },
    { etichetta: "Ruolo", valore: RUOLI[p.ruolo] ?? p.ruolo },
    { etichetta: "Qualifica", valore: p.qualifica ?? "—" },
  ];
  return (
    <div className="px-5 py-5 md:px-6">
      <div className="mb-6">
        <FotoProfilo id={p.id} iniziali={p.iniziali} foto={p.foto} />
      </div>
      <dl className="grid grid-cols-[7rem_1fr] gap-y-3 text-[0.9375rem]">
        {righe.map((r) => (
          <div key={r.etichetta} className="contents">
            <dt className="etichetta pt-0.5">{r.etichetta}</dt>
            <dd className="min-w-0 truncate">{r.valore}</dd>
          </div>
        ))}
      </dl>
      <LinkPulsante href="/imposta-password" variante="secondario" className="mt-6">
        Cambia password
      </LinkPulsante>
    </div>
  );
}
