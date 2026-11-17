import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import {
  GoogleSignInButton,
  isGoogleSignInConfigured,
} from "@/components/google-sign-in-button";
import { RegistroForm } from "./registro-form";

export default function Registro() {
  const googleConfigured = isGoogleSignInConfigured();

  return (
    <main className="min-h-screen bg-cream px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-ink/10 bg-white px-7 pb-7 pt-2 shadow-soft md:px-10 md:pb-10 md:pt-2 [&>form]:mt-6">
          <Link
            href="/"
            className="mx-auto mb-1 flex w-fit items-center justify-center"
          >
            <Image
              src="/logo.png"
              alt="AgroMarketNIC"
              width={220}
              height={147}
              className="h-auto w-[180px] object-contain sm:w-[220px]"
              priority
            />
          </Link>
          <Link
            href="/login"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-ink/50"
          >
            <ArrowLeft className="h-4 w-4" /> Ya tengo una cuenta
          </Link>
          <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
            Únete a la comunidad
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold">
            Crea tu cuenta
          </h1>
          <p className="mt-2 text-ink/55">
            Empieza a conectar con el mercado ganadero de Nicaragua.
          </p>
          <GoogleSignInButton dividerLabel="o crear cuenta con correo" />
          <RegistroForm />
        </div>
      </div>
    </main>
  );
}
