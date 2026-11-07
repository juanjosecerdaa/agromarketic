import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { redirect } from "next/navigation";
import type { AnimalStatus, FincaStatus } from "@prisma/client";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, Input } from "@/components/ui";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

const fincaStatusLabels: Record<FincaStatus, string> = {
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
  VERIFIED: "Verificada",
};

const animalStatusLabels: Record<AnimalStatus, string> = {
  AVAILABLE: "Disponibles",
  RESERVED: "Reservados",
  SOLD: "Vendidos",
  INACTIVE: "Inactivos",
};

const fincaStatusFilters = [
  { value: "", label: "Todas" },
  { value: "ACTIVE", label: "Activas" },
  { value: "INACTIVE", label: "Inactivas" },
  { value: "VERIFIED", label: "Verificadas" },
] as const;

type FincasPageProps = {
  searchParams: Promise<{
    busqueda?: string | string[];
    estado?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getDisplayName(name: string | null | undefined) {
  return name?.trim() || "Sin nombre";
}

function formatDate(date: Date) {
  return date.toLocaleDateString("es-NI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function filterHref({ search, status }: { search: string; status: string }) {
  const params = new URLSearchParams();

  if (search) {
    params.set("busqueda", search);
  }

  if (status) {
    params.set("estado", status);
  }

  const query = params.toString();
  return query ? `/admin/fincas?${query}` : "/admin/fincas";
}

export default async function AdminFincas({
  searchParams,
}: FincasPageProps) {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    !session.user.roles.includes(ROLES.ADMIN)
  ) {
    redirect(
      !session
        ? "/login?callbackUrl=/admin/fincas"
        : session.user.roles.includes(ROLES.FARMER)
          ? "/dashboard"
          : session.user.roles.includes(ROLES.BUYER)
            ? "/catalogo"
            : "/login",
    );
  }

  const params = await searchParams;
  const requestedStatus = firstParam(params.estado).toUpperCase();
  const status = fincaStatusFilters.some(
    (filter) => filter.value === requestedStatus,
  )
    ? requestedStatus
    : "";
  const search = firstParam(params.busqueda).trim().slice(0, 100);

  const fincas = await prisma.finca.findMany({
    where: {
      ...(status ? { status: status as FincaStatus } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { owner: { name: { contains: search, mode: "insensitive" } } },
              {
                department: {
                  name: { contains: search, mode: "insensitive" },
                },
              },
              {
                municipality: {
                  name: { contains: search, mode: "insensitive" },
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
      status: true,
      address: true,
      createdAt: true,
      owner: {
        select: { name: true },
      },
      department: {
        select: { name: true },
      },
      municipality: {
        select: { name: true },
      },
    },
  });

  const animalCounts = new Map<
    string,
    Partial<Record<AnimalStatus, number>>
  >();
  const fincaIds = fincas.map((finca) => finca.id);

  if (fincaIds.length > 0) {
    const groupedAnimals = await prisma.animal.groupBy({
      by: ["fincaId", "status"],
      where: { fincaId: { in: fincaIds } },
      _count: { _all: true },
    });

    for (const group of groupedAnimals) {
      const fincaCounts = animalCounts.get(group.fincaId) ?? {};
      fincaCounts[group.status] = group._count._all;
      animalCounts.set(group.fincaId, fincaCounts);
    }
  }

  return (
    <DashboardShell admin userName={session.user.name || undefined}>
      <div>
        <p className="text-sm text-ink/45">Administración AgroMarketNIC</p>
        <h2 className="mt-1 font-display text-3xl font-extrabold">Fincas</h2>
      </div>

      <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
        <form className="flex flex-col gap-3 sm:flex-row" method="get">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-ink/10 px-3 focus-within:border-leaf">
            <Search className="h-4 w-4 text-ink/40" />
            <Input
              name="busqueda"
              defaultValue={search}
              placeholder="Buscar por finca, propietario o ubicación..."
              className="border-0 px-0 shadow-none"
            />
          </label>
          {status && <input type="hidden" name="estado" value={status} />}
          <Button type="submit">Buscar</Button>
        </form>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
            Estado
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {fincaStatusFilters.map((filter) => (
              <Link
                href={filterHref({ search, status: filter.value })}
                key={filter.label}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  status === filter.value
                    ? "border-forest bg-forest text-white"
                    : "border-ink/10 text-ink/60 hover:border-forest/40"
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-bold">
            {fincas.length} {fincas.length === 1 ? "finca" : "fincas"}
          </h3>
          <p className="mt-1 text-sm text-ink/50">
            Consulta de fincas registradas en AgroMarketNIC
          </p>
        </div>
        {(status || search) && (
          <Link
            href="/admin/fincas"
            className="text-sm font-semibold text-forest hover:underline"
          >
            Limpiar filtros
          </Link>
        )}
      </div>

      <section className="mt-4 grid gap-5 lg:grid-cols-2">
        {fincas.map((finca) => (
          <FincaCard
            key={`${finca.name}-${finca.createdAt.toISOString()}`}
            finca={finca}
            animalCounts={animalCounts.get(finca.id) ?? {}}
          />
        ))}
      </section>

      {fincas.length === 0 && (
        <section className="mt-4 rounded-2xl border border-ink/10 bg-white p-8 text-center">
          <Building2 className="mx-auto h-8 w-8 text-forest" />
          <p className="mt-3 text-sm text-ink/55">
            No hay fincas que coincidan con los filtros seleccionados.
          </p>
        </section>
      )}
    </DashboardShell>
  );
}

type FincaData = {
  name: string;
  status: FincaStatus;
  address: string | null;
  createdAt: Date;
  owner: { name: string };
  department: { name: string };
  municipality: { name: string };
};

function FincaCard({
  finca,
  animalCounts,
}: {
  finca: FincaData;
  animalCounts: Partial<Record<AnimalStatus, number>>;
}) {
  const totalAnimals = Object.values(animalCounts).reduce(
    (total, count) => total + (count ?? 0),
    0,
  );

  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e5f0df] text-forest">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h4 className="truncate font-display text-xl font-bold">
              {getDisplayName(finca.name)}
            </h4>
            <p className="mt-1 text-sm text-ink/55">
              Propietario: {getDisplayName(finca.owner.name)}
            </p>
          </div>
        </div>
        <Badge>{fincaStatusLabels[finca.status]}</Badge>
      </div>

      <p className="mt-5 text-sm text-ink/60">
        {finca.municipality.name}, {finca.department.name}
      </p>
      {finca.address && (
        <p className="mt-1 text-sm text-ink/50">{finca.address}</p>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-ink/10 pt-5 text-sm sm:grid-cols-3">
        <Metric label="Animales" value={totalAnimals} />
        <Metric
          label={animalStatusLabels.AVAILABLE}
          value={animalCounts.AVAILABLE ?? 0}
        />
        <Metric
          label={animalStatusLabels.RESERVED}
          value={animalCounts.RESERVED ?? 0}
        />
        <Metric
          label={animalStatusLabels.SOLD}
          value={animalCounts.SOLD ?? 0}
        />
        <Metric
          label={animalStatusLabels.INACTIVE}
          value={animalCounts.INACTIVE ?? 0}
        />
      </dl>

      <p className="mt-5 text-xs text-ink/45">
        Registrada el {formatDate(finca.createdAt)}
      </p>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-ink/50">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold text-ink">{value}</dd>
    </div>
  );
}
