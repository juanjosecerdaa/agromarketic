import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AnimalCard, type AnimalCardData } from "@/components/animal-card";
import { Button } from "@/components/ui";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { getAnimalCategoryImage } from "@/lib/animal-categories";

export const dynamic = "force-dynamic";

const sexLabels = {
  MALE: "Macho",
  FEMALE: "Hembra",
  MIXED: "Mixto",
  UNKNOWN: "No especificado",
} as const;

function formatPrice(value: { toString(): string }) {
  const price = Number(value.toString());
  return Number.isFinite(price)
    ? `C$ ${price.toLocaleString("es-NI", { maximumFractionDigits: 2 })}`
    : "Precio no disponible";
}

function formatAge(months: number | null) {
  if (months === null || months < 0) return "Edad no especificada";
  if (months < 12) return `${months} ${months === 1 ? "mes" : "meses"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years} ${years === 1 ? "año" : "años"}` : `${years}a ${rest}m`;
}

export default async function FavoritesPage() {
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect("/login?callbackUrl=/favoritos");
  }
  if (session.user.roles.includes(ROLES.ADMIN)) redirect("/admin");
  if (!session.user.roles.includes(ROLES.BUYER)) redirect("/dashboard");

  const favorites = await prisma.favorite.findMany({
    where: {
      userId: session.user.id,
      animal: { status: { not: "INACTIVE" } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      animal: {
        select: {
          id: true,
          name: true,
          identifier: true,
          sex: true,
          approximateAgeMonths: true,
          quantity: true,
          price: true,
          status: true,
          category: { select: { name: true, slug: true } },
          finca: {
            select: {
              name: true,
              department: { select: { name: true } },
              municipality: { select: { name: true } },
            },
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

  const animals: AnimalCardData[] = favorites.map(({ animal }) => ({
    id: animal.id,
    name: animal.name?.trim() || animal.identifier?.trim() || "Animal sin nombre",
    category: animal.category.name,
    location: `${animal.finca.municipality.name}, ${animal.finca.department.name}`,
    price: formatPrice(animal.price),
    image: animal.images[0]?.url || getAnimalCategoryImage(animal.category.slug),
    tag:
      animal.status === "AVAILABLE"
        ? "Disponible"
        : animal.status === "RESERVED"
          ? "Reservado"
          : "Vendido",
    specs: [
      sexLabels[animal.sex],
      formatAge(animal.approximateAgeMonths),
      `${animal.quantity} ${animal.quantity === 1 ? "animal" : "animales"}`,
    ],
    finca: animal.finca.name,
    isFavorite: true,
    showFavorite: true,
  }));

  return (
    <main className="min-h-screen bg-cream px-5 py-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/catalogo" className="text-sm font-semibold text-forest">
          ← Explorar catálogo
        </Link>
        <h1 className="mt-8 font-display text-4xl font-extrabold">Mis favoritos</h1>
        <p className="mt-3 text-ink/55">
          Publicaciones que guardaste para revisarlas después.
        </p>

        {animals.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center">
            <p className="font-display text-xl font-bold">
              Todavía no has guardado publicaciones.
            </p>
            <Link href="/catalogo">
              <Button className="mt-5">Explorar catálogo</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {animals.map((animal) => (
              <AnimalCard key={animal.id} animal={animal} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
