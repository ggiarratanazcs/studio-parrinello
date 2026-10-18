import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...classi: ClassValue[]) {
  return twMerge(clsx(classi));
}

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
export function formattaEuro(valore: number | null | undefined) {
  return valore == null ? "—" : euro.format(valore);
}

const data = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" });
export function formattaData(valore: string | null | undefined) {
  return valore ? data.format(new Date(valore)) : "—";
}
