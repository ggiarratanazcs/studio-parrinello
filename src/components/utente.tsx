import Link from "next/link";
import { LogOut } from "lucide-react";
import { getProfilo } from "@/lib/auth";
import { RUOLI } from "@/lib/dominio";

function Avatar({ iniziali, className = "" }: { iniziali: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid size-9 shrink-0 place-items-center rounded-full bg-inchiostro text-[0.8125rem] font-medium text-superficie ${className}`}
      style={{ fontVariationSettings: '"wdth" 110' }}
    >
      {iniziali}
    </span>
  );
}

/** Blocco utente in fondo alla barra laterale. */
export async function UtenteLaterale() {
  const p = await getProfilo();
  const nome = [p.nome, p.cognome].filter(Boolean).join(" ") || p.email;
  return (
    <div className="flex items-center gap-3">
      <Link href="/impostazioni" className="flex min-w-0 flex-1 items-center gap-3 rounded-m p-1 hover:bg-superficie/60">
        <Avatar iniziali={p.iniziali} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{nome}</span>
          <span className="etichetta block truncate">{RUOLI[p.ruolo] ?? p.ruolo}</span>
        </span>
      </Link>
      <form action="/auth/esci" method="post">
        <button
          type="submit"
          title="Esci"
          className="grid size-9 place-items-center rounded-m text-tenue hover:bg-superficie/60 hover:text-inchiostro"
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
      <Avatar iniziali={p.iniziali} className="size-8 text-xs" />
    </Link>
  );
}

export function UtenteSegnaposto({ compatto = false }: { compatto?: boolean }) {
  return compatto ? (
    <span className="block size-8 rounded-full bg-pietra/70" />
  ) : (
    <div className="flex items-center gap-3 p-1">
      <span className="size-9 rounded-full bg-pietra/70" />
      <span className="h-3 w-24 rounded-s bg-pietra/70" />
    </div>
  );
}
