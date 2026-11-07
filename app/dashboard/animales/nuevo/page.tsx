import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { AnimalForm } from "./animal-form";

export default async function NewAnimalPage() {
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect("/login?callbackUrl=/dashboard/animales/nuevo");
  }

  if (session.user.roles.includes(ROLES.ADMIN)) {
    redirect("/admin");
  }

  if (!session.user.roles.includes(ROLES.FARMER)) {
    redirect("/catalogo");
  }

  const [fincas, categories] = await prisma.$transaction([
    prisma.finca.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-cream px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="inline-flex h-12 items-center rounded-xl bg-white px-3"
        >
          <Image src="/logo.png" alt="AgroMarketNIC" width={180} height={120} className="-my-9 h-[120px] w-[180px] object-contain" />
        </Link>
        <div className="mt-10 rounded-3xl border border-ink/10 bg-white p-7 shadow-soft md:p-10">
          <Link
            href="/dashboard"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-ink/50"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al dashboard
          </Link>
          <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
            Publicaciones
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold">
            Publica un animal
          </h1>
          <p className="mt-3 text-ink/55">
            Completa la información del animal para mostrarlo en el catálogo.
          </p>

          {fincas.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-cream p-7 text-center">
              <h2 className="font-display text-xl font-bold">
                Primero registra una finca
              </h2>
              <p className="mt-2 text-sm text-ink/55">
                Necesitas una finca propia antes de publicar animales.
              </p>
              <Link href="/dashboard/finca">
                <button
                  type="button"
                  className="mt-5 inline-flex rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink"
                >
                  Registrar mi finca
                </button>
              </Link>
            </div>
          ) : categories.length === 0 ? (
            <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No hay categorías activas disponibles para publicar todavía.
            </p>
          ) : (
            <AnimalForm fincas={fincas} categories={categories} />
          )}
        </div>
      </div>
    </main>
  );
}
