import Link from "next/link";
import Image from "next/image";
import {
  GoogleSignInButton,
  isGoogleSignInConfigured,
} from "@/components/google-sign-in-button";
import { RegistroForm } from "./registro-form";

export default function Registro() {
  const googleConfigured = isGoogleSignInConfigured();

  return (
    <main className="min-h-screen bg-cream px-5 py-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-[1fr_minmax(0,42rem)_1fr] sm:items-center sm:gap-4">
          <div className="mx-auto flex w-full max-w-2xl sm:col-start-2">
            <Link
              href="/"
              aria-label="AgroMarketNIC — ir al inicio"
              className="inline-flex min-w-0 items-center"
            >
              <Image
                src="/logo.png"
                alt="AgroMarketNIC"
                width={180}
                height={120}
                className="h-auto w-[132px] object-contain sm:w-[160px]"
                priority
              />
            </Link>
          </div>
          <Link
            href="/login"
            className="shrink-0 justify-self-start text-sm font-semibold text-ink/50 hover:text-forest sm:col-start-3 sm:justify-self-end"
          >
            Ya tengo una cuenta
          </Link>
        </header>
        <div className="mx-auto w-full max-w-2xl rounded-3xl border border-ink/10 bg-white p-7 shadow-soft md:p-10">
          <div className="mx-auto w-full max-w-4xl [&>form]:mt-4">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
              Únete a la comunidad
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold">
              Crea tu cuenta
            </h1>
            <p className="mt-2 text-ink/55">
              Empieza a conectar con el mercado ganadero de Nicaragua.
            </p>
            {googleConfigured && (
              <div className="mt-4 [&>form]:mt-0 [&>div]:my-4">
                <GoogleSignInButton dividerLabel="o crear cuenta con correo" />
              </div>
            )}
            <RegistroForm />
          </div>
        </div>
      </div>
    </main>
  );
}
