import Image from "next/image";
import Link from "next/link";

import { PasswordResetRequestForm } from "./request-form";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link
          href="/"
          className="inline-flex h-12 items-center rounded-xl bg-white/90 px-3"
        >
          <Image
            src="/logo.png"
            alt="AgroMarketNIC"
            width={180}
            height={120}
            className="-my-[21px] h-[90px] w-[135px] object-contain sm:h-[120px] sm:w-[180px] sm:-my-9"
            priority
          />
        </Link>
        <div>
          <p className="mb-5 text-sm font-bold uppercase tracking-[.2em] text-[#b6d6ae]">
            Acceso seguro
          </p>
          <h1 className="max-w-lg font-display text-5xl font-extrabold leading-tight">
            Recupera tu cuenta.
          </h1>
        </div>
        <p className="text-sm text-white/45">© 2026 AgroMarketNIC</p>
      </div>

      <div className="flex items-center justify-center bg-cream p-6">
        <div className="w-full max-w-md">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
            Recuperación de acceso
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold">
            ¿Olvidaste tu contraseña?
          </h2>
          <p className="mt-3 text-ink/55">
            Te enviaremos instrucciones si existe una cuenta asociada.
          </p>
          <PasswordResetRequestForm />
        </div>
      </div>
    </main>
  );
}
