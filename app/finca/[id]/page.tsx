import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { notFound } from "next/navigation";

import { AnimalCard, type AnimalCardData } from "@/components/animal-card";
import { FincaVerificationBadge } from "@/components/finca-verification-badge";
import { FincaRemoteImage } from "@/components/finca-remote-image";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { isUploadcareCdnUrl } from "@/lib/uploadcare-url";
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
      images: {
        where: { animalId: null, type: { in: ["PRIMARY", "GALLERY"] } },
        orderBy: { createdAt: "desc" },
        select: { url: true, type: true },
      },
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

  const profileImage = finca.images.find(
    (image) =>
      image.type === "PRIMARY" && isUploadcareCdnUrl(image.url),
  )?.url;
  const coverImage = finca.images.find(
    (image) =>
      image.type === "GALLERY" && isUploadcareCdnUrl(image.url),
  )?.url;

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
        <section className="overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-soft">
          <div className="relative h-28 overflow-hidden rounded-t-3xl bg-gradient-to-br from-forest via-forest to-leaf sm:h-40 md:h-48 lg:h-[17rem]">
            <FincaRemoteImage
              src={coverImage ?? null}
              alt={`Portada de ${finca.name}`}
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 90vw, 1280px"
              className="object-cover"
              fallback={null}
            />
            {coverImage && (
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-forest/35 to-transparent"
              />
            )}
          </div>

          <div className="px-5 pb-5 sm:px-8 sm:pb-6">
            <div className="-mt-9 flex min-w-0 flex-col gap-3 sm:-mt-12 sm:flex-row sm:items-end sm:gap-5">
              <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-forest text-3xl font-extrabold text-white shadow-soft sm:h-24 sm:w-24 sm:text-3xl lg:h-28 lg:w-28">
                <FincaRemoteImage
                  src={profileImage ?? null}
                  alt={`Foto de perfil de ${finca.name}`}
                  sizes="(max-width: 640px) 80px, 112px"
                  className="object-cover"
                  fallback={
                    <span
                      role="img"
                      aria-label={`Foto de perfil de ${finca.name}: inicial`}
                    >
                      {finca.name.trim().charAt(0).toLocaleUpperCase("es-NI") ||
                        "F"}
                    </span>
                  }
                />
              </div>

              <div className="min-w-0 flex-1 text-ink sm:translate-y-5">
                {finca.status !== "VERIFIED" && (
                  <Badge className="bg-forest/10 text-forest">
                    {fincaStatusLabels[finca.status]}
                  </Badge>
                )}
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                  <h1 className="min-w-0 break-words font-display text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
                    {finca.name}
                  </h1>
                  <FincaVerificationBadge
                    verified={finca.status === "VERIFIED"}
                  />
                </div>
                <p className="mt-2 flex min-w-0 items-start gap-2 text-sm text-ink/65">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
                  <span className="break-words">
                    {finca.municipality.name}, {finca.department.name}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 border-t border-ink/10 pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                {finca.status === "VERIFIED" && (
                  <p className="text-xs leading-5 text-ink/50">
                    Verificación interna de AgroMarketNIC.
                  </p>
                )}
                <p className="flex items-center gap-2 text-xs text-ink/50">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span>
                    Registrada el{" "}
                    {finca.createdAt.toLocaleDateString("es-NI")}
                  </span>
                </p>
              </div>
              <Link
                href="#publicaciones"
                className="inline-flex min-h-10 w-fit items-center rounded-xl border border-forest/15 bg-forest/5 px-4 text-sm font-semibold text-forest transition-colors hover:bg-forest/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              >
                Ver publicaciones
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-5 py-6 sm:gap-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <section className="rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
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
          </section>

          <aside className="h-fit rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
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

          <section
            id="publicaciones"
            className="scroll-mt-24 border-t border-ink/10 pt-6 sm:pt-8"
          >
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
          </section>
        </div>
      </main>
    </>
  );
}
