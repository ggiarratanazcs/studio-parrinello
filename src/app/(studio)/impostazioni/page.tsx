import { Suspense } from "react";
import { FotoProfilo } from "@/components/foto-profilo";
import { Cartiglio } from "@/components/cartiglio";
import { LinkPulsante, Pannello, Scheletro } from "@/components/ui";
import { getProfilo } from "@/lib/auth";
import { RUOLI } from "@/lib/dominio";
import { SceltaImpaginazione } from "@/components/scelta-impaginazione";
import { SceltaTema } from "@/components/scelta-tema";
import { ImpostazioniStudio, UtentiStudio } from "@/components/impostazioni-studio";
import { createClient } from "@/lib/supabase/server";
import { leggiStudio } from "@/lib/studio";

export const metadata = { title: "Impostazioni" };

export default function PaginaImpostazioni() {
  return (
    <>
      <Cartiglio titolo="Impostazioni" />

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
          <SceltaTema />
        </Pannello>

        {/* Configurazione generale dello studio e utenti: solo per il titolare */}
        <Suspense fallback={null}>
          <SezioniTitolare />
        </Suspense>
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

async function SezioniTitolare() {
  const io = await getProfilo();
  if (io.ruolo !== "titolare") return null;
  const supabase = await createClient();
  const [studio, { data: profili }] = await Promise.all([
    leggiStudio(),
    supabase.from("profili").select("id, nome, cognome, email, ruolo, attivo").order("attivo", { ascending: false }).order("cognome"),
  ]);
  const utenti = (profili ?? []).map((u) => ({
    id: u.id,
    nome: [u.nome, u.cognome].filter(Boolean).join(" ") || u.email,
    email: u.email,
    ruolo: u.ruolo,
    attivo: u.attivo,
  }));
  return (
    <>
      <Pannello className="lg:col-span-2">
        <div className="flex items-baseline justify-between gap-3 border-b border-linea px-5 py-4 md:px-6">
          <h2 className="text-base font-medium">Studio</h2>
          <span className="text-[0.8125rem] text-tenue">Visibile solo al titolare</span>
        </div>
        <ImpostazioniStudio studio={studio} />
      </Pannello>
      <Pannello className="lg:col-span-2">
        <div className="flex items-baseline justify-between gap-3 border-b border-linea px-5 py-4 md:px-6">
          <h2 className="text-base font-medium">Utenti dello studio</h2>
          <span className="numeri text-[0.8125rem] text-tenue">{utenti.filter((u) => u.attivo).length} attivi</span>
        </div>
        <UtentiStudio utenti={utenti} ioId={io.id} />
      </Pannello>
    </>
  );
}
