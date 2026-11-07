import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import { Badge, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { startConversation } from "@/app/mensajes/actions";
import { ReservationForm } from "@/components/reservation-form";
import { FavoriteButton } from "@/components/favorite-button";
import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=900&q=80";

const sexLabels = {
  MALE: "Macho",
  FEMALE: "Hembra",
  MIXED: "Mixto",
  UNKNOWN: "Sexo no especificado",
} as const;

const statusLabels = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  INACTIVE: "Inactivo",
} as const;

const currencyLabels: Record<string, string> = {
  NIO: "C$",
};

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

  const currencyLabel = currencyLabels[currency] ?? currency;

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

export default async function AnimalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const animal = await prisma.animal.findUnique({
    where: { id },
    include: {
      category: true,
      finca: {
        include: {
          department: true,
          municipality: true,
        },
      },
      images: {
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
      },
    },
  });

  if (!animal) {
    notFound();
  }

  const session = await auth();
  const isBuyer =
    session?.user.status === "ACTIVE" &&
    session.user.roles.includes(ROLES.BUYER);
  const isFavorite = isBuyer
    ? Boolean(
        await prisma.favorite.findUnique({
          where: {
            userId_animalId: {
              userId: session.user.id,
              animalId: animal.id,
            },
          },
          select: { id: true },
        }),
      )
    : false;

  const name = animal.name?.trim() || animal.identifier?.trim() || "Animal sin nombre";
  const location = `${animal.finca.municipality.name}, ${animal.finca.department.name}`;
  const imageUrls = animal.images.length > 0
    ? animal.images.map((image) => image.url)
    : [FALLBACK_IMAGE];
  const weight = formatWeight(animal.weightKg);
  const description =
    animal.description?.trim() ||
    "Este animal no tiene una descripción adicional publicada.";
  const identification = animal.identifier?.trim();
  const breed = animal.breed?.trim();
  const specs = [
    { label: "Sexo", value: sexLabels[animal.sex] },
    { label: "Edad", value: formatAge(animal.approximateAgeMonths) },
    { label: "Peso", value: weight ?? "Peso no especificado" },
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <Link
          href="/catalogo"
          className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-ink/55 hover:text-forest"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al catálogo
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="overflow-hidden rounded-3xl bg-white">
              <img
                src={imageUrls[0]}
                alt={name}
                className="h-[500px] w-full object-cover"
              />
            </div>

            <div className="mt-4 grid grid-cols-4 gap-3">
              {imageUrls.slice(0, 4).map((image, index) => (
                <img
                  key={image}
                  src={image}
                  alt={index === 0 ? name : `${name}, foto ${index + 1}`}
                  className={`h-20 w-full rounded-xl object-cover ${
                    index === 0 ? "ring-2 ring-forest" : ""
                  }`}
                />
              ))}
              {Array.from({ length: Math.max(0, 4 - imageUrls.length) }).map(
                (_, index) => (
                  <div
                    key={`placeholder-${index}`}
                    className="grid h-20 place-items-center rounded-xl bg-sand text-xs text-ink/40"
                  >
                    Foto {imageUrls.length + index + 1}
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-ink/10 bg-white p-7">
            <div className="flex items-start justify-between">
              <div>
                <Badge>{statusLabels[animal.status]}</Badge>
                <p className="mt-4 text-sm text-ink/50">
                  {animal.category.name} · {location}
                </p>
                <h1 className="mt-2 font-display text-4xl font-extrabold">
                  {name}
                </h1>
                {identification && (
                  <p className="mt-2 text-sm text-ink/50">
                    Identificador: {identification}
                  </p>
                )}
              </div>
              {isBuyer && (
                <FavoriteButton
                  animalId={animal.id}
                  animalName={name}
                  isFavorite={isFavorite}
                />
              )}
            </div>

            <div className="mt-7 grid grid-cols-3 gap-3 rounded-2xl bg-cream p-4 text-center">
              {specs.map((spec) => (
                <div key={spec.label}>
                  <span className="block text-sm font-bold text-ink">
                    {spec.value}
                  </span>
                  <span className="text-xs text-ink/50">{spec.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border border-ink/10 p-4 text-sm text-ink/60 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-ink">Cantidad:</span>{" "}
                {animal.quantity}{" "}
                {animal.quantity === 1 ? "animal" : "animales"}
              </p>
              {breed && (
                <p>
                  <span className="font-semibold text-ink">Raza:</span> {breed}
                </p>
              )}
            </div>

            <div className="mt-7 border-b border-ink/10 pb-7">
              <p className="text-sm leading-7 text-ink/60">{description}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-ink/60">
                <MapPin className="h-4 w-4 text-terracotta" />
                {location}
              </div>
              <p className="mt-2 text-sm text-ink/50">
                Finca: {animal.finca.name}
              </p>
            </div>

            <section className="mt-7 border-y border-ink/10 py-7">
              <div>
                <p className="text-xs text-ink/45">Precio de venta</p>
                <p className="whitespace-nowrap font-display text-3xl font-extrabold text-forest">
                  {formatPrice(animal.price, animal.currency)}
                </p>
              </div>

              <div className="mt-6 grid items-start gap-4 lg:grid-cols-3">
                <form
                  action={startConversation}
                  className="rounded-2xl border border-ink/10 bg-white p-4"
                >
                  <input type="hidden" name="animalId" value={animal.id} />
                  <Button className="w-full" variant="outline" type="submit">
                    <MessageCircle className="h-4 w-4" /> Consultar
                  </Button>
                </form>
                {animal.status === "AVAILABLE" ? (
                  <div className="lg:col-span-2">
                    <ReservationForm
                      animalId={animal.id}
                      animalName={name}
                      price={formatPrice(animal.price, animal.currency)}
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-ink/10 bg-white p-4 lg:col-span-2">
                    <Button className="w-full" disabled>
                      No disponible para reserva
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#d9e8d1] bg-[#f1f7ed] p-4">
                <ShieldCheck className="h-7 w-7 shrink-0 text-leaf" />
                <div>
                  <p className="text-sm font-bold">Compra protegida</p>
                  <p className="text-xs text-ink/55">
                    Información del vendedor verificada por AgroMarketNIC.
                  </p>
                </div>
              </div>
            </section>

            <div className="mt-7 flex items-center gap-3 border-t border-ink/10 pt-6">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-forest font-bold text-white">
                {animal.finca.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <Link
                  href={`/finca/${animal.finca.id}`}
                  className="font-bold hover:text-forest"
                >
                  {animal.finca.name}
                </Link>
                <p className="text-xs text-ink/50">
                  Estado de la finca: {animal.finca.status === "VERIFIED"
                    ? "Verificada"
                    : animal.finca.status === "ACTIVE"
                      ? "Activa"
                      : "No disponible"}
                </p>
              </div>
              <BadgeCheck className="h-5 w-5 text-leaf" />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
