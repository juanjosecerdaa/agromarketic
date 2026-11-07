import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { EditFincaForm } from "./edit-finca-form";

export const dynamic = "force-dynamic";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function EditFincaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect(`/login?callbackUrl=/dashboard/finca/${id}/editar`);
  }

  if (session.user.roles.includes(ROLES.ADMIN)) {
    redirect("/admin");
  }

  if (!session.user.roles.includes(ROLES.FARMER)) {
    redirect("/catalogo");
  }

  if (!isUuid(id)) {
    notFound();
  }

  const [finca, departments] = await prisma.$transaction([
    prisma.finca.findFirst({
      where: {
        id,
        ownerId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        departmentId: true,
        municipalityId: true,
      },
    }),
    prisma.department.findMany({
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
    }),
  ]);

  if (!finca) {
    notFound();
  }

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
            Gestión de finca
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold">
            Editar finca
          </h1>
          <p className="mt-3 text-ink/55">
            Actualiza únicamente la información editable de esta finca.
          </p>
          <EditFincaForm
            departments={departments}
            values={{
              fincaId: finca.id,
              name: finca.name,
              description: finca.description ?? "",
              address: finca.address ?? "",
              departmentId: finca.departmentId,
              municipalityId: finca.municipalityId,
            }}
          />
        </div>
      </div>
    </main>
  );
}
