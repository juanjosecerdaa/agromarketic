import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { RegistroForm } from "./registro-form";

export default function Registro() {
  return (
    <main className="min-h-screen bg-cream px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex h-12 items-center rounded-xl bg-white px-3"
        >
          <Image src="/logo.png" alt="AgroMarketNIC" width={180} height={120} className="-my-[21px] h-[90px] w-[135px] object-contain sm:h-[120px] sm:w-[180px] sm:-my-9" priority />
        </Link>
        <div className="mt-10 rounded-3xl border border-ink/10 bg-white p-7 shadow-soft md:p-10">
          <Link
            href="/login"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-ink/50"
          >
            <ArrowLeft className="h-4 w-4" /> Ya tengo una cuenta
          </Link>
          <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
            Únete a la comunidad
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold">
            Crea tu cuenta
          </h1>
          <p className="mt-3 text-ink/55">
            Empieza a conectar con el mercado ganadero de Nicaragua.
          </p>
          <RegistroForm />
        </div>
      </div>
    </main>
  );
}
