import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  MapPin,
  Search,
} from "lucide-react";
import { redirect } from "next/navigation";
import type {
  AnimalSex,
  AnimalStatus,
  AnimalType,
} from "@prisma/client";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, Input } from "@/components/ui";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=900&q=80";

const statusLabels: Record<AnimalStatus, string> = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  INACTIVE: "Inactivo",
};

const typeLabels: Record<AnimalType, string> = {
  INDIVIDUAL: "Individual",
  LOT: "Lote",
};

const sexLabels: Record<AnimalSex, string> = {
  MALE: "Macho",
  FEMALE: "Hembra",
  MIXED: "Mixto",
  UNKNOWN: "No especificado",
};

const statusFilters = [
  { value: "", label: "Todos" },
  { value: "AVAILABLE", label: "Disponibles" },
  { value: "RESERVED", label: "Reservados" },
  { value: "SOLD", label: "Vendidos" },
  { value: "INACTIVE", label: "Inactivos" },
] as const;

type AnimalsPageProps = {
  searchParams: Promise<{
    busqueda?: string | string[];
    estado?: string | string[];
    categoria?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getDisplayName(name: string | null | undefined) {
  return name?.trim() || "Sin nombre";
}

function formatPrice(value: { toString(): string }, currency: string) {
  const amount = Number(value.toString());

  if (!Number.isFinite(amount)) {
    return "Precio no disponible";
  }

  const prefix = currency === "NIO" ? "C$" : currency;
  return `${prefix} ${amount.toLocaleString("es-NI", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("es-NI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function filterHref({
  search,
  status,
  category,
}: {
  search: string;
  status: string;
  category: string;
}) {
  const params = new URLSearchParams();

  if (search) {
    params.set("busqueda", search);
  }

  if (status) {
    params.set("estado", status);
  }

  if (category) {
    params.set("categoria", category);
  }

  const query = params.toString();
  return query ? `/admin/animales?${query}` : "/admin/animales";
}

export default async function AdminAnimals({
  searchParams,
}: AnimalsPageProps) {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    !session.user.roles.includes(ROLES.ADMIN)
  ) {
    redirect(
      !session
        ? "/login?callbackUrl=/admin/animales"
        : session.user.roles.includes(ROLES.FARMER)
          ? "/dashboard"
          : session.user.roles.includes(ROLES.BUYER)
            ? "/catalogo"
            : "/login",
    );
  }

  const params = await searchParams;
  const requestedStatus = firstParam(params.estado).toUpperCase();
  const status = statusFilters.some(
    (filter) => filter.value === requestedStatus,
  )
    ? requestedStatus
    : "";
  const search = firstParam(params.busqueda).trim().slice(0, 100);
  const requestedCategory = firstParam(params.categoria).trim().toLowerCase();
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });
  const category = categories.some(
    (item) => item.slug === requestedCategory,
  )
    ? requestedCategory
    : "";

  const [animals, statusGroups] = await Promise.all([
    prisma.animal.findMany({
      where: {
        ...(status ? { status: status as AnimalStatus } : {}),
        ...(category ? { category: { slug: category } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { identifier: { contains: search, mode: "insensitive" } },
                {
                  category: {
                    name: { contains: search, mode: "insensitive" },
                  },
                },
                {
                  finca: {
                    name: { contains: search, mode: "insensitive" },
                  },
                },
                {
                  finca: {
                    owner: { name: { contains: search, mode: "insensitive" } },
                  },
                },
                {
                  finca: {
                    municipality: {
                      name: { contains: search, mode: "insensitive" },
                    },
                  },
                },
                {
                  finca: {
                    department: {
                      name: { contains: search, mode: "insensitive" },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        identifier: true,
        type: true,
        sex: true,
        status: true,
        price: true,
        currency: true,
        createdAt: true,
        category: {
          select: { name: true },
        },
        finca: {
          select: {
            name: true,
            owner: { select: { name: true } },
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
    }),
    prisma.animal.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const globalCounts = Object.fromEntries(
    statusGroups.map(({ status: animalStatus, _count }) => [
      animalStatus,
      _count._all,
    ]),
  );
  const totalGlobal = Object.values(globalCounts).reduce(
    (total, count) => total + count,
    0,
  );

  return (
    <DashboardShell admin userName={session.user.name || undefined}>
      <div>
        <p className="text-sm text-ink/45">Administración AgroMarketNIC</p>
        <h2 className="mt-1 font-display text-3xl font-extrabold">
          Publicaciones
        </h2>
      </div>

      <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
        <form className="flex flex-col gap-3 sm:flex-row" method="get">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-ink/10 px-3 focus-within:border-leaf">
            <Search className="h-4 w-4 text-ink/40" />
            <Input
              name="busqueda"
              defaultValue={search}
              placeholder="Buscar por animal, finca, propietario o ubicación..."
              className="border-0 px-0 shadow-none"
            />
          </label>
          {status && <input type="hidden" name="estado" value={status} />}
          {category && <input type="hidden" name="categoria" value={category} />}
          <Button type="submit">Buscar</Button>
        </form>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <FilterGroup
            label="Estado"
            options={statusFilters}
            selected={status}
            search={search}
            category={category}
            queryKey="status"
          />
          <FilterGroup
            label="Categoría"
            options={[
              { value: "", label: "Todas" },
              ...categories.map((item) => ({
                value: item.slug,
                label: item.name,
              })),
            ]}
            selected={category}
            search={search}
            status={status}
            queryKey="category"
          />
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Total" value={totalGlobal} />
        {statusFilters.slice(1).map((filter) => (
          <SummaryCard
            key={filter.value}
            label={filter.label}
            value={globalCounts[filter.value] ?? 0}
          />
        ))}
      </section>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-bold">
            {animals.length}{" "}
            {animals.length === 1 ? "publicación" : "publicaciones"}
          </h3>
          <p className="mt-1 text-sm text-ink/50">
            Resultado actual ordenado por fecha de publicación
          </p>
        </div>
        {(status || category || search) && (
          <Link
            href="/admin/animales"
            className="text-sm font-semibold text-forest hover:underline"
          >
            Limpiar filtros
          </Link>
        )}
      </div>

      {animals.length > 0 ? (
        <section className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {animals.map((animal) => (
            <AnimalAdminCard key={animal.id} animal={animal} />
          ))}
        </section>
      ) : (
        <section className="mt-4 rounded-2xl border border-ink/10 bg-white p-8 text-center">
          <p className="text-sm text-ink/55">
            No hay publicaciones que coincidan con los filtros seleccionados.
          </p>
        </section>
      )}
    </DashboardShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <p className="text-xs text-ink/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  search,
  status = "",
  category = "",
  queryKey,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  selected: string;
  search: string;
  status?: string;
  category?: string;
  queryKey: "status" | "category";
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <Link
            href={filterHref({
              search,
              status: queryKey === "status" ? option.value : status,
              category: queryKey === "category" ? option.value : category,
            })}
            key={option.value || "all"}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              selected === option.value
                ? "border-forest bg-forest text-white"
                : "border-ink/10 text-ink/60 hover:border-forest/40"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

type AnimalAdminData = {
  id: string;
  name: string | null;
  identifier: string | null;
  type: AnimalType;
  sex: AnimalSex;
  status: AnimalStatus;
  price: { toString(): string };
  currency: string;
  createdAt: Date;
  category: { name: string };
  finca: {
    name: string;
    owner: { name: string };
    department: { name: string };
    municipality: { name: string };
  };
  images: Array<{ url: string }>;
};

function AnimalAdminCard({ animal }: { animal: AnimalAdminData }) {
  const name = getDisplayName(animal.name || animal.identifier);
  const location = `${animal.finca.municipality.name}, ${animal.finca.department.name}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
      <div className="relative h-48 bg-sand">
        <img
          src={animal.images[0]?.url || FALLBACK_IMAGE}
          alt={name}
          className="h-full w-full object-cover"
        />
        <div className="absolute left-3 top-3">
          <Badge>{statusLabels[animal.status]}</Badge>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink/50">
              {animal.category.name}
            </p>
            <h4 className="mt-1 truncate font-display text-xl font-bold">
              {name}
            </h4>
          </div>
          <span className="whitespace-nowrap font-display text-lg font-extrabold text-forest">
            {formatPrice(animal.price, animal.currency)}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-ink/10 py-4 text-sm">
          <div>
            <dt className="text-ink/50">Identificador</dt>
            <dd className="mt-1 truncate font-semibold">
              {animal.identifier?.trim() || "No especificado"}
            </dd>
          </div>
          <div>
            <dt className="text-ink/50">Tipo</dt>
            <dd className="mt-1 font-semibold">{typeLabels[animal.type]}</dd>
          </div>
          <div>
            <dt className="text-ink/50">Sexo</dt>
            <dd className="mt-1 font-semibold">{sexLabels[animal.sex]}</dd>
          </div>
          <div>
            <dt className="text-ink/50">Publicación</dt>
            <dd className="mt-1 font-semibold">{formatDate(animal.createdAt)}</dd>
          </div>
        </dl>

        <div className="mt-4 space-y-2 text-sm text-ink/60">
          <p className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-forest" />
            <span className="truncate">
              Finca: <strong className="text-ink">{animal.finca.name}</strong>
            </span>
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-forest" />
            <span className="truncate">{location}</span>
          </p>
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-forest" />
            <span className="truncate">
              Propietario: {getDisplayName(animal.finca.owner.name)}
            </span>
          </p>
        </div>

        <Link
          href={`/animal/${animal.id}`}
          className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-forest hover:underline"
        >
          Ver publicación <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
