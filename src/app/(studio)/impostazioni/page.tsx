import { Suspense } from "react";
import { Building2, Palette, ShieldCheck, User, Users } from "lucide-react";
import { FotoProfilo } from "@/components/foto-profilo";
import { Cartiglio } from "@/components/cartiglio";
import { LinkPulsante, Scheletro } from "@/components/ui";
import { getProfilo } from "@/lib/auth";
import { RUOLI } from "@/lib/dominio";
import { RiepilogoAspetto, SceltaAspetto } from "@/components/scelta-aspetto";
import { SezioneImpostazioni } from "@/components/sezione-impostazioni";
import { ImpostazioniStudio, UtentiStudio } from "@/components/impostazioni-studio";
import { createClient } from "@/lib/supabase/server";
import { leggiStudio } from "@/lib/studio";
import { getPermessi } from "@/lib/permessi";
import { PREDEFINITI, RUOLI_CONFIGURABILI, type MappaPermessi, type RuoloConfigurabile } from "@/lib/permessi-catalogo";
import { MatricePermessi } from "@/components/ruoli-permessi";

export const metadata = { title: "Impostazioni" };

const icona = "size-[18px]";

/**
 * Impostazioni come elenco di sezioni che si aprono: Profilo, Aspetto e, per il titolare,
 * Studio e Utenti. Ogni sezione mostra a destra un riepilogo dello stato attuale.
 */
export default function PaginaImpostazioni() {
  return (
    <>
      <Cartiglio titolo="Impostazioni" disegno={null} />

      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        <Suspense fallback={<SezioneSegnaposto />}>
          <SezioneProfilo />
        </Suspense>

        <SezioneImpostazioni
          icona={<Palette className={icona} strokeWidth={1.7} />}
          titolo="Aspetto"
          descrizione="Impaginazione e tema"
          riepilogo={<RiepilogoAspetto />}
        >
          <div className="px-5 py-5 md:px-6">
            <SceltaAspetto />
          </div>
        </SezioneImpostazioni>

        {/* Configurazione generale dello studio e utenti: solo per il titolare */}
        <Suspense fallback={null}>
          <SezioniTitolare />
        </Suspense>
      </div>
    </>
  );
}

function SezioneSegnaposto() {
  return (
    <div className="flex items-center gap-4 rounded-grande border border-linea bg-superficie px-6 py-4">
      <Scheletro className="size-10 rounded-[11px]" />
      <div className="flex-1 space-y-2">
        <Scheletro className="h-4 w-32" />
        <Scheletro className="h-3 w-48" />
      </div>
    </div>
  );
}

async function SezioneProfilo() {
  const p = await getProfilo();
  const nome = [p.nome, p.cognome].filter(Boolean).join(" ") || p.email;
  const righe = [
    { etichetta: "Nome", valore: nome || "Da completare" },
    { etichetta: "Email", valore: p.email },
    { etichetta: "Ruolo", valore: RUOLI[p.ruolo] ?? p.ruolo },
    { etichetta: "Qualifica", valore: p.qualifica ?? "—" },
  ];
  return (
    <SezioneImpostazioni
      icona={<User className={icona} strokeWidth={1.7} />}
      titolo="Profilo"
      descrizione="Foto, dati personali e password"
      riepilogo={`${nome} · ${RUOLI[p.ruolo] ?? p.ruolo}`}
    >
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
    </SezioneImpostazioni>
  );
}

async function SezioniTitolare() {
  const [io, permessi] = await Promise.all([getProfilo(), getPermessi()]);
  const studio = await leggiStudio();
  const sezioneStudio = (
    <SezioneImpostazioni
      icona={<Building2 className={icona} strokeWidth={1.7} />}
      titolo="Studio"
      descrizione="Logo, nome, claim e dati sui documenti"
      riepilogo={studio.nome}
    >
      <ImpostazioniStudio studio={studio} />
    </SezioneImpostazioni>
  );
  // Chi ha "Impostazioni dello studio" in modifica vede solo la sezione Studio
  if (io.ruolo !== "titolare") return permessi.liv("impostazioni") >= 2 ? sezioneStudio : null;

  const supabase = await createClient();
  const [{ data: profili }, { data: righeRuolo }, { data: righeUtente }] = await Promise.all([
    supabase.from("profili").select("id, nome, cognome, email, ruolo, attivo").order("attivo", { ascending: false }).order("cognome"),
    supabase.from("permessi_ruolo").select("ruolo, chiave, livello"),
    supabase.from("permessi_utente").select("profilo_id, chiave, livello"),
  ]);

  // Valori dei ruoli: quelli salvati sopra i valori di partenza
  const ruoli = Object.fromEntries(RUOLI_CONFIGURABILI.map((r) => [r, { ...PREDEFINITI[r] }])) as Record<RuoloConfigurabile, MappaPermessi>;
  for (const r of righeRuolo ?? []) if (r.ruolo in ruoli) ruoli[r.ruolo as RuoloConfigurabile][r.chiave] = r.livello;
  const personali = new Map<string, MappaPermessi>();
  for (const r of righeUtente ?? []) personali.set(r.profilo_id, { ...(personali.get(r.profilo_id) ?? {}), [r.chiave]: r.livello });

  const utenti = (profili ?? []).map((u) => ({
    id: u.id,
    nome: [u.nome, u.cognome].filter(Boolean).join(" ") || u.email,
    email: u.email,
    ruolo: u.ruolo ?? "collaboratore",
    attivo: u.attivo,
    personali: personali.get(u.id) ?? {},
  }));
  const attivi = utenti.filter((u) => u.attivo).length;
  const conEccezioni = utenti.filter((u) => Object.keys(u.personali).length).length;
  return (
    <>
      {sezioneStudio}
      <SezioneImpostazioni
        icona={<Users className={icona} strokeWidth={1.7} />}
        titolo="Utenti dello studio"
        descrizione="Accessi, ruoli ed eccezioni personali · solo titolare"
        riepilogo={`${attivi} ${attivi === 1 ? "attivo" : "attivi"}`}
      >
        <UtentiStudio utenti={utenti} ioId={io.id} ruoli={ruoli} />
      </SezioneImpostazioni>
      <SezioneImpostazioni
        icona={<ShieldCheck className={icona} strokeWidth={1.7} />}
        titolo="Ruoli e permessi"
        descrizione="Cosa può vedere e fare ogni ruolo · solo titolare"
        riepilogo={conEccezioni ? `${conEccezioni} ${conEccezioni === 1 ? "utente" : "utenti"} con eccezioni` : "Architetto · Collaboratore"}
      >
        <MatricePermessi valori={ruoli} />
      </SezioneImpostazioni>
    </>
  );
}
