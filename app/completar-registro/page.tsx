import Image from "next/image";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logout } from "@/components/auth-actions";
import { getAuthorizedDestination } from "@/lib/auth/redirects";
import { isRoleName } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { CompletarRegistroForm } from "./completar-registro-form";

export default async function CompletarRegistroPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      roles: {
        select: {
          role: { select: { name: true } },
        },
      },
      accounts: {
        where: { provider: "google" },
        select: { provider: true },
        take: 1,
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.status === "SUSPENDED") {
    redirect("/login?error=AccessDenied");
  }

  if (user.roles.length > 0) {
    const roles = user.roles
      .map(({ role }) => role.name)
      .filter(isRoleName);
    redirect(getAuthorizedDestination(roles) ?? "/login");
  }

  if (user.status !== "PENDING" || user.accounts.length === 0) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-5 py-10">
      <section className="w-full max-w-2xl rounded-3xl border border-ink/10 bg-white px-6 py-8 shadow-soft sm:px-10 sm:py-10">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="AgroMarketNIC"
            width={220}
            height={147}
            className="h-auto w-[180px] object-contain sm:w-[220px]"
            priority
          />
        </div>

        <div className="mt-5 flex justify-end">
          <form action={logout}>
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-ink/55 transition hover:bg-cream hover:text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              type="submit"
            >
              Cerrar sesión
            </button>
          </form>
        </div>

        <div className="mt-4">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
            Un paso más
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-ink sm:text-4xl">
            Completa tu cuenta
          </h1>
          <p className="mt-3 text-ink/55">
            ¿Cómo utilizarás AgroMarketNIC?
          </p>
        </div>

        <CompletarRegistroForm />
      </section>
    </main>
  );
}
