import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { FincaForm } from "../finca-form";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewFincaPage() {
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect("/login?callbackUrl=/dashboard/finca/nueva");
  }

  if (session.user.roles.includes(ROLES.ADMIN)) {
    redirect("/admin");
  }

  if (!session.user.roles.includes(ROLES.FARMER)) {
    redirect("/catalogo");
  }

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      municipalities: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-cream px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard/finca"
          className="inline-flex h-12 items-center rounded-xl bg-white px-3"
        >
          <Image src="/logo.png" alt="AgroMarketNIC" width={180} height={120} className="-my-9 h-[120px] w-[180px] object-contain" />
        </Link>
        <div className="mt-10 rounded-3xl border border-ink/10 bg-white p-7 shadow-soft md:p-10">
          <Link
            href="/dashboard/finca"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-ink/50"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a mis fincas
          </Link>
          <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
            Nueva propiedad
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold">
            Registra tu finca
          </h1>
          <p className="mt-3 text-ink/55">
            Agrega la información básica para comenzar a organizar tus
            publicaciones.
          </p>
          {departments.length > 0 ? (
            <FincaForm departments={departments} />
          ) : (
            <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No hay ubicaciones disponibles para registrar una finca todavía.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
