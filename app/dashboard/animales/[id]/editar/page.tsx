import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { EditAnimalForm } from "./edit-animal-form";

export const dynamic = "force-dynamic";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function EditAnimalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ seccion?: string; nuevo?: string }>;
}) {
  const { id } = await params;
  const { seccion, nuevo } = await searchParams;
  const isNewPublication = seccion === "fotografias" && nuevo === "1";
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect(`/login?callbackUrl=/dashboard/animales/${id}/editar`);
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

  const [animal, fincas, categories] = await prisma.$transaction([
    prisma.animal.findFirst({
      where: {
        id,
        finca: {
          ownerId: session.user.id,
        },
      },
      select: {
        id: true,
        fincaId: true,
        categoryId: true,
        type: true,
        identifier: true,
        name: true,
        sex: true,
        breed: true,
        approximateAgeMonths: true,
        weightKg: true,
        quantity: true,
        price: true,
        currency: true,
        description: true,
        status: true,
        images: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            url: true,
            type: true,
          },
        },
      },
    }),
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

  if (!animal) {
    notFound();
  }

  if (categories.length === 0 || fincas.length === 0) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-cream px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/animales"
          className="inline-flex h-12 items-center rounded-xl bg-white px-3"
        >
          <Image src="/logo.png" alt="AgroMarketNIC" width={180} height={120} className="-my-9 h-[120px] w-[180px] object-contain" />
        </Link>
        <div className="mt-10 rounded-3xl border border-ink/10 bg-white p-7 shadow-soft md:p-10">
          <Link
            href="/dashboard/animales"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-ink/50"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a mis animales
          </Link>
          <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
            Gestión de publicación
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold">
            Editar animal
          </h1>
          <p className="mt-3 text-ink/55">
            Actualiza la información de esta publicación propia.
          </p>
          {isNewPublication && (
            <div
              role="status"
              className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-900"
            >
              <p className="font-semibold">Publicación creada correctamente</p>
              <p className="mt-1">
                Ahora puedes añadir fotografías del animal. Las fotografías se
                guardan automáticamente al finalizar cada subida.
              </p>
            </div>
          )}

          <EditAnimalForm
            fincas={fincas}
            categories={categories}
            isNewPublication={isNewPublication}
            values={{
              animalId: animal.id,
              fincaId: animal.fincaId,
              categoryId: animal.categoryId,
              name: animal.name ?? "",
              identifier: animal.identifier ?? "",
              type: animal.type,
              sex: animal.sex,
              breed: animal.breed ?? "",
              approximateAgeMonths: String(animal.approximateAgeMonths ?? 0),
              weightKg: animal.weightKg?.toString() ?? "",
              quantity: String(animal.quantity),
              price: animal.price.toString(),
              currency: "NIO",
              description: animal.description ?? "",
              status: animal.status,
            }}
            images={animal.images}
          />
        </div>
      </div>
    </main>
  );
}
