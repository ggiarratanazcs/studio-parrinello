import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Campo di testo con etichetta sopra. */
export function Campo({
  etichetta,
  id,
  className,
  ...props
}: ComponentProps<"input"> & { etichetta: string; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-inchiostro-2">
        {etichetta}
      </label>
      <input
        id={id}
        className={cn(
          "h-11 rounded-m border border-linea-forte bg-superficie px-3 text-base text-inchiostro outline-none transition-colors placeholder:text-tenue/70 focus:border-accento focus:ring-2 focus:ring-accento/20",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function Messaggio({ tipo, children }: { tipo: "errore" | "ok"; children: React.ReactNode }) {
  return (
    <p
      role={tipo === "errore" ? "alert" : "status"}
      className={cn(
        "rounded-m border px-3 py-2.5 text-sm",
        tipo === "errore"
          ? "border-[color:var(--stato-sospesa)]/30 bg-[color:var(--stato-sospesa)]/8 text-[color:var(--stato-sospesa)]"
          : "border-[color:var(--stato-attiva)]/30 bg-[color:var(--stato-attiva)]/8 text-[color:var(--stato-attiva)]",
      )}
    >
      {children}
    </p>
  );
}
