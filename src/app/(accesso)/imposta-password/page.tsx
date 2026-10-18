import { ModuloPassword } from "./modulo-password";

export const metadata = { title: "Imposta la password" };

export default function PaginaImpostaPassword() {
  return (
    <>
      <h1 className="titolo-display text-[2.25rem]">Imposta la password</h1>
      <p className="mt-3 text-[0.9375rem] text-tenue">
        Scegli la password che userai per entrare. Se è il tuo primo accesso, completa anche nome e cognome.
      </p>
      <ModuloPassword />
    </>
  );
}
