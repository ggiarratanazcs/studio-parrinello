import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { getProfilo } from "@/lib/auth";
import { RUOLI } from "@/lib/dominio";

/** Pallino del profilo: foto se caricata, altrimenti le iniziali. */
export function Avatar({ iniziali, foto, className = "" }: { iniziali: string; foto?: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-inchiostro text-[0.8125rem] font-medium text-superficie shadow-[0_6px_14px_-8px_rgba(43,42,40,0.7),inset_0_1px_0_rgba(255,255,255,0.15)] ${className}`}
      style={{ fontVariationSettings: '"wdth" 110' }}
    >
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        iniziali
      )}
    </span>
  );
}

/** Blocco utente in fondo alla barra laterale. */
export async function UtenteLaterale() {
  const p = await getProfilo();
  const nome = [p.nome, p.cognome].filter(Boolean).join(" ") || p.email;
  return (
    <div className="blocco-utente flex items-center gap-2">
      <Link href="/impostazioni" data-suggerimento={`${nome} · Impostazioni`} data-suggerimento-lato="destra" data-suggerimento-se-barra-chiusa className="flex min-w-0 flex-1 items-center gap-3 rounded-[12px] p-1 hover:bg-superficie-2">
        <Avatar iniziali={p.iniziali} foto={p.foto} />
        <span className="solo-barra-aperta min-w-0">
          <span className="block truncate text-sm font-medium">{nome}</span>
          <span className="etichetta block truncate">{RUOLI[p.ruolo] ?? p.ruolo}</span>
        </span>
      </Link>
      <form action="/auth/esci" method="post" className="solo-barra-aperta">
        <button
          type="submit"
          data-suggerimento="Esci"
          className="grid size-9 place-items-center rounded-[10px] text-tenue hover:bg-superficie-2 hover:text-inchiostro"
        >
          <LogOut className="size-[18px]" strokeWidth={1.6} />
          <span className="sr-only">Esci</span>
        </button>
      </form>
    </div>
  );
}

/** Avatar nella barra in alto su telefono: porta alle impostazioni. */
export async function UtenteMobile() {
  const p = await getProfilo();
  return (
    <Link href="/impostazioni" aria-label="Il tuo profilo e le impostazioni">
      <Avatar iniziali={p.iniziali} foto={p.foto} className="size-8 text-xs" />
    </Link>
  );
}

/** In alto a destra nell'impaginazione Materia: saluto, impostazioni (rotellina) ed esci. */
export async function SalutoUtente() {
  const p = await getProfilo();
  const nome = p.nome || p.email.split("@")[0];
  return (
    <div className="flex items-center gap-1">
      <Link href="/impostazioni" className="mr-2 flex items-center gap-2.5 rounded-full py-0.5 pl-0.5 pr-1" aria-label="Il tuo profilo">
        <Avatar iniziali={p.iniziali} foto={p.foto} className="size-8 text-xs" />
        <span className="saluto whitespace-nowrap text-[0.9375rem] text-inchiostro-2">
          Ciao <span className="text-inchiostro">{nome}</span>
        </span>
      </Link>
      <Link
        href="/impostazioni"
        aria-label="Impostazioni"
        data-suggerimento="Impostazioni"
        data-suggerimento-lato="sotto"
        className="grid size-9 place-items-center rounded-full text-tenue transition-colors hover:bg-superficie-2 hover:text-inchiostro"
      >
        <Settings className="size-[18px]" strokeWidth={1.7} />
      </Link>
      <form action="/auth/esci" method="post">
        <button
          type="submit"
          aria-label="Esci"
          data-suggerimento="Esci"
          data-suggerimento-lato="sotto"
          className="grid size-9 place-items-center rounded-full text-tenue transition-colors hover:bg-superficie-2 hover:text-inchiostro"
        >
          <LogOut className="size-[18px]" strokeWidth={1.6} />
        </button>
      </form>
    </div>
  );
}

export function UtenteSegnaposto({ compatto = false }: { compatto?: boolean }) {
  return compatto ? (
    <span className="block size-8 rounded-full bg-pietra/70" />
  ) : (
    <div className="flex items-center gap-3 p-1">
      <span className="size-9 rounded-full bg-pietra/70" />
      <span className="solo-barra-aperta h-3 w-24 rounded-piccolo bg-pietra/70" />
    </div>
  );
}
