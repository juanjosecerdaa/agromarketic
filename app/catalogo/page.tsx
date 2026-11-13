import { Prisma, type AnimalStatus } from "@prisma/client";
import { MapPin, Search } from "lucide-react";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { AnimalCard, type AnimalCardData } from "@/components/animal-card";
import { Button, Input } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { getAnimalCategoryImage } from "@/lib/animal-categories";

export const dynamic = "force-dynamic";

const visibleStatuses: AnimalStatus[] = ["AVAILABLE", "RESERVED"];

const sexLabels = {
  MALE: "Macho",
  FEMALE: "Hembra",
  MIXED: "Mixto",
  UNKNOWN: "No especificado",
} as const;

const sortLabels = {
  recientes: "Más recientes",
  precio_asc: "Precio: menor a mayor",
  precio_desc: "Precio: mayor a menor",
} as const;

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeText(value: string | undefined, maxLength: number) {
  const normalized = value?.trim().slice(0, maxLength);
  return normalized || undefined;
}

function isUuid(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function parsePrice(value: string | undefined) {
  if (!value || !/^\d{1,10}(?:\.\d{1,2})?$/.test(value)) {
    return undefined;
  }

  const number = Number(value);
  return Number.isFinite(number) && number >= 0
    ? new Prisma.Decimal(value)
    : undefined;
}

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

function buildQuery(params: {
  buscar?: string;
  categoria?: string;
  departamento?: string;
  municipio?: string;
  precioMin?: string;
  precioMax?: string;
  sexo?: keyof typeof sexLabels;
  orden: keyof typeof sortLabels;
}) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  return query.toString();
}

function FilterFields({
  search,
  category,
  department,
  municipality,
  priceMin,
  priceMax,
  sex,
  categories,
  departments,
  municipalities,
}: {
  search?: string;
  category?: string;
  department?: string;
  municipality?: string;
  priceMin?: string;
  priceMax?: string;
  sex?: keyof typeof sexLabels;
  categories: Array<{
    name: string;
    slug: string;
    _count: { animals: number };
  }>;
  departments: Array<{ id: string; name: string }>;
  municipalities: Array<{
    id: string;
    name: string;
    departmentId: string;
    department: { name: string };
  }>;
}) {
  return (
    <>
      <label className="block text-xs font-bold text-ink/60" htmlFor="buscar">
        Buscar
      </label>
      <div className="relative mt-2">
        <Search className="absolute left-3 top-3 h-4 w-4 text-ink/40" />
        <Input
          id="buscar"
          className="pl-9"
          name="buscar"
          defaultValue={search}
          maxLength={100}
          placeholder="Animal, raza o finca"
        />
      </div>

      <label
        className="mt-5 block text-xs font-bold text-ink/60"
        htmlFor="categoria"
      >
        Categoría
      </label>
      <select
        id="categoria"
        name="categoria"
        defaultValue={category ?? ""}
        className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm"
      >
        <option value="">Todas las categorías</option>
        {categories.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.name} ({item._count.animals})
          </option>
        ))}
      </select>

      <label
        className="mt-5 block text-xs font-bold text-ink/60"
        htmlFor="departamento"
      >
        Departamento
      </label>
      <select
        id="departamento"
        name="departamento"
        defaultValue={department ?? ""}
        className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm"
      >
        <option value="">Todo Nicaragua</option>
        {departments.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>

      <label
        className="mt-5 block text-xs font-bold text-ink/60"
        htmlFor="municipio"
      >
        Municipio
      </label>
      <select
        id="municipio"
        name="municipio"
        defaultValue={municipality ?? ""}
        className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm"
      >
        <option value="">Todos los municipios</option>
        {municipalities.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({item.department.name})
          </option>
        ))}
      </select>

      <label className="mt-5 block text-xs font-bold text-ink/60" htmlFor="sexo">
        Sexo
      </label>
      <select
        id="sexo"
        name="sexo"
        defaultValue={sex ?? ""}
        className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm"
      >
        <option value="">Todos</option>
        {Object.entries(sexLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <label className="mt-5 block text-xs font-bold text-ink/60">
        Rango de precio
      </label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Input
          name="precioMin"
          defaultValue={priceMin}
          inputMode="decimal"
          placeholder="Mínimo"
          aria-label="Precio mínimo"
        />
        <Input
          name="precioMax"
          defaultValue={priceMax}
          inputMode="decimal"
          placeholder="Máximo"
          aria-label="Precio máximo"
        />
      </div>
    </>
  );
}

