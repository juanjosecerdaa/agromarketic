import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MapPin, Pencil, Plus, Trees } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { FincaForm } from "./finca-form";

export default async function FincaPage() {
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect("/login?callbackUrl=/dashboard/finca");
  }

  if (session.user.roles.includes(ROLES.ADMIN)) {
    redirect("/admin");
  }

  if (!session.user.roles.includes(ROLES.FARMER)) {
    redirect("/catalogo");
  }

  const [fincas] = await prisma.$transaction([
    prisma.finca.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        status: true,
        department: { select: { name: true } },
        municipality: { select: { name: true } },
        _count: { select: { animals: true } },
      },
    }),
  ]);
  const departments =
    fincas.length === 0
      ? await prisma.department.findMany({
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
        })
      : [];

  const statusLabels = {
    ACTIVE: "Activa",
    INACTIVE: "Inactiva",
    VERIFIED: "Verificada",
  } as const;

  return (
    <main className="min-h-screen bg-cream px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="inline-flex h-12 items-center rounded-xl bg-white px-3"
        >
          <Image src="/logo.png" alt="AgroMarketNIC" width={180} height={120} className="-my-9 h-[120px] w-[180px] object-contain" />
        </Link>
        <div className="mt-10 rounded-3xl border border-ink/10 bg-white p-7 shadow-soft md:p-10">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-forest"
              >
                <ArrowLeft className="h-4 w-4" /> Volver al dashboard
              </Link>
              <p className="mt-7 text-sm font-bold uppercase tracking-[.18em] text-terracotta">
                Gestión de propiedades
              </p>
              <h1 className="mt-2 font-display text-4xl font-extrabold">
                Mis fincas
              </h1>
              <p className="mt-3 text-ink/55">
                Consulta y administra únicamente tus fincas registradas.
              </p>
            </div>
            <Link href="/dashboard/finca/nueva">
              <Button>
                <Plus className="h-4 w-4" /> Registrar otra finca
              </Button>
            </Link>
          </div>

          {fincas.length === 0 ? (
            <section className="mt-8">
              <div className="rounded-2xl border border-dashed border-ink/20 bg-cream p-6">
                <div className="flex items-center gap-3">
                  <Trees className="h-6 w-6 text-forest" />
                  <div>
                    <h2 className="font-display text-2xl font-extrabold">
                      Registra tu primera finca
                    </h2>
                    <p className="mt-1 text-sm text-ink/55">
                      Agrega la información básica para comenzar a organizar tus publicaciones.
                    </p>
                  </div>
                </div>
              </div>
              {departments.length > 0 ? (
                <FincaForm departments={departments} />
              ) : (
                <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No hay ubicaciones disponibles para registrar una finca todavía.
                </p>
              )}
            </section>
          ) : (
            <section className="mt-8 grid gap-5 md:grid-cols-2">
              {fincas.map((finca) => (
                <article
                  key={finca.id}
                  className="rounded-2xl border border-ink/10 bg-cream p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">
                        Finca propia
                      </p>
                      <h2 className="mt-1 font-display text-2xl font-extrabold">
                        {finca.name}
                      </h2>
                    </div>
                    <span className="rounded-full bg-[#e1efdf] px-3 py-1 text-xs font-bold text-forest">
                      {statusLabels[finca.status]}
                    </span>
                  </div>
                  <p className="mt-4 flex items-center gap-2 text-sm text-ink/60">
                    <MapPin className="h-4 w-4 text-terracotta" />
                    {finca.municipality.name}, {finca.department.name}
                  </p>
                  {finca.address?.trim() && (
                    <p className="mt-2 text-sm text-ink/60">
                      Dirección: {finca.address.trim()}
                    </p>
                  )}
                  {finca.description?.trim() && (
                    <p className="mt-3 text-sm leading-6 text-ink/55">
                      {finca.description.trim()}
                    </p>
                  )}
                  <p className="mt-4 text-sm font-semibold text-forest">
                    {finca._count.animals}{" "}
                    {finca._count.animals === 1
                      ? "animal publicado"
                      : "animales publicados"}
                  </p>
                  <Link href={`/dashboard/finca/${finca.id}/editar`} className="mt-5 block">
                    <Button variant="outline" className="w-full">
                      <Pencil className="h-4 w-4" /> Editar finca
                    </Button>
                  </Link>
                </article>
              ))}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
