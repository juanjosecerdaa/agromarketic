import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { notFound } from "next/navigation";

import { AnimalCard, type AnimalCardData } from "@/components/animal-card";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { ProfileVisitTracker } from "./profile-visit-tracker";
import { getAnimalCategoryImage } from "@/lib/animal-categories";

export const dynamic = "force-dynamic";

const fincaStatusLabels = {
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
  VERIFIED: "Verificada",
} as const;

const animalStatusLabels = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  INACTIVE: "Inactivo",
} as const;

const sexLabels = {
  MALE: "Macho",
  FEMALE: "Hembra",
  MIXED: "Mixto",
  UNKNOWN: "Sexo no especificado",
} as const;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function formatPrice(value: { toString(): string }, currency: string) {
  const price = Number(value.toString());

  if (!Number.isFinite(price)) {
    return "Precio no disponible";
  }

  const currencyLabel = currency === "NIO" ? "C$" : currency;
  return `${currencyLabel} ${price.toLocaleString("es-NI", {
    maximumFractionDigits: 2,
  })}`;
}

function formatAge(months: number | null) {
  if (months === null || months < 0) {
    return "Edad no especificada";
  }

  if (months < 12) {
    return `${months} ${months === 1 ? "mes" : "meses"}`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  return remainingMonths === 0
    ? `${years} ${years === 1 ? "año" : "años"}`
    : `${years}a ${remainingMonths}m`;
}

function formatWeight(weightKg: { toString(): string } | null) {
  if (weightKg === null) {
    return null;
  }

  const weight = Number(weightKg.toString());
  return Number.isFinite(weight) ? `${weight} kg` : null;
}

export default async function FincaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const finca = await prisma.finca.findUnique({
    where: { id },
    select: {
      name: true,
      description: true,
      status: true,
      createdAt: true,
      ownerId: true,
      owner: {
        select: { name: true },
      },
      department: {
        select: { name: true },
      },
      municipality: {
        select: { name: true },
      },
      animals: {
        where: {
          status: {
            in: ["AVAILABLE", "RESERVED", "SOLD"],
          },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          identifier: true,
          sex: true,
          approximateAgeMonths: true,
          weightKg: true,
          quantity: true,
          price: true,
          currency: true,
          status: true,
          category: {
            select: { name: true, slug: true },
          },
          images: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  });

  if (!finca) {
    notFound();
  }

  const animals: AnimalCardData[] = finca.animals.map((animal) => {
    const name =
      animal.name?.trim() ||
      animal.identifier?.trim() ||
      "Animal sin nombre";
    const weight = formatWeight(animal.weightKg);

    return {
      id: animal.id,
      name,
      category: animal.category.name,
      location: `${finca.municipality.name}, ${finca.department.name}`,
      price: formatPrice(animal.price, animal.currency),
      image: animal.images[0]?.url || getAnimalCategoryImage(animal.category.slug),
      tag: animalStatusLabels[animal.status],
      specs: [
        sexLabels[animal.sex],
        formatAge(animal.approximateAgeMonths),
        weight ??
          `${animal.quantity} ${
            animal.quantity === 1 ? "animal" : "animales"
          }`,
      ],
      finca: finca.name,
    };
  });

  const availableCount = finca.animals.filter(
    (animal) => animal.status === "AVAILABLE",
  ).length;
  const reservedCount = finca.animals.filter(
    (animal) => animal.status === "RESERVED",
  ).length;
  const soldCount = finca.animals.filter(
    (animal) => animal.status === "SOLD",
  ).length;
  const description =
    finca.description?.trim() ||
    "Esta finca no tiene una descripción adicional publicada.";

  return (
    <>
      <SiteHeader />
      <ProfileVisitTracker fincaId={id} />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <section className="rounded-3xl bg-forest p-7 text-white sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge className="bg-white/15 text-white">
                {fincaStatusLabels[finca.status]}
              </Badge>
              <h1 className="mt-4 font-display text-4xl font-extrabold">
                {finca.name}
              </h1>
              <p className="mt-3 flex items-center gap-2 text-sm text-white/70">
                <MapPin className="h-4 w-4" />
                {finca.municipality.name}, {finca.department.name}
              </p>
            </div>
            <p className="flex items-center gap-2 text-sm text-white/70">
              <CalendarDays className="h-4 w-4" />
              Registrada el{" "}
              {finca.createdAt.toLocaleDateString("es-NI")}
            </p>
          </div>
        </section>

        <div className="grid gap-10 py-12 lg:grid-cols-[1fr_280px]">
          <section>
            <div className="border-b border-ink/10 pb-6">
              <h2 className="font-display text-2xl font-extrabold">
                Información de la finca
              </h2>
              <p className="mt-3 leading-7 text-ink/65">{description}</p>
              <p className="mt-4 text-sm text-ink/60">
                Propietario:{" "}
                <span className="font-semibold text-ink">
                  {finca.owner.name}
                </span>
              </p>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-2xl font-extrabold">
                Publicaciones de esta finca
              </h2>
              {animals.length > 0 ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {animals.map((animal) => (
                    <AnimalCard key={animal.id} animal={animal} />
                  ))}
                </div>
              ) : (
                <p className="mt-6 rounded-2xl border border-dashed border-ink/20 p-8 text-center text-sm text-ink/55">
                  No hay publicaciones disponibles de esta finca.
                </p>
              )}
            </div>
          </section>

          <aside className="h-fit rounded-2xl border border-ink/10 bg-white p-5">
            <h2 className="font-display text-xl font-bold">Actividad</h2>
            <div className="mt-5 space-y-4 border-y border-ink/10 py-5 text-sm">
              <p className="flex justify-between gap-4">
                <span className="text-ink/55">Publicaciones</span>
                <b>{animals.length}</b>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-ink/55">Disponibles</span>
                <b>{availableCount}</b>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-ink/55">Reservados</span>
                <b>{reservedCount}</b>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-ink/55">Vendidos</span>
                <b>{soldCount}</b>
              </p>
            </div>
            <p className="text-sm leading-6 text-ink/55">
              Para contactar al propietario, abre una publicación y pulsa
              “Consultar”.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
