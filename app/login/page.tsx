import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getAuthorizedDestination } from "@/lib/auth/redirects";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ registered?: string; callbackUrl?: string }>;
};

export default async function Login({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const session = await auth();
  const destination =
    session?.user?.status === "ACTIVE"
      ? getAuthorizedDestination(session.user.roles, params.callbackUrl)
      : null;

  if (destination) {
    redirect(destination);
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link
          href="/"
          className="inline-flex h-12 items-center rounded-xl bg-white/90 px-3"
        >
          <Image src="/logo.png" alt="AgroMarketNIC" width={180} height={120} className="-my-[21px] h-[90px] w-[135px] object-contain sm:h-[120px] sm:w-[180px] sm:-my-9" priority />
        </Link>
        <div>
          <p className="mb-5 text-sm font-bold uppercase tracking-[.2em] text-[#b6d6ae]">
            Tu próximo negocio empieza aquí
          </p>
          <h1 className="max-w-lg font-display text-5xl font-extrabold leading-tight">
            El campo nicaragüense,{" "}
            <span className="text-[#d3e7bc]">conectado.</span>
          </h1>
          <p className="mt-6 max-w-md leading-7 text-white/65">
            Compra, vende y encuentra oportunidades con productores de
            confianza.
          </p>
        </div>
        <p className="text-sm text-white/45">© 2026 AgroMarketNIC</p>
      </div>

      <div className="flex items-center justify-center bg-cream p-6">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-12 flex items-center gap-2 text-sm font-semibold text-ink/55"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>
          <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
            Bienvenido de vuelta
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold">
            Ingresa a tu cuenta
          </h2>
          <p className="mt-3 text-ink/55">
            Gestiona tus animales y conecta con compradores.
          </p>

          <LoginForm
            registered={params.registered === "1"}
            callbackUrl={params.callbackUrl}
          />

          <p className="mt-8 text-center text-sm text-ink/55">
            ¿Aún no tienes cuenta?{" "}
            <Link href="/registro" className="font-bold text-forest">
              Crea una gratis
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
