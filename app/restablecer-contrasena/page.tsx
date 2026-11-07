import Image from "next/image";
import Link from "next/link";

import { PasswordResetForm } from "./reset-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;
  const validToken = typeof token === "string" && token.length > 0 ? token : null;

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
        <h1 className="max-w-lg font-display text-5xl font-extrabold leading-tight">
          Vuelve a ingresar con confianza.
        </h1>
        <p className="text-sm text-white/45">© 2026 AgroMarketNIC</p>
      </div>

      <div className="flex items-center justify-center bg-cream p-6">
        <div className="w-full max-w-md">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
            Recuperación de acceso
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold">
            Restablece tu contraseña
          </h2>
          {validToken ? (
            <PasswordResetForm token={validToken} />
          ) : (
            <p
              role="alert"
              className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              El enlace no es válido o ha expirado.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