export default async function Catalogo({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const rawParams = await searchParams;
  const session = await auth();
  const isBuyer =
    session?.user.status === "ACTIVE" &&
    session.user.roles.includes(ROLES.BUYER);
  const rawSearch = normalizeText(firstParam(rawParams.buscar), 100);
  const rawCategory = normalizeText(firstParam(rawParams.categoria), 100);
  const rawDepartment = firstParam(rawParams.departamento);
  const rawMunicipality = firstParam(rawParams.municipio);
  const rawPriceMin = firstParam(rawParams.precioMin);
  const rawPriceMax = firstParam(rawParams.precioMax);
  const rawSex = firstParam(rawParams.sexo);
  const rawOrder = firstParam(rawParams.orden);

  const [categories, categoryCounts, departments, municipalities] =
    await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { name: true, slug: true, id: true },
    }),
    prisma.animal.groupBy({
      by: ["categoryId"],
      where: { status: { in: visibleStatuses } },
      _count: { _all: true },
    }),
    prisma.department.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.municipality.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: { select: { name: true } },
      },
    }),
    ]);

  const categoriesWithCounts = categories.map((item) => ({
    name: item.name,
    slug: item.slug,
    _count: {
      animals:
        categoryCounts.find((count) => count.categoryId === item.id)?._count
          ._all ?? 0,
    },
  }));

  const category = categoriesWithCounts.some((item) => item.slug === rawCategory)
    ? rawCategory
    : undefined;
  const department = departments.some((item) => item.id === rawDepartment)
    ? rawDepartment
    : undefined;
  const selectedMunicipality = municipalities.find(
    (item) => item.id === rawMunicipality,
  );
  const municipality =
    selectedMunicipality &&
    (!department || selectedMunicipality.departmentId === department)
      ? selectedMunicipality.id
      : undefined;
  const sex =
    rawSex && rawSex in sexLabels
      ? (rawSex as keyof typeof sexLabels)
      : undefined;
  const order =
    rawOrder && rawOrder in sortLabels
      ? (rawOrder as keyof typeof sortLabels)
      : "recientes";
  const priceMin = parsePrice(rawPriceMin);
  const priceMax = parsePrice(rawPriceMax);
  const validPriceRange =
    priceMin && priceMax && priceMin.gt(priceMax)
      ? { min: undefined, max: undefined }
      : { min: priceMin, max: priceMax };

  const where: Prisma.AnimalWhereInput = {
    status: { in: visibleStatuses },
    ...(rawSearch && {
      OR: [
        { name: { contains: rawSearch, mode: "insensitive" } },
        { identifier: { contains: rawSearch, mode: "insensitive" } },
        { breed: { contains: rawSearch, mode: "insensitive" } },
        { category: { name: { contains: rawSearch, mode: "insensitive" } } },
        { finca: { name: { contains: rawSearch, mode: "insensitive" } } },
        {
          finca: {
            municipality: { name: { contains: rawSearch, mode: "insensitive" } },
          },
        },
        {
          finca: {
            department: { name: { contains: rawSearch, mode: "insensitive" } },
          },
        },
      ],
    }),
    ...(category && { category: { slug: category, isActive: true } }),
    ...(department || municipality
      ? {
          finca: {
            ...(department && { departmentId: department }),
            ...(municipality && { municipalityId: municipality }),
          },
        }
      : {}),
    ...(sex && { sex }),
    ...((validPriceRange.min || validPriceRange.max) && {
      price: {
        ...(validPriceRange.min && { gte: validPriceRange.min }),
        ...(validPriceRange.max && { lte: validPriceRange.max }),
      },
    }),
  };
  const orderBy =
    order === "precio_asc"
      ? { price: "asc" as const }
      : order === "precio_desc"
        ? { price: "desc" as const }
        : { createdAt: "desc" as const };

  const [resultCount, animalesDb] = await Promise.all([
    prisma.animal.count({ where }),
    prisma.animal.findMany({
      where,
      select: {
        id: true,
        name: true,
        identifier: true,
        sex: true,
        approximateAgeMonths: true,
        weightKg: true,
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
      orderBy,
    }),
  ]);
  const favoriteIds = isBuyer
    ? new Set(
        (
          await prisma.favorite.findMany({
            where: {
              userId: session.user.id,
              animalId: { in: animalesDb.map((animal) => animal.id) },
            },
            select: { animalId: true },
          })
        ).map((favorite) => favorite.animalId),
      )
    : new Set<string>();

  const animales: AnimalCardData[] = animalesDb.map((animal) => {
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
      image: animal.images[0]?.url || getAnimalCategoryImage(animal.category.slug),
      tag: animal.status === "AVAILABLE" ? "Disponible" : "Reservado",
      specs: [
        sexLabels[animal.sex],
        formatAge(animal.approximateAgeMonths),
        weight ??
          `${animal.quantity} ${
            animal.quantity === 1 ? "animal" : "animales"
          }`,
      ],
      finca: animal.finca.name,
      isFavorite: favoriteIds.has(animal.id),
      showFavorite: isBuyer,
    };
  });

  const filters = {
    buscar: rawSearch,
    categoria: category,
    departamento: department,
    municipio: municipality,
    precioMin: validPriceRange.min?.toString(),
    precioMax: validPriceRange.max?.toString(),
    sexo: sex,
    orden: order,
  };
  const hasFilters = Object.entries(filters).some(
    ([key, value]) => key !== "orden" && Boolean(value),
  ) || order !== "recientes";
  const clearHref = "/catalogo";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
            Marketplace ganadero
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold">
            Encuentra tu próximo animal
          </h1>
          <p className="mt-3 text-ink/55">
            Explora ofertas disponibles y reservadas de productores de Nicaragua.
          </p>
        </div>

        <div className="mb-6 lg:hidden">
          <form action="/catalogo" method="get">
            <details className="rounded-2xl border border-ink/10 bg-white p-5">
              <summary className="cursor-pointer font-bold">Filtros</summary>
              <div className="mt-5">
                <FilterFields
                  {...filters}
                  categories={categoriesWithCounts}
                  departments={departments}
                  municipalities={municipalities}
                />
                <input type="hidden" name="orden" value={order} />
                <Button className="mt-5 w-full" type="submit">
                  Aplicar filtros
                </Button>
              </div>
            </details>
          </form>
        </div>

        <div className="grid gap-8 lg:grid-cols-[245px_1fr]">
          <form action="/catalogo" method="get">
            <aside className="hidden rounded-2xl border border-ink/10 bg-white p-5 lg:block">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Filtros</h3>
                {hasFilters && (
                  <Link href={clearHref} className="text-xs text-terracotta">
                    Limpiar filtros
                  </Link>
                )}
              </div>
              <div className="mt-6">
                <FilterFields
                  {...filters}
                  categories={categoriesWithCounts}
                  departments={departments}
                  municipalities={municipalities}
                />
                <input type="hidden" name="orden" value={order} />
                <Button className="mt-5 w-full" type="submit">
                  Aplicar filtros
                </Button>
              </div>
            </aside>
          </form>

          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink/55">
                <b className="text-ink">{resultCount}</b>{" "}
                {resultCount === 1 ? "resultado" : "resultados"}
              </p>
              <form action="/catalogo" method="get">
                <div className="flex items-center gap-2">
                  {Object.entries(filters).map(([key, value]) =>
                    key !== "orden" && value ? (
                      <input key={key} type="hidden" name={key} value={value} />
                    ) : null,
                  )}
                  {hasFilters && (
                    <Link
                      href={clearHref}
                      className="text-sm font-semibold text-terracotta lg:hidden"
                    >
                      Limpiar filtros
                    </Link>
                  )}
                  <label className="sr-only" htmlFor="orden">
                    Ordenar resultados
                  </label>
                  <select
                    id="orden"
                    name="orden"
                    defaultValue={order}
                    className="h-10 rounded-xl border border-forest/20 bg-white px-3 text-sm text-forest"
                  >
                    {Object.entries(sortLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <Button className="h-10 px-3" type="submit">
                    Ordenar
                  </Button>
                </div>
              </form>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {animales.length > 0 ? (
                animales.map((animal) => (
                  <AnimalCard key={animal.id} animal={animal} />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center sm:col-span-2 xl:col-span-3">
                  <h2 className="font-display text-xl font-bold text-ink">
                    No encontramos publicaciones con esos filtros.
                  </h2>
                  <Link
                    href={clearHref}
                    className="mt-4 inline-flex text-sm font-bold text-forest"
                  >
                    Limpiar filtros
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
