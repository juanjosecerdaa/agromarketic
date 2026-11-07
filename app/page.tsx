import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
  Sprout,
  Truck,
} from "lucide-react";

import { AnimalCard, type AnimalCardData } from "@/components/animal-card";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=900&q=80";

const sexLabels = {
  MALE: "Macho",
  FEMALE: "Hembra",
  MIXED: "Mixto",
  UNKNOWN: "Sexo no especificado",
} as const;

function formatPrice(value: { toString(): string }) {
  const price = Number(value.toString());

  if (!Number.isFinite(price)) {
    return "Precio no disponible";
  }

  return `C$ ${price.toLocaleString("es-NI", {
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

export default async function Home() {
  const [publishedAnimalCount, fincaCount, categories, animalsDb] =
    await Promise.all([
      prisma.animal.count({
        where: { status: "AVAILABLE" },
      }),
      prisma.finca.count(),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          name: true,
          slug: true,
          _count: {
            select: {
              animals: {
                where: { status: "AVAILABLE" },
              },
            },
          },
        },
      }),
      prisma.animal.findMany({
        where: { status: "AVAILABLE" },
        orderBy: { createdAt: "desc" },
        take: 4,
        include: {
          category: true,
          finca: {
            include: {
              department: true,
              municipality: true,
            },
          },
          images: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            take: 1,
          },
        },
      }),
    ]);

  const animals: AnimalCardData[] = animalsDb.map((animal) => {
    const name =
      animal.name?.trim() ||
      animal.identifier?.trim() ||
      "Animal sin nombre";
    const weight = formatWeight(animal.weightKg);

    return {
      id: animal.id,
      name,
      category: animal.category.name,
      location: `${animal.finca.municipality.name}, ${animal.finca.department.name}`,
      price: formatPrice(animal.price),
      image: animal.images[0]?.url || FALLBACK_IMAGE,
      tag: "Disponible",
      specs: [
        sexLabels[animal.sex],
        formatAge(animal.approximateAgeMonths),
        weight ??
          `${animal.quantity} ${
            animal.quantity === 1 ? "animal" : "animales"
          }`,
      ],
      finca: animal.finca.name,
    };
  });

  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden bg-forest text-white">
          <div className="hero-gradient absolute inset-0" />
          <div className="relative mx-auto grid min-h-[570px] max-w-7xl items-center gap-10 px-5 py-20 lg:grid-cols-[1.02fr_.98fr] lg:px-8">
            <div>
              <p className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[.2em] text-[#b6d6ae]">
                <Sprout className="h-4 w-4" /> El campo, más cerca
              </p>
              <h1 className="max-w-xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
                El mercado ganadero de{" "}
                <span className="text-[#d3e7bc]">Nicaragua.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-white/70">
                Encuentra animales de calidad, conecta con productores
                confiables y haz crecer tu negocio desde un solo lugar.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/catalogo">
                  <Button className="bg-[#d3e7bc] text-forest hover:bg-white">
                    Explorar animales <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/registro">
                  <Button variant="light">Publicar mis animales</Button>
                </Link>
              </div>
              <div className="mt-12 flex gap-8 text-sm text-white/70">
                <span>
                  <b className="block text-2xl text-white">
                    {publishedAnimalCount}
                  </b>
                  animales disponibles
                </span>
                <span>
                  <b className="block text-2xl text-white">{fincaCount}</b>
                  fincas registradas
                </span>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute -right-10 -top-12 h-72 w-72 rounded-full border border-white/10" />
              <div className="overflow-hidden rounded-[2rem] border-8 border-white/10 shadow-2xl">
                <img
                  src={FALLBACK_IMAGE}
                  alt="Animales de ganadería en Nicaragua"
                  className="h-[430px] w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-7 -left-8 rounded-2xl bg-white p-4 text-ink shadow-xl">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <BadgeCheck className="h-5 w-5 text-leaf" /> Publicaciones
                  reales
                </div>
                <p className="mt-1 text-xs text-ink/50">
                  Información clara para cada oportunidad.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mb-9 flex items-end justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
                Encuentra lo que buscas
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold">
                Explora por categoría
              </h2>
            </div>
            <Link
              href="/catalogo"
              className="hidden items-center gap-2 text-sm font-bold text-forest sm:flex"
            >
              Ver catálogo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {categories.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/catalogo?categoria=${encodeURIComponent(category.slug)}`}
                  className="group relative h-56 overflow-hidden rounded-2xl"
                >
                  <img
                    src={FALLBACK_IMAGE}
                    alt={category.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/85 to-transparent p-5">
                    <p className="mt-32 font-display text-2xl font-extrabold text-white">
                      {category.name}
                    </p>
                    <span className="text-sm text-white/70">
                      {category._count.animals}{" "}
                      {category._count.animals === 1
                        ? "publicación disponible"
                        : "publicaciones disponibles"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-ink/20 p-8 text-center text-sm text-ink/55">
              Todavía no hay categorías activas.
            </p>
          )}
        </section>

        <section className="bg-sand/50">
          <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
            <div className="mb-9 flex items-end justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
                  Oportunidades cerca de ti
                </p>
                <h2 className="mt-2 font-display text-3xl font-extrabold">
                  Publicaciones recientes
                </h2>
              </div>
              <Link
                href="/catalogo"
                className="hidden items-center gap-2 text-sm font-bold text-forest sm:flex"
              >
                Ver todas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {animals.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {animals.map((animal) => (
                  <AnimalCard key={animal.id} animal={animal} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center">
                <h2 className="font-display text-xl font-bold text-ink">
                  No hay animales disponibles en este momento.
                </h2>
                <Link
                  href="/catalogo"
                  className="mt-4 inline-flex text-sm font-bold text-forest"
                >
                  Explorar catálogo <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-5 py-20 sm:grid-cols-3 lg:px-8">
          <div>
            <ShieldCheck className="mb-4 h-8 w-8 text-terracotta" />
            <h3 className="font-display text-lg font-bold">
              Productores locales
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              Conecta directamente con fincas de Nicaragua.
            </p>
          </div>
          <div>
            <Truck className="mb-4 h-8 w-8 text-terracotta" />
            <h3 className="font-display text-lg font-bold">
              Conexiones reales
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              Encuentra oportunidades publicadas por productores.
            </p>
          </div>
          <div>
            <BadgeCheck className="mb-4 h-8 w-8 text-terracotta" />
            <h3 className="font-display text-lg font-bold">
              Información clara
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              Conoce raza, peso, ubicación y estado de cada animal.
            </p>
          </div>
        </section>
      </main>
      <footer className="bg-ink py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 text-sm text-white/60 lg:px-8">
          <span className="font-display text-lg font-bold text-white">
            AgroMarket<span className="text-terracotta">NIC</span>
          </span>
          <span>
            Conectando el campo nicaragüense con nuevas oportunidades.
          </span>
        </div>
      </footer>
    </>
  );
}
